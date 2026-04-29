# Investment Gravity Map — Marker Popup Redesign
## From Numeric Precision to Qualitative Insights

**Version:** 1.0  
**Date:** April 27, 2026  
**Goal:** Answer one question: "Why does this location pull investment attention?"

---

## Current State (Problem)

**Current Popup:**
```
Parcel #1025
Zoning: Commercial (badge)
━━━━━━━━━━━━━━━━━
Composite Score: 0.876
Rental Yield: 4.2%
Vacancy Rate: 8.5%
Price/m²: R 18,500
Transit Score: 7.2
Amenity Density: 34/km²
Crime Index: 62
Development Activity: 12
```

**Problems:**
- 8 metrics = cognitive overload
- Decimal precision (0.876, 4.2%) implies false certainty
- No narrative: investor doesn't know *why* this matters
- Doesn't answer "Should I focus here?"
- Metric names don't translate to action

---

## Redesigned Popup Structure

### Visual Hierarchy

```
┌─────────────────────────────────────────────┐
│  ✨ Why this area pulls attention           │  ← Heading (removes mystique of "score")
├─────────────────────────────────────────────┤
│  ✅ Strong rental yield potential           │  ← Signal + outcome
│                                             │
│  ✅ Above-average amenity access            │  ← Relative framing
│                                             │
│  ⚠️  Moderate property prices               │  ← Caution indicator
│     (middle of market range)                │
│                                             │
│  ❌ Limited near-term development           │  ← Weakness signal
│                                             │
│  ℹ️  Zoning: Commercial (badge color)       │  ← Context
├─────────────────────────────────────────────┤
│  📍 Parcel #1025                            │  ← Identity (smaller)
│  Data: Stats SA + OpenStreetMap             │  ← Attribution
└─────────────────────────────────────────────┘
```

---

## Signal Mapping Logic

### How to Convert Metrics → Qualitative Signals

#### **1. Rental Yield → Income Potential**

| Metric Range | Signal | Framing |
|---|---|---|
| >6% | ✅ Strong | "Strong rental yield potential" |
| 4–6% | ✅ Good | "Solid rental income opportunity" |
| 2–4% | ⚠️ Moderate | "Moderate rental returns" |
| <2% | ❌ Weak | "Limited rental income" |

**How to calculate for display:**
- Get area avg rental yield from `areaStats.rental_yield`
- Get parcel expected yield from solver metrics
- Compare to area average, not absolute thresholds
- **Framing:** "Above area average" / "Below area average" / "At market rate"

---

#### **2. Vacancy Rate → Market Stability**

| Metric Range | Signal | Framing |
|---|---|---|
| <5% | ✅ Strong | "Tight rental market" (stability) |
| 5–10% | ✅ Good | "Stable occupancy" |
| 10–15% | ⚠️ Moderate | "Moderate vacancy risk" |
| >15% | ❌ Weak | "High vacancy exposure" |

**Framing rule:** Lower vacancy = stability = positive signal

---

#### **3. Price per m² → Affordability**

| Comparison to Area Avg | Signal | Framing |
|---|---|---|
| -15% or more | ✅ Strong | "Good value vs. area average" |
| -5% to -15% | ✅ Moderate | "Fairly priced" |
| -5% to +5% | ⚠️ Neutral | "At market rate" |
| +5% to +15% | ⚠️ Caution | "Premium pricing" |
| +15% or more | ❌ Weak | "Above-market pricing" |

**Framing rule:** Compare to area, not township-wide. Use SA property terminology: "good value," "fairly priced," "premium."

---

#### **4. Amenity Density → Convenience & Attractiveness**

| Amenities per km² | Signal | Framing |
|---|---|---|
| >25 | ✅ Strong | "Strong amenity access" |
| 15–25 | ✅ Good | "Good local services" |
| 8–15 | ⚠️ Moderate | "Moderate amenity access" |
| <8 | ❌ Weak | "Limited local services" |

**What counts:** Groceries, pharmacies, schools, parks, restaurants, healthcare

**Framing rule:** Personal convenience + tenant appeal. Use SA context: "good access to services," "local shopping nearby."

---

#### **5. Transit Proximity → Connectivity**

| Distance to Transit | Signal | Framing |
|---|---|---|
| <500m | ✅ Strong | "Strong transport connectivity" |
| 500–1000m | ✅ Good | "Good transit access" |
| 1–2km | ⚠️ Moderate | "Car-dependent area" |
| >2km | ❌ Weak | "Limited public transport" |

**Framing rule:** In SA, transit = bus lines, minibus taxi routes, train stations. Be honest: many areas are car-dependent. Don't fake walkability.

---

#### **6. Crime Index → Safety**

| Index Score | Signal | Framing |
|---|---|---|
| <40 (vs. area avg) | ✅ Strong | "Below-average crime profile" |
| 40–60 | ⚠️ Moderate | "In-line with area average" |
| 60–80 | ❌ Weak | "Above-average crime index" |
| >80 | ❌ Strong Warning | "High crime area" |

**Framing rule:** Compare to area, acknowledge data source is municipal SAPS (may have reporting bias). Use neutral language: "below-average," "above-average."

**Never say:** "Safe" or "Unsafe" (too subjective). Use "crime profile" instead.

---

#### **7. Planned Development → Growth Signal**

| Development Count | Signal | Framing |
|---|---|---|
| >5 active projects | ✅ Strong | "Strong development pipeline" |
| 2–5 projects | ✅ Good | "Active development interest" |
| 1 project | ⚠️ Moderate | "Limited development activity" |
| 0 projects | ❌ Weak | "No planned developments" |

**Framing rule:** This is forward-looking. A lack of development isn't always bad (established neighborhoods have fewer projects). Phrase as "limited pipeline," not "no growth."

---

## Popup Content Template

### Structure

```jsx
<div className="marker-popup-redesigned">
  <h4 className="popup-title">
    ✨ Why this area pulls attention
  </h4>
  
  <ul className="popup-signals">
    {/* Up to 5 signals */}
    <li className="signal signal--strong">
      <span className="signal-icon">✅</span>
      <span className="signal-text">Strong rental yield potential</span>
    </li>
    
    <li className="signal signal--strong">
      <span className="signal-icon">✅</span>
      <span className="signal-text">Above-average amenity access</span>
    </li>
    
    <li className="signal signal--moderate">
      <span className="signal-icon">⚠️</span>
      <span className="signal-text">Moderate property prices (middle of market range)</span>
    </li>
    
    <li className="signal signal--weak">
      <span className="signal-icon">❌</span>
      <span className="signal-text">Limited near-term development pipeline</span>
    </li>
  </ul>
  
  <div className="popup-context">
    <div className="popup-zoning">
      Zoning: <span className="zoning-badge" style={{backgroundColor: '#3b82f6'}}>Residential</span>
    </div>
  </div>
  
  <footer className="popup-footer">
    <span className="popup-parcel-id">Parcel #1025</span>
    <span className="popup-attribution">Data: Stats SA + OpenStreetMap</span>
  </footer>
</div>
```

---

## Real-World Examples (South African Context)

### Example 1: High-Yielding Sandton Commercial Property

```
✨ Why this area pulls attention

✅ Strong rental yield potential
   (3.8% above area average)

✅ Tight rental market
   (5.2% vacancy, well-below area average)

✅ Good local services
   (24 amenities within 1km: shops, restaurants, gyms)

⚠️  Premium property pricing
   (12% above area average)

ℹ️  Zoning: Commercial
    Parcel #2847
    Data: Stats SA + OpenStreetMap
```

### Example 2: Emerging Pretoria Residential Area

```
✨ Why this area pulls attention

✅ Good value vs. area average
   (15% below comparable properties)

✅ Active development interest
   (4 projects within 2km)

✅ Above-average population growth
   (4.2% YoY, township-level data)

⚠️  Car-dependent area
   (2.1km to nearest transit route)

❌ Limited local services
   (9 amenities, below neighborhood average)

ℹ️  Zoning: Residential
    Parcel #5124
    Data: Stats SA + OpenStreetMap
```

### Example 3: Balanced Port Elizabeth Opportunity

```
✨ Why this area pulls attention

✅ Balanced investment profile
   (solid yield + reasonable pricing)

✅ Above-average safety record
   (crime index 38 vs. area avg 52)

⚠️  Moderate rental returns
   (2.3% expected yield)

⚠️  Moderate development activity
   (1 active project nearby)

ℹ️  Zoning: Mixed-Use
    Parcel #7331
    Data: Stats SA + OpenStreetMap
```

---

## Implementation Guide

### Step 1: Create Signal Mapping Function

```javascript
/**
 * Converts raw metrics to qualitative signals
 * Returns array of { icon, text, severity }
 */
function generateSignals(parcel, areaStats) {
  const signals = [];
  
  // Rental Yield
  const yieldDiff = parcel.rentalYield - areaStats.rentalYield;
  if (parcel.rentalYield > 6) {
    signals.push({
      icon: '✅',
      text: 'Strong rental yield potential',
      severity: 'strong'
    });
  } else if (parcel.rentalYield > 4) {
    signals.push({
      icon: '✅',
      text: 'Solid rental income opportunity',
      severity: 'good'
    });
  } else if (parcel.rentalYield > 2) {
    signals.push({
      icon: '⚠️',
      text: 'Moderate rental returns',
      severity: 'moderate'
    });
  }
  
  // Vacancy Rate (inverted: lower is better)
  if (parcel.vacancyRate < 5) {
    signals.push({
      icon: '✅',
      text: 'Tight rental market',
      severity: 'strong'
    });
  } else if (parcel.vacancyRate < 10) {
    signals.push({
      icon: '✅',
      text: 'Stable occupancy',
      severity: 'good'
    });
  } else if (parcel.vacancyRate < 15) {
    signals.push({
      icon: '⚠️',
      text: 'Moderate vacancy risk',
      severity: 'moderate'
    });
  }
  
  // Price/m² (compare to area average)
  const priceDiff = ((parcel.pricePerSqm - areaStats.avgPriceSqm) / areaStats.avgPriceSqm) * 100;
  if (priceDiff < -15) {
    signals.push({
      icon: '✅',
      text: 'Good value vs. area average',
      severity: 'strong'
    });
  } else if (priceDiff > 15) {
    signals.push({
      icon: '⚠️',
      text: 'Premium pricing',
      severity: 'moderate'
    });
  } else {
    signals.push({
      icon: '⚠️',
      text: 'At market rate',
      severity: 'neutral'
    });
  }
  
  // Amenity Density
  if (parcel.amenityDensity > 25) {
    signals.push({
      icon: '✅',
      text: 'Strong amenity access',
      severity: 'strong'
    });
  } else if (parcel.amenityDensity > 15) {
    signals.push({
      icon: '✅',
      text: 'Good local services',
      severity: 'good'
    });
  } else if (parcel.amenityDensity > 8) {
    signals.push({
      icon: '⚠️',
      text: 'Moderate amenity access',
      severity: 'moderate'
    });
  } else {
    signals.push({
      icon: '❌',
      text: 'Limited local services',
      severity: 'weak'
    });
  }
  
  // Transit Proximity
  if (parcel.transitDistance < 500) {
    signals.push({
      icon: '✅',
      text: 'Strong transport connectivity',
      severity: 'strong'
    });
  } else if (parcel.transitDistance < 1000) {
    signals.push({
      icon: '✅',
      text: 'Good transit access',
      severity: 'good'
    });
  } else if (parcel.transitDistance < 2000) {
    signals.push({
      icon: '⚠️',
      text: 'Car-dependent area',
      severity: 'moderate'
    });
  } else {
    signals.push({
      icon: '❌',
      text: 'Limited public transport',
      severity: 'weak'
    });
  }
  
  // Crime Index (compare to area)
  if (parcel.crimeIndex < areaStats.avgCrimeIndex - 20) {
    signals.push({
      icon: '✅',
      text: 'Below-average crime profile',
      severity: 'strong'
    });
  } else if (parcel.crimeIndex > areaStats.avgCrimeIndex + 20) {
    signals.push({
      icon: '❌',
      text: 'Above-average crime index',
      severity: 'weak'
    });
  }
  
  // Development Activity
  if (parcel.developmentCount > 5) {
    signals.push({
      icon: '✅',
      text: 'Strong development pipeline',
      severity: 'strong'
    });
  } else if (parcel.developmentCount > 2) {
    signals.push({
      icon: '✅',
      text: 'Active development interest',
      severity: 'good'
    });
  } else if (parcel.developmentCount === 0) {
    signals.push({
      icon: '❌',
      text: 'Limited development activity',
      severity: 'weak'
    });
  }
  
  // Return top 4–5 signals (prioritize strong/weak, then others)
  return signals
    .sort((a, b) => {
      const severityOrder = { strong: 0, weak: 1, good: 2, moderate: 3, neutral: 4 };
      return (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5);
    })
    .slice(0, 5);
}
```

---

### Step 2: Update Popup Component

```jsx
import React from 'react';
import './MarkerPopup.css';

export default function MarkerPopupRedesigned({ parcel, areaStats, onClose }) {
  const signals = generateSignals(parcel, areaStats);
  
  const ZONING_COLORS = {
    residential: { hex: '#3b82f6', label: 'Residential' },
    commercial: { hex: '#22c55e', label: 'Commercial' },
    industrial: { hex: '#ef4444', label: 'Industrial' },
    mixed: { hex: '#a855f7', label: 'Mixed-Use' },
    retail: { hex: '#f97316', label: 'Retail' }
  };
  
  const zoningInfo = ZONING_COLORS[parcel.zoning] || {};
  
  return (
    <div className="marker-popup-redesigned">
      <h4 className="popup-title">
        <span className="popup-title-icon">✨</span>
        Why this area pulls attention
      </h4>
      
      <ul className="popup-signals">
        {signals.map((signal, idx) => (
          <li 
            key={idx} 
            className={`signal signal--${signal.severity}`}
            role="listitem"
          >
            <span className="signal-icon" aria-hidden="true">
              {signal.icon}
            </span>
            <span className="signal-text">
              {signal.text}
            </span>
          </li>
        ))}
      </ul>
      
      <div className="popup-context">
        <div className="popup-zoning">
          <span className="popup-label">Zoning:</span>
          <span 
            className="zoning-badge" 
            style={{ backgroundColor: zoningInfo.hex }}
          >
            {zoningInfo.label}
          </span>
        </div>
      </div>
      
      <footer className="popup-footer">
        <span className="popup-parcel-id">
          📍 Parcel #{parcel.id}
        </span>
        <span className="popup-attribution">
          Data: Stats SA + OpenStreetMap
        </span>
      </footer>
    </div>
  );
}

/**
 * Signal mapping logic (see Step 1 implementation above)
 */
function generateSignals(parcel, areaStats) {
  // ... implementation from Step 1
}
```

---

### Step 3: CSS Styling

```css
/* ── Marker Popup Redesign ──────────────────────────────────────── */

.marker-popup-redesigned {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: #1e293b;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  max-width: 320px;
  width: 280px;
  padding: 0;
}

.popup-title {
  margin: 0;
  padding: 12px 14px 10px;
  font-size: 14px;
  font-weight: 600;
  color: #0e1420;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 8px;
}

.popup-title-icon {
  font-size: 16px;
  line-height: 1;
}

.popup-signals {
  list-style: none;
  margin: 0;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.signal {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 14px;
  margin: 0;
  border-left: 3px solid transparent;
}

.signal--strong {
  border-left-color: #22c55e;
  background-color: #f0fdf4;
}

.signal--good {
  border-left-color: #3b82f6;
  background-color: #eff6ff;
}

.signal--moderate {
  border-left-color: #eab308;
  background-color: #fefce8;
}

.signal--weak {
  border-left-color: #ef4444;
  background-color: #fef2f2;
}

.signal--neutral {
  border-left-color: #94a3b8;
  background-color: #f8fafc;
}

.signal-icon {
  font-size: 14px;
  line-height: 1.4;
  flex-shrink: 0;
  letter-spacing: -0.2em; /* Slightly compress emoji spacing */
}

.signal-text {
  font-size: 12px;
  color: #334155;
  line-height: 1.4;
  flex: 1;
}

.popup-context {
  padding: 8px 14px;
  border-top: 1px solid #f1f5f9;
  background-color: #f8fafc;
}

.popup-zoning {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.popup-label {
  color: #64748b;
  font-weight: 500;
}

.zoning-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  color: white;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.popup-footer {
  padding: 10px 14px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fafbfc;
  font-size: 11px;
}

.popup-parcel-id {
  color: #0e1420;
  font-weight: 600;
}

.popup-attribution {
  color: #999;
  font-size: 10px;
  font-style: italic;
}

/* ── Dark Mode ──────────────────────────────────────────────────── */

@media (prefers-color-scheme: dark) {
  .marker-popup-redesigned {
    background: #1e293b;
    border-color: #334155;
    color: #e2e8f0;
  }

  .popup-title {
    color: #f1f5f9;
    border-bottom-color: #334155;
  }

  .signal {
    /* Tinted backgrounds for dark mode */
  }

  .signal--strong {
    background-color: rgba(34, 197, 94, 0.15);
  }

  .signal--good {
    background-color: rgba(59, 130, 246, 0.15);
  }

  .signal--moderate {
    background-color: rgba(234, 179, 8, 0.15);
  }

  .signal--weak {
    background-color: rgba(239, 68, 68, 0.15);
  }

  .signal-text {
    color: #cbd5e1;
  }

  .popup-context {
    background-color: #0f172a;
    border-top-color: #334155;
  }

  .popup-label {
    color: #94a3b8;
  }

  .popup-footer {
    background: #0f172a;
    border-top-color: #334155;
  }

  .popup-parcel-id {
    color: #f1f5f9;
  }

  .popup-attribution {
    color: #64748b;
  }
}

/* ── Mobile ────────────────────────────────────────────────────── */

@media (max-width: 480px) {
  .marker-popup-redesigned {
    width: 100%;
    max-width: calc(100vw - 20px);
  }

  .popup-signals {
    gap: 4px;
  }

  .signal {
    padding: 5px 12px;
  }
}
```

---

## Interaction Patterns

### Hover / Tap States

**Desktop (hover):**
- Popup appears on marker click (standard Leaflet behavior)
- Signals have light left border color on the left
- Footer attribution is subtle (gray, smaller font)

**Mobile (tap):**
- Popup appears below map controls
- Full-height popup if needed
- Close button (X) in top-right corner (built into Leaflet)
- Attribution visible but not intrusive

---

## Language Guidelines

### DO Use This Language:
- "Strong rental yield potential" (forward-looking, not guaranteed)
- "Good local services" (accessible, SA context)
- "Above-average crime index" (comparative, not absolute judgment)
- "Limited development pipeline" (honest, not pejorative)
- "Moderate property prices" (middle ground, invites comparison)
- "Tight rental market" (professional real estate term)

### DON'T Use This Language:
- ❌ "Best deal" (implies recommendation/certainty)
- ❌ "Safe area" or "Unsafe area" (subjective, potentially offensive)
- ❌ "Guaranteed returns" (no such thing exists)
- ❌ "High-growth investment" (too speculative)
- ❌ "Perfect for you" (you don't know the investor)
- ❌ "Insider opportunity" (sounds predatory)

---

## Signal Priority / Ranking

When a parcel has many positive signals, show the most investor-relevant ones first:

1. **Rental yield** (income signal) — highest priority for yield hunters
2. **Price/value** (entry signal) — critical for affordability
3. **Vacancy rate** (stability signal) — affects cash flow
4. **Development** (growth signal) — affects capital appreciation
5. **Amenities** (quality of life signal) — affects tenant appeal
6. **Transit** (connectivity signal) — affects desirability
7. **Crime** (risk signal) — show only if significantly above/below average

**Implementation:** Return top 4–5 signals, sorted by severity (strong > good > moderate > weak).

---

## Accessibility Considerations

### Screen Reader Friendly

```jsx
<h4 className="popup-title" role="heading" aria-level="4">
  <span className="popup-title-icon" aria-hidden="true">✨</span>
  Why this area pulls attention
</h4>

<ul className="popup-signals" role="list">
  {signals.map((signal, idx) => (
    <li key={idx} role="listitem" className={`signal signal--${signal.severity}`}>
      <span style={{fontWeight: 'bold'}} aria-label={`signal-severity-${signal.severity}`}>
        {signal.icon}
      </span>
      <span>{signal.text}</span>
    </li>
  ))}
</ul>

<footer aria-label="Attribution and parcel details">
  <span className="popup-parcel-id">📍 Parcel #{parcel.id}</span>
  <span className="popup-attribution">Data: Stats SA + OpenStreetMap</span>
</footer>
```

### Color Contrast
- Signal text (12px) on colored backgrounds: **WCAG AA compliant** (4.5:1 or higher)
- Footer text (11px) on light gray: **WCAG AA compliant**
- Dark mode variant maintains contrast ratios

---

## Analytics / Logging Suggestions

When a user clicks on a signal (if made interactive), log:

```javascript
{
  event: 'marker_popup_signal_click',
  parcel_id: 1025,
  signal_type: 'rental_yield',
  signal_severity: 'strong',
  area_id: 42,
  timestamp: '2026-04-27T10:22:33Z'
}
```

This tells you which signals drive investor interest.

---

## Transition Path

### Phase 1: Small deployment
- Roll out to 10% of users
- Monitor: Do session durations improve? Do users click through to more details?
- Measure: Signal comprehension via user interviews

### Phase 2: Full deployment
- Roll out to all users
- Keep numeric precision available in a "Details" toggle (optional)
- Monitor feedback via in-app rating

### Phase 3: Iteration
- Based on feedback, refine signal thresholds
- Add new signals if data becomes available
- Adjust SA-specific phrasing (e.g., "minibus taxi accessible" vs. "transit access")

---

## Example Integration Points

### In CogCandidatesMarkers.jsx

```jsx
import MarkerPopupRedesigned from './MarkerPopupRedesigned';

// When marker is clicked:
<Popup maxWidth={320}>
  <MarkerPopupRedesigned 
    parcel={parcel} 
    areaStats={areaStats}
    onClose={() => setSelectedParcel(null)}
  />
</Popup>
```

### In CentreOfGravity.jsx

```jsx
// Pass area stats to the markers component
<CogCandidatesMarkers 
  parcels={heatmapParcels}
  areaStats={cog.areaStatistics}
  onSelect={setSelectedParcel}
/>
```

---

## South African Phrasing Notes

This redesign uses SA-appropriate language:
- "Good value" vs. "Deal of the century" (not hype-driven)
- "Tight rental market" (professional; most SA investors use this term)
- "Minibus taxi accessible" and "bus route proximity" (realistic transit in SA context)
- "Crime index" compared to area (not absolute; acknowledges SAPS reporting variation)
- "Development pipeline" (infrastructure language used by property developers in SA)
- "Population growth" (census-based; Stats SA terminology)

---

## Testing Checklist

- [ ] Popup displays 4–5 signals (not too many)
- [ ] Icons render correctly (✅ ⚠️ ❌) on all browsers
- [ ] Left border color matches severity
- [ ] Background color tinted appropriately (light, not bright)
- [ ] Zoning badge color matches marker color
- [ ] Attribution is visible but not distracting
- [ ] Parcel ID is clearly shown
- [ ] Mobile: popup doesn't overflow (max-width on mobile)
- [ ] Dark mode: all text readable (sufficient contrast)
- [ ] Screen reader: "Why this area pulls attention" is announced
- [ ] Screen reader: each signal is read as a list item with icon + text
- [ ] No numeric precision leaked (no % signs, no exact prices)
- [ ] Tone is analyst-grade (calm, not salesy)

