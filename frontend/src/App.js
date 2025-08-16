import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import SettingsProvider from "./context/SettingsContext";
import { AuthProvider } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import PropertyListPage from "./pages/PropertyListPage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import Settings from "./pages/Settings";
import ResearchDashboard from "./pages/ResearchDashboard";
import ProfileButton from "./components/ProfileButton";
import AuthModal from "./components/AuthModal";
import "./App.css";

function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5 21V7l7-4 7 4v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="9" r="1" fill="currentColor"/>
            </svg>
          </div>
          {isOpen && (
            <div className="logo-text">
              <h1 className="company-name">DigitalEstate</h1>
              <p className="company-tagline">Property Solutions</p>
            </div>
          )}
        </div>
        
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {isOpen ? (
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            ) : (
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <Link 
          to="/" 
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          title="Dashboard"
        >
          <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          {isOpen && <span className="nav-text">Dashboard</span>}
        </Link>

        <Link 
          to="/properties" 
          className={`nav-link ${location.pathname === '/properties' ? 'active' : ''}`}
          title="Properties"
        >
          <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5 21V7l7-4 7 4v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isOpen && <span className="nav-text">Properties</span>}
        </Link>

        <Link 
          to="/research" 
          className={`nav-link ${location.pathname === '/research' ? 'active' : ''}`}
          title="Market Research"
        >
          <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 12l3-3 2 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="18" cy="6" r="2" fill="currentColor"/>
          </svg>
          {isOpen && <span className="nav-text">Market Research</span>}
        </Link>

        <Link 
          to="/analytics" 
          className={`nav-link ${location.pathname === '/analytics' ? 'active' : ''}`}
          title="Analytics"
        >
          <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="7" y="12" width="2" height="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="11" y="8" width="2" height="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="15" y="14" width="2" height="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {isOpen && <span className="nav-text">Analytics</span>}
        </Link>

        <Link 
          to="/settings" 
          className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
          title="Settings"
        >
          <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          {isOpen && <span className="nav-text">Settings</span>}
        </Link>
      </nav>

      {/* Footer */}
      {isOpen && (
        <div className="sidebar-footer">
          <div className="footer-content">
            <p className="footer-text">© 2025 DigitalEstate</p>
            <p className="footer-subtext">Professional Property Management</p>
          </div>
        </div>
      )}
    </aside>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLoginClick = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleRegisterClick = () => {
    setAuthModalMode('register');
    setAuthModalOpen(true);
  };

  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <div className="app-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
            <main className={`main-content ${sidebarOpen ? 'main-content-expanded' : 'main-content-collapsed'}`}>
              {/* Top Navigation Bar with Profile Button */}
              <div className="top-nav">
                <div className="nav-left">
                  <button 
                    className="sidebar-toggle"
                    onClick={toggleSidebar}
                    aria-label="Toggle sidebar"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="3" y1="12" x2="21" y2="12"/>
                      <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="nav-right">
                  <ProfileButton 
                    onLoginClick={handleLoginClick}
                    onRegisterClick={handleRegisterClick}
                  />
                </div>
              </div>

              {/* Main Content Area */}
              <div className="content-area">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/properties" element={<PropertyListPage />} />
                  <Route path="/property/:id" element={<PropertyDetailsPage />} />
                  <Route path="/research" element={<ResearchDashboard />} />
                  <Route path="/analytics" element={<div className="coming-soon">Analytics - Coming Soon...</div>} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </main>

            {/* Authentication Modal */}
            <AuthModal 
              isOpen={authModalOpen}
              onClose={() => setAuthModalOpen(false)}
              initialMode={authModalMode}
            />
          </div>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
