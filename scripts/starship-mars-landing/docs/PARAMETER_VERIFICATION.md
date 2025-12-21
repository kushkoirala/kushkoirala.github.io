# Mars Lander Parameter Verification

## Source of Truth: `public/Mars Lander.pdf`

### Parameters Extracted from PDF (Page 15-16, MATLAB code section)

```matlab
% Martian Gravity (m/s^2)  
g = [-3.711400; 0; 0];

% Simulation Data  
m_wet = 1905;  % Initial mass(kg)  
m_dry = 1505;  %(kg)  
alpha = 4.53e-4;% Fuel constant (s/m)  
rho_1 = 4972;   % Minimum thrust  
rho_2 = 13260;  % Maximum thrust  
r0 = [1500; 500; 2000];     % Position in meters  
v0 = [ -75; 0; 100];         % Velocity in m/s  
rf = [0; 0; 0]; % Terminal position             
vf = [0; 0; 0]; % Terminal velocity             

% Final Time guess  
tf_guess = 200;   % Terminal time guess  
N = 70;           % Discretization point  
```

### Glide Slope Constraint (Page 11, Section C)

**PDF states:** Υ = 4° (gamma = 4 degrees)

Constraint formulation:
```
||S[r(t)-r(tf)]|| - c^T[r(t)-r(tf)] <= 0
Where S = [0 1 0; 0 0 1], c = e1 * tan(Υ), Υ = 4°
```

This translates to: `tan(4°) * ||lateral|| <= vertical`

### Terminal Conditions

**PDF specifies:** `rf = [0; 0; 0]` - **Surface landing** (not 1 m above)

This means the lander should touch down at the surface, not hover 1 m above it.

### Parameters NOT in PDF

1. **Thrust Tilt Constraint (20°)**: NOT mentioned in PDF
   - Current implementation includes this constraint
   - May be an additional safety constraint, not part of original problem

2. **Terminal Altitude = 1.0 m**: NOT in PDF
   - PDF shows `rf = [0; 0; 0]` which means surface landing
   - Current implementation uses 1.0 m, which violates PDF specification

### Changes Made to Match PDF

1. ✅ **N = 70** (was 60) - matches PDF discretization
2. ✅ **terminal_altitude = 0.0** (was 1.0) - matches PDF: rf = [0; 0; 0]
3. ✅ **min_altitude = 0.0** (was 1.0) - allows surface landing
4. ✅ **gamma = 4.0°** - confirmed from PDF
5. ⚠️ **Thrust tilt constraint** - kept but noted as not in PDF

### Verification Status

| Parameter | PDF Value | Current Value | Status |
|-----------|-----------|---------------|--------|
| g_mars | [-3.7114, 0, 0] | [-3.7114, 0, 0] | ✅ Match |
| m_wet | 1905 kg | 1905 kg | ✅ Match |
| m_dry | 1505 kg | 1505 kg | ✅ Match |
| alpha | 4.53e-4 | 4.53e-4 | ✅ Match |
| rho_1 | 4972 N | 4972 N | ✅ Match |
| rho_2 | 13260 N | 13260 N | ✅ Match |
| r0 | [1500, 500, 2000] m | [1500, 500, 2000] m | ✅ Match |
| v0 | [-75, 0, 100] m/s | [-75, 0, 100] m/s | ✅ Match |
| rf | [0, 0, 0] m | [0, 0, 0] m | ✅ Match |
| vf | [0, 0, 0] m/s | [0, 0, 0] m/s | ✅ Match |
| N | 70 | 70 | ✅ Fixed |
| gamma | 4° | 4° | ✅ Match |
| terminal_altitude | 0.0 m | 0.0 m | ✅ Fixed |
| tilt_max | N/A | 20° | ⚠️ Not in PDF |

### Impact of Changes

1. **Terminal altitude = 0.0**: This is a significant change - the solver must now achieve true surface landing, not hover at 1 m. This may make the problem harder but is correct per PDF.

2. **N = 70**: More discretization points should improve solution accuracy.

3. **Thrust tilt**: If this constraint is not in the problem statement, removing it might make the problem easier to solve, but keeping it adds realism.

### Next Steps

1. Re-run solver with corrected parameters
2. Verify trajectory achieves true surface landing (r[0] = 0)
3. Check if removing thrust tilt constraint improves feasibility
4. Compare results with PDF figures/results


