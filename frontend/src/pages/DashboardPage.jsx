import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
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
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
        {/* Professional Platform Overview */}
        <div className="platform-overview-section">
          <div className="container-professional">
            <div className="overview-header">
              <h2 className="section-title-professional">Complete Property Intelligence Platform</h2>
              <p className="section-subtitle-professional">
                Comprehensive property data, market insights, and analytics for South Africa's real estate market
              </p>
            </div>
            
            <div className="capabilities-grid">
              <div className="capability-card">
                <div className="capability-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>Location Intelligence</h4>
                <p>Advanced search and filtering across all South African provinces and cities</p>
              </div>
              
              <div className="capability-card">
                <div className="capability-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 12l3-3 2 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="18" cy="6" r="2" fill="currentColor"/>
                  </svg>
                </div>
                <h4>Real-Time Analytics</h4>
                <p>Live market data with pricing trends, yields, and performance metrics</p>
              </div>
              
              <div className="capability-card">
                <div className="capability-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M2 20h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M7 20V9l5-5 5 5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <h4>Property Intelligence</h4>
                <p>Detailed property data including costs, specifications, and developer information</p>
              </div>
            </div>
          </div>
        </div>

        {/* Target Audience & Market Research Combined */}
        <div className="value-proposition-section">
          <div className="container-professional">
            <div className="value-grid">
              {/* Who We Serve */}
              <div className="value-column">
                <h3 className="value-column-title">Built for Professionals</h3>
                <div className="professional-targets">
                  <div className="target-item">
                    <div className="target-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 21v-5a2 2 0 012-2h4a2 2 0 012 2v5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 7h8M8 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <h5>Property Investors</h5>
                      <p>Data-driven investment decisions</p>
                    </div>
                  </div>
                  <div className="target-item">
                    <div className="target-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M6 21V7l6-4 6 4v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 21v-6h4v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="8" y="9" width="2" height="2" stroke="currentColor" strokeWidth="1.5"/>
                        <rect x="14" y="9" width="2" height="2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <div>
                      <h5>Facilities Managers</h5>
                      <p>Portfolio optimization tools</p>
                    </div>
                  </div>
                  <div className="target-item">
                    <div className="target-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M6 10h12M6 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <h5>Developers</h5>
                      <p>Market insights for development</p>
                    </div>
                  </div>
                  <div className="target-item">
                    <div className="target-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 12l3-3 2 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="18" cy="6" r="1" fill="currentColor"/>
                        <circle cx="9" cy="17" r="1" fill="currentColor"/>
                      </svg>
                    </div>
                    <div>
                      <h5>Market Researchers</h5>
                      <p>Comprehensive trend analysis</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Excellence */}
        <div className="excellence-section">
          <div className="container-professional">
            <div className="excellence-content">
              <div className="excellence-text">
                <h3 className="excellence-title">Making Property Data Accessible, Meaningful, and Beautiful</h3>
                <p className="excellence-description">
                  We reimagine how property data is accessed in South Africa — combining comprehensive information 
                  with intelligent design to empower smarter real estate decisions.
                </p>
                <div className="excellence-features">
                  <div className="feature-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Accessible to All
                  </div>
                  <div className="feature-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Actionable Insights
                  </div>
                  <div className="feature-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 17.2l-6.4 4L8 13.2 2 8.4h7.6L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Modern Interface
                  </div>
                </div>
              </div>
              <div className="excellence-cta">
                <button 
                  onClick={() => navigate('/research')} 
                  className="btn-professional btn-primary-professional"
                >
                  <span>Explore Market Research</span>
                  <svg className="cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
