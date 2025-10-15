// Central glossary for metric definitions displayed in tooltips

const metricGlossary = {
  avg_price: {
    title: 'Average Property Price',
    definition:
      'The average property price for an area is calculated by summing the prices of all properties sold within a specific timeframe and dividing by the number of sales. This figure, also known as the mean price, indicates a general price point, but it can be skewed by extremely high or low-priced properties, which is why the median price is often used instead, as it represents the middle value of a sorted list of sales prices.'
  },
  rental_yield: {
    title: 'Average Rental Yield',
    definition:
      'Rental yield measures annual rental income as a percentage of the property’s purchase price or current value. It is calculated as (annual rent ÷ property value) × 100. Higher yields can indicate stronger income returns but may also be associated with higher risk or lower capital growth.'
  },
  vacancy_rate: {
    title: 'Vacancy Rate',
    definition:
      'The vacancy rate is the percentage of rental properties that are unoccupied at a given time. It is calculated as (vacant units ÷ total rental units) × 100. Lower vacancy typically indicates stronger rental demand and pricing power for landlords.'
  },
  safety_rating: {
    title: 'Safety Rating',
    definition:
      'A composite indicator reflecting relative safety in the area based on available data (e.g., reported incidents, local indices) and qualitative assessments. Higher values indicate better relative safety. Methodology may vary and should be interpreted as directional, not absolute.'
  },
  population_density: {
    title: 'Population Density',
    definition:
      'The number of people living per square kilometer (or mile) in an area. Higher density often correlates with increased amenities and transport options but may also imply congestion and higher competition for housing.'
  },
  crime_index: {
    title: 'Crime Index',
    definition:
      'An index measuring relative crime prevalence. Higher values typically indicate more crime. Interpret comparatively across areas and in context of population size and reporting practices.'
  },
  population_growth: {
    title: 'Population Growth',
    definition:
      'The percentage change in population over a period (e.g., year-over-year). Positive growth can support housing demand, rental markets, and long-term investment fundamentals.'
  },
  planned_dev_count: {
    title: 'Planned Developments',
    definition:
      'The count of upcoming or approved developments (e.g., residential, mixed-use, infrastructure) that may affect supply, pricing, and area attractiveness over time.'
  },
  development_score: {
    title: 'Development Score',
    definition:
      'A heuristic score indicating area development momentum, combining signals like new projects, infrastructure upgrades, and amenity expansion. Higher scores suggest stronger growth prospects.'
  }
};

export default metricGlossary;
