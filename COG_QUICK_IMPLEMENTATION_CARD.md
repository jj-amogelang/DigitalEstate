# Investment Gravity Map — Quick Implementation Card
## Copy-Paste Replacement Reference

**Use this as your quick lookup while implementing the refactoring.**

---

## 1️⃣ CentreOfGravity.jsx

### Replacement 1: Solve Button Text
**Find:**
```jsx
: <>&#x25B6; Solve</>}
```

**Replace with:**
```jsx
: <>&#x25B6; Show investment pull</>}
```

---

### Replacement 2: Loading State Text
**Find:**
```jsx
? <><span className="loading-spinner-small" style={{border:'2px solid rgba(0,0,0,0.12)',borderTopColor:'#c9a030'}}/> Solving…</>
```

**Replace with:**
```jsx
? <><span className="loading-spinner-small" style={{border:'2px solid rgba(0,0,0,0.12)',borderTopColor:'#c9a030'}}/> Analysing gravity…</>
```

---

### Replacement 3: Button Tooltip
**Find:**
```jsx
title={!cog.weightsValid ? 'Weights must sum to 100' : 'Run full 200-iteration solve'}
```

**Replace with:**
```jsx
title={!cog.weightsValid ? 'Weights must sum to 100' : 'Analyse investment gravity across weighted metrics'}
```

---

### Replacement 4: Status Chip — "Ready" State
**Find:**
```jsx
{cog.weightsValid ? 'Ready to solve' : 'Adjust weights to 100%'}
```

**Replace with:**
```jsx
{cog.weightsValid ? 'Ready to analyse' : 'Adjust weights to 100%'}
```

---

### Replacement 5: Model Chip Description
**Find:**
```jsx
<span className="cog-intro-chip">Model: k-NN geospatial optimizer</span>
```

**Replace with:**
```jsx
<span className="cog-intro-chip">Model: Gravity-weighted location analysis</span>
```

---

## 2️⃣ ExplorePage.jsx

### Replacement 6: CTA Button Label
**Find:**
```jsx
Open Centre of Gravity
```

**Replace with:**
```jsx
Open Investment Gravity Map
```

---

### Replacement 7: Aria Label
**Find:**
```jsx
<section className="explore-cog-spotlight" aria-label="Centre of Gravity assistant">
```

**Replace with:**
```jsx
<section className="explore-cog-spotlight" aria-label="Investment Gravity Map assistant">
```

---

### Replacement 8: **CRITICAL** — Main Description Paragraph
**Find:**
```jsx
<p className="explore-cog-spotlight-sub">
  Centre of Gravity converts your investor priorities into an optimized location recommendation using local market, zoning, and feasibility signals.
</p>
```

**Replace with:**
```jsx
<p className="explore-cog-spotlight-sub">
  Investment Gravity Map visualises your investment priorities across multiple market signals—rental yield, vacancy, price, amenities, crime, and development activity. It shows where the strongest pull of opportunity aligns with your criteria. This guides your research focus; it does not predict returns or guarantee outcomes.
</p>
```

---

### Replacement 9: Bullet Points
**Find:**
```jsx
<div className="explore-cog-spotlight-points" aria-hidden="true">
  <span className="explore-cog-point">Profile-based weighting</span>
  <span className="explore-cog-point">Live map optimization</span>
  <span className="explore-cog-point">Feasibility diagnostics</span>
</div>
```

**Replace with:**
```jsx
<div className="explore-cog-spotlight-points" aria-hidden="true">
  <span className="explore-cog-point">Customise your weighting</span>
  <span className="explore-cog-point">See real-time results on map</span>
  <span className="explore-cog-point">No models, no predictions</span>
</div>
```

---

## 3️⃣ AboutPage.jsx

### Replacement 10: Feature Title
**Find:**
```jsx
<h3>Centre of Gravity Optimization</h3>
```

**Replace with:**
```jsx
<h3>Investment Gravity Map</h3>
```

---

### Replacement 11: Feature Description
**Find:**
```jsx
<p>
  Advanced k-NN solver identifies optimal parcels matching your investment 
  profile across multiple weighted metrics.
</p>
```

**Replace with:**
```jsx
<p>
  Visualise where investment opportunity aligns with your priorities. Combine rental yield, vacancy stability, purchase price, transit access, amenities, safety, and development activity into a single weighted map. Focuses your research on the best-fit locations.
</p>
```

---

### Replacement 12: Intro Reference (Search for this pattern)
**Find:**
```jsx
and feasibility assessment. Using the Centre of Gravity optimization engine, we identify
```

**Replace with:**
```jsx
and feasibility assessment. Using the Investment Gravity Map, we identify
```

---

## 4️⃣ PLATFORM_DOCUMENTATION.md — Global Replacements

### Use Find & Replace (Cmd+H / Ctrl+H)

| Find | Replace | Context |
|------|---------|---------|
| `Centre of Gravity Solver` | `Investment Gravity Map` | Feature name references |
| `Centre of Gravity Optimization` | `Investment Gravity Map` | Section titles |
| `Centre of Gravity (CoG)` | `Investment Gravity Map` | Parenthetical intro |
| `the CoG` | `the Investment Gravity Map` | Mid-sentence reference |
| `CoG solver` | `gravity analysis engine` | Technical description |
| `CoG/solve` | `gravity analysis` | Process description |
| `CoG endpoint` | `Investment Gravity Analysis endpoint` | API reference |
| `Run CoG` | `Analyse investment gravity` | Action descriptions |

**Recommended order:**
1. Start with `Centre of Gravity Solver` (most specific, lowest risk)
2. Then `Centre of Gravity Optimization` (specific section titles)
3. Then `Centre of Gravity` (general references)
4. Finally broader terms like `CoG` (but be careful of variable names)

---

## Optional: CogWeightPanel.jsx

### Replacement 13 (Optional): Section Label
**Find:**
```jsx
<p className="cog-panel-section-label">Investment Weights</p>
```

**Replace with:**
```jsx
<p className="cog-panel-section-label">Adjust your investment priorities</p>
```

**Note:** Lower priority; "Investment Weights" is still acceptable but makes the panel feel more human-focused.

---

## Testing After Changes

### Smoke Test Checklist
- [ ] Click "Open Investment Gravity Map" button on Explore page
- [ ] Modal opens with new button label "Show investment pull"
- [ ] Click "Show investment pull" button
- [ ] Loading state shows "Analysing gravity…"
- [ ] Results appear
- [ ] Tooltip on button reads correctly (hover for 1s)
- [ ] Status chip shows "Ready to analyse"
- [ ] About page displays "Investment Gravity Map" feature title
- [ ] About page description is readable and not truncated
- [ ] Spotlight section on Explore page shows new description
- [ ] Bullet points are properly spaced

### Visual Regression Check
- [ ] Button text not truncated on mobile
- [ ] Paragraph text wraps naturally
- [ ] No overflow in modal header
- [ ] Aria labels still make sense when read aloud

### Browser Check
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

---

## Commit Message Template

```
refactor: replace Centre of Gravity terminology with Investment Gravity Map

- Rename "Centre of Gravity Solver" → "Investment Gravity Map"
- Change action verb: "Solve" → "Show investment pull"
- Update loading state: "Solving…" → "Analysing gravity…"
- Rewrite Explore page description to clarify:
  - This guides research focus; does NOT predict returns
  - Shows where opportunity aligns with investor criteria
- Update About page feature description for investor-grade tone
- Update PLATFORM_DOCUMENTATION.md throughout
- No backend changes; UI/copy refactoring only

Addresses: More accessible framing for first-time users
Related: Product accessibility & investor confidence
```

---

## Rollback Instructions (if needed)

All changes are in copy only; no logic changes. To rollback:

1. Run `git diff frontend/src/components/CentreOfGravity.jsx` to see changes
2. Run `git checkout frontend/src/components/CentreOfGravity.jsx` to revert that file
3. Repeat for ExplorePage.jsx, AboutPage.jsx
4. For PLATFORM_DOCUMENTATION.md, run global find-replace in reverse

No database migrations or API changes needed.

---

## Questions & Clarifications

### Q: Should I change the backend endpoint `/api/cog/solve`?
**A:** No. Keep the endpoint path as-is. Only update documentation labels that refer to it. The endpoint works but the UI calls it "Investment Gravity Analysis."

### Q: What about code comments in cog_solver.py?
**A:** Update comments that user-facing (e.g., docstrings). Keep internal algorithm comments (e.g., "k-NN ascent") as-is for developer clarity.

### Q: Do I need to change CSS class names like `.cog-solve-button`?
**A:** No. Keep CSS class names unchanged (they're internal). Only text content and labels visible to users.

### Q: What if a user is viewing an old saved CoG result?
**A:** Old results are fine. They won't see the new terminology unless they use the tool again. No data migration needed.

### Q: Should I update the GitHub repo README?
**A:** Yes, if it mentions "Centre of Gravity Solver" anywhere. Update it the same way you update PLATFORM_DOCUMENTATION.md.

---

## Success Criteria

✅ All user-facing text updated  
✅ Tone consistent: calm, analytical, investor-grade  
✅ Disclaimer language clearly states: "guides focus, doesn't predict returns"  
✅ No jargon leakage (k-NN, optimization, solver removed from UI)  
✅ All tests pass (smoke test + visual regression)  
✅ Tooltips & ARIA labels updated  
✅ Mobile layout preserves text (no truncation)  
✅ Commit message references this refactoring  

---

**Ready to implement? Start with ExplorePage.jsx (most visible), then CentreOfGravity.jsx, then AboutPage.jsx, then Documentation.**
