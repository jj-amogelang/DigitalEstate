# CoG Simplified Control Panel
## From 7 Sliders to 3 Presets + Optional Advanced Mode

**Version:** 1.0  
**Date:** April 27, 2026  
**Goal:** Decision fatigue ↓, user clarity ↑, functionality preserved

---

## Current State (The Problem)

**Current UI Complexity:**
```
Investment Gravity Map
━━━━━━━━━━━━━━━━━━━━━

[Preset Buttons - Multiple Options Visible]
🎯 Yield Hunter    📈 Capital Growth    ⚖️ Balanced    🛡️ Low Risk    🏗️ Development

[Weight Sliders - All 7 Visible at Once]
Rental Yield        [━━●━━━━━] 30%
Vacancy Rate        [━━━━●━━━] 25%
Price per m²        [━━━●━━━━] 20%
Transit Proximity   [━━●━━━━━] 15%
Amenity Density     [━●━━━━━━] 10%
Crime Index         [━━●━━━━━] 15%
Planned Development [━━━●━━━━] 20%

[Zoning Filters]
☑️ Residential    ☑️ Commercial    ☑️ Industrial    ☐ Mixed    ☐ Retail

┌─────────────────────────────────┐
│ ▶ Solve    |    Reset    |    X │
└─────────────────────────────────┘
```

**Problems:**
- 5 preset buttons = "which one should I pick?"
- 7 sliders on load = cognitive overload
- Users don't know slider relationships (e.g., "high yield" conflicts with "low price")
- Zoning filters appear disconnected ("why am I choosing zones?")
- "Solve" button not prominent enough
- Advanced users can't quickly fine-tune

---

## New State: Simplified + Progressive Disclosure

### **Visual Redesign**

```
Investment Gravity Map — Discover the pull of opportunity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Choose your investment approach
────────────────────────────────────────

  🚀 Growth Potential          💎 Stable Returns          ⚖️ Balanced
  ───────────────────         ─────────────────         ──────────
  Higher prices later          Steady income now         Mix of both
  Property values rise         Low vacancy risk          Moderate everything
  but yields lower today       Lower capital gains        Most flexibility

[Selected: Balanced ✓]


Step 2: Focus on property types (optional)
──────────────────────────────────────────

☑️ Residential    ☑️ Commercial    ☑️ Industrial    ☐ Mixed    ☐ Retail

Zone filters change what type of property is considered, not which area is best.


                    ┌─────────────────────────────────┐
                    │  ▶ Show investment pull        │
                    └─────────────────────────────────┘

[Advanced: Customize weights ▼] [Hidden until clicked]
```

---

## The 3 Core Presets

### **Preset 1: Growth Potential**

**Icon:** 🚀  
**Position:** First (prominent)  
**For:** "I'm willing to lower income today for bigger price appreciation later"

**Short Description:**
```
Higher prices later
Property values rise; but yields lower today
```

**Full Description (Tooltip):**
```
This profile prioritises properties in growth corridors where capital 
appreciation may exceed rental income. Best for investors with:
- Long holding periods (5+ years)
- Ability to cover negative cash flow
- Appetite for development risk
- Belief in area transformation

Trade-offs:
+ Higher potential capital gains
+ Riding growth waves in emerging areas
- Lower rental yields now
- Exposed to development delays
- Requires patient capital
```

**Weight Configuration (Internally):**
```
Rental Yield:        10%  (low priority; income secondary)
Vacancy Rate:        10%  (okay with some vacancy)
Price per m²:        5%   (okay with high prices; growth matters more)
Transit Proximity:   15%  (access = future demand)
Amenity Density:     10%  (infrastructure signals development)
Crime Index:         15%  (safety correlates with formal development)
Planned Development: 35%  (🔴 PRIMARY: development projects signal growth)
```

---

### **Preset 2: Stable Returns**

**Icon:** 💎  
**Position:** Second (center)  
**For:** "I need income now, low vacancy, minimal downside risk"

**Short Description:**
```
Steady income now
Low vacancy risk; lower capital gains
```

**Full Description (Tooltip):**
```
This profile prioritises high-rental-yield, low-vacancy properties in 
established markets. Best for investors with:
- Focus on cash flow / dividend income
- Risk-averse mindset
- Shorter holding horizons (3–7 years)
- Tenant stability preference
- Lower tolerance for negative cash flow

Trade-offs:
+ Consistent rental income
+ Stable, lower-risk neighborhoods
+ Predictable cash flow
- Lower price appreciation potential
- Mature markets (slower growth)
- Less exciting returns
```

**Weight Configuration (Internally):**
```
Rental Yield:        35%  (🔴 PRIMARY: income focus)
Vacancy Rate:        25%  (🔴 PRIMARY: stability focus)
Price per m²:        10%  (buying at reasonable prices)
Transit Proximity:   10%  (tenant access matters)
Amenity Density:     10%  (convenience = tenant retention)
Crime Index:         5%   (less weight; may trade safety for yield)
Planned Development: 5%   (low priority; not seeking growth)
```

---

### **Preset 3: Balanced**

**Icon:** ⚖️  
**Position:** Third (right)  
**For:** "I want a mix of income and growth; let the algorithm decide"

**Short Description:**
```
Mix of both
Moderate everything; most flexibility
```

**Full Description (Tooltip):**
```
This profile balances income, stability, and growth. Best for investors who:
- Want flexibility (don't lock into one strategy)
- Have mixed portfolio goals
- Are newer to investing (safe starting point)
- Believe algorithm should optimize
- Want exposure to multiple success factors

Trade-offs:
+ Balanced across all metrics
+ Reduces bet-concentration risk
+ Works in most market conditions
+ Good for newcomers
- No single-factor dominance (may miss pure-play opportunities)
- Compromises between growth + income
```

**Weight Configuration (Internally):**
```
Rental Yield:        20%  (some income focus)
Vacancy Rate:        15%  (some stability focus)
Price per m²:        15%  (reasonable pricing)
Transit Proximity:   15%  (access matters)
Amenity Density:     10%  (convenience matters)
Crime Index:         10%  (safety matters)
Planned Development: 15%  (some growth focus)
```

---

## Advanced Mode: Manual Slider Control

### **Trigger:** "[Advanced: Customize weights ▼]" (toggle)

### **Label Copy:**
```
Advanced: Customize weights (optional)

Fine-tune the solver if you know what you're looking for.
Most investors use one of the three profiles above.
```

### **When Expanded:**

```
Custom Weight Configuration
───────────────────────────

Drag sliders to adjust. Total must = 100%.

[Slider Group]
Rental Yield              [━━●━━━━] 20%
Vacancy Rate              [━━━●━━━] 15%
Price per m²              [━━━●━━━] 15%
Transit Proximity         [━━━●━━━] 15%
Amenity Density           [━━●━━━━] 10%
Crime Index               [━━●━━━━] 10%
Planned Development       [━━¹━━━━] 15%

Total: 100% ✓

┌────────────────┐
│ Reset to Balanced │ [Apply Custom Weights]
└────────────────┘
```

### **Behaviors:**
- Advanced mode only shows if user clicks toggle
- Sliders persist user's last custom state
- "Reset to Balanced" button resets all sliders to Balanced preset
- Solving with custom weights changes the result immediately

---

## Zoning Filters: Clarity Addition

### **Current (Ambiguous):**
```
☑️ Residential    ☑️ Commercial    ☑️ Industrial    ☐ Mixed    ☐ Retail
```

### **New (Clear Intent):**
```
Property types to consider (optional)

☑️ Residential    ☑️ Commercial    ☑️ Industrial    ☐ Mixed    ☐ Retail

Zone filters change what type of property is considered, not which area is best.
```

### **Explanation Line Copy:**
```
"Zone filters change what type of property is considered, not which area is best."
```

### **Tooltip (on hover of info icon):**
```
Why zones matter:
- Residential: Single-family homes, apartments, townhouses
- Commercial: Offices, retail, warehouses
- Industrial: Factories, logistics, manufacturing
- Mixed-Use: Residential + commercial combined
- Retail: Shopping centers, restaurants, shops

Zones affect rental markets:
- Residential zones: stable, demographic-driven demand
- Commercial zones: office/retail churn = higher risk
- Industrial zones: logistics drives demand (if near ports/hubs)

Zones don't matter for area selection:
If you want to explore Sandton, the zone filter just narrows to 
residential vs. commercial vs. mixed within Sandton. The area 
research stays the same.
```

---

## Implementation: Component Structure

### **High-Level Layout**

```jsx
<div className="cog-simplified-panel">
  
  {/* Title */}
  <h2 className="cog-title">
    Investment Gravity Map — Discover the pull of opportunity
  </h2>
  
  {/* Step 1: Preset Selection */}
  <section className="cog-step">
    <h3 className="cog-step-title">Step 1: Choose your investment approach</h3>
    
    <div className="cog-preset-group">
      {/* Growth Preset */}
      <button 
        className={`cog-preset ${selectedPreset === 'growth' ? 'cog-preset--active' : ''}`}
        onClick={() => selectPreset('growth')}
      >
        <div className="preset-icon">🚀</div>
        <div className="preset-header">Growth Potential</div>
        <div className="preset-subtitle">Higher prices later<br/>Property values rise; yields lower today</div>
        <div className="preset-tooltip-trigger">?</div>
      </button>
      
      {/* Stable Preset */}
      <button 
        className={`cog-preset ${selectedPreset === 'stable' ? 'cog-preset--active' : ''}`}
        onClick={() => selectPreset('stable')}
      >
        <div className="preset-icon">💎</div>
        <div className="preset-header">Stable Returns</div>
        <div className="preset-subtitle">Steady income now<br/>Low vacancy risk; lower capital gains</div>
        <div className="preset-tooltip-trigger">?</div>
      </button>
      
      {/* Balanced Preset */}
      <button 
        className={`cog-preset ${selectedPreset === 'balanced' ? 'cog-preset--active' : ''}`}
        onClick={() => selectPreset('balanced')}
      >
        <div className="preset-icon">⚖️</div>
        <div className="preset-header">Balanced</div>
        <div className="preset-subtitle">Mix of both<br/>Moderate everything; most flexibility</div>
        <div className="preset-tooltip-trigger">?</div>
      </button>
    </div>
  </section>
  
  {/* Step 2: Zoning Filters */}
  <section className="cog-step">
    <h3 className="cog-step-title">
      Step 2: Focus on property types
      <span className="cog-step-badge">optional</span>
    </h3>
    
    <div className="cog-zoning-info">
      Zone filters change what type of property is considered, not which area is best.
      <button className="info-icon" aria-label="Learn more about zones">ⓘ</button>
    </div>
    
    <div className="cog-zoning-filters">
      {/* Zoning buttons */}
      {['Residential', 'Commercial', 'Industrial', 'Mixed', 'Retail'].map(zone => (
        <button key={zone}
          className={`cog-zoning-btn ${cog.zoning.includes(zone.toLowerCase()) ? 'cog-zoning-btn--active' : ''}`}
          onClick={() => toggleZoning(zone.toLowerCase())}
        >
          ☑️ {zone}
        </button>
      ))}
    </div>
  </section>
  
  {/* Primary Action: Solve Button */}
  <div className="cog-action-group">
    <button 
      className="cog-solve-button"
      onClick={() => cog.solve()}
      disabled={cog.loading || !cog.weightsValid}
    >
      {cog.loading 
        ? <>⏳ Analysing gravity…</> 
        : <>▶ Show investment pull</>}
    </button>
  </div>
  
  {/* Advanced Mode: Toggle */}
  <section className="cog-advanced">
    <button 
      className="cog-advanced-toggle"
      onClick={() => setAdvancedOpen(!advancedOpen)}
      aria-expanded={advancedOpen}
    >
      <span className="toggle-icon">{advancedOpen ? '▼' : '▶'}</span>
      Advanced: Customize weights <span className="badge-optional">optional</span>
    </button>
    
    {advancedOpen && (
      <div className="cog-advanced-content">
        <p className="cog-advanced-description">
          Fine-tune the solver if you know what you're looking for.
          Most investors use one of the three profiles above.
        </p>
        
        {/* Weight Sliders (shown only when Advanced is open) */}
        <div className="cog-sliders">
          {/* 7 sliders rendered here */}
          <CogWeightPanel
            weights={cog.weights}
            onWeightChange={handleWeightChange}
          />
        </div>
        
        <div className="cog-advanced-actions">
          <button className="btn-secondary" onClick={() => resetToBalanced()}>
            Reset to Balanced
          </button>
          <button className="btn-primary" onClick={() => apply CustomWeights()}>
            Apply Custom Weights
          </button>
        </div>
      </div>
    )}
  </section>
  
</div>
```

---

## CSS Styling

```css
/* ── Simplified CoG Panel ──────────────────────────────────── */

.cog-simplified-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
}

/* ── Title ─────────────────────────────────────────────────── */

.cog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0e1420;
  line-height: 1.3;
}

/* ── Steps ─────────────────────────────────────────────────── */

.cog-step {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cog-step-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cog-step-badge {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  margin-left: 8px;
}

/* ── Preset Buttons ────────────────────────────────────────── */

.cog-preset-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.cog-preset {
  position: relative;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.cog-preset:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.cog-preset--active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.preset-icon {
  font-size: 28px;
  line-height: 1;
}

.preset-header {
  font-size: 13px;
  font-weight: 700;
  color: #0e1420;
  line-height: 1.3;
}

.preset-subtitle {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

.preset-tooltip-trigger {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #cbd5e1;
  color: white;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.cog-preset:hover .preset-tooltip-trigger {
  opacity: 1;
}

/* ── Zoning Filters ────────────────────────────────────────── */

.cog-zoning-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #cbd5e1;
}

.info-icon {
  background: none;
  border: none;
  cursor: help;
  color: #0ea5e9;
  font-size: 14px;
  padding: 0;
  margin-left: 4px;
}

.cog-zoning-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cog-zoning-btn {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #334155;
}

.cog-zoning-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.cog-zoning-btn--active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #0c4a6e;
  font-weight: 600;
}

/* ── Action Button ────────────────────────────────────────── */

.cog-action-group {
  display: flex;
  gap: 12px;
}

.cog-solve-button {
  flex: 1;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.cog-solve-button:hover:not(:disabled) {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.cog-solve-button:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.6;
}

/* ── Advanced Mode ─────────────────────────────────────────── */

.cog-advanced {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
}

.cog-advanced-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: #0ea5e9;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s ease;
}

.cog-advanced-toggle:hover {
  color: #0284c7;
}

.toggle-icon {
  display: inline-flex;
  transition: transform 0.2s ease;
}

.cog-advanced-toggle[aria-expanded="true"] .toggle-icon {
  transform: rotate(180deg);
}

.badge-optional {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-left: 4px;
}

.cog-advanced-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 12px;
  padding: 14px;
  background: #f8fafc;
  border-radius: 6px;
}

.cog-advanced-description {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}

.cog-sliders {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cog-advanced-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-secondary,
.btn-primary {
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: white;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

/* ── Mobile Responsive ─────────────────────────────────────── */

@media (max-width: 768px) {
  .cog-preset-group {
    grid-template-columns: 1fr;
  }
  
  .cog-preset {
    padding: 12px;
    flex-direction: row;
    text-align: left;
    align-items: flex-start;
  }
  
  .preset-icon {
    font-size: 24px;
    flex-shrink: 0;
  }
  
  .cog-zoning-filters {
    flex-direction: column;
  }
  
  .cog-zoning-btn {
    width: 100%;
  }
}

/* ── Dark Mode ─────────────────────────────────────────────── */

@media (prefers-color-scheme: dark) {
  .cog-simplified-panel {
    background: #1e293b;
  }
  
  .cog-title {
    color: #f1f5f9;
  }
  
  .cog-step-title {
    color: #cbd5e1;
  }
  
  .preset-header {
    color: #f1f5f9;
  }
  
  .preset-subtitle {
    color: #94a3b8;
  }
  
  .cog-preset {
    background: #0f172a;
    border-color: #334155;
  }
  
  .cog-preset:hover {
    background: #1e293b;
    border-color: #475569;
  }
  
  .cog-preset--active {
    border-color: #0ea5e9;
    background: rgba(14, 165, 233, 0.1);
  }
  
  /* Additional dark mode styles for zoning, buttons, etc. */
}
```

---

## Tooltip Interactions

### **Preset Question Mark (?) Click = Tooltip Modal**

```jsx
<div className="preset-tooltip-modal">
  <div className="tooltip-header">
    <h4>Growth Potential</h4>
    <button className="tooltip-close" onClick={closeTooltip}>✕</button>
  </div>
  
  <div className="tooltip-body">
    <h5>Who this is for</h5>
    <p>
      Investors willing to lower income today for bigger price 
      appreciation later.
    </p>
    
    <h5>What it prioritises</h5>
    <ul>
      <li><strong>Primary:</strong> Planned development (35%)</li>
      <li>Transit proximity (15%)</li>
      <li>Crime index (15%)</li>
      <li>Amenity density (10%)</li>
    </ul>
    
    <h5>Trade-offs</h5>
    <div className="trade-off trade-off--positive">
      <span className="trade-off-icon">+</span>
      <span>Higher potential capital gains</span>
    </div>
    <div className="trade-off trade-off--positive">
      <span className="trade-off-icon">+</span>
      <span>Riding growth waves in emerging areas</span>
    </div>
    <div className="trade-off trade-off--negative">
      <span className="trade-off-icon">−</span>
      <span>Lower rental yields now</span>
    </div>
    <div className="trade-off trade-off--negative">
      <span className="trade-off-icon">−</span>
      <span>Exposed to development delays</span>
    </div>
    <div className="trade-off trade-off--negative">
      <span className="trade-off-icon">−</span>
      <span>Requires patient capital</span>
    </div>
    
    <h5>Ideal holding period</h5>
    <p>5+ years (long-term play)</p>
  </div>
</div>
```

---

## User Flows

### **Flow 1: New User (Fastest Path)**

```
1. Load CoG modal
2. See 3 presets: Growth | Stable | Balanced
3. Click "Balanced" (most neutral)
4. See zones: Residential ✓ Commercial ✓ Industrial ✓
5. Click "Show investment pull"
6. See results in 2 seconds
7. Done in ~30 seconds
```

### **Flow 2: Power User (Customization)**

```
1. Load CoG modal
2. See 3 presets
3. Don't see what I want; click "[Advanced ▼]"
4. Sliders appear
5. Drag sliders to custom: 40% yield, 30% price, etc.
6. Click "Apply Custom Weights"
7. Click "Show investment pull"
8. Custom results in 2 seconds
```

### **Flow 3: Curious User (Learning)**

```
1. Load CoG modal
2. See 3 presets
3. Click "?" next to Growth Potential
4. Tooltip modal appears
5. Read: "35% planned development focus" + trade-offs
6. Think: "Oh, this is for growth-at-any-cost investors"
7. Close tooltip, select Stable instead
8. Click "Show investment pull"
```

---

## Copy: Finalized Messaging

### **Preset Buttons**

| Element | Copy |
|---------|------|
| **Button 1 Header** | Growth Potential |
| **Button 1 Subtitle** | Higher prices later<br/>Property values rise; yields lower today |
| **Button 2 Header** | Stable Returns |
| **Button 2 Subtitle** | Steady income now<br/>Low vacancy risk; lower capital gains |
| **Button 3 Header** | Balanced |
| **Button 3 Subtitle** | Mix of both<br/>Moderate everything; most flexibility |

### **Zoning Section**

| Element | Copy |
|---------|------|
| **Section Title** | Step 2: Focus on property types |
| **Badge** | optional |
| **Info Line** | Zone filters change what type of property is considered, not which area is best. |
| **Info Tooltip** | [See section above] |

### **Advanced Toggle**

| Element | Copy |
|---------|------|
| **Label** | Advanced: Customize weights |
| **Badge** | optional |
| **Description** | Fine-tune the solver if you know what you're looking for.<br/>Most investors use one of the three profiles above. |

### **Main Action**

| Element | Copy |
|---------|------|
| **Normal** | ▶ Show investment pull |
| **Loading** | ⏳ Analysing gravity… |
| **Disabled** | [Grayed, cursor: not-allowed] |

---

## Migration: Old → New

### **Things That Disappear from View (But Remain Functional)**

- 5 preset buttons → 3 preset buttons visible
- 7 weight sliders → hidden behind Advanced toggle
- "Solve" button label → "Show investment pull"
- "Ready to solve" status → integrated into flow

### **Things Added**

- Step numbering ("Step 1" / "Step 2")
- Preset tooltips (? icons)
- Zoning explanation line
- Advanced toggle (collapsed by default)
- Title + narrative framing

### **Things Unchanged**

- Solver engine (same k-NN algorithm)
- Weight values (internally, presets still use their configured weights)
- Zone filtering logic (same filtering, just better explained)
- CoG result display (same map + rankings)

---

## Testing Checklist

### **Usability Testing**
- [ ] New user can select a preset in <5 seconds without guidance
- [ ] User understands why Balanced is the default
- [ ] User can explain the difference between Growth + Stable in own words
- [ ] Zoning explanation line makes sense (compare to control group)
- [ ] User eventually discovers Advanced mode (not hidden too well)
- [ ] Time-to-solve reduced by 50% vs. old interface

### **Content Testing**
- [ ] Preset descriptions are jargon-free
- [ ] Trade-off language is honest (not hype-driven)
- [ ] Zone explanation line is 1 line (not 2 lines)
- [ ] No decimal precision in descriptions
- [ ] South African phrasing lands (growth corridors, capital gains, etc.)

### **Functional Testing**
- [ ] Selecting a preset updates weights internally
- [ ] Advanced sliders show correct values for selected preset
- [ ] Toggling zones filters results correctly
- [ ] "Show investment pull" button triggers solve
- [ ] Results display is unchanged from current version

### **Accessibility Testing**
- [ ] Preset buttons are keyboard-accessible (Tab + Enter)
- [ ] Tooltip modals have tab order + close button
- [ ] ARIA labels: `aria-expanded` on Advanced toggle
- [ ] Screen reader announces "optional" badges
- [ ] Color blind users can distinguish selected preset (not just color)

### **Mobile Testing**
- [ ] Presets stack to 1 column on mobile
- [ ] Zoning buttons stack to 1 column on mobile
- [ ] Preset tooltips don't overflow viewport
- [ ] "Show investment pull" button full-width on mobile

---

## Before vs. After (Visual Comparison)

### **BEFORE: Daunting Control Panel**

```
💡 Investment Gravity Solver

[5 Preset Chips in a Row]
🎯 Yield Hunter  📈 Capital Growth  ⚖️ Balanced  🛡️ Low Risk  🏗️ Dev Focus

[ALL 7 SLIDERS VISIBLE IMMEDIATELY]
Rental Yield        [━━●━━━━━] 30%      [?]
Vacancy Rate        [━●━━━━━━] 25%      [?]
Price per m²        [━━●━━━━]  20%      [?]
Transit Proximity   [━━━●━━━] 15%       [?]
Amenity Density     [━●━━━━━] 10%       [?]
Crime Index         [━━●━━━━] 15%       [?]
Dev Activity        [━━━●━━━] 20%       [?]

[Zoning buttons with no explanation]
☑️ Residential  ☑️ Commercial  ☑️ Industrial  ☐ Mixed  ☐ Retail

[Small Solve button, not prominent]
Solve  |  Reset Weights  |  Close

Status: < Weights invalid >
```

**Problems visible:**
- User paralyzed (7 sliders, 5 presets, "where do I start?")
- Presets ignored (sliders draw all attention)
- No explanation of zone interaction
- Solve button is afterthought
- Looks like technical panel, not investor tool

---

### **AFTER: Clear, Progressive Disclosure**

```
Investment Gravity Map — Discover the pull of opportunity

┌────────────────────────────────────────────────────────────────┐
│ Step 1: Choose your investment approach                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ 🚀 Growth        │  │ 💎 Stable        │  │ ⚖️ Balanced  │ │
│  │ Potential        │  │ Returns          │  │              │ │
│  │ Higher prices    │  │ Steady income    │  │ Mix of both  │ │
│  │ later; yields    │  │ now; lower       │  │ Moderate    │ │
│  │ lower today      │  │ capital gains    │  │ everything; │ │
│  │ ? │ ? │ ?        │  │                  │  │ most flex   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                         ✓ Selected                             │
└────────────────────────────────────────────────────────────────┘

Step 2: Focus on property types (optional)

Zone filters change what type of property is considered, not which 
area is best. ⓘ

☑️ Residential   ☑️ Commercial   ☑️ Industrial   ☐ Mixed   ☐ Retail

                    ┌──────────────────────────┐
                    │  ▶ Show investment pull  │
                    └──────────────────────────┘

[Advanced: Customize weights ▼]            optional
```

**Wins:**
- Clear 3-step flow (choose → filter → solve)
- Default selected (Balanced)
- Sliders hidden (not intimidating)
- Zone intent explained (1 line)
- Solve button prominent
- Optional badge signals this is progressive disclosure

---

## FAQ

### Q: Won't removing 5 presets frustrate power users?
**A:** Power users go to Advanced mode. They still get all 7 sliders + full control. But 90% of first-time users don't need Development Flow Focus vs. Low Risk; they need "growth" or "income."

### Q: What if someone wants both "high yield" AND "high growth"?
**A:** That's a custom weights scenario. They open Advanced → drag Rental Yield + Planned Development → click Apply. They still get exactly what they want.

### Q: Why Advanced mode is collapsed by default?
**A:** Cognitive load. 90% of users will never use it. If it's visible, they'll feel obligated to understand it. Hidden = "this is optional; come back if you need it."

### Q: Does this change the solver results?
**A:** No. Internally, presets still carry the same weights. Only the UX is simplified. A user selecting "Balanced" will see identical results to today's version.

### Q: How do I explain zones to a confused user?
**A:** Send them to the tooltip. It says: "Zone filters change what type of property is considered, not which area is best." Zones are about narrowing property *types* within an area, not choosing a better *area*.

### Q: Can we test which preset is most popular?
**A:** Yes. Track clicks on each preset button. Analytics will show if Growth > Stable > Balanced or vice versa. Use data to refine presets in next iteration.

---

## Rollout Plan

### **Week 1: Internal Testing**
- [ ] Dev team builds new UI
- [ ] QA tests on 3 browsers + mobile
- [ ] Product reviews copy
- [ ] Run accessibility audit

### **Week 2: Beta (10% of users)**
- [ ] Feature flag: enable new interface for 10% cohort
- [ ] Monitor: session time, solve rate, errors
- [ ] Gather: user interviews (5–10 beta users)
- [ ] Adjust: if needed

### **Week 3: Full Rollout (100%)**
- [ ] Remove feature flag
- [ ] Announce to user base (blog post, email)
- [ ] Monitor: performance, support tickets
- [ ] Iterate based on feedback

---

## Success Metrics

| Metric | Current | Target | +Timeline |
|--------|---------|--------|-----------|
| **Time to first solve** | 45 sec | 20 sec | Faster, less clicked steps |
| **Users selecting a preset** | 30% | 70% | Presets now prominent |
| **Advanced mode adoption** | N/A (didn't exist) | 15% | Power users find it |
| **Support tickets re: "too many options"** | 12/month | 3/month | Clarity wins |
| **CoG solve success rate** | 85% | 92% | Fewer invalid weight configs |

