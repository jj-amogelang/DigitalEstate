import React from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      {/* Hero Section with Background Image */}
      <div className="dashboard-hero">
        <div className="hero-overlay">
          <div className="hero-content">
            <div className="hero-badge">Premium Real Estate Platform</div>
            <h1 className="dashboard-title">
              Discover Exceptional
              <span className="title-highlight"> Properties</span>
            </h1>
            <p className="dashboard-subtitle">
              Elevating South Africa's luxury real estate experience with cutting-edge technology 
              and unparalleled market expertise
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
                View Market Insights
              </button>
            </div>
            <div className="hero-metrics">
              <div className="metric">
                <div className="metric-number">1.2K+</div>
                <div className="metric-label">Premium Listings</div>
              </div>
              <div className="metric-divider"></div>
              <div className="metric">
                <div className="metric-number">R4.8B+</div>
                <div className="metric-label">Property Value</div>
              </div>
              <div className="metric-divider"></div>
              <div className="metric">
                <div className="metric-number">98%</div>
                <div className="metric-label">Success Rate</div>
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
        {/* Trust Indicators */}
        <div className="trust-section">
          <div className="trust-badge">
            <div className="trust-icon">🏆</div>
            <div className="trust-text">
              <div className="trust-title">Industry Leaders</div>
              <div className="trust-subtitle">Trusted by thousands of property investors</div>
            </div>
          </div>
          <div className="trust-badge">
            <div className="trust-icon">🔒</div>
            <div className="trust-text">
              <div className="trust-title">Secure Transactions</div>
              <div className="trust-subtitle">Bank-level security & verification</div>
            </div>
          </div>
          <div className="trust-badge">
            <div className="trust-icon">⚡</div>
            <div className="trust-text">
              <div className="trust-title">Real-time Data</div>
              <div className="trust-subtitle">Live market updates & analytics</div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats */}
        <div className="dashboard-stats">
          <div className="stat-card featured">
            <div className="stat-header">
              <div className="stat-icon-modern">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 4L21 9.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="stat-trend">↗ +12%</div>
            </div>
            <h3 className="stat-number">1,247</h3>
            <p className="stat-label">Active Properties</p>
            <p className="stat-sublabel">Across premium locations</p>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-modern">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="stat-trend positive">↗ +8%</div>
            </div>
            <h3 className="stat-number">R4.2M</h3>
            <p className="stat-label">Average Value</p>
            <p className="stat-sublabel">Luxury segment</p>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-modern">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 9h.01M15 9h.01" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="stat-trend positive">↗ +15%</div>
            </div>
            <h3 className="stat-number">98.5%</h3>
            <p className="stat-label">Client Satisfaction</p>
            <p className="stat-sublabel">5-star rated service</p>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <div className="stat-icon-modern">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div className="stat-trend">↗ +5%</div>
            </div>
            <h3 className="stat-number">156</h3>
            <p className="stat-label">Prime Locations</p>
            <p className="stat-sublabel">Major cities covered</p>
          </div>
        </div>
        
        {/* Enhanced Features */}
        <div className="features-section">
          <div className="section-header">
            <h2 className="section-title">Why Choose DigitalEstate</h2>
            <p className="section-subtitle">Experience the future of real estate with our advanced platform</p>
          </div>
          
          <div className="dashboard-features">
            <div className="feature-card premium">
              <div className="feature-header">
                <div className="feature-icon-modern">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="feature-badge">AI Powered</div>
              </div>
              <h4 className="feature-title">Intelligent Search</h4>
              <p className="feature-description">
                Advanced AI algorithms match you with properties that perfectly align with your 
                preferences, budget, and lifestyle requirements.
              </p>
              <div className="feature-benefits">
                <div className="benefit">✓ Smart recommendations</div>
                <div className="benefit">✓ Price predictions</div>
                <div className="benefit">✓ Market insights</div>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="feature-header">
                <div className="feature-icon-modern">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="feature-badge">Live Data</div>
              </div>
              <h4 className="feature-title">Real-Time Analytics</h4>
              <p className="feature-description">
                Access comprehensive market data, trend analysis, and investment insights 
                updated in real-time to make informed decisions.
              </p>
              <div className="feature-benefits">
                <div className="benefit">✓ Market trends</div>
                <div className="benefit">✓ Investment ROI</div>
                <div className="benefit">✓ Area analysis</div>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="feature-header">
                <div className="feature-icon-modern">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="feature-badge">24/7 Support</div>
              </div>
              <h4 className="feature-title">Expert Consultation</h4>
              <p className="feature-description">
                Connect with certified real estate professionals who provide personalized 
                guidance throughout your property journey.
              </p>
              <div className="feature-benefits">
                <div className="benefit">✓ Licensed agents</div>
                <div className="benefit">✓ Legal support</div>
                <div className="benefit">✓ Investment advice</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
