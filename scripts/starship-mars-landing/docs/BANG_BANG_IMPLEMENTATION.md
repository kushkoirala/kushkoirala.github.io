# Bang-Bang Control Implementation Guide

## Why Bang-Bang is Optimal

**From PDF (lines 200-201):**
> "Since the thrusts are bounded between two values (Min and Max), and the final cost is only depended on the final mass and not thrust, we can conclude that a **bang-bang control is the optimal control**."

**Key Insight:**
- Cost function: `J = -m(tf)` (maximize final mass = minimize fuel)
- Cost doesn't depend on thrust magnitude, only final mass
- Thrust is bounded: `rho_1 <= ||T|| <= rho_2`
- **Result:** Optimal control switches between bounds (bang-bang)

---

## Current Implementation Analysis

**Current SOCP Solution:**
- ✗ **NOT bang-bang** - 62.9% of points have intermediate thrust values
- ✗ Maximum deviation: 3958 N (47.76% of thrust range)
- ✗ Average deviation: 557 N from nearest bound
- ✓ Has 3 switching points, but thrust varies continuously between them

**Why SOCP gives continuous solution:**
- SOCP optimizes over continuous variables
- No constraint forcing bang-bang structure
- Smooth profiles are easier for solver to find
- But **not theoretically optimal** per PDF

---

## Implementation Approaches

### Method 1: Indirect Method (True Bang-Bang)

**Principle:** Use Pontryagin's Maximum Principle

**Steps:**
1. **Define Hamiltonian:**
   ```
   H = λ_r^T v + λ_v^T (g + T/m) - α λ_m ||T||
   ```

2. **Costate Equations (backward integration):**
   ```
   λ_r_dot = -∂H/∂r = 0  (for this problem)
   λ_v_dot = -∂H/∂v = -λ_r
   λ_m_dot = -∂H/∂m = λ_v^T T / m^2
   ```

3. **Terminal Conditions (from PDF lines 391-397):**
   ```
   λ_r(tf) = 0
   λ_v(tf) = 0
   λ_m(tf) = -1
   ```

4. **Switching Condition (PDF lines 212-230):**
   ```
   ∂H/∂T = λ_v/m - (α λ_m) T/||T||
   
   If ∂H/∂T > 0: Use rho_1 (min thrust)
   If ∂H/∂T < 0: Use rho_2 (max thrust)
   ```

5. **Implementation:**
   - Integrate costates backward from terminal conditions
   - Find switching times where ∂H/∂T changes sign
   - Forward simulate with bang-bang thrust

**Pros:**
- ✓ Theoretically optimal
- ✓ True bang-bang control
- ✓ Matches PDF theory

**Cons:**
- ✗ Complex: requires backward integration
- ✗ Need to solve two-point boundary value problem
- ✗ Switching times must be found iteratively

---

### Method 2: Direct Method with Bang-Bang Constraint

**Principle:** Modify SOCP to enforce bang-bang structure

**Approach:**
1. **Binary Variables:**
   ```python
   # Add binary variables for each time step
   b = cp.Variable(N, boolean=True)  # 1 = max thrust, 0 = min thrust
   
   # Enforce bang-bang
   thrust = b * rho_2 + (1 - b) * rho_1
   ```

2. **Mixed-Integer SOCP (MISOCP):**
   - Requires MIP solver (e.g., Gurobi, CPLEX)
   - More complex than continuous SOCP
   - Guarantees bang-bang structure

**Pros:**
- ✓ Guarantees bang-bang
- ✓ Can use existing SOCP framework
- ✓ Solver handles switching logic

**Cons:**
- ✗ Requires MIP solver (not free)
- ✗ Much slower than continuous SOCP
- ✗ May not converge

---

### Method 3: Post-Process SOCP Solution (Hybrid)

**Principle:** Use SOCP to find trajectory, then enforce bang-bang

**Steps:**
1. Solve with continuous SOCP (current approach)
2. Extract switching structure from solution
3. Round thrust to nearest bound: `rho_1` or `rho_2`
4. Re-simulate with bang-bang thrust
5. Optimize switching times if needed

**Implementation:**
```python
# Round to nearest bound
midpoint = (rho_1 + rho_2) / 2
thrust_bb = np.where(thrust > midpoint, rho_2, rho_1)

# Find switching times
switches = np.where(np.diff(thrust_bb) != 0)[0]
switching_times = t[switches]

# Re-simulate with bang-bang
traj_bb = simulate_bang_bang(switching_times)
```

**Pros:**
- ✓ Practical and fast
- ✓ Uses existing SOCP solution
- ✓ Easy to implement
- ✓ Good starting point

**Cons:**
- ✗ May not be truly optimal
- ✗ Terminal conditions may not be satisfied exactly
- ✗ Need to validate/refine switching times

---

### Method 4: Parameter Optimization (PDF Approach)

**Principle:** Parameterize switching times, optimize directly

**From PDF (lines 235-259):**
- Use direct method with parameter optimization
- Parameterize switching times
- Optimize switching times to minimize fuel

**Implementation:**
```python
def objective(switching_times):
    """Objective: minimize fuel consumption"""
    traj = simulate_bang_bang(switching_times)
    fuel = m_wet - traj['m'][-1]
    
    # Add penalty for constraint violations
    pos_error = np.linalg.norm(traj['r'][:, -1] - rf)
    vel_error = np.linalg.norm(traj['v'][:, -1] - vf)
    
    return fuel + penalty * (pos_error + vel_error)

# Optimize switching times
result = minimize(objective, initial_switching_times)
```

**Pros:**
- ✓ Matches PDF approach
- ✓ Guarantees bang-bang
- ✓ Can use standard optimizers

**Cons:**
- ✗ Need good initial guess for switching times
- ✗ May have multiple local minima
- ✗ Requires forward simulation at each iteration

---

## Recommended Implementation Strategy

### Phase 1: Quick Implementation (Hybrid)
1. Use current SOCP solution
2. Post-process to bang-bang (Method 3)
3. Validate terminal conditions
4. If close enough, use this

### Phase 2: Refinement (Parameter Optimization)
1. Extract switching times from Phase 1
2. Use as initial guess for Method 4
3. Optimize switching times
4. Validate constraints

### Phase 3: True Optimal (Indirect Method)
1. Implement costate backward integration
2. Solve two-point boundary value problem
3. Find optimal switching times
4. Most complex but theoretically correct

---

## Code Structure

### Bang-Bang Controller Class

```python
class BangBangController:
    def __init__(self, lander):
        self.lander = lander
        
    def compute_switching_function(self, lambda_v, lambda_m, m, T_dir):
        """Compute ∂H/∂T for switching condition"""
        return np.dot(lambda_v, T_dir) / m - self.alpha * lambda_m
    
    def get_thrust(self, t, switching_times, initial_max=True):
        """Get bang-bang thrust magnitude"""
        switches_before = np.sum(switching_times <= t)
        use_max = (switches_before % 2 == 0) if initial_max else (switches_before % 2 == 1)
        return self.lander.rho_2 if use_max else self.lander.rho_1
    
    def integrate_costates_backward(self, tf, final_mass):
        """Integrate costate equations backward"""
        # Terminal conditions
        lambda_r_tf = np.zeros(3)
        lambda_v_tf = np.zeros(3)
        lambda_m_tf = -1.0
        
        # Backward integration
        # ... implementation ...
        
    def find_optimal_switching_times(self):
        """Find optimal switching times"""
        # Use costate integration or parameter optimization
        # ... implementation ...
```

---

## Comparison: Current vs Bang-Bang

| Aspect | Current (SOCP) | Bang-Bang (Optimal) |
|--------|----------------|---------------------|
| **Theoretical Optimality** | ✗ Not optimal | ✓ Optimal (per PDF) |
| **Thrust Values** | Continuous | Only rho_1 or rho_2 |
| **Implementation Complexity** | Low | High |
| **Solver Requirements** | SOCP solver | MIP or custom |
| **Fuel Efficiency** | Good | Optimal |
| **Practical Use** | ✓ Easy | ⚠️ More complex |

---

## Next Steps

1. **Immediate:** Implement Method 3 (post-process SOCP)
2. **Short-term:** Implement Method 4 (parameter optimization)
3. **Long-term:** Implement Method 1 (indirect method with costates)

**Files Created:**
- `scripts/bang_bang_control.py` - Framework and explanation
- `scripts/implement_bang_bang.py` - Post-processing implementation
- `scripts/analyze_thrust_profile.py` - Analysis of current solution
- `scripts/BANG_BANG_IMPLEMENTATION.md` - This guide

---

## Conclusion

**Yes, it should be bang-bang!** The PDF clearly states this is optimal. The current SOCP implementation gives a continuous solution which is:
- ✓ Practical and implementable
- ✗ Not theoretically optimal
- ✗ Uses more fuel than necessary

**Recommendation:** Implement bang-bang control using the hybrid approach (Method 3) first, then refine with parameter optimization (Method 4) for true optimality.


