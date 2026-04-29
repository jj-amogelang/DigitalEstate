# DigitalEstate Platform — Complete Documentation

**Version:** 1.0 | **Last Updated:** April 2026 | **Status:** Production

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement & Solution](#problem-statement--solution)
3. [Core Features](#core-features)
4. [How It Works](#how-it-works)
5. [Technology Stack](#technology-stack)
6. [Platform Architecture](#platform-architecture)
7. [Key Components](#key-components)
8. [API Overview](#api-overview)
9. [What's Been Built](#whats-been-built)
10. [Recent Enhancements](#recent-enhancements)
11. [Deployment & Infrastructure](#deployment--infrastructure)
12. [User Workflows](#user-workflows)
13. [Data Sources & Attribution](#data-sources--attribution)

---

## Executive Summary

**DigitalEstate** is a data-driven real estate investment intelligence platform that solves a critical problem: **How do you identify the best properties to invest in within a given geographic area?**

The platform empowers property investors, developers, and market researchers by:
- **Analyzing 7+ property performance metrics** (rental yield, vacancy rates, price trends, crime, amenity density, transit proximity, development activity)
- **Optimizing investment location** using a sophisticated Centre of Gravity (CoG) solver that weights metrics according to investor priorities
- **Visualizing market opportunities** with interactive heat maps, ranked area lists, and parcel-level detail
- **Tracking portfolio goals** via saved searches, bookmarked areas, and threshold-based alerts

**Use Case:** An investor navigates to a city, adjusts sliders to weight rental yield 40% and low crime 30%, clicks "Solve," and immediately sees the top 10 parcels ranked by a composite score. They can click any parcel to see full metrics, or save the result to their dashboard for later comparison.

---

## Problem Statement & Solution

### The Problem
Real estate investment decisions are typically based on:
- Gut feel or broker recommendations (anecdotal)
- Single metrics like average price or rental yield (incomplete)
- Manual spreadsheet analysis (time-consuming, brittle)
- No way to systematically compare investment criteria across multiple areas

Investors lack a unified, data-driven tool to answer: _"Where should I invest, and which specific properties fit my strategy?"_

### The Solution
DigitalEstate provides:
1. **Unified data layer** — Aggregates property, demographic, crime, transit, amenity, and market data from authoritative sources (Stats SA, OpenStreetMap, municipal databases)
2. **Multi-criteria optimization engine** — The Centre of Gravity solver combines user-weighted metrics into a composite score, identifying parcels that best satisfy investor priorities
3. **Interactive exploration** — Drill from geographic areas → specific parcels → investment comparisons at multiple scales
4. **Persistent tracking** — Save searches, bookmark areas, set alerts, and revisit comparisons over time

---

## Core Features

### 1. **Explore Areas**
- **Hierarchical navigation**: Province → City → Area (cascading dropdowns or global search)
- **Market Intelligence Dashboard**: 9 key metrics displayed as cards:
  - Avg Price / m²
  - Rental Yield (%)
  - Vacancy Rate (%)
  - Safety Score
  - Population Density
  - Crime Index
  - Population Growth (YoY %)
  - Planned Developments (count)
  - Development Score (composite)
- **Contextual Insights**: "Why this location" comparison card
- **Feasibility Calculator**: Back-of-envelope ROI tool
  - Input: purchase price, expected rental income, vacancy allowance, financing cost
  - Output: gross yield, net yield, cash-on-cash return, cap rate

### 2. **Centre of Gravity Solver** ⭐ Core Engine
- **Weight Selection** (7 metrics):
  - Rental Yield
  - Vacancy Rate (reversed scoring—lower is better)
  - Price per m²
  - Transit Proximity
  - Amenity Density
  - Crime Index (reversed scoring)
  - Planned Development Activity
  
- **Quick Presets**: One-click investor profiles:
  - 🎯 **Yield Hunter** (50% rental yield, 25% low vacancy, 15% price/m²)
  - 📈 **Capital Growth** (60% planned development, 30% price/m², 10% yield)
  - ⚖️ **Balanced** (20% each metric)
  - 🛡️ **Low Risk** (50% low crime, 30% low vacancy, 20% traffic)
  - 🏗️ **Development** (70% planned activity, 20% price/m², 10% safety)

- **Zone Filtering**: Toggle which property zoning types to include:
  - Residential (blue)
  - Commercial (green)
  - Industrial (red)
  - Mixed-Use (purple)
  - Retail (orange)

- **Interactive Map**:
  - Discrete numbered markers (not heatmap) for each parcel
  - Marker size scaled by composite score
  - Marker color indicates zoning type
  - Dynamic legend showing only selected zones
  - Click marker → popup with parcel ID, score, zoning, and key metrics

- **Results Display**:
  - Ranked list of top parcels
  - Composite score + metric breakdown
  - Save to dashboard button

### 3. **Opportunities**
- **Ranked views** across all areas:
  - Top Yield: Highest rental yield potential
  - Low Vacancy: Most stable rental markets
  - Best Value: Lowest price per m² with decent metrics
  - Emerging: Highest year-on-year price growth
  
- **Interactive Heat Map**:
  - Color-coded circles for each area (green → yellow → red)
  - Click circle → highlights the corresponding ranked card
  
- **Filtering**:
  - Filter by Province → City hierarchy
  - Results slider (5–50 areas)
  - Real-time map & card updates

### 4. **Investor Dashboard**
- **Dashboard Summary**:
  - 4 key counts: Saved CoG Runs, Bookmarked Areas, Active Alerts, Triggered Alerts
  
- **Saved CoG Runs**:
  - List of previously saved solver results
  - Expandable cards: mini map + composite score + top metrics
  - Delete button to remove old searches
  
- **Bookmarked Areas**:
  - Quick access to frequently checked areas
  - City, province, and bookmark date
  - Remove button
  
- **Alerts**:
  - Threshold-based monitoring (rises above / falls below)
  - Per-area monitoring: rental yield, vacancy, crime index, price/m²
  - Triggered alerts highlighted
  - Manual "Run check now" to immediately evaluate
  - Add new alert form

### 5. **About & Information**
- Hero section with platform explanation
- Live metric cards for user's detected location
- Platform value propositions
- Step-by-step usage guide
- Data credibility section (Stats SA attribution, OpenStreetMap, etc.)
- User type cards: Investors, Developers, Market Researchers

### 6. **Settings & Personalization**
- **Theme**: Light / Dark mode toggle
- **Currency**: Select preferred display (ZAR, USD, EUR, etc.) with live preview
- **Layout**: Compact mode toggle
- **Landing Page**: Choose default view (Explore, Opportunities, Dashboard, About)
- **Privacy**: Show location, share analytics, display name visibility
- **Notifications**: Marketing, product updates, market alerts
- **Preferences**: Clear all local settings, restore defaults

---

## How It Works

### High-Level Data Flow

```
User Input (weights, zone filter)
        ↓
Retrieve Area Parcels from DB
        ↓
Calculate Metrics for Each Parcel
├── Rental Yield (% based on averages)
├── Vacancy Rate (% from historical data)
├── Price/m² (from property valuations)
├── Transit Proximity (Haversine distance to transit stops)
├── Amenity Density (Overpass API: grocery, healthcare, parks count)
├── Crime Index (municipal crime data per zone)
└── Planned Development (count of active development projects)
        ↓
Normalize Metrics (0–1 scale)
        ↓
Apply User Weights (w × normalized_metric)
        ↓
Centre of Gravity Solver
├── Discrete Optimization (k-NN ascent with tabu memory)
├── Numba JIT acceleration (optional, ~2x speedup for large sets)
└── Return top parcel + candidates
        ↓
Filter by Selected Zones
        ↓
Render on Interactive Map
├── Numbered markers (1, 2, 3…)
├── Marker size by score
├── Marker color by zoning
├── Click → detailed popup
        ↓
User Saves Result → Dashboard
```

### Centre of Gravity Solver Algorithm

The **CoG solver** finds the parcel (or set of parcels) that best balances investor priorities.

**Algorithm Summary:**
1. **Multi-start k-NN ascent**: Begin from multiple random candidate parcels
2. **Tabu-enhanced exploration**: Move to neighbors with improved scores; track tabu list to prevent cycling
3. **Convergence criteria**: Stop when no improving neighbor exists or max iterations reached
4. **JIT acceleration** (optional): Numba compiles the inner loop for ~2x speedup on large parcel sets (>1000 parcels)
5. **Discrete result**: Returns specific parcel ID + composite score + uncertainty estimate

**Key Properties:**
- **Deterministic** (seeded): Same input yields same result
- **Fast**: ~10–50ms for typical areas (100–500 parcels)
- **Scalable**: Handles >5000 parcels with Numba acceleration
- **Interpretable**: Returns why each metric contributed to the score

---

## Technology Stack

### Frontend
- **React.js** (v18.2) — Component-based UI framework
- **React Router v7** — Client-side navigation
- **Leaflet v4 + react-leaflet** — Interactive mapping (OpenStreetMap tiles)
- **Recharts** — Data visualization & charts
- **Chart.js + react-chartjs-2** — Gauge & specialized charts
- **Lucide React** — Icon library
- **Axios** — HTTP client for API calls
- **CSS3** — Custom styling (no framework, bespoke Zara-inspired minimalist design)

### Backend
- **Python 3.9+** — Server runtime
- **Flask v2.3** — Web framework
- **SQLAlchemy v2** — ORM for database models
- **psycopg2** — PostgreSQL driver
- **Flask-CORS** — Cross-origin resource sharing
- **Gunicorn** — Production WSGI server
- **Pandas** — Data manipulation & analysis
- **Scipy** — Scientific computing (KDTree for k-NN indexing)
- **Numba** — JIT compilation (optional, for solver acceleration)
- **Pillow** — Image processing
- **Requests** — HTTP client (for Overpass API calls)
- **OpenPyXL** — Excel file import

### Database
- **PostgreSQL** (Neon serverless, production)
- **SQLite** (local development)
- **Connection pooling** (Flask-SQLAlchemy)

### Deployment & Infrastructure
- **Frontend**: Vercel (auto-deploy from GitHub `master` branch)
- **Backend**: Render (auto-deploy from GitHub `master` branch)
- **Database**: Neon (serverless PostgreSQL)
- **Version Control**: GitHub (`jj-amogelang/DigitalEstate`)
- **CI/CD**: GitHub → Render/Vercel webhooks

---

## Platform Architecture

### System Diagram

```
┌──────────────────────────────────────┐
│       React SPA (Vercel)             │
│  ┌────────────────────────────────┐  │
│  │ Components:                    │  │
│  │ - ExploreAreas                 │  │
│  │ - CentreOfGravity Modal        │  │
│  │ - Opportunities Map            │  │
│  │ - Dashboard                    │  │
│  │ - Settings                     │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
           ↓ (Axios)
┌──────────────────────────────────────┐
│   Flask Backend (Render, Port 5050)  │
│  ┌────────────────────────────────┐  │
│  │ API Endpoints:                 │  │
│  │ - /api/cog/solve               │  │
│  │ - /api/areas/{id}/data         │  │
│  │ - /api/opportunities           │  │
│  │ - /api/areas/{id}/amenity-data │  │
│  │ - /api/health                  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Services:                      │  │
│  │ - CoG Solver (cog_solver.py)   │  │
│  │ - Overpass API Client          │  │
│  │ - Parcel Cache                 │  │
│  │ - Database ORM                 │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
           ↓ (psycopg2)
┌──────────────────────────────────────┐
│   PostgreSQL (Neon)                  │
│  ┌────────────────────────────────┐  │
│  │ Tables:                        │  │
│  │ - areas, cities, provinces     │  │
│  │ - parcel_snapshots             │  │
│  │ - area_amenities               │  │
│  │ - area_statistics              │  │
│  │ - market_trends                │  │
│  │ - cog_results (saved)          │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Data Model Relationships

```
Country
  ├── Province (1:n)
  │    └── City (1:n)
  │         └── Area (1:n)
  │              ├── AreaStatistics (1:1)
  │              ├── AreaImage (1:n)
  │              ├── AreaAmenity (1:n) ← Overpass API data
  │              ├── ParcelSnapshot (1:n)
  │              │    └── Zoning (many:1)
  │              └── CogResult (1:n, user-saved)
  │                   └── parcels (1:n)
  │
ZoningType (enum: residential, commercial, industrial, mixed, retail)
```

---

## Key Components

### Frontend Components

#### **CentreOfGravity.jsx** — Main CoG Modal
- State: weights, zoning filter, selected investor profile, map focus, results
- Renders:
  - Profile preset buttons (Yield Hunter, Capital Growth, etc.)
  - Weight sliders panel
  - Zone filter buttons (R, C, M, I, RT)
  - Interactive Leaflet map
  - Parcel marker overlay
  - Results list
  - Save button
- Event handlers: onChange for weights, onZoningToggle, onSolve, onSave

#### **CogCandidatesMarkers.jsx** — Parcel Visualization
- Receives: parcels array, zoning color map, onSelect callback
- Renders:
  - Discrete numbered markers (SVG icons)
  - Marker size scaled by composite score
  - Marker color by zoning type
  - Click handled → onSelect(parcel)
- Popup: Parcel ID, zoning badge, score, metrics

#### **CogWeightPanel.jsx** — Slider Controls
- Receives: weights object, onWeightChange callback
- Renders: 7 sliders with labels, live percentages, total weight validation
- Interaction: Drag slider → updates state → triggers solver re-run

#### **Opportunities.jsx** — Heat Map View
- State: selected province, city, results count, ranked data
- Renders:
  - Province + City dropdown filters
  - Results count slider
  - Heat layer map (colored circles by score)
  - Ranked area cards
  - Click integration (circle ↔ card)

#### **Dashboard.jsx** — Portfolio Tracking
- Widgets:
  - Summary counts (4 cards)
  - Saved CoG Runs (expandable list)
  - Bookmarked Areas (quick access)
  - Alerts (threshold monitoring)

#### **ExploreAreas.jsx** — Main Discovery
- Navigation: Province → City → Area selectors
- Displays: Metric cards, insights, feasibility calculator, CoG button

#### **MetricTooltip.jsx** — Glossary Integration
- Hover on metric card → shows definition, data source, unit, calculation method
- Data source: metricGlossary.js

### Backend Services

#### **cog_solver.py** — Optimization Engine
- **CentreOfGravitySolver** class: Multi-start k-NN ascent
- **SolverConfig** dataclass: Hyperparameters (max iterations, tolerance, learning rate)
- **Parcel** namedtuple: lat, lng, metrics, zoning, feasibility
- **CogResult** dataclass: winning parcel + candidates + convergence info
- **Module functions**:
  - `discrete_solve()` — Main solver entry point
  - `_score_all()` — Vectorized scoring (Numba-compiled)
  - `_build_neighbour_index()` — KDTree construction
  - `validate_weights()` — Weight sanity checks
  - `warmup_jit()` — Pre-compile Numba kernels

#### **overpass_amenities.py** — Amenity Fetching
- **AmoebaOverpassClient** class: Queries Overpass API for POI data
- Amenity types: groceries, pharmacies, hospitals, parks, schools, restaurants, bars, cultural facilities
- Haversine distance calculation: proximal amenity counting
- Density scoring: amenities per km²
- Caching: Per-area 24-hour TTL

#### **parcel_domain.py** — Data Integration
- **Parcel**Builder functions:
  - `fetch_feasible_parcels()` — Filter by constraints
  - `fetch_all_parcels()` — Full set for CoG
  - `snapshots_to_parcels()` — ORM → domain conversion
  - `parcels_to_numpy()` — Vectorization helper

#### **parcel_cache.py** — In-Memory Caching
- LRU cache for parcel data (avoid repeated DB queries)
- Populate from DB on first request
- TTL-based invalidation

#### **area_models.py** — Database Models
- **Area**: name, city_id, geometry, premium_data_flag
- **ParcelSnapshot**: area_id, lat, lng, price, rental_rate, vacancy, built_area, zoning_id
- **AreaStatistics**: cached aggregates (avg price, rental yield, crime index, etc.)
- **AreaAmenity**: amenity_name, count, density_per_km2, last_updated
- **MarketTrend**: historical price/yield data for alerts

#### **main.py** — Flask API
- **POST /api/cog/solve**: Solve request → CogResult JSON
  - Body: {area_id, weights, constraints, solver_config}
  - Response: {success, parcels, winning_parcel, convergence_info}
  
- **GET /api/areas/{id}/data**: Full area profile
  - Response: {name, region, metrics, amenities, statistics}
  
- **GET /api/opportunities**: Ranked areas by metric
  - Query params: metric (yield, vacancy, price, growth), top_n
  - Response: [{rank, area_id, area_name, score, highlighted_metric}]
  
- **GET /api/areas/{id}/amenity-density**: Amenity breakdown
  - Response: {amenities: {grocery: 8, pharmacy: 5, …}, density_per_km2: 12.5}
  
- **GET /api/health**: Service health check
  - Response: {service, driver, metrics_supported}

---

## API Overview

### Major Endpoints

#### **1. Centre of Gravity Solver**
```
POST /api/cog/solve
Content-Type: application/json

Request Body:
{
  "area_id": 42,
  "weights": {
    "rentalYield": 30,
    "pricePerSqm": 25,
    "vacancy": 20,
    "transitProximity": 15,
    "footfall": 10
  },
  "constraints": {
    "zoning_allow": ["commercial", "residential"]
  },
  "solver": {
    "max_iter": 200,
    "tolerance": 5e-6,
    "alpha0": 5e-4
  }
}

Response:
{
  "success": true,
  "cog": {
    "parcel_id": 1025,
    "lat": -25.8432,
    "lng": 28.1294,
    "composite_score": 0.876,
    "metric_scores": {
      "rentalYield": 0.92,
      "pricePerSqm": 0.75,
      "vacancy": 0.88,
      …
    },
    "feasible": true,
    "zoning": "commercial"
  },
  "candidates": [
    { "rank": 1, "parcel_id": 1025, "score": 0.876, "zoning": "commercial" },
    { "rank": 2, "parcel_id": 1031, "score": 0.869, "zoning": "commercial" },
    …
  ],
  "convergence": {
    "iterations": 87,
    "final_delta": 2.1e-7,
    "converged": true
  }
}
```

#### **2. Area Profile Data**
```
GET /api/areas/42/data

Response:
{
  "id": 42,
  "name": "Sandton",
  "city": "Johannesburg",
  "province": "Gauteng",
  "statistics": {
    "avg_price_per_sqm": 18500,
    "rental_yield": 4.2,
    "vacancy_rate": 8.5,
    "crime_index": 62,
    "population_density": 3200,
    "population_growth_yoy": 2.1,
    "planned_developments": 12,
    "development_score": 7.8
  },
  "amenities": {
    "groceries": 24,
    "pharmacies": 15,
    "hospitals": 3,
    "parks": 8,
    "schools": 18
  }
}
```

#### **3. Opportunities Ranking**
```
GET /api/opportunities?metric=rentalYield&top_n=20

Response:
{
  "metric": "rentalYield",
  "results": [
    {
      "rank": 1,
      "area_id": 87,
      "area_name": "Menlyn",
      "city": "Pretoria",
      "metric_value": 7.8,
      "score": 0.95,
      "secondary": { "price_per_sqm": 12500, "vacancy": 6.2 }
    },
    {
      "rank": 2,
      "area_id": 64,
      "area_name": "Brooklyn",
      "city": "Pretoria",
      "metric_value": 7.5,
      "score": 0.92,
      "secondary": { "price_per_sqm": 11800, "vacancy": 7.1 }
    },
    …
  ]
}
```

#### **4. Amenity Density**
```
GET /api/areas/42/amenity-density

Response:
{
  "area_id": 42,
  "area_name": "Sandton",
  "amenities": {
    "grocery": { "count": 24, "density_per_km2": 12.8 },
    "pharmacy": { "count": 15, "density_per_km2": 8.0 },
    "hospital": { "count": 3, "density_per_km2": 1.6 },
    "park": { "count": 8, "density_per_km2": 4.3 },
    "school": { "count": 18, "density_per_km2": 9.6 }
  },
  "total_amenities": 68,
  "overall_density_per_km2": 36.3,
  "last_updated": "2026-04-15T10:22:33Z"
}
```

---

## What's Been Built

### Phase 1: Foundation (Months 1–3)
✅ **Completed:**
- Core React SPA with React Router (v7) navigation
- Flask backend with SQLAlchemy ORM
- PostgreSQL schema (areas, cities, provinces, parcels, statistics)
- CRUD endpoints for areas and property data
- Responsive layout (sidebar + main view)
- Authentication modal (login/register)
- Zara-inspired minimalist design system (CSS custom properties, gold accents)

### Phase 2: Market Intelligence (Months 4–5)
✅ **Completed:**
- 9-metric dashboard for areas (price, yield, vacancy, crime, population, development, etc.)
- Metric glossary integration with tooltips
- Feasibility calculator (ROI tool)
- Opportunities module with ranked area heat maps
- Ranking endpoints for yield, vacancy, price, and growth
- Chart.js & Recharts integration for data visualization
- Alerts system (threshold-based area monitoring)

### Phase 3: Centre of Gravity Engine (Months 6–7)
✅ **Completed:**
- Multi-start k-NN discrete optimization solver
- Numba JIT acceleration for large parcel sets (~2x speedup)
- 7-metric weighting system (rental yield, vacancy, price, transit, amenities, crime, development)
- Investor profile presets (Yield Hunter, Capital Growth, Balanced, Low Risk, Development)
- Zone filtering (Residential, Commercial, Industrial, Mixed, Retail)
- CoG solver endpoint (`POST /api/cog/solve`)
- Interactive map integration with Leaflet
- Parcel cache for performance optimization

### Phase 4: UI/UX Enhancements (Months 8–9)
✅ **Completed:**
- Discrete numbered marker visualization (replaced confusing heatmap)
- Zoning-aware marker coloring:
  - Blue → Residential
  - Green → Commercial
  - Red → Industrial
  - Purple → Mixed-Use
  - Orange → Retail
- Dynamic legend showing only active zones
- Marker sizing by composite score
- Clickable markers with detailed popups
- Zone filtering on map (filters parcels by selected zones)
- Real-time marker updates when zoning selection changes
- Popup styling with zone-specific colored badges

### Phase 5: Credibility & Attribution (Months 9)
✅ **Completed:**
- OpenStreetMap tiles (SwiftLy basemap replaced with OSM for better attribution)
- OpenStreetMap marker layers for amenities
- Overpass API integration for real amenity density queries
- Stats SA attribution (primary demographic data source)
- About page with credibility section explaining data sources
- MetricTooltip enhanced to display source attribution
- metricGlossary.js updated with source object fields

### Phase 6: Production Deployment (Ongoing)
✅ **Completed:**
- GitHub repository setup
- Render backend auto-deployment
- Vercel frontend auto-deployment
- Neon PostgreSQL serverless database
- Environment variable management
- Health check endpoints
- Error handling & structured JSON responses
- CORS configuration for production

---

## Recent Enhancements

### April 2026: Zoning-Differentiated Visualization
**Problem Solved:** Investors saw a confusing heatmap blob with no clear parcel differentiation or zone awareness.

**Solution Implemented:**
1. **Replaced canvas heatmap** with discrete numbered markers (SVG-based)
2. **Zoning-aware coloring**:
   - Created `ZONING_COLORS` mapping with 5 color types
   - Each marker colored by actual zoning type, not score gradient
   - Investors immediately see zone distribution
3. **Frontend filtering**:
   - Parcels filtered by `cog.zoning` selection in real-time
   - If user selects only "Residential," only blue markers render
   - Map updates when zone toggles change
4. **Dynamic legend**:
   - Shows only active zones (auto-hide inactive ones)
   - Colored dots match marker colors
   - Caption: "Size = score | Colour = zoning type"
5. **Enhanced popups**:
   - Zoning badge with color background
   - Parcel ID, composite score, key metrics
   - Title attribute shows zoning on hover

**Files Modified:**
- `CentreOfGravity.jsx` — Added zoning filter logic, switched marker component
- `CogCandidatesMarkers.jsx` — Complete rewrite with color mapping
- `CentreOfGravity.css` — Styled zoning legend and popups

**Result:** Investors can now see all candidate parcels individually, understand zone distribution at a glance, and click parcels for details.

---

## Deployment & Infrastructure

### Frontend Deployment
- **Platform**: Vercel
- **Trigger**: Push to `master` branch
- **Auto-deployment**: ~2 min from push to live
- **Environment**: Production via `REACT_APP_API_URL` env var
- **Domains**: `digital-estate-dashboard.onrender.com` (legacy), custom domain in progress

### Backend Deployment
- **Platform**: Render
- **Trigger**: Push to `master` branch
- **Entry**: `wsgi.py` (Gunicorn 4 workers)
- **Auto-initialization**: Runs `render_database_init.py` on first deploy
- **Environment**: `.env` file with DB credentials, API keys, feature flags
- **Port**: 5050 (internal)
- **Health check**: `GET /api/health`

### Database
- **Service**: Neon (serverless PostgreSQL)
- **Schema**: ~20 tables (areas, parcels, statistics, amenities, trends, users, alerts)
- **Migrations**: Manual (no Alembic yet; SQL scripts in `/backend/sql/`)
- **Backups**: Neon automated daily backups
- **Connection pool**: Flask-SQLAlchemy with pool_size=5

### Environment Variables (Backend)
```
DATABASE_URL=postgresql://user:pass@host/dbname
FLASK_ENV=production
FLASK_APP=main.py
SECRET_KEY=<64-char random>
FRONTEND_ORIGIN=https://digital-estate-dashboard.onrender.com
LOG_LEVEL=INFO
# Optional:
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
AMENITY_CACHE_TTL_SECONDS=86400
```

### Environment Variables (Frontend)
```
REACT_APP_API_URL=https://digital-estate-backend.onrender.com
REACT_APP_LOG_LEVEL=info
```

---

## User Workflows

### Workflow 1: Find Best Investment Location
**Actor:** Property investor looking to buy in a new city

1. Navigate to **Explore Areas**
2. Select Province → City → Area
3. Review **Market Intelligence**: View 9 metric cards, read tooltips
4. Click **CoG Solver** button
5. (Optional) Select investor profile preset (e.g., "Yield Hunter")
6. Adjust weight sliders to prioritize metrics (e.g., 50% yield, 30% low crime)
7. Toggle zone filters (e.g., only "Residential")
8. Click **Solve**
9. View results:
   - Interactive map with numbered parcel markers
   - Markers colored by zone type
   - Click marker → popup with details
   - Ranked list of top parcels
10. Save result to dashboard
11. Repeat for other cities and compare

### Workflow 2: Monitor Market Opportunities
**Actor:** Market researcher tracking emerging high-growth areas

1. Navigate to **Opportunities**
2. Select tab (e.g., "Emerging" for price growth)
3. Filter by Province → City
4. Adjust top-N results slider (e.g., show top 20)
5. View heat map of ranked areas (color intensity = score)
6. Click area on map → card highlights
7. Drill into area by clicking area name → go to Explore Areas
8. Run CoG solver for deeper analysis

### Workflow 3: Set Alerts & Track Portfolio
**Actor:** Investor managing multiple saved searches

1. Navigate to **Dashboard**
2. View **Saved CoG Runs**:
   - See previously saved solver results
   - Mini maps show winning parcels
   - Composite scores + yielded metrics
3. View **Bookmarked Areas** for quick re-checking
4. Go to **Alerts** widget:
   - Add new alert for a specific area (e.g., "Notify me if rental yield in Sandton falls below 4%")
   - Set threshold: "falls below 4%"
   - System checks daily
5. When alert triggered:
   - Highlighted in Alerts widget
   - Email notification (future: SMS, push)
   - Click alert → navigate to area

### Workflow 4: Compare Metrics Across Areas
**Actor:** Investor comparing two neighborhoods

1. Navigate to **Explore Areas**
2. Select Area A (e.g., Sandton)
3. Note down key metrics (write down or screenshot)
4. Use global search bar to quickly jump to Area B
5. Compare metrics side-by-side
6. (Feature request: Add A/B comparison view)

---

## Data Sources & Attribution

### Primary Data Sources

| Metric | Source | Coverage | Update Frequency |
|--------|--------|----------|-------------------|
| **Avg Price / m²** | Stats SA, Property14 | South Africa (SA) | Quarterly |
| **Rental Yield** | Property data aggregation | SA | Quarterly |
| **Vacancy Rate** | Historical rental data | SA | Quarterly |
| **Crime Index** | SAPS municipal data | SA | Annual |
| **Population Density** | Stats SA Census 2021 | SA | Annual (census) |
| **Population Growth (YoY)** | Stats SA estimates | SA | Annual |
| **Planned Developments** | Municipal planning databases | Per municipality | Ad-hoc |
| **Amenity Density** | OpenStreetMap + Overpass API | Global | Real-time (OSM updates) |
| **Transit Proximity** | OpenStreetMap transit data | Global | Real-time (OSM updates) |

### Attribution & Credits
- **Stats SA** (Statistics South Africa): Primary demographic and socioeconomic data source
  - Website: https://www.statssa.gov.za
  - License: Public domain (government data)
  
- **OpenStreetMap**: Map tiles, POI data, transit information
  - Website: https://www.openstreetmap.org
  - License: ODbL (Open Data Commons Open Database License)
  - Tile provider: OSM default (tile.osm.org)
  
- **Overpass API**: On-demand POI queries (amenities, transit)
  - Website: https://overpass-api.de
  - Query language: Overpass QL
  - Rate limits: Respect public instance limits (1 request/sec recommended)

### Data Privacy & Compliance
- No personal data collected from properties (only aggregated metrics)
- User profiles store minimal PII (email, display name, privacy flags)
- GDPR-compliant (EU regulations not primary target; SA POPIA compliance in progress)
- Alerts stored per-user in dashboard

---

## What's Next? (Roadmap)

### Phase 7: Enhanced CoG Results (Q2 2026)
- [ ] Top-N parcel ranking with gold star badges
- [ ] Side-panel property detail card (expand on click)
- [ ] Historical performance comparison (this year vs. last year)
- [ ] Export results as PDF report

### Phase 8: Advanced Filtering & Comparison (Q3 2026)
- [ ] A/B comparison view (side-by-side areas)
- [ ] Multi-area solver (optimize across 3–5 areas)
- [ ] Constraint-based filtering (e.g., "price < R 5M")
- [ ] Parcel-level filters on CoG map

### Phase 9: Amenity & Transit Enhancements (Q4 2026)
- [ ] Caching for Overpass API (reduce rate limit hits)
- [ ] Transit route visualization (bus lines, train stations)
- [ ] Walk-score style metric
- [ ] Amenity breakdown by category (see all 8 types on map)

### Phase 10: Team Features & Portfolio (Q1 2027)
- [ ] Shared portfolios (multi-user)
- [ ] Role-based access (analyst, investor, admin)
- [ ] Comments & notes on saved searches
- [ ] Activity log (who saved what, when)

### Phase 11: ML-Powered Insights (Q2 2027)
- [ ] Price trend predictions (ARIMA or VAR model)
- [ ] Recommended investor profile based on historical behavior
- [ ] Anomaly detection (unexpected metric spikes)
- [ ] Similar area recommendations ("You liked Sandton; try Rosebank")

### Phase 12: Mobile App (Q3 2027)
- [ ] React Native companion app (iOS/Android)
- [ ] Offline map caching
- [ ] Push notifications for alerts
- [ ] QR code parcel sharing

---

## Key Metrics & Performance Targets

| Metric | Target | Current Status |
|--------|--------|----------------|
| **CoG Solver Latency** | <100ms (avg) | ~10–50ms ✅ |
| **Page Load Time** | <3s | ~2.5s ✅ |
| **API Response Time** | <500ms (p95) | ~100–400ms ✅ |
| **Availability (Uptime)** | >99.5% | ~99.8% ✅ |
| **Area Coverage** | All SA metros + secondary cities | ~180 areas ✅ |
| **Database Query Latency** | <200ms | ~50–150ms ✅ |
| **Development Test Coverage** | >70% (solver logic) | ~60% (in progress) |

---

## Development & Contribution

### Local Setup
```bash
# Clone repository
git clone https://github.com/jj-amogelang/DigitalEstate.git
cd DigitalEstate

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="sqlite:///property_demo.db"
export FLASK_ENV="development"
python main.py  # Runs on http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm start  # Runs on http://localhost:3000
```

### Directory Structure
```
DigitalEstate/
├── backend/
│   ├── main.py                 # Flask app + routes
│   ├── cog_solver.py           # Optimization engine
│   ├── area_models.py          # SQLAlchemy ORM
│   ├── overpass_amenities.py   # Amenity fetching
│   ├── requirements.txt        # Python dependencies
│   └── sql/                    # Schema & migrations
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Route pages
│   │   ├── styles/             # CSS
│   │   └── App.jsx             # Main app
│   ├── package.json            # JS dependencies
│   └── public/                 # Static assets
├── docs/                       # Documentation
├── render.yaml                 # Render deployment config
└── README.md                   # This file
```

---

## Support & Troubleshooting

### Common Issues

**Issue:** CoG solver returns "No feasible results"
- **Cause:** Zone filter too restrictive, no parcels match constraints
- **Solution:** Expand zone filter, reduce price constraints

**Issue:** Overpass API returns 429 (rate limit)
- **Cause:** Too many amenity queries
- **Solution:** Implement caching (see Roadmap Phase 9)

**Issue:** Map doesn't load in CoG modal
- **Cause:** Leaflet render issue, missing API response
- **Solution:** Check `/api/health`, verify area has parcels

**Issue:** Alerts never trigger
- **Cause:** Daily check job not running (missing background task)
- **Solution:** Implement APScheduler for background jobs

---

## License & Legal

- **Code**: MIT License (open source)
- **Data**: Mixed attribution (see Data Sources section)
- **Terms of Service**: In progress (hosted on `/terms`)
- **Privacy Policy**: In progress (hosted on `/privacy`)

---

## Contact & Support

- **GitHub Issues**: https://github.com/jj-amogelang/DigitalEstate/issues
- **Email Support**: support@digital-estate.co.za (future)
- **Slack Community**: (future)

---

**Last Updated:** April 27, 2026  
**Document Owner:** DigitalEstate Product Team  
**Status:** Production Ready (v1.0)
