#!/usr/bin/env python3
"""
3D Animation of Mars Lander Landing Trajectory

Creates an animated 3D visualization showing the lander descending and landing.
"""

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from matplotlib import animation
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from MarsLander import MarsLanderGNC
from bang_bang_optimal import OptimalBangBangController

def create_landing_animation(traj, lander, save_gif=True):
    """
    Create 3D animated visualization of landing.
    
    Parameters:
    - traj: trajectory dictionary
    - lander: MarsLanderGNC instance
    - save_gif: whether to save as GIF file
    """
    t = traj['t']
    r = traj['r']
    v = traj['v']
    thrust = traj.get('thrust', None)
    
    # Extract position components
    downrange = r[2, :]  # x-axis (forward)
    crossrange = r[1, :]  # y-axis (lateral)
    altitude = r[0, :]    # z-axis (up)
    
    # Clamp altitude to prevent showing below surface
    altitude = np.maximum(altitude, 0.0)  # Never show negative altitude
    
    # Create figure
    fig = plt.figure(figsize=(14, 10))
    ax = fig.add_subplot(111, projection='3d')
    
    # Set labels and title
    ax.set_xlabel('Downrange (m)', fontsize=12, fontweight='bold')
    ax.set_ylabel('Crossrange (m)', fontsize=12, fontweight='bold')
    ax.set_zlabel('Altitude (m)', fontsize=12, fontweight='bold')
    ax.set_title('Mars Lander - 3D Landing Animation', fontsize=16, fontweight='bold', pad=20)
    
    # Set axis limits with equal aspect
    max_range = max(
        np.ptp(downrange),
        np.ptp(crossrange),
        np.ptp(altitude)
    ) * 0.6
    
    mid_x = (np.max(downrange) + np.min(downrange)) * 0.5
    mid_y = (np.max(crossrange) + np.min(crossrange)) * 0.5
    mid_z = (np.max(altitude) + np.min(altitude)) * 0.5
    
    ax.set_xlim(mid_x - max_range, mid_x + max_range)
    ax.set_ylim(mid_y - max_range, mid_y + max_range)
    # Ensure z-axis starts at 0 (surface) and never goes negative
    ax.set_zlim(0, max(np.max(altitude) * 1.1, 100))  # At least 100m range
    
    # Add ground plane (Mars surface) - visible reference plane
    # Create a grid for the surface
    x_surf = np.linspace(mid_x - max_range * 0.8, mid_x + max_range * 0.8, 15)
    y_surf = np.linspace(mid_y - max_range * 0.8, mid_y + max_range * 0.8, 15)
    X_ground, Y_ground = np.meshgrid(x_surf, y_surf)
    Z_ground = np.zeros_like(X_ground)  # Surface at z=0
    ax.plot_surface(X_ground, Y_ground, Z_ground, alpha=0.4, color='saddlebrown', 
                    edgecolor='darkred', linewidth=0.5, zorder=1)
    
    # Plot full trajectory path (static, gray) - clamped to surface
    ax.plot(downrange, crossrange, altitude, 'lightgray', linewidth=2, alpha=0.4, label='Trajectory Path', zorder=2)
    
    # Start point (green sphere)
    ax.scatter([downrange[0]], [crossrange[0]], [altitude[0]], 
              color='green', s=300, marker='o', label='Start', zorder=5)
    
    # Target/landing point (red star)
    ax.scatter([0], [0], [0], color='red', s=500, marker='*', 
              label='Landing Site', zorder=5, edgecolors='darkred', linewidths=2)
    
    # Animated elements
    # Traversed path (grows as animation progresses)
    path_line, = ax.plot([], [], [], 'blue', linewidth=2.5, alpha=0.8, label='Lander Path')
    
    # Lander position (animated)
    lander_scatter = ax.scatter([], [], [], color='blue', s=400, marker='^', 
                                label='Lander', zorder=10, edgecolors='darkblue', linewidths=2)
    
    # Velocity vector (orange arrow)
    vel_quiver = None
    
    # Thrust vector (red arrow) - if available
    thrust_quiver = None
    
    # Information text
    time_text = ax.text2D(0.02, 0.98, '', transform=ax.transAxes, fontsize=13,
                          verticalalignment='top', fontweight='bold',
                          bbox=dict(boxstyle='round,pad=0.5', facecolor='yellow', alpha=0.8))
    
    info_text = ax.text2D(0.02, 0.85, '', transform=ax.transAxes, fontsize=11,
                         verticalalignment='top',
                         bbox=dict(boxstyle='round,pad=0.5', facecolor='lightblue', alpha=0.8))
    
    # Legend
    ax.legend(loc='upper left', fontsize=10)
    ax.grid(True, alpha=0.3)
    
    # Store quiver objects for cleanup
    quiver_objects = []
    
    def animate(frame):
        nonlocal vel_quiver, thrust_quiver
        
        # Clear previous quiver arrows
        for q in quiver_objects:
            q.remove()
        quiver_objects.clear()
        
        if frame >= len(t):
            frame = len(t) - 1
        
        # Update path line (show trajectory up to current frame, clamped to surface)
        path_alt = np.maximum(altitude[:frame+1], 0.0)  # Clamp to surface
        path_line.set_data_3d(
            downrange[:frame+1],
            crossrange[:frame+1],
            path_alt
        )
        
        # Current position (clamp altitude to surface)
        current_alt = max(0.0, altitude[frame])  # Never below surface
        current_pos = np.array([downrange[frame], crossrange[frame], current_alt])
        lander_scatter._offsets3d = ([current_pos[0]], [current_pos[1]], [current_pos[2]])
        
        # Velocity vector
        vel = v[:, frame]
        vel_mag = np.linalg.norm(vel)
        
        if vel_mag > 0.1:  # Only show if significant velocity
            scale = max_range * 0.15
            vel_quiver = ax.quiver(
                current_pos[0], current_pos[1], current_pos[2],
                vel[2] * scale, vel[1] * scale, vel[0] * scale,
                color='orange', arrow_length_ratio=0.4, linewidth=3, alpha=0.8
            )
            quiver_objects.append(vel_quiver)
        
        # Thrust vector (if available)
        if thrust is not None and frame < len(thrust):
            thrust_mag = thrust[frame]
            if vel_mag > 1e-3:
                # Thrust direction: oppose velocity + upward component
                thrust_dir = -vel / vel_mag
                thrust_dir[0] = max(thrust_dir[0], 0.3)  # Ensure upward
                thrust_dir = thrust_dir / np.linalg.norm(thrust_dir)
            else:
                thrust_dir = np.array([1.0, 0.0, 0.0])  # Pure upward
            
            scale_thrust = max_range * 0.08
            thrust_quiver = ax.quiver(
                current_pos[0], current_pos[1], current_pos[2],
                thrust_dir[2] * scale_thrust,
                thrust_dir[1] * scale_thrust,
                thrust_dir[0] * scale_thrust,
                color='red', arrow_length_ratio=0.4, linewidth=4, alpha=0.9
            )
            quiver_objects.append(thrust_quiver)
        
        # Update text information
        current_time = t[frame]
        remaining_time = t[-1] - current_time
        dist_to_target = np.linalg.norm(r[:, frame] - lander.rf)
        current_altitude = max(0.0, altitude[frame])  # Clamp for display
        current_vel = vel_mag
        
        # Determine thrust level
        if thrust is not None and frame < len(thrust):
            thrust_val = thrust[frame]
            thrust_level = "MAX" if abs(thrust_val - lander.rho_2) < 100 else "MIN"
        else:
            thrust_val = 0
            thrust_level = "N/A"
        
        time_text.set_text(f'⏱ Time: {current_time:.2f} s / {t[-1]:.2f} s')
        
        info_text.set_text(
            f'📊 Telemetry:\n'
            f'Altitude: {current_altitude:.1f} m\n'
            f'Velocity: {current_vel:.2f} m/s\n'
            f'Thrust: {thrust_val:.0f} N ({thrust_level})\n'
            f'Distance to target: {dist_to_target:.1f} m\n'
            f'Time remaining: {remaining_time:.2f} s'
        )
        
        return path_line, lander_scatter, time_text, info_text
    
    # Create animation
    # Use every Nth frame for smoother animation
    n_total = len(t)
    step = max(1, n_total // 300)  # ~300 frames for animation
    frames = list(range(0, n_total, step))
    
    print(f"   Creating animation with {len(frames)} frames...")
    
    anim = animation.FuncAnimation(
        fig, animate,
        frames=frames,
        interval=50,  # 50 ms between frames (~20 fps)
        blit=False,
        repeat=True
    )
    
    # Save animation
    if save_gif:
        try:
            print(f"   Saving as GIF (this may take a minute)...")
            # Get script directory and save GIF to outputs folder
            script_dir = os.path.dirname(os.path.abspath(__file__))
            outputs_dir = os.path.join(script_dir, 'outputs')
            os.makedirs(outputs_dir, exist_ok=True)
            gif_file = os.path.join(outputs_dir, 'mars_lander_3d_animation.gif')
            anim.save(gif_file, writer='pillow', fps=20, bitrate=1800)
            print(f"   ✓ GIF saved to: {gif_file}")
        except Exception as e:
            print(f"   ⚠️  Could not save GIF: {e}")
            print(f"   (Install pillow: pip install pillow)")
    
    return fig, anim

def main():
    """Main function."""
    print("="*70)
    print("3D ANIMATION OF MARS LANDER LANDING")
    print("="*70)
    
    # Use improved bang-bang controller for shallower descent
    print("\n1. Using improved bang-bang controller...")
    print("   Strategy: Longer MAX thrust, thrust points away from target initially")
    
    lander = MarsLanderGNC()
    controller = OptimalBangBangController(lander)
    
    print("\n2. Optimizing trajectory with improved descent strategy...")
    optimal_switches, optimal_tf, traj = controller.optimize(
        n_switches=3,
        initial_thrust_max=True,
        tf_guess=85.0
    )
    
    if traj is None:
        print("Failed to get trajectory")
        return
    
    print(f"\n✓ Trajectory optimized!")
    print(f"  Time of flight: {optimal_tf:.2f} s")
    print(f"  Fuel: {lander.m_wet - traj['m'][-1]:.2f} kg")
    print(f"  Terminal position error: {np.linalg.norm(traj['r'][:, -1] - lander.rf):.4f} m")
    print(f"  Terminal velocity error: {np.linalg.norm(traj['v'][:, -1] - lander.vf):.4f} m/s")
    
    # Analyze descent angle
    altitude = traj['r'][0, :]
    horizontal_dist = np.linalg.norm(traj['r'][1:3, :], axis=0)
    descent_angles = np.arctan2(altitude, horizontal_dist + 1e-6) * 180 / np.pi
    print(f"  Average descent angle: {np.mean(descent_angles):.1f}° (shallower is better)")
    
    # Create animation
    print("\n3. Creating 3D animation...")
    fig, anim = create_landing_animation(traj, lander, save_gif=True)
    
    print("\n4. Animation complete!")
    print("   GIF saved to: scripts/mars_lander_3d_animation.gif")
    print("   Displaying animation window...")
    print("   (Close the window when done viewing)")
    
    plt.show()
    
    return anim

if __name__ == "__main__":
    anim = main()

