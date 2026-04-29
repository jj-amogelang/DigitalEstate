# Trust-Building Disclaimer Statements
## For Investment Gravity Map + Explore Area Dashboards

**Date:** April 27, 2026  
**Purpose:** Reduce legal, cognitive, and reputational risk while maintaining investor confidence  
**Audience:** South African property investors (sophisticated but cautious)

---

## Primary Disclaimer Statement

### **For Investment Gravity Map Modal + Explore Area Header**

**Length:** 2 sentences (high visibility placement)

```
This platform guides investment research focus through geospatial and financial 
analysis—it does not predict returns, guarantee outcomes, or constitute investment 
advice. Combine this analysis with your own due diligence and professional 
consultation before making investment decisions.
```

**Placement:**
- Investment Gravity Map: Below title, above preset selection
- Explore Area: Top of page, above metric cards (or in collapsible info panel)
- Rendered in: 12px, #666 text, sans-serif, light background band

---

## Compact Disclaimer Statement

### **For Tooltips, Expandable Sections, Inline Help**

**Length:** 1 sentence (space-constrained)

```
Research-guided analysis to inform your investment focus—always conduct your own 
due diligence and seek professional advice.
```

**Placement:**
- CoG modal info icon (i)
- Explore Area metrics help buttons
- "About this analysis" expandable sections

---

## Very Brief Badge Statement

### **For Footers, Headers, Disclaimer Badges**

**Length:** 4–6 words (minimal footprint)

```
Research analysis only. Not investment advice.
```

**Or (slightly longer):**

```
Analysis to guide research. Due diligence required.
```

**Placement:**
- Page footer (left or center, muted color)
- Modal footers
- Legal/About page header

---

## South African Context Integration

### **Optional: Expanded version with SA-specific framing**

If space allows (longer page sections, info modals):

```
Investment opportunity analysis for South African property research. This platform 
identifies patterns in geospatial, infrastructure, and market data—it guides where 
to focus your investment research, not which properties will outperform. Investment 
outcomes depend on execution, market timing, economic conditions, and individual 
risk tolerance.

Never make investment decisions based solely on this platform. Conduct thorough due 
diligence, understand local market dynamics and regulatory changes, and consult your 
financial advisor, tax advisor, and legal counsel before committing capital.
```

---

## Design Specifications

### **Visual Hierarchy**

**Investment Gravity Map (Modal Body):**
```
┌─────────────────────────────────────────────┐
│ Investment Gravity Map — Discover pull      │
│ Strategic location optimizer · Sandton      │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ℹ️  This platform guides research focus     │
│    through geospatial analysis—it does not  │
│    predict returns. Always conduct due      │
│    diligence and seek professional advice.  │
└─────────────────────────────────────────────┘

[Step 1: Choose your investment approach]
🚀 Growth | 💎 Stable | ⚖️ Balanced
```

**Styling:**
- Background: `#f8fafc` or `rgba(255,255,255,0.8)` (light, not intrusive)
- Border-left: `3px solid #0ea5e9` (blue info color, not gold)
- Font: 12px, `#475569` text, sans-serif
- Icon: ℹ️ or 🔍 (research symbol)
- Padding: 12px 14px
- Line-height: 1.5
- Rounded corners: 6px

**Explore Area (Top Banner):**
```
┌─────────────────────────────────────────────┐
│ 🔍 ANALYSIS TO GUIDE YOUR RESEARCH FOCUS    │
│                                             │
│ This analysis identifies patterns in area  │
│ data. Always conduct due diligence.         │
│ [? Learn more] [✕ Dismiss]                 │
└─────────────────────────────────────────────┘

[4 Signal Cards: Local Amenities, Transit, Population, Development]
```

---

## Copy Rationale

### **Why this works:**

| Element | Purpose | Effect |
|---------|---------|--------|
| "guides research focus" | Clarifies intent | Users understand platform as research tool, not prediction engine |
| "does not predict returns" | Explicit negative | Removes ambiguity about what platform cannot do |
| "does not constitute advice" | Legal clarity | Reduces regulatory risk without sounding defensive |
| "Always conduct due diligence" | Investor empowerment | Positions disclaimer as *protection for user*, not platform |
| "South African context" | Local relevance | Acknowledges market complexity investors understand |
| "geospatial and financial analysis" | Technical credibility | Explains *why* the platform can guide (data-driven) |

### **Tone:**

- ✅ Confident: "guides research focus" (active, strong verb)
- ✅ Transparent: "does not predict" (clear negative)
- ✅ Professional: "conduct due diligence" (investor language)
- ✅ Not defensive: No "all investments carry risk" boilerplate
- ✅ Not condescending: Assumes investor sophistication

---

## Implementation Checklist

- [ ] **Investment Gravity Map modal**: Add disclaimer below title, above Step 1
- [ ] **Explore Area dashboard**: Add disclaimer as sticky top banner (dismissible)
- [ ] **CoG modal info icon**: Link primary text to tooltip
- [ ] **Footer**: Add brief badge statement
- [ ] **About page**: Add expanded SA-specific version
- [ ] **Terms of Service**: Cross-reference primary statement
- [ ] **CSS**: Style with info-blue border, light background
- [ ] **A/B Test**: Compare visible disclaimer vs. collapsed (tooltip-only)
- [ ] **Analytics**: Track dismissals, tooltip clicks
- [ ] **Mobile**: Ensure readable on small screens (don't truncate)

---

## Mobile Responsive Version

### **For small screens (< 640px):**

**Collapsed by default:**
```
┌─────────────────────────────┐
│ ℹ️ Analysis to guide focus   │ [expand ▼]
└─────────────────────────────┘
```

**When expanded:**
```
┌──────────────────────────────────────┐
│ ℹ️ Analysis to guide focus            │
│                                      │
│ This platform identifies patterns    │
│ in area data—it does not predict     │
│ returns. Always conduct due diligence│
│ and seek professional advice.        │
│                                      │
│              [✕ Close]               │
└──────────────────────────────────────┘
```

---

## Legal Review Notes

**Items for legal counsel:**

1. **"Does not constitute investment advice"**: Check FSCA (Financial Sector Conduct Authority) guidance on content disclaimers
2. **Platform liability**: Ensure Terms of Service aligns with this disclaimer (no contradictions)
3. **Data attribution**: Any inaccuracy in underlying data? Add: "Based on available public data; always verify."
4. **Regulatory context**: South African property market—any sector-specific disclaimers needed? (e.g., FICA compliance, BEE considerations)

**Suggested addition (if required by legal):**

```
The analyses provided are based on available geospatial, infrastructure, and 
market data. The accuracy, completeness, and timeliness of underlying sources 
are not guaranteed. Property values, rental markets, and investment outcomes 
are subject to economic, regulatory, and market conditions beyond the scope 
of this platform.
```

---

## Success Metrics

**After implementation, track:**

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| Disclaimer visibility (% users who read) | TBD | 60%+ | 2 weeks |
| Support tickets re: "is this advice?" | TBD | -50% | 1 month |
| User trust score (NPS sentiment) | TBD | +15 points | 1 month |
| Legal/regulatory incidents | 0 | 0 maintained | Ongoing |
| Mobile accessibility score | TBD | 95+ (a11y) | 2 weeks |

---

## Final Copy Summary

| Context | Statement | Length |
|---------|-----------|--------|
| **Primary (Gravity Map, Explore Area)** | "This platform guides investment research focus through geospatial and financial analysis—it does not predict returns, guarantee outcomes, or constitute investment advice. Combine this analysis with your own due diligence and professional consultation." | 2 sentences |
| **Compact (Tooltips, Help)** | "Research-guided analysis to inform your investment focus—always conduct your own due diligence and seek professional advice." | 1 sentence |
| **Brief (Footer, Badge)** | "Research analysis only. Not investment advice." | 6 words |
| **Expanded (About page, Legal)** | [See SA-specific section above] | 3–4 sentences |

