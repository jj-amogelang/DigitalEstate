// Central glossary for metric definitions displayed in tooltips

const metricGlossary = {
  avg_price: {
    title: 'Average Property Price',
    definition:
      'Mean sale price over a period. Useful for level comparisons but can be skewed by outliers.',
    source: null
  },
  rental_yield: {
    title: 'Average Rental Yield',
    definition:
      'Annual rent as a % of property value: (annual rent ÷ value) × 100. Higher is more income-focused.',
    source: null
  },
  vacancy_rate: {
    title: 'Vacancy Rate',
    definition:
      'Share of rentals currently unoccupied: (vacant ÷ total) × 100. Lower suggests stronger demand.',
    source: null
  },
  safety_rating: {
    title: 'Safety Rating',
    definition:
      'Composite indicator of relative safety based on available data. Higher is safer; directional only.',
    source: null
  },
  population_density: {
    title: 'Population Density',
    definition:
      'People per km². Higher often aligns with more amenities—and potentially more congestion.',
    source: {
      name: 'Stats SA',
      url: 'https://www.statssa.gov.za',
      description: 'South African Statistics Authority'
    }
  },
  crime_index: {
    title: 'Crime Index',
    definition:
      'Relative crime prevalence. Higher indicates more crime; compare across areas, with context.',
    source: null
  },
  population_growth: {
    title: 'Population Growth',
    definition:
      'Percent change in population over time. Positive growth supports housing demand.',
    source: {
      name: 'Stats SA',
      url: 'https://www.statssa.gov.za',
      description: 'South African Statistics Authority'
    }
  },
  planned_dev_count: {
    title: 'Planned Developments',
    definition:
      'Count of upcoming/approved projects. Signals future supply and area momentum.',
    source: null
  },
  development_score: {
    title: 'Development Score',
    definition:
      'Heuristic score of development momentum (projects, upgrades, amenities). Higher suggests growth.',
    source: null
  }
};

export default metricGlossary;
