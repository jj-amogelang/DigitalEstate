# DigitalEstate — Platform Overview

---

## Navigation

- Fixed left sidebar (collapses to icon-only) with links to: Explore Areas, Opportunities, Dashboard, About, Settings
- Persistent top bar with a hamburger toggle, global area search, and login/register profile button
- Mobile: sidebar hidden; full-width top bar + sticky bottom navigation tab bar (5 items)
- Location permission modal on first visit to detect the user's area automatically

## Authentication

- Login / Register modal (slides in from top bar profile button)
- Authenticated users see a personalised welcome banner on the About page
- User context persists across the session

---

## Explore Areas (`/explore`)

- Province → City → Area cascading dropdowns
- Global search bar in top bar also routes directly to an area
- Recently viewed areas and saved (bookmarked) areas shown when no area is selected
- Once an area is selected:
  - Area header: name, city, province, premium data badge
  - **Market Intelligence grid** — 9 metric cards: Avg Price, Rental Yield, Vacancy Rate, Safety, Population Density, Crime Index, Population Growth, Planned Developments, Development Score — each card has a tooltip with a glossary definition
  - **Insight Card** — "Why this location" contextual comparison
  - **Feasibility Tab** — back-of-envelope calculator: enter purchase price, rental income, vacancy allowance, financing cost → outputs gross yield, net yield, cash-on-cash return, cap rate
  - **Centre of Gravity button** — opens the CoG modal

## Centre of Gravity Modal (opens from Explore)

- **Investor profile strip** — one-click presets: Yield Hunter, Capital Growth, Balanced, Low Risk, Development — instantly loads a weight configuration
- **Weight panel** (left column):
  - 7 sliders: Rental Yield, Vacancy Rate, Price/m², Transport, Amenities, Crime Index, Planned Development
  - **Zone Filter** — vertical button rows for Residential, Commercial, Mixed-Use, Industrial, Retail — each with an SVG icon, label, and circular toggle; count badge + All / None shortcuts
- **Map + results** (right column):
  - Interactive Leaflet map showing parcels in the selected area
  - Animated pulsing marker on the winning parcel
  - Ranked list of top parcels with composite score and individual metric breakdown
  - Save result button (persists to Investor Dashboard)

---

## Opportunities (`/opportunities`)

- **Header tabs**: Top Yield · Low Vacancy · Best Value · Emerging (YoY price growth)
- **Filter panel** (left): Province dropdown, City dropdown (appears when province selected), Results slider (5–50 areas), Apply / Reset
- **Heat layer map** (right top): Leaflet map with colour-coded circle markers for each ranked area; click a marker to highlight its card
- **Ranked cards** (right bottom): each card shows rank, area name, city, primary highlight metric with formatted value, score bar, and secondary highlights

---

## Dashboard (`/dashboard`)

- Summary bar: 4 count cards — Saved CoG Runs, Bookmarked Areas, Active Alerts, Triggered Alerts
- **Saved CoG Targets widget**: list of previously saved CoG solver runs; expandable cards show a mini Leaflet map of the result location + composite score, yield, vacancy, price/m²; delete button
- **Bookmarked Areas widget**: list of bookmarked areas with city and date; remove button
- **Alerts widget**: metric threshold alerts per area (yield, vacancy, crime index, price/m²); conditions "rises above" / "falls below" with a numeric threshold; triggered alerts highlighted; Add alert form; manual "Run check now" button

---

## About (`/about`)

- Hero with headline "Find the Centre of Gravity" + CTA button to Explore Areas
- Live area metric cards driven by detected location: Avg Price, Rental Yield, Vacancy, Crime Index, Population Growth, Planned Developments
- Platform explanation sections: how to use CoG, user type cards (investors, developers, market researchers), step-by-step guide

---

## Settings (`/settings`)

- Theme toggle (light / dark — applies to the document root)
- Currency selector with live price format preview
- Compact mode toggle
- Default landing page selector
- Display name + email visibility (public / private)
- Notification toggles: Marketing, Product updates, Market alerts
- Privacy toggles: Show location, Share analytics
- Clear local preferences button (clears localStorage filters and saved area selections)
- Save and Reset to defaults buttons

---

## Infrastructure

- **Frontend**: React SPA → Vercel (auto-deploy from `master`)
- **Backend**: Flask + Gunicorn → Render (auto-deploy from `master`)
- **Database**: Neon serverless PostgreSQL
- **Source control**: GitHub — `jj-amogelang/DigitalEstate`
