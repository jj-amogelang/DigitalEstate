import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfileButton.css';

const ProfileButton = ({ onLoginClick, onRegisterClick }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      setIsDropdownOpen(!isDropdownOpen);
    } else {
      onLoginClick();
    }
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="profile-button-container">
        <button className="profile-button login-button" onClick={onLoginClick}>
          <svg className="profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="profile-button-container" ref={dropdownRef}>
      <button 
        className="profile-button authenticated" 
        onClick={handleProfileClick}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <div className="profile-avatar">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} />
          ) : (
            <span className="profile-initials">
              {getInitials(user.firstName, user.lastName)}
            </span>
          )}
        </div>
        <span className="profile-name">{user.firstName} {user.lastName}</span>
        <svg 
          className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
        >
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="profile-dropdown">
          <div className="dropdown-header">
            <div className="user-info">
              <div className="user-avatar">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} />
                ) : (
                  <span className="user-initials">
                    {getInitials(user.firstName, user.lastName)}
                  </span>
                )}
              </div>
              <div className="user-details">
                <div className="user-name">{user.firstName} {user.lastName}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          </div>
          
          <div className="dropdown-divider"></div>
          
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <svg className="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              View Profile
            </button>
            
            <button className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <svg className="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
              </svg>
              Account Settings
            </button>
            
            <button className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
              <svg className="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              My Properties
            </button>
            
            <div className="dropdown-divider"></div>
            
            <button className="dropdown-item logout-item" onClick={handleLogout}>
              <svg className="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileButton;
