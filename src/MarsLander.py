import os
import copy
import cvxpy as cp
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import animation
from concurrent.futures import ProcessPoolExecutor


def _solve_tf_worker(payload):
    """
    Worker function for parallel tf evaluation.
    """
    cfg, tf, flags, scvx_iters, ecos_opts, scs_opts = payload
    lander = MarsLanderGNC()
    lander.apply_config(cfg)
    fuel, traj, status = lander.solve_socp(
        tf,
        enforce_glide_slope=flags["enforce_glide_slope"],
        enforce_terminal_altitude=flags["enforce_terminal_altitude"],
        enforce_thrust_tilt=flags["enforce_thrust_tilt"],
        enforce_descent_envelope=flags["enforce_descent_envelope"],
        scvx_iters=scvx_iters,
        verbose=False,
        ecos_opts=ecos_opts,
        scs_opts=scs_opts
    )
    return tf, fuel, traj, status

class MarsLanderGNC:
    def __init__(self):
        # --- System Parameters  ---
        self.g_mars = np.array([-3.7114, 0, 0]) # Gravity vector (m/s^2)
        # Note: e1 is UP. Gravity is negative e1.
        
        self.m_wet = 1905.0  # Initial mass (kg)
        self.m_dry = 1505.0  # Dry mass (kg)
        self.alpha = 4.53e-4 # Mass depletion rate (s/N) proxy (simple)
        self.rho_1 = 4972.0  # Min Thrust (N) from spec
        self.rho_2 = 13260.0 # Max Thrust (N) from spec
        self.min_altitude = 1.0 # Keep altitude above ground (meters)
        self.max_altitude = 5000.0 # Upper bound to prevent runaway ascent (meters)
        self.v_max = 200.0        # Velocity magnitude cap (m/s) to avoid solver blowups
        self.climb_cap = 2.0      # Allowable upward velocity (m/s)
        self.climb_slack = 2.0    # Per-step altitude increase allowance (meters)
        self.descent_buffer = 20.0 # Soft buffer for the descent envelope (meters)
        self.smooth_velocity_weight = 1e-3  # Penalizes velocity changes for smoother, more uniform trajectories
        self.terminal_altitude = self.min_altitude
        self.tilt_max_deg = 20.0
        self.tilt_max = np.radians(self.tilt_max_deg)
        self.tilt_cos = np.cos(self.tilt_max)
        self.tilt_tan = np.tan(self.tilt_max)
        
        # --- Boundary Conditions ---
        # Defaults taken from problem statement / PDF
        self.r0 = np.array([1500.0, 500.0, 2000.0])  # Initial Position (vertical, cross, downrange)
        self.v0 = np.array([-75.0, 0.0, 100.0])     # Initial Velocity (m/s)
        self.rf = np.array([0.0, 0.0, 0.0])       # Target Position (surface)
        self.vf = np.array([0.0, 0.0, 0.0])       # Target Velocity (hover/land)
        
        # --- Glide Slope Constraint ---
        # tan(gamma) * ||lateral|| <= vertical
        self.gamma = np.radians(4.0) 
        self.tan_gamma = np.tan(self.gamma)
        
        # --- Discretization ---
        self.N = 60  # Number of temporal nodes

    def export_config(self):
        """
        Snapshot parameters for multiprocessing.
        """
        keys = [
            "g_mars", "m_wet", "m_dry", "alpha", "rho_1", "rho_2",
            "min_altitude", "max_altitude", "terminal_altitude",
            "tilt_max_deg", "tilt_max", "tilt_cos", "tilt_tan",
            "climb_cap", "climb_slack", "descent_buffer", "smooth_velocity_weight",
            "v_max",
            "r0", "v0", "rf", "vf",
            "gamma", "tan_gamma",
            "N"
        ]
        return {k: copy.deepcopy(getattr(self, k)) for k in keys}

    def apply_config(self, cfg):
        for k, v in cfg.items():
            setattr(self, k, copy.deepcopy(v))

    def solve_socp(
        self,
        tf,
        enforce_glide_slope=True,
        enforce_terminal_altitude=True,
        enforce_thrust_tilt=True,
        enforce_descent_envelope=True,
        scvx_iters=1,
        verbose=False,
        ecos_opts=None,
        scs_opts=None
    ):
        """
        Solves the Fixed-Time Fuel Optimal Landing Problem using SOCP.
        Returns: fuel_cost, trajectories (r, v, u, z, sigma), status
        """
        N = self.N
        dt = tf / (N - 1)

        # Initial reference mass profile (linear wet->dry)
        m_ref = np.linspace(self.m_wet, self.m_dry, N)
        best = None
        last_status = 'unknown'

        for _ in range(max(1, scvx_iters)):
            # 1. Define Variables
            r = cp.Variable((3, N))  # Position
            v = cp.Variable((3, N))  # Velocity
            u = cp.Variable((3, N))  # Specific Thrust vector (T/m)
            z = cp.Variable(N)       # Log mass (ln(m))
            sigma = cp.Variable(N)   # Thrust magnitude slack (||T||/m)

            constraints = []
            
            # 2. Boundary Conditions
            constraints += [
                r[:, 0] == self.r0,
                v[:, 0] == self.v0,
                z[0] == np.log(self.m_wet),
                r[1:, -1] == self.rf[1:],           # Lateral/dowrange meet target
                v[:, -1] == self.vf
            ]
            # Final altitude constraint
            if enforce_terminal_altitude:
                constraints += [r[0, -1] == self.terminal_altitude]
            else:
                constraints += [r[0, -1] >= self.min_altitude]
            # Respect dry-mass floor
            constraints += [z >= np.log(self.m_dry)]
            constraints += [sigma >= 0]

            # 3. Dynamics (Simple Euler integration)
            t_grid = np.linspace(0, tf, N)
            for k in range(N - 1):
                constraints += [r[:, k+1] == r[:, k] + dt * v[:, k]]
                constraints += [v[:, k+1] == v[:, k] + dt * (self.g_mars + u[:, k])]
                # Log-mass dynamics: z_dot = -alpha * ||T|| / m = -alpha * sigma
                constraints += [z[k+1] == z[k] - self.alpha * sigma[k] * dt]
                # Prevent significant climbs between nodes
                constraints += [r[0, k+1] <= r[0, k] + self.climb_slack]

            # 4. Control Constraints & Lossless Convexification
            # Use mass reference profile to set per-node thrust bounds
            m_ref_clipped = np.clip(m_ref, self.m_dry, self.m_wet)
            for k in range(N):
                # A. Second-Order Cone Relaxation: ||u|| <= sigma
                constraints += [cp.norm(u[:, k], 2) <= sigma[k]]
                
                # B. Thrust Bounds scaled by reference mass
                sigma_min = self.rho_1 / m_ref_clipped[k]
                sigma_max = self.rho_2 / m_ref_clipped[k]
                constraints += [sigma[k] >= sigma_min, sigma[k] <= sigma_max]
                # Absolute thrust cap using worst-case (minimum) mass to avoid solver tolerance blowups
                constraints += [cp.norm(u[:, k], 2) <= self.rho_2 / self.m_dry]

                # C. Glide Slope Constraint (SOCP Form)
                if enforce_glide_slope:
                    lateral_norm = cp.norm(r[1:3, k], 2)
                    vertical_height = r[0, k] - self.terminal_altitude
                    constraints += [vertical_height >= 0]
                    constraints += [lateral_norm <= (1.0 / self.tan_gamma) * vertical_height]
                constraints += [r[0, k] >= self.min_altitude]
                constraints += [r[0, k] <= self.max_altitude]
                constraints += [cp.norm(v[:, k], 2) <= self.v_max]
                constraints += [v[0, k] <= self.climb_cap]
                if enforce_descent_envelope:
                    envelope = max(self.min_altitude, self.r0[0] * (1 - t_grid[k] / tf) + self.descent_buffer)
                    constraints += [r[0, k] <= envelope]

                # D. Thrust tilt / pointing cone (prevents downward thrusting)
                if enforce_thrust_tilt:
                    constraints += [
                        u[0, k] >= self.tilt_cos * sigma[k],
                        cp.norm(u[1:3, k], 2) <= self.tilt_tan * u[0, k]
                    ]

            # 5. Objective: Minimize Fuel (Integral of sigma)
            smooth_term = cp.sum_squares(v[:, 1:] - v[:, :-1])
            objective = cp.Minimize(cp.sum(sigma) * dt + self.smooth_velocity_weight * smooth_term)

            # 6. Solve
            prob = cp.Problem(objective, constraints)
            
            # Use ECOS for robustness in embedded-like contexts, fall back to SCS if needed
            try:
                prob.solve(
                    solver=cp.ECOS,
                    verbose=verbose,
                    **(ecos_opts or {
                        "abstol": 1e-7,
                        "reltol": 1e-7,
                        "feastol": 1e-7,
                        "max_iters": 200
                    })
                )
            except cp.SolverError:
                try:
                    prob.solve(
                        solver=cp.SCS,
                        verbose=verbose,
                        **(scs_opts or {
                            "eps": 1e-4,
                            "max_iters": 3000
                        })
                    )
                except cp.SolverError:
                    last_status = 'solver_error'
                    break

            last_status = prob.status
            if prob.status not in ('optimal', 'optimal_inaccurate'):
                break

            mass_profile = np.exp(z.value)
            thrust_profile = np.minimum(self.rho_2, np.maximum(0, sigma.value * mass_profile))  # ||T|| = sigma * m
            fuel_used = self.m_wet - mass_profile[-1]    # kg consumed
            trajectory = {
                't': np.linspace(0, tf, N),
                'r': r.value,
                'v': v.value,
                'u': u.value,
                'm': mass_profile,
                'sigma': sigma.value,
                'thrust': thrust_profile
            }
            best = (fuel_used, trajectory, prob.status)

            # Update mass reference for next SCvx iteration
            m_ref = mass_profile

        if best is not None:
            return best
        return np.inf, None, last_status

    def find_optimal_time_of_flight(
        self,
        t_min=80.0,
        t_max=150.0,
        enforce_glide_slope=True,
        enforce_terminal_altitude=True,
        enforce_thrust_tilt=True,
        enforce_descent_envelope=True,
        parallel_candidates=0,
        scvx_iters=3
    ):
        """
        Outer Loop: Golden Section Search to find optimal tf.
        """
        gr = (np.sqrt(5) + 1) / 2
        
        c = t_max - (t_max - t_min) / gr
        d = t_min + (t_max - t_min) / gr
        
        print(f"Searching for optimal Time of Flight (tf) in range [{t_min}, {t_max}]s...")

        # Optional coarse parallel screening of tf to reduce solver failures and use multiple cores
        best_parallel = None
        if parallel_candidates and parallel_candidates > 0:
            seeds = np.linspace(t_min, t_max, parallel_candidates)
            cfg = self.export_config()
            flags = {
                "enforce_glide_slope": enforce_glide_slope,
                "enforce_terminal_altitude": enforce_terminal_altitude,
                "enforce_thrust_tilt": enforce_thrust_tilt,
                "enforce_descent_envelope": enforce_descent_envelope,
            }
            payloads = [(cfg, float(tf), flags, scvx_iters, None, None) for tf in seeds]
            max_workers = min(len(payloads), max(1, (os.cpu_count() or 2) - 1))
            print(f"Parallel screening {len(payloads)} tf seeds on {max_workers} workers...")
            with ProcessPoolExecutor(max_workers=max_workers) as ex:
                results = list(ex.map(_solve_tf_worker, payloads))
            feasible = [
                (tf, fuel, traj, status)
                for (tf, fuel, traj, status) in results
                if status in ('optimal', 'optimal_inaccurate')
            ]
            if feasible:
                feasible.sort(key=lambda x: x[1])
                best_parallel = feasible[0]
                best_tf = best_parallel[0]
                span = 0.3 * (t_max - t_min)
                t_min = max(t_min, best_tf - span * 0.5)
                t_max = min(t_max, best_tf + span * 0.5)
                c = t_max - (t_max - t_min) / gr
                d = t_min + (t_max - t_min) / gr
                print(f"Parallel best tf={best_tf:.2f}s, tightening search window to [{t_min:.2f}, {t_max:.2f}]s")
        
        tol = 0.5 # Convergence tolerance (seconds)
        
        while abs(t_max - t_min) > tol:
            fuel_c, _, status_c = self.solve_socp(
                c,
                enforce_glide_slope,
                enforce_terminal_altitude,
                enforce_thrust_tilt,
                enforce_descent_envelope,
                scvx_iters=scvx_iters
            )
            fuel_d, _, status_d = self.solve_socp(
                d,
                enforce_glide_slope,
                enforce_terminal_altitude,
                enforce_thrust_tilt,
                enforce_descent_envelope,
                scvx_iters=scvx_iters
            )
            print(f"tf={c:.2f}s status={status_c}, tf={d:.2f}s status={status_d}")
            
            # Handle infeasibility penalties
            feasible_c = status_c in ('optimal', 'optimal_inaccurate')
            feasible_d = status_d in ('optimal', 'optimal_inaccurate')
            if not feasible_c: fuel_c = 1e9
            if not feasible_d: fuel_d = 1e9
            
            if fuel_c < fuel_d:
                t_max = d
                d = c
                c = t_max - (t_max - t_min) / gr
            else:
                t_min = c
                c = d
                d = t_min + (t_max - t_min) / gr
                
        optimal_tf = (t_min + t_max) / 2
        print(f"Optimal tf found: {optimal_tf:.2f} seconds")
        
        # Final solve to get trajectory
        fuel, trajectory, status = self.solve_socp(
            optimal_tf,
            enforce_glide_slope,
            enforce_terminal_altitude,
            enforce_thrust_tilt,
            enforce_descent_envelope,
            scvx_iters=scvx_iters
        )
        if status not in ('optimal', 'optimal_inaccurate') and best_parallel is not None:
            # Fall back to best parallel candidate
            _, fuel, trajectory, status = best_parallel
            optimal_tf = best_parallel[0]
            print(f"Golden-section failed; using best parallel tf={optimal_tf:.2f}s status={status}")
        else:
            print(f"Final solve status: {status}")
        return optimal_tf, trajectory

    def plot_profiles(self, trajectory, save_path=None, show=True, close=True):
        t = trajectory['t']
        r = trajectory['r']
        v = trajectory['v']
        thrust = trajectory['thrust']

        fig, axs = plt.subplots(3, 1, figsize=(8, 8), sharex=True)
        axs[0].plot(t, r[0, :], label='Altitude (m)')
        axs[0].set_ylabel('Altitude (m)')
        axs[0].grid(True)

        axs[1].plot(t, v[0, :], label='Vertical Velocity (m/s)', color='tab:orange')
        axs[1].set_ylabel('Vvert (m/s)')
        axs[1].grid(True)

        axs[2].plot(t, thrust, label='Thrust (N)', color='tab:red')
        axs[2].set_ylabel('Thrust (N)')
        axs[2].set_xlabel('Time (s)')
        axs[2].grid(True)

        plt.tight_layout()
        if save_path:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            plt.savefig(save_path, dpi=140, bbox_inches='tight')
        if show:
            plt.show()
        if close:
            plt.close(fig)
        return save_path

    def plot_trajectory_3d(self, trajectory, every=4, save_path=None, show=True, close=True):
        """
        3D path visualization with sampled velocity arrows.
        """
        r = trajectory['r']
        v = trajectory['v']
        x = r[2, :]
        y = r[1, :]
        z = r[0, :]

        fig = plt.figure(figsize=(8, 6))
        ax = fig.add_subplot(111, projection='3d')

        ax.plot(x, y, z, color='tab:blue', lw=2, label='Path')
        ax.scatter(x[0], y[0], z[0], color='tab:green', s=50, label='Start')
        ax.scatter(x[-1], y[-1], z[-1], color='tab:red', s=50, label='Touchdown')

        if every > 0:
            idx = np.arange(0, len(x), max(1, every))
            scale = max(np.ptp(x), np.ptp(y), np.ptp(z), 1.0)
            ax.quiver(
                x[idx], y[idx], z[idx],
                v[2, idx], v[1, idx], v[0, idx],
                length=0.08 * scale,
                normalize=True,
                color='tab:orange',
                alpha=0.7
            )

        self._set_equal_aspect(ax, x, y, z)
        ax.set_xlabel('Downrange (m)')
        ax.set_ylabel('Crossrange (m)')
        ax.set_zlabel('Altitude (m)')
        ax.legend(loc='upper right')
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        if save_path:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            plt.savefig(save_path, dpi=140, bbox_inches='tight')
        if show:
            plt.show()
        if close:
            plt.close(fig)
        return save_path

    def animate_descent(self, trajectory, interval_ms=120, save_path=None, show=True):
        """
        Simple 3D animation of the lander with a velocity arrow.
        """
        r = trajectory['r']
        v = trajectory['v']
        t = trajectory['t']
        x, y, z = r[2, :], r[1, :], r[0, :]

        fig = plt.figure(figsize=(8, 6))
        ax = fig.add_subplot(111, projection='3d')
        ax.plot(x, y, z, color='lightgray', lw=1.5, alpha=0.6)

        lander, = ax.plot([], [], [], 'o', color='tab:red', markersize=6, label='Lander')
        vel_handle = {'artist': None}
        time_text = ax.text2D(0.05, 0.92, '', transform=ax.transAxes)

        self._set_equal_aspect(ax, x, y, z)
        ax.set_xlabel('Downrange (m)')
        ax.set_ylabel('Crossrange (m)')
        ax.set_zlabel('Altitude (m)')
        ax.legend(loc='upper right')

        vel_length = max(np.ptp(x), np.ptp(y), np.ptp(z), 1.0) * 0.1

        def init():
            lander.set_data([], [])
            lander.set_3d_properties([])
            time_text.set_text('')
            return lander, time_text

        def update(frame):
            lander.set_data([x[frame]], [y[frame]])
            lander.set_3d_properties([z[frame]])

            if vel_handle['artist'] is not None:
                vel_handle['artist'].remove()
            vel = v[:, frame]
            if np.linalg.norm(vel) > 1e-3:
                vel_handle['artist'] = ax.quiver(
                    x[frame], y[frame], z[frame],
                    vel[2], vel[1], vel[0],
                    length=vel_length,
                    normalize=True,
                    color='tab:green'
                )

            time_text.set_text(f"t = {t[frame]:.1f}s | |v| = {np.linalg.norm(vel):.1f} m/s")
            return lander, time_text

        anim = animation.FuncAnimation(
            fig,
            update,
            init_func=init,
            frames=len(t),
            interval=interval_ms,
            blit=False,
            repeat=False
        )
        self._last_anim = anim  # keep reference alive to avoid GC warning

        plt.tight_layout()
        if save_path:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            try:
                anim.save(save_path, writer='imagemagick', fps=max(1, int(1000 / interval_ms)))
            except Exception:
                # Fall back to not saving if writer is unavailable
                pass
        if show:
            plt.show()
        else:
            plt.close(fig)
        return anim

    def export_media(self, trajectory, output_dir="docs/images"):
        """
        Render and save key figures for the README/gallery.
        Returns a dict of generated file paths.
        """
        os.makedirs(output_dir, exist_ok=True)
        profiles_path = os.path.join(output_dir, "mars-lander-profiles.png")
        traj3d_path = os.path.join(output_dir, "mars-lander-trajectory.png")
        anim_path = os.path.join(output_dir, "mars-lander-descent.gif")

        self.plot_profiles(trajectory, save_path=profiles_path, show=False)
        self.plot_trajectory_3d(trajectory, save_path=traj3d_path, show=False)

        # Animation save is best-effort; will skip silently if writer unavailable.
        try:
            self.animate_descent(trajectory, save_path=anim_path, show=False)
            anim_saved = anim_path
        except Exception:
            anim_saved = None

        return {
            "profiles": profiles_path,
            "trajectory": traj3d_path,
            "animation": anim_saved
        }

    @staticmethod
    def _set_equal_aspect(ax, x, y, z):
        """
        Set 3D axes to equal scale for better spatial interpretation.
        """
        max_range = max(np.ptp(x), np.ptp(y), np.ptp(z), 1.0) * 0.6
        mid_x = (np.max(x) + np.min(x)) * 0.5
        mid_y = (np.max(y) + np.min(y)) * 0.5
        mid_z = (np.max(z) + np.min(z)) * 0.5
        ax.set_xlim(mid_x - max_range, mid_x + max_range)
        ax.set_ylim(mid_y - max_range, mid_y + max_range)
        ax.set_zlim(mid_z - max_range, mid_z + max_range)

# --- Execution Block ---
if __name__ == "__main__":
    lander = MarsLanderGNC()
    tf_opt, traj = lander.find_optimal_time_of_flight(
        enforce_glide_slope=True,
        enforce_terminal_altitude=True,
        enforce_thrust_tilt=True,
        parallel_candidates=6
    )
    
    if traj is not None:
        print(f"Mission Success. Fuel Consumed: {lander.m_wet - traj['m'][-1]:.2f} kg")
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        media_dir = os.path.join(repo_root, "docs", "images")
        media_paths = lander.export_media(traj, output_dir=media_dir)
        print("Media saved for README/gallery:")
        for label, path in media_paths.items():
            if path:
                print(f" - {label}: {path}")
        # Set SHOW_MARS_LANDER_PLOTS=1 to open the interactive windows
        if os.getenv("SHOW_MARS_LANDER_PLOTS", "0") == "1":
            lander.plot_profiles(traj)
            lander.plot_trajectory_3d(traj)
            lander.animate_descent(traj)
    else:
        print("Mission Failed: Could not find feasible trajectory.")
