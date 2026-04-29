import React from 'react';
import { ExternalLink, CheckCircle, BarChart3, MapPin } from 'lucide-react';
import './styles/about-page.css';

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <div className="about-hero">
        <div className="about-hero-content">
          <h1>About DigitalEstate</h1>
          <p className="about-tagline">
            Data-driven property investment insights for South Africa
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="about-container">
        {/* Mission Section */}
        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            DigitalEstate empowers property investors with transparent, data-driven location analysis 
            and feasibility assessment. Using the Centre of Gravity optimization engine, we identify 
            optimal investment zones that align with your strategy—whether you're chasing yield, 
            growth, or capital preservation.
          </p>
        </section>

        {/* Credibility Section */}
        <section className="about-section credibility-section">
          <h2>Credibility & Data Sources</h2>
          <p className="credibility-intro">
            We prioritize data integrity and transparency. Our key demographic and statistical metrics 
            are anchored in official government data:
          </p>

          <div className="data-sources-grid">
            {/* Stats SA */}
            <div className="data-source-card">
              <div className="source-icon stats-sa">
                <BarChart3 size={32} />
              </div>
              <h3>
                <a 
                  href="https://www.statssa.gov.za" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="source-link"
                >
                  Statistics South Africa (Stats SA)
                  <ExternalLink size={14} className="external-icon" />
                </a>
              </h3>
              <p className="source-description">
                Official national statistics authority providing authoritative demographic, 
                population, and economic data.
              </p>
              <div className="source-metrics">
                <div className="metric-tag">Population Density</div>
                <div className="metric-tag">Population Growth</div>
                <div className="metric-tag">Census Data</div>
              </div>
            </div>

            {/* OpenStreetMap */}
            <div className="data-source-card">
              <div className="source-icon osm">
                <MapPin size={32} />
              </div>
              <h3>
                <a 
                  href="https://www.openstreetmap.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="source-link"
                >
                  OpenStreetMap
                  <ExternalLink size={14} className="external-icon" />
                </a>
              </h3>
              <p className="source-description">
                Community-driven global mapping database providing real-time location data, 
                amenities, and geographic information.
              </p>
              <div className="source-metrics">
                <div className="metric-tag">Amenities Mapping</div>
                <div className="metric-tag">Transportation</div>
                <div className="metric-tag">Geographic Data</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="about-section">
          <h2>Key Features</h2>
          <div className="features-list">
            <div className="feature-item">
              <CheckCircle className="feature-icon" />
              <div className="feature-content">
                <h3>Centre of Gravity Optimization</h3>
                <p>
                  Advanced k-NN solver identifies optimal parcels matching your investment 
                  profile across multiple weighted metrics.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <CheckCircle className="feature-icon" />
              <div className="feature-content">
                <h3>Investment Feasibility Analysis</h3>
                <p>
                  Calculate bond affordability, cash-on-cash returns, IRR, and renovation 
                  scenarios with transparency and context.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <CheckCircle className="feature-icon" />
              <div className="feature-content">
                <h3>Real-Time Amenity Scoring</h3>
                <p>
                  Evaluate local amenities (schools, clinics, retail, transport) via 
                  OpenStreetMap integration for investor-friendly footfall metrics.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <CheckCircle className="feature-icon" />
              <div className="feature-content">
                <h3>Transparent Data Attribution</h3>
                <p>
                  Every metric is sourced, verified, and linked so you know exactly where 
                  your insights come from.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Disclaimer Section */}
        <section className="about-section disclaimer-section">
          <h2>Important Disclaimer</h2>
          <p>
            DigitalEstate provides analytical tools and insights for educational and 
            informational purposes. Our data is sourced from reputable public sources and 
            community-driven datasets, but we cannot guarantee completeness or real-time accuracy. 
            Property investment decisions should always be made in consultation with qualified 
            financial advisors, legal professionals, and local property experts.
          </p>
          <p className="disclaimer-emphasis">
            Past performance and data trends do not guarantee future results. Always conduct 
            independent due diligence before making investment decisions.
          </p>
        </section>

        {/* Contact Section */}
        <section className="about-section contact-section">
          <h2>Get In Touch</h2>
          <p>
            Questions about our data sources, methodology, or features? 
            We'd love to hear from you. Visit our contact page or connect via social media.
          </p>
          <div className="contact-buttons">
            <a href="mailto:support@digitalestate.co.za" className="btn btn-primary">
              Email Support
            </a>
            <a href="/settings" className="btn btn-secondary">
              Settings & Preferences
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
