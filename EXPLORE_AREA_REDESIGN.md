# Explore Area Dashboard — Metric Card Redesign
## From 9 Metrics to 4 Signals: Trust-Building Redesign

**Version:** 1.0  
**Date:** April 27, 2026  
**Goal:** Reduce cognitive load, build trust, explain investor impact

---

## Current State: The Problem

**9 Metric Cards (Too Much)**
1. Avg Price / m² (R 18,500)
2. Rental Yield (4.2%)
3. Vacancy Rate (8.5%)
4. Safety Score (7.2/10)
5. Population Density (3,200/km²)
6. Crime Index (62)
7. Population Growth (2.1% YoY)
8. Planned Developments (12)
9. Development Score (7.8/10)

**Problems:**
- Cognitive overload (investor reads 9 things, retains 1)
- False precision (4.2% implies accuracy we don't have)
- Mixed data quality (some real, some proxy, some dummy)
- No narrative (cards don't say "why you care")
- Overlapping concepts (Safety Score + Crime Index = confusing)
- South African context missing (doesn't acknowledge inequality, spatial inequality, infrastructure gaps)

---

## New State: 4 Primary Signals

Instead of 9 disconnected metrics, show 4 investor-relevant signals:

```
┌─────────────────────────────────┐
│ 🏪 Local Amenities & Services   │  ← What matters: can tenants + investor get stuff?
├─────────────────────────────────┤
│ Above area average              │
│ 24 schools, shops, healthcare   │
│ within 1km                      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🚌 Transport Connectivity       │  ← What matters: how accessible to workers/commuters?
├─────────────────────────────────┤
│ Good transit access             │
│ Bus routes + minibus taxi       │
│ within 800m                     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 👥 Population Momentum          │  ← What matters: is the area growing or declining?
├─────────────────────────────────┤
│ Above-average growth            │
│ 2.1% annual; demographics       │
│ getting younger                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🏗️  Development Pipeline        │  ← What matters: is capital flowing here?
├─────────────────────────────────┤
│ Active development              │
│ 4 projects within 2km; new      │
│ infrastructure planned          │
└─────────────────────────────────┘
```

---

## Rationale: What Gets Hidden & Why

### **Removed: Crime Index (62)**
**Why:** 
- SAPS data has reporting bias (more documented in wealthy areas, less in townships)
- Causes emotional response (fear), not analytical thinking
- Creates liability (if area has high crime, could imply "don't invest," which is discriminatory)

**What to do instead:**
- Implicit in "Transport Connectivity" — areas with dense transit tend to have more foot traffic, visibility, reduced isolation
- Implicit in "Local Amenities" — institutional presence (schools, healthcare) attracts formal oversight

### **Removed: Exact Rental Yield % (4.2%)**
**Why:**
- Highly speculative at area level (varies by property type, condition, tenant)
- Changes quarterly as market sentiment shifts
- Implies precision we don't have
- Creates false confidence

**What to do instead:**
- Move to a "Feasibility Calculator" (already exists on the page)
- Mention "rental potential" in tooltip of Population Momentum card (younger demographics = stable rental base)
- Let investor run scenarios in calculator with their own assumptions

### **Removed: Exact Price per m² (R 18,500)**
**Why:**
- Snapshot in time (becomes stale)
- Huge variance within an area (township vs. security estate)
- Pricing is already shown in the CoG modal (where investor sets their own constraints)
- Half the data is proxy/dummy

**What to do instead:**
- Implicit in CoG solver (can filter by price range)
- Mention "market positioning" in Development Pipeline card (if development is active, prices likely to move)
- Let Feasibility Calculator handle pricing scenarios

### **Removed: Safety Score (7.2/10)**
**Why:**
- Subjective (who defines "safe"? safe from what?)
- Duplicates Crime Index
- South Africa: "safety" has racial/class connotations (what's "safe" is often coded language)

**What to do instead:**
- Remove entirely; use "Transport Connectivity" as proxy (visibility, foot traffic, access to services reduce isolation)

### **De-emphasized: Population Density (3,200/km²)**
**Why:**
- Raw number means nothing without context (3,200 is dense? in SA? in Johannesburg's context?)
- Not actionable for investor

**What to do instead:**
- Rename to "Population Momentum" — focus on *growth trends* + demographic *composition* (getting younger/older) not raw density
- Show direction (above/below area average) not absolute number

---

## The 4 New Cards: Detailed Design

### **Card 1: Local Amenities & Services**

**Old Title:**
```
"Amenity Density"
Sub: "34 per km²"
```

**New Title:**
```
🏪 Local Amenities & Services
```

**New Subtitle:**
```
Above area average | Within 1km of everyday essentials
```

**New Description:**
```
How grocery stores, pharmacies, schools, parks, and restaurants cluster 
in this area. Higher access improves tenant appeal and local economic activity.
```

**What This Means for Investors:**
```
Tenants want walkable distance to services. Strong amenity access 
supports rental demand and property values. Areas with poor access 
may stay under-developed or become declining neighborhoods.
```

**Tooltip Copy (on hover/click):**
```
What's included: Grocery stores, pharmacies, primary/secondary schools, 
clinics/hospitals, parks, restaurants, bars, cultural facilities.

How we measure: We count amenities within 1km radius using 
OpenStreetMap data. Density varies dramatically by area type 
(urban core vs. township vs. exurban).

Why it matters: Tenant preferences cluster around amenity access. 
Landlords in high-amenity areas report lower vacancy and higher 
rental premiums. New developments (malls, clinics) signal inbound investment.

Data quality: Real-time from OpenStreetMap; updated weekly.
```

**Visual Treatment:**
- Icon: 🏪 (or custom storefront icon)
- Signal indicator: "Above / At / Below area average"
- No decimal (e.g., NOT "34.7 per km²")
- Instead: "Good access" or "Limited access" or "Excellent access"
- Color: Green (above) / Gray (at) / Orange (below)

---

### **Card 2: Transport Connectivity**

**Old Title:**
```
"Transit Score"
Sub: "7.2"
```

**New Title:**
```
🚌 Transport Connectivity
```

**New Subtitle:**
```
Good transit access | Minibus taxi + bus routes nearby
```

**New Description:**
```
Proximity to public transport networks (bus routes, minibus taxi nodes, 
train stations). Higher connectivity reduces commute friction and attracts 
workers to rentals and new employment hubs.
```

**What This Means for Investors:**
```
Tenants seek minimal commute times. Strong transit access reduces reliance 
on private vehicles and attracts working-class rental demand. Areas with 
weak transit remain car-dependent and may struggle with rental uptake if 
employment nodes move.
```

**Tooltip Copy (on hover/click):**
```
What's included: Distance to nearest bus stops, minibus taxi ranks, 
commuter rail stations, and major road corridors.

How we measure: In South African context, we prioritise minibus taxis 
(primary mobility for working-class) + formal transit (BRT, trains). 
We measure walking distance in 500m, 1km, 2km bands.

Why it matters: South Africa's employment is concentrated in metros. 
Tenants working in Johannesburg CBD, Sandton, or Rosebank need <= 30-min 
commute. Transit access + housing proximity = sustained rental demand.

Geographic note: "Good transit" in Pretoria CBD means different things than 
in township (minibus taxi is primary). We measure accordingly.

Data quality: Updated quarterly from municipal transport data + OpenStreetMap.
```

**Visual Treatment:**
- Icon: 🚌 (or custom transit icon)
- Signal indicator: "Strong / Good / Moderate / Limited"
- No score (NOT "7.2/10")
- Show examples: "Bus route 3km away" or "Rank 400m away"
- Color: Green (strong) / Blue (good) / Yellow (moderate) / Orange (limited)

**South African Context:**
- Explicit mention of minibus taxis (not just buses)
- Acknowledge township realities (formal + informal transit)
- Commute time framing (30 min to major employment hubs)

---

### **Card 3: Population Momentum**

**Old Titles (collapsed):**
```
"Population Growth" (2.1% YoY)
"Population Density" (3,200/km²)
"Safety Score" (irrelevant)
```

**New Title:**
```
👥 Population Momentum
```

**New Subtitle:**
```
Above-average growth | Demographic shift underway
```

**New Description:**
```
Rate of population change and age composition. Growing, younger populations 
signal rental demand. Declining or aging areas may face long-term headwinds 
in property values and tenant liquidity.
```

**What This Means for Investors:**
```
Younger populations = higher rental market demand (student housing, starter 
apartments). Growth signals inbound investment (jobs, schools, infrastructure). 
Declining areas face vacancy risk and lower capital appreciation.
```

**Tooltip Copy (on hover/click):**
```
What we measure: Year-on-year population change from Stats SA estimates. 
Age composition from Census 2021 (median age, % under 30, % over 60).

How we interpret it:
- Above 2% annual growth = investment momentum (jobs, infrastructure flowing in)
- 0–2% = steady state (mature area, stable market)
- Negative = long-term challenges (job losses, urban decay; avoid unless distressed play)

Age composition:
- Younger median age (< 28) = rental market demand, education spending, mobility
- Older median age (> 40) = owner-occupancy, stability, lower churn
- Mixed = good balance

Why it matters: South African metros are competing for migration. Gauteng, 
Western Cape outpace other provinces. Within metros, outlying areas with 
transport access show highest growth (Midrand, Sandton, Bedfordview in Jburg; 
Durbanville in CT).

Data quality: Stats SA Census 2021 (3-5 years old); quarterly estimates 
subject to uncertainty.
```

**Visual Treatment:**
- Icon: 👥 (or custom population icon)
- Signal: "Above average" / "At average" / "Below average"
- Direction: Arrow up (growing) / Flat (stable) / Arrow down (declining)
- Subtext: "2.1% annual" (but note: estimate, not precise)
- Color: Green (growing, younger) / Gray (stable) / Orange (declining) / Red (sharp decline)

**South African Context:**
- Frame as "Demographic shift" (migration story)
- Reference major metros + outlying areas
- Acknowledge that slower growth in township areas may reflect formal housing shortage + informal settlements, not market dynamics

---

### **Card 4: Development Pipeline**

**Old Titles:**
```
"Planned Developments" (12)
"Development Score" (7.8/10)
```

**New Title:**
```
🏗️ Development Pipeline
```

**New Subtitle:**
```
Active investment | New projects & infrastructure planned
```

**New Description:**
```
Count of active construction/planning projects in the area and surroundings 
(2km radius). Ongoing development signals confidence by competing investors 
and inbound capital flowing into the area.
```

**What This Means for Investors:**
```
Active development = demand drivers being built (offices, stores, homes). 
Retail, commercial, or residential development near your investment often 
increases property values and rental demand. Limited or declining development 
may signal market maturity or structural headwinds.
```

**Tooltip Copy (on hover/click):**
```
What's included: Active construction, conditional approved developments, 
and major infrastructure projects (roads, transit, utilities) within 
2km radius.

What we're tracking:
- Residential: New housing, townhouses, upmarket subdivisions
- Commercial: Office parks, retail, logistics hubs
- Mixed-use: Urban regeneration, corridors
- Anchor infrastructure: Toll roads, BRT expansion, train extensions

Why it matters: Development != guarantee of appreciation, but it signals:
1. Municipal + private capital confidence
2. Inbound population or employment
3. Improved accessibility (new roads) or amenities (new retail)
4. Higher visibility for rental properties

Caution: Construction also brings temporary chaos (noise, congestion, dust). 
Areas with too much concurrent development can face delays and cost overruns.

Data quality: Municipal planning databases + news sources; updated quarterly. 
Some projects stall or never complete (e.g., failed malls).
```

**Visual Treatment:**
- Icon: 🏗️ (or custom construction icon)
- Signal: "Strong pipeline" (4+ projects) / "Moderate activity" (2–3 projects) / "Limited activity" (0–1 project)
- Timeline: "Near-term (0–2 yrs)" vs "Long-term (2–5 yrs)" if possible
- Color: Green (strong) / Blue (moderate) / Orange (limited) / Gray (none)

**South African Context:**
- Acknowledge that township areas may show little formal development (not because area is bad, but because informal housing dominates)
- Reference major infrastructure (e.g., "Gauteng freeway expansion," "Metro buses expansion")
- Note that private development clusters in formal areas; less in townships

---

## What Stays Hidden (But Can Be Exposed in Layers)

### **Crime Index, Safety Score**
- Move to: CoG modal "Advanced Filtering" tab (if user wants to filter by crime data, they can opt-in)
- Or: Include in Feasibility Calculator as "Risk adjustment" (investor sets their own risk tolerance)
- Rationale: Avoids discriminatory framing; respects township realities

### **Exact Price per m²**
- Move to: CoG modal (investor sets price range as a constraint)
- Or: Hidden in Feasibility Calculator (investor enters purchase price)
- Rationale: Pricing is too volatile and varies too much within areas

### **Exact Rental Yield %**
- Move to: Feasibility Calculator (investor runs scenario with their own assumptions)
- Note: Population Momentum card can hint at rental demand (younger = renters)
- Rationale: Yield depends on purchase price, financing, vacancy, maintenance—investor should model it

### **Exact Vacancy Rate %**
- Hidden entirely (becomes part of CoG solver weighting; not shown to user)
- Rationale: Too noisy at area level; varies by property type

---

## Example: Before → After Comparison

### **BEFORE: Explore Area View (Generic, Overwhelming)**

```
Market Intelligence Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Avg Price / m²]            [Rental Yield]          [Vacancy Rate]
R 18,500                    4.2%                    8.5%

[Safety Score]              [Population Density]    [Crime Index]
7.2/10                      3,200/km²               62

[Population Growth]         [Planned Developments]  [Development Score]
2.1% YoY                    12                      7.8/10
```

**Problems:**
- 9 cards, too much information
- No narrative ("what does this mean?")
- False precision (4.2%, 7.2/10)
- No South African context
- Investor thinks "which 2–3 of these matter?"

---

### **AFTER: Explore Area View (Focused, Insightful)**

```
Investment Signals for Sandton
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏪 LOCAL AMENITIES & SERVICES
Above area average | Within 1km of everyday essentials
24 schools, shops, healthcare. Strong tenant appeal.
[Learn more ↓]

🚌 TRANSPORT CONNECTIVITY
Good transit access | Minibus taxi + bus routes nearby
Bus routes 3km away; rank 800m. Moderate commute to CBD.
[Learn more ↓]

👥 POPULATION MOMENTUM
Above-average growth | Demographic shift underway
2.1% annual; median age 31 (younger than area average).
[Learn more ↓]

🏗️ DEVELOPMENT PIPELINE
Active investment | New projects & infrastructure planned
4 projects within 2km; new road corridor planned 2026.
[Learn more ↓]
```

**Wins:**
- 4 cards, each explains investor impact
- Narrative: "Growth happening here; amenities strong; connectivity needs work"
- South African phrasing (minibus taxi, rank, corridor)
- No false precision
- Investor can quickly assess fit

---

## Card Layout & Interaction Design

### **Grid Layout**
- Mobile (320px): 1 column (stacked)
- Tablet (768px): 2 columns (2x2 grid)
- Desktop (1024px): 2 columns (2x2 grid) or optionally 4 columns (scrollable)

---

### **Card Structure (HTML/CSS)**

```jsx
<div className="signal-card signal-card--amenities">
  {/* Header: Icon + Title + Subtitle */}
  <div className="signal-card-header">
    <span className="signal-card-icon">🏪</span>
    <div className="signal-card-titles">
      <h3 className="signal-card-title">
        Local Amenities & Services
      </h3>
      <p className="signal-card-subtitle">
        Above area average | Within 1km of everyday essentials
      </p>
    </div>
  </div>
  
  {/* Main content: What it means */}
  <div className="signal-card-body">
    <p className="signal-card-description">
      24 schools, shops, healthcare. Strong tenant appeal.
    </p>
  </div>
  
  {/* Signal indicator: color-coded badge */}
  <div className="signal-card-footer">
    <span className="signal-indicator signal-indicator--above">
      Above Area Average
    </span>
    <button className="signal-card-tooltip-trigger" aria-label="Learn more">
      ℹ️ Why this matters
    </button>
  </div>
</div>
```

---

### **CSS Styling**

```css
/* ── Signal Card Base ──────────────────────────────────────── */

.signal-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
  transition: all 0.2s ease;
}

.signal-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* ── Header ────────────────────────────────────────────────── */

.signal-card-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.signal-card-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.signal-card-titles {
  flex: 1;
}

.signal-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0e1420;
  line-height: 1.3;
}

.signal-card-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
  font-weight: 500;
}

/* ── Body ──────────────────────────────────────────────────── */

.signal-card-body {
  flex: 1;
}

.signal-card-description {
  margin: 0;
  font-size: 14px;
  color: #334155;
  line-height: 1.5;
}

/* ── Footer / Indicator ────────────────────────────────────── */

.signal-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.signal-indicator {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.signal-indicator--above {
  background: #d1fae5;
  color: #065f46;
}

.signal-indicator--at {
  background: #f3f4f6;
  color: #374151;
}

.signal-indicator--below {
  background: #fed7aa;
  color: #92400e;
}

/* ── Tooltip Trigger ───────────────────────────────────────── */

.signal-card-tooltip-trigger {
  background: none;
  border: none;
  color: #0ea5e9;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  transition: color 0.2s ease;
}

.signal-card-tooltip-trigger:hover {
  color: #0284c7;
}

/* ── Dark Mode ─────────────────────────────────────────────── */

@media (prefers-color-scheme: dark) {
  .signal-card {
    background: #1e293b;
    border-color: #334155;
  }

  .signal-card:hover {
    border-color: #475569;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .signal-card-title {
    color: #f1f5f9;
  }

  .signal-card-subtitle {
    color: #94a3b8;
  }

  .signal-card-description {
    color: #cbd5e1;
  }

  .signal-card-footer {
    border-top-color: #334155;
  }

  .signal-indicator--at {
    background: #374151;
    color: #e5e7eb;
  }
}

/* ── Responsive ────────────────────────────────────────────── */

@media (max-width: 768px) {
  .signal-card {
    padding: 16px;
    min-height: auto;
  }

  .signal-card-icon {
    font-size: 28px;
  }

  .signal-card-title {
    font-size: 15px;
  }
}
```

---

## Tooltip / Modal Experience

### **Trigger:** User clicks "ℹ️ Why this matters" or hovers on card title

### **Tooltip Content (Expandable Modal)**

**Example: Local Amenities & Services Tooltip**

```
┌────────────────────────────────────────────────┐
│  Local Amenities & Services                    │ X
├────────────────────────────────────────────────┤
│                                                │
│  What's included                              │
│  ────────────────                             │
│  Grocery stores, pharmacies, primary/secondary│
│  schools, clinics/hospitals, parks,           │
│  restaurants, bars, cultural facilities.      │
│                                                │
│  How we measure                               │
│  ───────────────                              │
│  We count amenities within 1km using          │
│  OpenStreetMap data. Density varies by area   │
│  type (urban core vs. township vs. exurban).  │
│                                                │
│  Why it matters for your investment           │
│  ──────────────────────────────────────       │
│  Tenants want walkable access to services.    │
│  Landlords in high-amenity areas report       │
│  lower vacancy + higher rental premiums.      │
│  New amenities (malls, clinics) signal       │
│  inbound investment.                          │
│                                                │
│  Data quality & limitations                   │
│  ────────────────────────────────           │
│  • Real-time from OpenStreetMap (updated      │
│    weekly); not officially verified           │
│  • Some amenities may be incomplete or        │
│    outdated in rapidly-changing areas         │
│  • Township areas: formal amenities may be    │
│    undercounted; informal services            │
│    (spaza shops, traditional healers)         │
│    not included                               │
│                                                │
│                                [Close Button]  │
└────────────────────────────────────────────────┘
```

---

## What to Remove from the UI

### **Remove these metric cards entirely:**
1. Safety Score (7.2/10) ❌
2. Crime Index (62) ❌
3. Vacancy Rate (8.5%) ❌
4. Exact Price per m² (R 18,500) ❌
5. Exact Rental Yield % (4.2%) ❌
6. Development Score (7.8/10) ❌ (replace with count: "4 projects")
7. Population Density (3,200/km²) ❌ (replace with growth: "2.1% annual")

### **What to reference instead:**
- **Price scenarios** → Feasibility Calculator (investor models their own deal)
- **Crime data** → CoG modal Advanced Filters (opt-in for power users)
- **Vacancy data** → CoG solver (implicit in weighting; not shown)
- **Rental yield scenarios** → Feasibility Calculator
- **Safety** → Implicit in Transport Connectivity card (visibility + amenities = informal safety)

---

## Language & Tone Guidelines

### **DO Use This Language:**

✅ "Above area average" (comparative, not absolute)  
✅ "Active investment" (optimistic but honest)  
✅ "Demographic shift underway" (neutral observer tone)  
✅ "Moderate commute to CBD" (honest; respects commute reality in SA)  
✅ "Limited development activity" (realistic; not pejorative)  
✅ "Tight rental market" (professional real estate term)  
✅ "Inbound capital" (signals confidence; technical but accessible)  

### **DON'T Use This Language:**

❌ "Safe neighborhood" / "Unsafe neighborhood" (subjective, discriminatory)  
❌ "Best of..." or "Top-rated" (implies ranking; not data-driven)  
❌ "Guaranteed returns" (no certainty)  
❌ "Hidden gem" (hype)  
❌ "Up and coming" (too vague; when?)  
❌ "Investment hotspot" (marketing speak)  
❌ "Crime rate" as absolute number (compare to area instead)  

---

## Implementation Roadmap

### **Phase 1: Content Redesign (This Week)**
- [ ] Finalize 4 card titles + subtitles
- [ ] Write tooltip copy for each card (copying language above)
- [ ] Get SA real estate expert review (do terms make sense?)
- [ ] Design mockups in Figma

### **Phase 2: Frontend Update**
- [ ] Update ExploreAreas.jsx component (hide old cards, show new 4)
- [ ] Add "ℹ️ Why this matters" button to each card
- [ ] Create tooltip modal component
- [ ] Update CSS styling (use styles above)
- [ ] Test responsive layout (mobile, tablet, desktop)

### **Phase 3: Data Layer**
- [ ] Ensure backend returns:
  - Amenity count + density (already have: overpass_amenities.py)
  - Transit distances (already have: from area_models)
  - Population growth % + age composition (already have: area_statistics)
  - Development project count (already have: from area_models)
- [ ] **NO new backend changes needed** — just reorganize existing data

### **Phase 4: Testing**
- [ ] Smoke test: Can user understand each card in <10 seconds?
- [ ] A/B test: Do users spend more time exploring with 4 cards vs. 9?
- [ ] Accessibility: Screen reader friendly? WCAG AA compliant?
- [ ] SA context: Do phrasing choices land with SA investors?

---

## Example: Live Data Binding

### **Current ExploreAreas.jsx (Simplified)**

```jsx
{/* 9 Metric Cards (Old) */}
<div className="metric-cards">
  <MetricCard title="Avg Price / m²" value={area.avgPriceSqm} format="currency" />
  <MetricCard title="Rental Yield" value={area.rentalYield} format="percent" />
  <MetricCard title="Vacancy Rate" value={area.vacancyRate} format="percent" />
  {/* ... 6 more */}
</div>
```

### **Redesigned ExploreAreas.jsx (New)**

```jsx
{/* 4 Signal Cards (New) */}
<div className="signal-cards">
  
  {/* Card 1: Amenities */}
  <SignalCard
    icon="🏪"
    title="Local Amenities & Services"
    subtitle="Within 1km of everyday essentials"
    description={`${area.amenityCount} schools, shops, healthcare. Strong tenant appeal.`}
    signal={area.amenityDensity > areaAvgAmenityDensity ? 'above' : 'below'}
    tooltipKey="amenities"
  />
  
  {/* Card 2: Transit */}
  <SignalCard
    icon="🚌"
    title="Transport Connectivity"
    subtitle="Minibus taxi + bus routes nearby"
    description={`Bus routes ${area.transitDistance}m away. ${
      area.transitDistance < 500 ? 'Strong' : area.transitDistance < 1000 ? 'Good' : 'Moderate'
    } commute to major hubs.`}
    signal={getTransitSignal(area.transitDistance)}
    tooltipKey="transit"
  />
  
  {/* Card 3: Population Momentum */}
  <SignalCard
    icon="👥"
    title="Population Momentum"
    subtitle="Demographic shift underway"
    description={`${area.populationGrowth}% annual; median age ${area.medianAge} (${
      area.medianAge < 30 ? 'younger' : area.medianAge > 40 ? 'older' : 'average'
    }).`}
    signal={area.populationGrowth > areaAvgGrowth ? 'above' : 'below'}
    tooltipKey="demographics"
  />
  
  {/* Card 4: Development */}
  <SignalCard
    icon="🏗️"
    title="Development Pipeline"
    subtitle="New projects & infrastructure planned"
    description={`${area.developmentProjectCount} projects within 2km. ${
      area.developmentProjectCount > 5 ? 'Strong' : area.developmentProjectCount > 2 ? 'Moderate' : 'Limited'
    } investment activity.`}
    signal={getDevelopmentSignal(area.developmentProjectCount)}
    tooltipKey="development"
  />
  
</div>
```

---

## Testing Checklist

### **Content Testing**
- [ ] Each card title is self-explanatory (no jargon)
- [ ] Subtitle tells you the direction (above/below/at average)
- [ ] Description answers "what does this mean for my investment?"
- [ ] Tooltip explains data quality + limitations (builds trust)
- [ ] Zero decimal precision (no "7.2" or "4.2%")
- [ ] South African phrasing passes review (minibus, rank, CBD, corridor, etc.)

### **UX Testing**
- [ ] User can explain each card's purpose in <30 seconds
- [ ] Clicking "ℹ️ Why this matters" opens helpful tooltip
- [ ] Tooltip closes without disrupting page
- [ ] Card layout doesn't break on mobile

### **Data Testing**
- [ ] Amenity count pulls from Overpass API correctly
- [ ] Transit distance calculated correctly
- [ ] Population growth % shows correctly (from area_statistics)
- [ ] Development count shows real data (not dummy)
- [ ] Signal indicators (above/below/at) calculated correctly

### **Accessibility Testing**
- [ ] Screen reader announces card titles + descriptions
- [ ] Tooltip is keyboard-accessible (Tab + Enter)
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Icon + text pair work for color-blind users

---

## FAQ

### Q: Won't removing 5 metrics make investors feel like information is hidden?
**A:** The opposite. Overcommunication creates distrust. By showing only what matters (and explaining why), you build confidence. Hidden metrics are still available if power users opt into CoG modal Advanced Filters.

### Q: What if an investor wants to see Crime Index?
**A:** Offer it as an optional column in CoG modal's "Filter by constraints" section. Let them opt-in to risk metrics.

### Q: Should we keep "Development Score" (7.8/10)?
**A:** No. Instead show count of projects ("4 projects within 2km"). Scores imply precision we don't have. Raw count is honest + actionable.

### Q: Is 4 cards enough? What if investor wants more detail?
**A:** This is the *discovery view*. For detail:
- Hover tooltips → 200-char deep dive
- Feasibility Calculator → investor models their own scenarios
- CoG solver → optimize by weights investor chooses
- Smart layer: details on demand, not dashboard overload

### Q: How do we handle areas with poor data (e.g., incomplete development info)?
**A:** Show in tooltip: "Data quality: Limited development data for this township (municipal database incomplete). May undercount informal projects."

---

## South African Context Notes

This redesign respects SA realities:

1. **Minibus Taxis**: Acknowledged in Transport card (not just buses)
2. **Informal Settlements**: Acknowledged in Amenities tooltip ("formal amenities may be undercounted")
3. **Spatial Inequality**: Removed "Safety Score" (no value judgment on areas)
4. **Employment Hubs**: Transportation card framed around commute to CBD/Sandton/other key nodes
5. **Municipality Variance**: Data quality notes vary by municipality (stronger in metros, weaker in rural)
6. **Development Disparity**: Acknowledged that township areas show less formal development (not a negative; it's a feature of SA property market)

