import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="dashboard">
      {/* Welcome Message for Authenticated Users */}
      {isAuthenticated && (
        <div className="welcome-banner">
          <div className="welcome-content">
            <h2 className="welcome-title">
              Welcome back, {user.firstName}! 👋
            </h2>
            <p className="welcome-subtitle">
              Ready to explore the South African property market? Your personalized dashboard awaits.
            </p>
          </div>
        </div>
      )}

      {/* Hero Section with Background Image */}
      <div className="dashboard-hero">
        <div className="hero-overlay">
          <div className="hero-content">
            <div className="hero-badge">About Digital Estate</div>
            <h1 className="dashboard-title">
              Smart, Data-Driven
              <span className="title-highlight"> Real Estate Dashboard</span>
            </h1>
            <p className="dashboard-subtitle">
              Designed to give you insights into all property in South Africa. 
              A centralized, user-friendly platform to explore property listings, view real-time data, and access detailed insights — all in one place.
            </p>
            <div className="hero-actions">
              <button 
                onClick={() => navigate('/properties')} 
                className="btn btn-primary hero-cta"
              >
                <span>Explore Properties</span>
                <svg className="cta-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button 
                onClick={() => navigate('/properties')} 
                className="btn btn-secondary hero-cta-secondary"
              >
                View Live Data
              </button>
            </div>
            <div className="hero-metrics">
              <div className="metric">
                <div className="metric-number">Live</div>
                <div className="metric-label">Property Data</div>
              </div>
              <div className="metric-divider"></div>
              <div className="metric">
                <div className="metric-number">All</div>
                <div className="metric-label">South Africa</div>
              </div>
              <div className="metric-divider"></div>
              <div className="metric">
                <div className="metric-number">Smart</div>
                <div className="metric-label">Insights</div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-scroll-indicator">
          <div className="scroll-text">Scroll to explore</div>
          <div className="scroll-arrow"></div>
        </div>
      </div>
      
      <div className="dashboard-content">
        {/* Who We Serve Section */}
        <div className="trust-section-classic">
          <div className="trust-item">
            <div className="trust-icon-small">💼</div>
            <div className="trust-content">
              <h4 className="trust-heading">Investors</h4>
              <p className="trust-description">Make informed investment decisions with comprehensive data</p>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon-small">🏢</div>
            <div className="trust-content">
              <h4 className="trust-heading">Facilities Managers</h4>
              <p className="trust-description">Manage and optimize property portfolios efficiently</p>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon-small">🏗️</div>
            <div className="trust-content">
              <h4 className="trust-heading">Property Developers</h4>
              <p className="trust-description">Access market insights for strategic development</p>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon-small">🔬</div>
            <div className="trust-content">
              <h4 className="trust-heading">Researchers</h4>
              <p className="trust-description">Analyze trends and patterns in the property market</p>
            </div>
          </div>
        </div>

        {/* Platform Features */}
        <div className="services-section-classic">
          <div className="section-header-classic">
            <h2 className="section-title-classic">Platform Features</h2>
            <p className="section-subtitle-classic">Everything you need for property insights in one place</p>
          </div>
          
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="service-content">
                <h4 className="service-title">Search by Location</h4>
                <p className="service-description">
                  Explore properties across South Africa with intuitive location-based search. 
                  Filter by country, province, city, and specific areas.
                </p>
              </div>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 4L21 9.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="service-content">
                <h4 className="service-title">Property Type Filtering</h4>
                <p className="service-description">
                  Categorize and explore by property types — residential, commercial, 
                  industrial, and retail — for focused exploration.
                </p>
              </div>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="service-content">
                <h4 className="service-title">Real-Time Data</h4>
                <p className="service-description">
                  Access live property data with up-to-date information on pricing, 
                  availability, and market trends across all regions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Property Information Section */}
        <div className="services-section-classic">
          <div className="section-header-classic">
            <h2 className="section-title-classic">Comprehensive Property Details</h2>
            <p className="section-subtitle-classic">Every listing includes detailed information for informed decisions</p>
          </div>
          
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="service-content">
                <h4 className="service-title">High-Quality Images</h4>
                <p className="service-description">
                  Professional property photography and visual documentation 
                  to give you a clear view of every listing.
                </p>
              </div>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="service-content">
                <h4 className="service-title">Cost Information</h4>
                <p className="service-description">
                  Transparent pricing data with detailed cost breakdowns 
                  and market value comparisons for accurate assessments.
                </p>
              </div>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.5"/>
                  <polyline points="3.27,6.96 12,12.01 20.73,6.96" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="service-content">
                <h4 className="service-title">ERF Size & Developer Details</h4>
                <p className="service-description">
                  Complete property specifications including erf size, 
                  developer information, and technical details for thorough evaluation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Our Vision Section */}
        <div className="services-section-classic">
          <div className="section-header-classic">
            <h2 className="section-title-classic">Our Vision</h2>
            <p className="section-subtitle-classic">Reimagining property data access in South Africa</p>
          </div>
          
          <div className="vision-content">
            <div className="vision-statement">
              <h3 className="vision-title">Making Property Data Accessible, Meaningful, and Beautiful</h3>
              <p className="vision-description">
                We are reimagining how property data is accessed and understood in South Africa — 
                making it accessible, meaningful, and beautiful. With Digital Estate, we aim to 
                empower users with insights that drive smarter decisions and bring clarity to the real estate landscape.
              </p>
            </div>
            
            <div className="vision-goals">
              <div className="vision-goal">
                <div className="goal-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="goal-content">
                  <h4>Accessible</h4>
                  <p>Property data available to everyone, everywhere</p>
                </div>
              </div>
              
              <div className="vision-goal">
                <div className="goal-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="goal-content">
                  <h4>Meaningful</h4>
                  <p>Insights that drive smarter decisions</p>
                </div>
              </div>
              
              <div className="vision-goal">
                <div className="goal-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="goal-content">
                  <h4>Beautiful</h4>
                  <p>Clean, modern interface for better understanding</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Market Research Section */}
        <div className="services-section-classic">
          <div className="section-header-classic">
            <h2 className="section-title-classic">Advanced Market Research</h2>
            <p className="section-subtitle-classic">Data-driven insights for Sandton, Centurion, and Rosebank markets</p>
          </div>
          
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17ZM19.5 19.1H4.5V5H19.5V19.1Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="service-content">
                <h4 className="service-title">Market Trends Analysis</h4>
                <p className="service-description">
                  Interactive charts showing average prices, rental yields, and growth rates 
                  across premium South African locations.
                </p>
              </div>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4H20V20H4V4ZM6 6V18H18V6H6ZM8 8H16V10H8V8ZM8 12H16V14H8V12Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="service-content">
                <h4 className="service-title">Property Research Database</h4>
                <p className="service-description">
                  Comprehensive PostgreSQL database with sortable tables showing 
                  vacancy rates, yield analysis, and market performance metrics.
                </p>
              </div>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="service-content">
                <h4 className="service-title">Excel Data Upload</h4>
                <p className="service-description">
                  Upload and refresh market data with Excel files through our 
                  FastAPI backend for real-time research updates.
                </p>
              </div>
            </div>
          </div>
          
          <div className="research-cta-section">
            <div className="research-cta-content">
              <h3>Explore Comprehensive Market Research</h3>
              <p>Access detailed analytics, interactive charts, and real-time data for informed property investment decisions.</p>
              <button 
                onClick={() => navigate('/research')} 
                className="btn btn-primary research-cta-btn"
              >
                <span>View Market Research</span>
                <svg className="cta-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Platform Benefits */}
        <div className="trust-section-classic">
          <div className="trust-item">
            <div className="trust-icon-small">🔗</div>
            <div className="trust-content">
              <h4 className="trust-heading">Robust Backend</h4>
              <p className="trust-description">Seamless connection to comprehensive property database</p>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon-small">🎯</div>
            <div className="trust-content">
              <h4 className="trust-heading">One-Click Details</h4>
              <p className="trust-description">View detailed property information with simple interaction</p>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon-small">✨</div>
            <div className="trust-content">
              <h4 className="trust-heading">Modern Interface</h4>
              <p className="trust-description">Clean, user-friendly design for optimal experience</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
