#!/usr/bin/env python3
"""
Quick-and-dirty aerodynamic coefficient calibration helper.

Numbers are transcribed from the trim spreadsheet snapshots
(airspeed in ft/s, alpha_trim/ delta_e_trim in degrees).  The script
fits a simple linear lift model and estimates pitching-moment
coefficients assuming Cm = Cm0 + Cm_alpha * alpha + Cm_de * delta_e.
"""

from __future__ import annotations

import numpy as np


# --- Trim data pulled from the shared spreadsheet ---
airspeed_fps = np.array([200, 250, 300, 350, 400, 450, 500], dtype=float)
alpha_trim_deg = np.array(
    [25.5029611, 16.5660979, 11.7115056, 8.78433954, 6.88449697, 5.58196982, 4.65028038],
    dtype=float,
)
delta_trim_deg = np.array(
    [-16.2950578, -12.8408095, -10.9644278, -9.83302875, -9.09870728, -8.59525889, -8.233154522],
    dtype=float,
)
# Wing/tail lift coefficients from the spreadsheet (dimensionless). These are
# approximate but capture the trend needed to recover CL0 and CL_alpha.
CL_trim = np.array(
    [1.336373244, 0.855278876, 0.593934664, 0.436866774, 0.334093311, 0.263974962, 0.213819719],
    dtype=float,
)


def fit_lift_coefficients(alpha_deg: np.ndarray, cl_vals: np.ndarray):
    """Fit CL = CL0 + CL_alpha * alpha (alpha in radians)."""
    alpha = np.deg2rad(alpha_deg)
    A = np.column_stack([np.ones_like(alpha), alpha])
    CL0, CL_alpha = np.linalg.lstsq(A, cl_vals, rcond=None)[0]
    return CL0, CL_alpha


def fit_pitch_coefficients(alpha_deg: np.ndarray, delta_deg: np.ndarray, cm_de: float = -1.0):
    """
    Fit Cm0 and Cm_alpha assuming a fixed Cm_de (default -1.0 / rad).
    Cm = Cm0 + Cm_alpha * alpha + Cm_de * delta = 0 at trim.
    """
    alpha = np.deg2rad(alpha_deg)
    delta = np.deg2rad(delta_deg)
    rhs = -cm_de * delta
    A = np.column_stack([np.ones_like(alpha), alpha])
    Cm0, Cm_alpha = np.linalg.lstsq(A, rhs, rcond=None)[0]
    return Cm0, Cm_alpha, cm_de


def main():
    CL0, CL_alpha = fit_lift_coefficients(alpha_trim_deg, CL_trim)
    Cm0, Cm_alpha, Cm_de = fit_pitch_coefficients(alpha_trim_deg, delta_trim_deg, cm_de=-1.0)

    print("=== Lift fit ===")
    print(f"CL0     = {CL0:.6f}")
    print(f"CL_alpha= {CL_alpha:.6f} per rad")
    print("\n=== Pitch moment fit (Cm_de fixed at -1.0 / rad) ===")
    print(f"Cm0     = {Cm0:.6f}")
    print(f"Cm_alpha= {Cm_alpha:.6f} per rad")
    print(f"Cm_de   = {Cm_de:.6f} per rad")


if __name__ == "__main__":
    main()
