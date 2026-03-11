import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import GlobalSearchBar from './components/GlobalSearchBar';
import SettingsProvider from "./context/SettingsContext";
import { AuthProvider } from "./context/AuthContext";
import { LocationProvider, useAppLocation } from "./context/LocationContext";
import LocationPermissionModal from "./components/LocationPermissionModal";
import DashboardPage from "./pages/DashboardPage";
import ExplorePage from "./pages/ExplorePage";
import Settings from "./pages/Settings";
import ProfileButton from "./components/ProfileButton";
import AuthModal from "./components/AuthModal";
import "./App.css";
import "./styles/aws-global.css";
import { Info, MapPinned, Settings as Cog, TrendingUp, LayoutDashboard } from "lucide-react";
import InvestorDashboard from "./pages/InvestorDashboard";
import OpportunitiesPage from "./pages/OpportunitiesPage";

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
          to="/explore" 
          className={`nav-link ${location.pathname === '/' || location.pathname === '/explore' ? 'active' : ''}`}
          title="Explore Areas"
        >
          <MapPinned className="nav-icon" size={20} />
          {isOpen && <span className="nav-text">Explore Areas</span>}
        </Link>

        <Link
          to="/opportunities"
          className={`nav-link ${location.pathname === '/opportunities' ? 'active' : ''}`}
          title="Opportunities"
        >
          <TrendingUp className="nav-icon" size={20} />
          {isOpen && <span className="nav-text">Opportunities</span>}
        </Link>

        <Link
          to="/dashboard"
          className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          title="Dashboard"
        >
          <LayoutDashboard className="nav-icon" size={20} />
          {isOpen && <span className="nav-text">Dashboard</span>}
        </Link>

        <Link 
          to="/about" 
          className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
          title="About"
        >
          <Info className="nav-icon" size={20} />
          {isOpen && <span className="nav-text">About</span>}
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

/**
 * LocationModalBridge
 * Thin bridge component that reads from LocationContext (which lives inside
 * LocationProvider) and renders the permission modal when needed.
 * Must be rendered INSIDE <LocationProvider> but OUTSIDE <Router> is fine
 * since it doesn't use any routing hooks.
 */
function LocationModalBridge() {
  const { showModal, requestPermission, dismissModal } = useAppLocation();
  if (!showModal) return null;
  return (
    <LocationPermissionModal
      onAllow={requestPermission}
      onSkip={dismissModal}
    />
  );
}

/**
 * BottomNav
 * Mobile-only sticky bottom navigation for quick access to main sections.
 * Visible only on screens ≤ 768px via CSS.
 */
function BottomNav() {
  const location = useLocation();
  const navItems = [
    { to: '/explore',        icon: MapPinned,   label: 'Explore',        match: ['/', '/explore'] },
    { to: '/opportunities',  icon: TrendingUp,       label: 'Opportunities',  match: ['/opportunities'] },
    { to: '/dashboard',      icon: LayoutDashboard,  label: 'Dashboard',      match: ['/dashboard'] },
    { to: '/about',          icon: Info,             label: 'About',          match: ['/about'] },
    { to: '/settings',       icon: Cog,         label: 'Settings',       match: ['/settings'] },
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {navItems.map(({ to, icon: Icon, label, match }) => {
        const isActive = match.some(p => p.trim() === location.pathname);
        return (
          <Link
            key={to}
            to={to}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="bottom-nav-icon" size={22} />
            <span className="bottom-nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
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
        <LocationProvider>
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
                  {/* Sidebar Toggle */}
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
                  {/* Global area search — navigates to /explore?areaId=X&areaName=Y */}
                  <GlobalSearchBar variant="header" />
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
                  <Route path="/" element={<ExplorePage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/about" element={<DashboardPage />} />
                  {/* Analytics route removed */}
                  <Route path="/opportunities" element={<OpportunitiesPage />} />
                  <Route path="/dashboard" element={<InvestorDashboard />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>

              {/* Mobile bottom navigation — only rendered/visible on ≤768px */}
              <BottomNav />
            </main>

            {/* Authentication Modal */}
            <AuthModal 
              isOpen={authModalOpen}
              onClose={() => setAuthModalOpen(false)}
              initialMode={authModalMode}
            />
          </div>
        </Router>
        {/* Location permission modal — shown once per browser on first visit */}
        <LocationModalBridge />
        </LocationProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
