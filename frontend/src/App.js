import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import SettingsProvider from "./context/SettingsContext";
import { AuthProvider } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import ExplorePage from "./pages/ExplorePage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import Settings from "./pages/Settings";
import ResearchDashboard from "./pages/ResearchDashboard";
import ProfileButton from "./components/ProfileButton";
import AuthModal from "./components/AuthModal";
import "./App.css";
import "./styles/aws-global.css";
import { LayoutGrid, MapPinned, Settings as Cog, Home as HomeIcon } from "lucide-react";

function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();
  const [logoError, setLogoError] = useState(false);

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="logo-container">
          <div className={`logo-icon ${!logoError ? 'has-image' : ''}`}>
            {!logoError ? (
              <img
                src="/images/Logo white.png"
                alt="DigitalEstate logo"
                className="brand-logo-img"
                onError={() => setLogoError(true)}
              />
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M5 21V7l7-4 7 4v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="9" r="1" fill="currentColor"/>
              </svg>
            )}
          </div>
          {isOpen && (
            <div className="logo-text">
              <h1 className="company-name">DigitalEstate</h1>
              <p className="company-tagline">Property Solutions</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <Link 
          to="/" 
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          title="Dashboard"
        >
          <LayoutGrid className="nav-icon" size={20} />
          {isOpen && <span className="nav-text">Dashboard</span>}
        </Link>

        <Link 
          to="/explore" 
          className={`nav-link ${location.pathname === '/explore' || location.pathname === '/properties' ? 'active' : ''}`}
          title="Explore Properties"
        >
          <MapPinned className="nav-icon" size={20} />
          {isOpen && <span className="nav-text">Explore Properties</span>}
        </Link>

        <Link 
          to="/insights" 
          className={`nav-link ${location.pathname === '/insights' ? 'active' : ''}`}
          title="Property Insights"
        >
          <HomeIcon className="nav-icon" size={20} />
          {isOpen && <span className="nav-text">Property Insights</span>}
        </Link>

        {/* Analytics removed */}

        <Link 
          to="/settings" 
          className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
          title="Settings"
        >
          <Cog className="nav-icon" size={20} />
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
            
            {/* Mobile overlay to close sidebar when clicked outside */}
            {sidebarOpen && (
              <div 
                className="sidebar-mobile-overlay" 
                onClick={toggleSidebar}
                aria-label="Close sidebar"
              />
            )}
            
            <main className={`main-content ${sidebarOpen ? 'main-content-expanded' : 'main-content-collapsed'}`}>
              {/* Top Navigation Bar with Profile Button */}
              <div className="top-nav">
                <div className="nav-left">
                  {/* Mobile Sidebar Toggle */}
                  <button
                    className="sidebar-toggle"
                    aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                    title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                    onClick={toggleSidebar}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
                  <Route path="/properties" element={<ExplorePage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/property/:id" element={<PropertyDetailsPage />} />
                  <Route path="/insights" element={<ResearchDashboard />} />
                  {/* Analytics route removed */}
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
