# Centre of Gravity → Investment Gravity Map
## Language & Framing Refactoring Guide

**Version:** 1.0  
**Date:** April 27, 2026  
**Scope:** Copy + UI labels only (no backend logic changes)  
**Tone:** Calm, analytical, investor-grade, South Africa-appropriate

---

## Terminology Map

| Old | New | Context |
|-----|-----|---------|
| Centre of Gravity Solver | Investment Gravity Map | Feature name |
| Centre of Gravity | Investment Gravity Map | General references |
| "Solve" | "Show investment pull" | Primary action button |
| Run CoG / Running CoG | Analysing investment gravity | Loading states, status |
| "Ready to solve" | "Ready to analyse" | Status indicators |

---

## UI Component Changes

### 1. **CentreOfGravity.jsx** — Main Modal
**File:** `frontend/src/components/CentreOfGravity.jsx`

#### Change 1.1: Modal Title / Header
**Location:** Line ~110 (modal header area, not visible in current snippet but title prop)  
**Old:**
```jsx
// Likely appears in modal title or header  
// "Centre of Gravity"
```

**New:**
```jsx
// "Investment Gravity Map"
```

---

#### Change 1.2: Solve Button Label
**Location:** Line 265  
**Old:**
```jsx
{cog.loading
  ? <><span className="loading-spinner-small" style={{border:'2px solid rgba(0,0,0,0.12)',borderTopColor:'#c9a030'}}/> Solving…</>
  : <>&#x25B6; Solve</>}
```

**New:**
```jsx
{cog.loading
  ? <><span className="loading-spinner-small" style={{border:'2px solid rgba(0,0,0,0.12)',borderTopColor:'#c9a030'}}/> Analysing gravity…</>
  : <>&#x25B6; Show investment pull</>}
```

---

#### Change 1.3: Button Tooltip / Title Attribute
**Location:** Line 260  
**Old:**
```jsx
title={!cog.weightsValid ? 'Weights must sum to 100' : 'Run full 200-iteration solve'}
```

**New:**
```jsx
title={!cog.weightsValid ? 'Weights must sum to 100' : 'Analyse investment gravity across weighted metrics'}
```

---

#### Change 1.4: Status Indicator Chip
**Location:** Line ~272 (Status chip showing "Ready to solve")  
**Old:**
```jsx
<span className={`cog-intro-chip ${cog.weightsValid ? 'cog-intro-chip--ready' : 'cog-intro-chip--warn'}`}>
  {cog.weightsValid ? 'Ready to solve' : 'Adjust weights to 100%'}
</span>
```

**New:**
```jsx
<span className={`cog-intro-chip ${cog.weightsValid ? 'cog-intro-chip--ready' : 'cog-intro-chip--warn'}`}>
  {cog.weightsValid ? 'Ready to analyse' : 'Adjust weights to 100%'}
</span>
```

---

#### Change 1.5: Modal Model Chip Description
**Location:** Line ~271  
**Old:**
```jsx
<span className="cog-intro-chip">Model: k-NN geospatial optimizer</span>
```

**New:**
```jsx
<span className="cog-intro-chip">Model: Gravity-weighted location analysis</span>
```

---

### 2. **ExplorePage.jsx** — CoG Spotlight Section
**File:** `frontend/src/pages/ExplorePage.jsx`

#### Change 2.1: CTA Button Label
**Location:** Line 793  
**Old:**
```jsx
<button className="explore-cog-cta-btn" onClick={() => setCogOpen(true)}>
  Open Centre of Gravity
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</button>
```

**New:**
```jsx
<button className="explore-cog-cta-btn" onClick={() => setCogOpen(true)}>
  Open Investment Gravity Map
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</button>
```

---

#### Change 2.2: Spotlight Section Aria Label
**Location:** Line 766  
**Old:**
```jsx
<section className="explore-cog-spotlight" aria-label="Centre of Gravity assistant">
```

**New:**
```jsx
<section className="explore-cog-spotlight" aria-label="Investment Gravity Map assistant">
```

---

#### Change 2.3: Heading
**Location:** Line 780  
**Old:**
```jsx
<h3 className="explore-cog-spotlight-heading">Need direction before choosing an area?</h3>
```

**New:** (Keep as-is — this is still contextually appropriate)
```jsx
<h3 className="explore-cog-spotlight-heading">Need direction before choosing an area?</h3>
```

---

#### Change 2.4: **CRITICAL** — Spotlight Description (Main Copy Overhaul)
**Location:** Line 783–784  
**Old:**
```jsx
<p className="explore-cog-spotlight-sub">
  Centre of Gravity converts your investor priorities into an optimized location recommendation using local market, zoning, and feasibility signals.
</p>
```

**New:**
```jsx
<p className="explore-cog-spotlight-sub">
  Investment Gravity Map visualises your investment priorities across multiple market signals—rental yield, vacancy, price, amenities, crime, and development activity. It shows where the strongest pull of opportunity aligns with your criteria. This guides your research focus; it does not predict returns or guarantee outcomes.
</p>
```

---

#### Change 2.5: Spotlight Bullet Points
**Location:** Line 787–790  
**Old:**
```jsx
<div className="explore-cog-spotlight-points" aria-hidden="true">
  <span className="explore-cog-point">Profile-based weighting</span>
  <span className="explore-cog-point">Live map optimization</span>
  <span className="explore-cog-point">Feasibility diagnostics</span>
</div>
```

**New:**
```jsx
<div className="explore-cog-spotlight-points" aria-hidden="true">
  <span className="explore-cog-point">Customise your weighting</span>
  <span className="explore-cog-point">See real-time results on map</span>
  <span className="explore-cog-point">No models, no predictions</span>
</div>
```

**Rationale:** "Feasibility diagnostics" sounds technical; replaced with "No models, no predictions" to reinforce the core messaging point that this is a **research tool**, not a forecasting model.

---

### 3. **AboutPage.jsx** — Features Section
**File:** `frontend/src/pages/AboutPage.jsx`

#### Change 3.1: Feature Title
**Location:** Line 103  
**Old:**
```jsx
<h3>Centre of Gravity Optimization</h3>
```

**New:**
```jsx
<h3>Investment Gravity Map</h3>
```

---

#### Change 3.2: Feature Description
**Location:** Line 105–108  
**Old:**
```jsx
<p>
  Advanced k-NN solver identifies optimal parcels matching your investment 
  profile across multiple weighted metrics.
</p>
```

**New:**
```jsx
<p>
  Visualise where investment opportunity aligns with your priorities. Combine rental yield, vacancy stability, purchase price, transit access, amenities, safety, and development activity into a single weighted map. Focuses your research on the best-fit locations.
</p>
```

**Rationale:**
- Removes "k-NN solver" jargon (investors don't care about the algorithm)
- Replaces "optimal parcels" with "best-fit locations" (more human, less mathematical)
- Adds clarity: "focuses your research" (implies it's a guide, not a guarantee)
- Lists metrics in plain language order (not technical ordering)

---

#### Change 3.3: AboutPage Introduction Reference
**Location:** Line ~25 (if visible in the intro section)  
**Old:**
```jsx
and feasibility assessment. Using the Centre of Gravity optimization engine, we identify
```

**New:**
```jsx
and feasibility assessment. Using the Investment Gravity Map, we identify
```

---

### 4. **CogWeightPanel.jsx** — Optional Labeling
**File:** `frontend/src/components/CogWeightPanel.jsx`

#### Change 4.1: Panel Section Label (If Present)
**Location:** Line 95  
**Current:**
```jsx
<p className="cog-panel-section-label">Investment Weights</p>
```

**Suggested Enhancement (Optional):**
```jsx
<p className="cog-panel-section-label">Adjust your investment priorities</p>
```

**Rationale:** More human-friendly than "Investment Weights" or "Weight Configuration."

---

### 5. **InvestmentProfiles.jsx** — Preset Descriptions
**File:** `frontend/src/components/InvestmentProfiles.jsx` (if descriptions exist)

#### Change 5.1: Profile Tooltips (If Applicable)
**Example — Yield Hunter Profile**

**Old (if exists):**
```jsx
// "Maximise rental yield through optimised CoG selection"
```

**New:**
```jsx
// "Prioritises rental income potential. Focuses on high-yield markets."
```

**Pattern:** Remove "CoG" references; use plain investing language.

---

## Documentation Updates

### 6. **PLATFORM_DOCUMENTATION.md**

#### Change 6.1: Executive Summary (Line ~15)
**Old:**
```markdown
- **Optimizing investment location** using a sophisticated Centre of Gravity (CoG) solver...
```

**New:**
```markdown
- **Optimizing investment location** using the Investment Gravity Map...
```

---

#### Change 6.2: Core Features Section (Line ~102)
**Old:**
```markdown
### 2. **Centre of Gravity Solver** ⭐ Core Engine
```

**New:**
```markdown
### 2. **Investment Gravity Map** ⭐ Core Engine
```

---

#### Change 6.3: Feature Description Intro (Line ~107)
**Old:**
```markdown
- **Weight Selection** (7 metrics):
```

**New:** (Keep as-is; this is still applicable)

---

#### Change 6.4: Key Components Section (Line ~510)
**Old:**
```markdown
#### **CentreOfGravity.jsx** — Main CoG Modal
```

**New:**
```markdown
#### **CentreOfGravity.jsx** — Investment Gravity Map Modal
```

---

#### Change 6.5: Backend Services Section (Line ~535)
**Old:**
```markdown
#### **cog_solver.py** — Optimization Engine
```

**New:**
```markdown
#### **cog_solver.py** — Gravity Analysis Engine
```

---

#### Change 6.6: API Endpoint Description (Line ~560)
**Old:**
```markdown
#### **1. Centre of Gravity Solver**
```

**New:**
```markdown
#### **1. Investment Gravity Analysis**
```

---

#### Change 6.7: API Endpoint Path (Line ~566)
**Old:**
```
POST /api/cog/solve
```

**New:** (Keep path as-is for backend compatibility)
```
POST /api/cog/solve  [Endpoint path unchanged; doc label updated to "Investment Gravity Analysis"]
```

---

#### Change 6.8: What's Been Built Section (Line ~717)
**Old:**
```markdown
### Phase 3: Centre of Gravity Engine (Months 6–7)
✅ **Completed:**
- Multi-start k-NN discrete optimization solver
- Numba JIT acceleration for large parcel sets (~2x speedup)
- 7-metric weighting system (rental yield, vacancy, price, transit, amenities, crime, development)
- Investor profile presets (Yield Hunter, Capital Growth, Balanced, Low Risk, Development)
- Zone filtering (Residential, Commercial, Industrial, Mixed, Retail)
- CoG solver endpoint (`POST /api/cog/solve`)
```

**New:**
```markdown
### Phase 3: Investment Gravity Map Engine (Months 6–7)
✅ **Completed:**
- Multi-start k-NN discrete optimization engine (gravity analysis)
- Numba JIT acceleration for large parcel sets (~2x speedup)
- 7-metric weighting system (rental yield, vacancy, price, transit, amenities, crime, development)
- Investor profile presets (Yield Hunter, Capital Growth, Balanced, Low Risk, Development)
- Zone filtering (Residential, Commercial, Industrial, Mixed, Retail)
- Investment Gravity Analysis endpoint (`POST /api/cog/solve`)
```

---

#### Change 6.9: Recent Enhancements Title (Line ~776)
**Old:**
```markdown
### April 2026: Zoning-Differentiated Visualization
```

**New:** (Keep as-is; this is still contextually accurate)

---

#### Change 6.10: Roadmap Section (Line ~871)
**Old (if appears):**
```markdown
### Phase 7: Enhanced CoG Results (Q2 2026)
```

**New:**
```markdown
### Phase 7: Enhanced Investment Gravity Results (Q2 2026)
```

---

## Copy Consistency Rules

### Naming Hierarchy
1. **Feature name:** "Investment Gravity Map" (always use this exact phrasing)
2. **Action verb:** "Show investment pull" (preferred), "Analyse investment gravity" (alternate)
3. **Modal title:** "Investment Gravity Map"
4. **Button label:** "Show investment pull"
5. **Loading state:** "Analysing gravity…"

### What NOT to Say
❌ "Run the CoG"  
❌ "Solve this area"  
❌ "Centre of Gravity"  
❌ "CoG solver"  
❌ "Optimize parcels"  

### What TO Say
✅ "Show investment pull"  
✅ "Analyse investment gravity"  
✅ "Investment Gravity Map"  
✅ "Find the pull of opportunity"  
✅ "Research focus guide"  

---

## Disclaimer / Clarity Language

### When describing what the tool does:
**USE:**
> This shows you where the strongest pull of investment opportunity aligns with your criteria. It guides your research focus; it does not predict returns.

**AVOID:**
> This predicts the best investment.  
> This guarantees performance.  
> This optimizes your portfolio.

---

## Implementation Checklist

- [ ] CentreOfGravity.jsx: Update button label ("Solve" → "Show investment pull")
- [ ] CentreOfGravity.jsx: Update button tooltip
- [ ] CentreOfGravity.jsx: Update status chip ("Ready to solve" → "Ready to analyse")
- [ ] CentreOfGravity.jsx: Update model chip ("k-NN geospatial optimizer" → "Gravity-weighted location analysis")
- [ ] ExplorePage.jsx: Update CTA button ("Open Centre of Gravity" → "Open Investment Gravity Map")
- [ ] ExplorePage.jsx: Update aria-label
- [ ] ExplorePage.jsx: **Rewrite spotlight description** (most important copy change)
- [ ] ExplorePage.jsx: Update bullet points
- [ ] AboutPage.jsx: Update feature title
- [ ] AboutPage.jsx: Rewrite feature description
- [ ] AboutPage.jsx: Update intro reference
- [ ] PLATFORM_DOCUMENTATION.md: Global find-replace (12+ sections)
- [ ] Test all text rendering in light/dark modes
- [ ] Verify tooltips and ARIA labels read correctly
- [ ] QA: Check button spacing and line breaks after copy changes

---

## Rationale & Design Thinking

### Why "Investment Gravity Map"?
1. **Gravit** → Implies natural pull/attraction (less mathematical than "centre")
2. **Map** → Visual, spatial, accessible (less jargon than "solver")
3. **Investment** → Investor-focused terminology
4. **Compound name** → Single concept (not three words)

### Why "Show investment pull"?
1. **Show** → Action-oriented (not "Run," "Execute," "Solve")
2. **Investment pull** → Colloquial real estate terminology (investors understand "pull" = opportunity concentration)
3. **Active voice** → Clear what happens when clicked

### Why add the disclaimer?
1. **Legal protection** → Clarifies this is not a prediction model
2. **User trust** → Transparent about limitations
3. **South Africa context** → Complies with financial advice disclaimers (ongoing POPIA compliance)
4. **Investor confidence** → Shows intellectual honesty (not overpromising)

---

## Testing Checklist

**Accessibility:**
- [ ] Aria-labels make sense when screen reader reads them
- [ ] Button tooltips appear on hover
- [ ] No button text truncation on mobile

**Consistency:**
- [ ] All instances of old terminology replaced
- [ ] Tone consistent across all mentions
- [ ] Investor-grade language throughout

**Localization Future:**
- [ ] Copy structure allows for future i18n (no hardcoded phrases mixed with JSX)
- [ ] No colloquialisms that don't translate (OK: "pull"; AVOID: "vibe," "magic")

---

## Files Requiring Changes (Summary)

| File | Changes | Priority |
|------|---------|----------|
| `frontend/src/components/CentreOfGravity.jsx` | 5 (button, tooltip, status, model chip) | **HIGH** |
| `frontend/src/pages/ExplorePage.jsx` | 5 (label, aria, description, bullets) | **HIGH** |
| `frontend/src/pages/AboutPage.jsx` | 3 (title, description, intro) | **MEDIUM** |
| `PLATFORM_DOCUMENTATION.md` | 10+ (multi-section) | **MEDIUM** |
| `frontend/src/components/CogWeightPanel.jsx` | 1 (optional: panel label) | **LOW** |

**Total Estimated Time:** 30–45 min (implementation + testing)

