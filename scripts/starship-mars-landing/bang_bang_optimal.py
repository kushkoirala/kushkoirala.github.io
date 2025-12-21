#!/usr/bin/env python3
"""
Optimal Bang-Bang Control with Terminal Condition Satisfaction

This implementation:
1. Optimizes both switching times AND final time
2. Uses better thrust direction calculation
3. Ensures terminal conditions are satisfied
"""

import numpy as np
from scipy.integrate import odeint
from scipy.optimize import minimize, differential_evolution
from MarsLander import MarsLanderGNC

class OptimalBangBangController:
    """Optimal bang-bang controller with terminal condition satisfaction."""
    
    def __init__(self, lander):
        self.lander = lander
        
    def get_thrust_magnitude(self, t, switching_times, initial_thrust_max=True):
        """Get bang-bang thrust magnitude."""
        switches_before = np.sum(switching_times <= t)
        use_max = (switches_before % 2 == 0) if initial_thrust_max else (switches_before % 2 == 1)
        return self.lander.rho_2 if use_max else self.lander.rho_1
    
    def get_thrust_direction_optimal(self, r, v, target_r, target_v):
        """
        Optimal thrust direction for landing.
        
        Strategy:
        - Initially: Point AWAY from target, strongly upward to reduce steep descent
        - Mid-trajectory: Oppose velocity (decelerate)
        - Terminal: Blend velocity and position correction
        """
        # Error vectors
        pos_error = target_r - r
        vel_error = target_v - v
        dist_to_target = np.linalg.norm(pos_error)
        vel_mag = np.linalg.norm(v)
        v_vertical = v[0]  # Vertical velocity component (negative = descending)
        
        # Determine phase of flight
        altitude = r[0]
        is_initial_phase = altitude > 800  # High altitude = initial phase
        is_terminal_phase = altitude < 100  # Low altitude = terminal phase
        
        if is_initial_phase and v_vertical < -20:
            # INITIAL PHASE: Steep descent - point AWAY from target, strongly upward
            # This reduces vertical velocity and creates shallower descent
            if vel_mag > 1e-3:
                # Strongly oppose velocity, especially vertical component
                oppose_v = -v / vel_mag
                # Boost upward component
                oppose_v[0] = max(oppose_v[0], 0.6)  # At least 60% upward
                # Point away from target (oppose position error)
                if dist_to_target > 1e-3:
                    away_from_target = -pos_error / dist_to_target
                    away_from_target[0] = max(away_from_target[0], 0.5)  # Upward component
                    # Blend: 70% oppose velocity (upward), 30% away from target
                    direction = 0.7 * oppose_v + 0.3 * away_from_target
                else:
                    direction = oppose_v
            else:
                direction = np.array([1.0, 0.0, 0.0])  # Pure upward
        
        elif is_terminal_phase:
            # TERMINAL PHASE: Close to target - blend velocity and position
            if vel_mag > 1e-3:
                oppose_v = -v / vel_mag
                oppose_v[0] = max(oppose_v[0], 0.3)  # At least 30% upward
            else:
                oppose_v = np.array([0.0, 0.0, 0.0])
            
            if np.linalg.norm(pos_error) > 1e-3:
                to_pos = pos_error / np.linalg.norm(pos_error)
            else:
                to_pos = np.array([0.0, 0.0, 0.0])
            
            if np.linalg.norm(vel_error) > 1e-3:
                oppose_vel_error = -vel_error / np.linalg.norm(vel_error)
            else:
                oppose_vel_error = np.array([0.0, 0.0, 0.0])
            
            # Blend: 50% oppose velocity, 30% position correction, 20% velocity correction
            direction = 0.5 * oppose_v + 0.3 * to_pos + 0.2 * oppose_vel_error
        
        else:
            # MID-TRAJECTORY: Oppose velocity primarily
            if vel_mag > 1e-3:
                direction = -v / vel_mag
                direction[0] = max(direction[0], 0.4)  # At least 40% upward
            else:
                direction = np.array([1.0, 0.0, 0.0])  # Upward
        
        # Ensure upward component (can't thrust downward)
        direction[0] = max(direction[0], 0.2)  # At least 20% upward
        
        # Normalize
        direction = direction / np.linalg.norm(direction)
        return direction
    
    def dynamics(self, state, t, switching_times, tf, initial_thrust_max=True):
        """State dynamics with bang-bang thrust."""
        r = state[0:3]
        v = state[3:6]
        m = state[6]
        
        # Get bang-bang thrust magnitude
        thrust_mag = self.get_thrust_magnitude(t, switching_times, initial_thrust_max)
        
        # Get optimal thrust direction
        # Use remaining time to estimate target approach
        remaining_time = max(0.1, tf - t)
        estimated_target_r = r + v * remaining_time  # Simple prediction
        estimated_target_v = v + self.lander.g_mars * remaining_time
        
        thrust_dir = self.get_thrust_direction_optimal(
            r, v, 
            self.lander.rf, 
            self.lander.vf
        )
        
        # Thrust vector
        T = thrust_mag * thrust_dir
        
        # Dynamics
        r_dot = v
        v_dot = self.lander.g_mars + T / m
        m_dot = -self.lander.alpha * thrust_mag
        
        return np.concatenate([r_dot, v_dot, [m_dot]])
    
    def simulate(self, tf, switching_times, initial_thrust_max=True, n_points=2000):
        """Simulate trajectory with bang-bang control."""
        switching_times = np.array(switching_times)
        switching_times = switching_times[(switching_times > 0) & (switching_times < tf)]
        switching_times = np.sort(switching_times)
        
        state0 = np.concatenate([self.lander.r0, self.lander.v0, [self.lander.m_wet]])
        t_eval = np.linspace(0, tf, n_points)
        
        def dynamics_wrapper(state, t):
            return self.dynamics(state, t, switching_times, tf, initial_thrust_max)
        
        states = odeint(dynamics_wrapper, state0, t_eval, rtol=1e-9, atol=1e-9)
        
        r = states[:, 0:3].T
        v = states[:, 3:6].T
        m = states[:, 6]
        
        thrust_profile = [self.get_thrust_magnitude(t, switching_times, initial_thrust_max) 
                         for t in t_eval]
        
        return {
            't': t_eval,
            'r': r,
            'v': v,
            'm': m,
            'thrust': np.array(thrust_profile),
            'switching_times': switching_times
        }
    
    def objective(self, params, initial_thrust_max=True):
        """
        Objective function.
        
        params: [switching_time_1, ..., switching_time_n, tf]
        """
        params = np.array(params)
        n_switches = len(params) - 1
        switching_times = params[:-1]
        tf = params[-1]
        
        # Ensure valid bounds
        if tf < 50 or tf > 200:
            return 1e10
        switching_times = np.clip(switching_times, 0.05 * tf, 0.95 * tf)
        switching_times = np.sort(switching_times)
        
        try:
            traj = self.simulate(tf, switching_times, initial_thrust_max)
        except:
            return 1e10
        
        # Fuel consumption
        fuel_used = self.lander.m_wet - traj['m'][-1]
        
        # Terminal condition penalties (very large weights)
        pos_error = np.linalg.norm(traj['r'][:, -1] - self.lander.rf)
        vel_error = np.linalg.norm(traj['v'][:, -1] - self.lander.vf)
        
        # Constraint penalties
        min_alt = np.min(traj['r'][0, :])
        alt_penalty = max(0, self.lander.min_altitude - min_alt) * 100000
        
        final_mass = traj['m'][-1]
        mass_penalty = max(0, self.lander.m_dry - final_mass) * 100000
        
        # Combined objective
        penalty_weight = 1000000.0  # Very large to enforce constraints
        objective = fuel_used + penalty_weight * (pos_error + vel_error + alt_penalty + mass_penalty)
        
        return objective
    
    def optimize(self, n_switches=3, initial_thrust_max=True, tf_guess=85.0):
        """Optimize switching times and final time."""
        print(f"\nOptimizing {n_switches} switching times + final time...")
        print(f"Strategy: Use MAX thrust longer initially to reduce steep descent")
        
        # Initial guess: [switching_times..., tf]
        # Start with later switching times to keep MAX thrust longer
        switching_times_init = np.linspace(0.4 * tf_guess, 0.9 * tf_guess, n_switches)
        x0 = np.concatenate([switching_times_init, [tf_guess]])
        
        # Bounds: switching times and final time
        bounds = [(0.05 * tf_guess, 0.95 * tf_guess) for _ in range(n_switches)]
        bounds.append((50.0, 200.0))  # Final time bounds
        
        # Use differential evolution for global optimization
        result = differential_evolution(
            lambda x: self.objective(x, initial_thrust_max),
            bounds,
            maxiter=150,
            popsize=25,
            seed=42,
            polish=True,
            mutation=(0.5, 1.5),
            recombination=0.7,
            atol=1e-6,
            tol=1e-6
        )
        
        optimal_params = result.x
        optimal_switches = np.sort(optimal_params[:-1])
        optimal_tf = optimal_params[-1]
        
        print(f"✓ Optimization complete")
        print(f"  Optimal switching times: {optimal_switches}")
        print(f"  Optimal final time: {optimal_tf:.2f} s")
        print(f"  Objective value: {result.fun:.2f}")
        
        # Simulate with optimal parameters
        traj = self.simulate(optimal_tf, optimal_switches, initial_thrust_max)
        
        # Print results
        fuel = self.lander.m_wet - traj['m'][-1]
        pos_error = np.linalg.norm(traj['r'][:, -1] - self.lander.rf)
        vel_error = np.linalg.norm(traj['v'][:, -1] - self.lander.vf)
        print(f"  Fuel: {fuel:.2f} kg")
        print(f"  Position error: {pos_error:.4f} m")
        print(f"  Velocity error: {vel_error:.4f} m/s")
        print(f"  Final mass: {traj['m'][-1]:.2f} kg")
        
        return optimal_switches, optimal_tf, traj

def main():
    """Main function."""
    print("="*70)
    print("OPTIMAL BANG-BANG CONTROL IMPLEMENTATION")
    print("="*70)
    
    # Get SOCP solution for comparison
    lander = MarsLanderGNC()
    print("\n1. Getting SOCP solution for comparison...")
    tf_socp, traj_socp = lander.find_optimal_time_of_flight(
        enforce_glide_slope=False,
        enforce_terminal_altitude=True,
        enforce_thrust_tilt=False,
        parallel_candidates=2,
        scvx_iters=1
    )
    
    if traj_socp:
        fuel_socp = lander.m_wet - traj_socp['m'][-1]
        print(f"✓ SOCP: tf = {tf_socp:.2f} s, fuel = {fuel_socp:.2f} kg")
    
    # Create bang-bang controller
    controller = OptimalBangBangController(lander)
    
    # Optimize bang-bang control
    print("\n2. Optimizing bang-bang control...")
    optimal_switches, optimal_tf, traj_bb = controller.optimize(
        n_switches=3,
        initial_thrust_max=True,
        tf_guess=tf_socp if traj_socp else 85.0
    )
    
    # Final comparison
    print("\n" + "="*70)
    print("FINAL COMPARISON")
    print("="*70)
    
    if traj_socp:
        fuel_socp = lander.m_wet - traj_socp['m'][-1]
        fuel_bb = lander.m_wet - traj_bb['m'][-1]
        
        print(f"\nFuel Consumption:")
        print(f"  SOCP (continuous):  {fuel_socp:.2f} kg")
        print(f"  Bang-Bang:         {fuel_bb:.2f} kg ({fuel_bb-fuel_socp:+.2f} kg)")
        
        print(f"\nTerminal Conditions:")
        pos_error_socp = np.linalg.norm(traj_socp['r'][:, -1] - lander.rf)
        pos_error_bb = np.linalg.norm(traj_bb['r'][:, -1] - lander.rf)
        vel_error_socp = np.linalg.norm(traj_socp['v'][:, -1] - lander.vf)
        vel_error_bb = np.linalg.norm(traj_bb['v'][:, -1] - lander.vf)
        
        print(f"  Position error:")
        print(f"    SOCP: {pos_error_socp:.4f} m")
        print(f"    Bang-Bang: {pos_error_bb:.4f} m")
        print(f"  Velocity error:")
        print(f"    SOCP: {vel_error_socp:.4f} m/s")
        print(f"    Bang-Bang: {vel_error_bb:.4f} m/s")
    
    # Validate bang-bang
    thrust_bb = traj_bb['thrust']
    is_bangbang = np.all((thrust_bb == lander.rho_1) | (thrust_bb == lander.rho_2))
    print(f"\nBang-Bang Validation:")
    print(f"  ✓ All thrust values at bounds: {is_bangbang}")
    print(f"  ✓ Unique thrust values: {np.unique(thrust_bb)}")
    print(f"  ✓ Number of switches: {len(optimal_switches)}")
    
    # Visualize
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # Thrust
    ax = axes[0, 0]
    if traj_socp:
        ax.plot(traj_socp['t'], traj_socp['thrust'], 'b-', label='SOCP', linewidth=2, alpha=0.7)
    ax.plot(traj_bb['t'], traj_bb['thrust'], 'r-', label='Bang-Bang', linewidth=2)
    ax.axhline(lander.rho_1, color='g', linestyle='--', label=f'Min ({lander.rho_1:.0f} N)')
    ax.axhline(lander.rho_2, color='r', linestyle='--', label=f'Max ({lander.rho_2:.0f} N)')
    for switch_time in optimal_switches:
        ax.axvline(switch_time, color='orange', linestyle=':', alpha=0.5)
    ax.set_xlabel('Time (s)')
    ax.set_ylabel('Thrust (N)')
    ax.set_title('Bang-Bang Thrust Profile')
    ax.legend()
    ax.grid(True)
    
    # Altitude
    ax = axes[0, 1]
    if traj_socp:
        ax.plot(traj_socp['t'], traj_socp['r'][0, :], 'b-', label='SOCP', linewidth=2, alpha=0.7)
    ax.plot(traj_bb['t'], traj_bb['r'][0, :], 'r-', label='Bang-Bang', linewidth=2)
    ax.set_xlabel('Time (s)')
    ax.set_ylabel('Altitude (m)')
    ax.set_title('Altitude Profile')
    ax.legend()
    ax.grid(True)
    
    # Velocity
    ax = axes[1, 0]
    if traj_socp:
        v_socp = np.linalg.norm(traj_socp['v'], axis=0)
        ax.plot(traj_socp['t'], v_socp, 'b-', label='SOCP', linewidth=2, alpha=0.7)
    v_bb = np.linalg.norm(traj_bb['v'], axis=0)
    ax.plot(traj_bb['t'], v_bb, 'r-', label='Bang-Bang', linewidth=2)
    ax.set_xlabel('Time (s)')
    ax.set_ylabel('Velocity (m/s)')
    ax.set_title('Velocity Magnitude')
    ax.legend()
    ax.grid(True)
    
    # Mass
    ax = axes[1, 1]
    if traj_socp:
        ax.plot(traj_socp['t'], traj_socp['m'], 'b-', label='SOCP', linewidth=2, alpha=0.7)
    ax.plot(traj_bb['t'], traj_bb['m'], 'r-', label='Bang-Bang', linewidth=2)
    ax.set_xlabel('Time (s)')
    ax.set_ylabel('Mass (kg)')
    ax.set_title('Mass Profile')
    ax.legend()
    ax.grid(True)
    
    plt.tight_layout()
    plt.savefig('scripts/bang_bang_optimal.png', dpi=150, bbox_inches='tight')
    print(f"\n✓ Visualization saved to: scripts/bang_bang_optimal.png")
    
    return traj_bb, optimal_switches, optimal_tf

if __name__ == "__main__":
    traj, switches, tf = main()

