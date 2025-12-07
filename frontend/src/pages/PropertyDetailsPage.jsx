import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import './styles/property-details.css';

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  // Get return filters from navigation state
  const returnFilters = location.state?.filters;
  const returnUrl = location.state?.returnUrl || '/properties';

  // Enhanced back navigation function with proper browser history
  const handleBackToProperties = () => {
    console.log('🔄 Navigating back with browser history support');
    console.log('🔄 Return filters:', returnFilters);
    console.log('🔄 Return URL:', returnUrl);
    
    // Use browser's back navigation if we came from properties page
    if (location.state?.fromPropertiesPage && window.history.length > 1) {
      console.log('🔄 Using browser back navigation');
      navigate(-1); // Go back in history
    }
    // Fallback: navigate with filter restoration
    else if (returnFilters) {
      console.log('🔄 Navigating with state restoration');
      navigate(returnUrl, {
        state: { filters: returnFilters }
      });
    } 
    // Final fallback: restore from localStorage
    else {
      console.log('🔄 Fallback: restoring from localStorage');
      const savedFilters = localStorage.getItem('propertyFilters');
      if (savedFilters) {
        navigate(returnUrl, {
          state: { filters: JSON.parse(savedFilters) }
        });
      } else {
        navigate(returnUrl);
      }
    }
  };

  // Contact form handlers
  const handleContactFormChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the contact form to your backend
    console.log('Contact form submitted:', contactForm);
    alert('Thank you for your inquiry! We will contact you soon.');
    setContactForm({ name: '', email: '', phone: '', message: '' });
  };

  const handleSaveProperty = () => {
    // Here you would typically save the property to user's favorites
    console.log('Property saved:', property.id);
    alert('Property saved to your favorites!');
  };

  useEffect(() => {
    console.log('🔍 PropertyDetails received ID:', id);
    if (id) {
      fetchPropertyDetails();
    }
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      console.log('🔍 Fetching property details for ID:', id);
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.API_PROPERTY_BY_ID(id));
      setProperty(response.data);
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching property details for ID:', id, err);
      setError('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for Price';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getPropertyImages = () => {
    if (!property) return [];
    
    // For now, we'll use the single image URL and generate some variations
    const baseImage = property.image_url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop';
    
    // Generate multiple angles/views (in a real app, these would come from the database)
    return [
      baseImage,
      baseImage.replace('w=800&h=600', 'w=800&h=600&crop=entropy'),
      baseImage.replace('w=800&h=600', 'w=800&h=600&crop=faces'),
      baseImage.replace('w=800&h=600', 'w=800&h=600&crop=edges')
    ];
  };

  if (loading) {
    return (
      <div className="property-details-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading property details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="property-details-error">
        <div className="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <h2>Error Loading Property</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={handleBackToProperties}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Back to Properties
        </button>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="property-details-error">
        <div className="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" fill="none"/>
            <circle cx="12" cy="8" r="1" fill="currentColor"/>
          </svg>
        </div>
        <h2>Property Not Found</h2>
        <p>The requested property could not be found.</p>
        <button className="btn-primary" onClick={handleBackToProperties}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Back to Properties
        </button>
      </div>
    );
  }

  const images = getPropertyImages();

  return (
    <div className="property-details">
      {/* Navigation Header */}
      <div className="property-nav">
        <button className="back-button" onClick={handleBackToProperties}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Back to Properties
        </button>
        
        <div className="property-breadcrumb">
          <span>Properties</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span>{property.suburb || property.area}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span className="active">{property.name}</span>
        </div>
      </div>

      {/* Creative Image Gallery */}
      <div className="property-gallery">
        <div className="gallery-container">
          {/* Main featured image */}
          <div className="featured-image">
            <img 
              src={images[activeImageIndex]} 
              alt={property.name}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop';
              }}
            />
            <div className="image-navigation">
              <button 
                className="nav-button prev"
                onClick={() => setActiveImageIndex(activeImageIndex > 0 ? activeImageIndex - 1 : images.length - 1)}
              >
                ‹
              </button>
              <button 
                className="nav-button next"
                onClick={() => setActiveImageIndex(activeImageIndex < images.length - 1 ? activeImageIndex + 1 : 0)}
              >
                ›
              </button>
            </div>
            <div className="image-counter">
              {activeImageIndex + 1} / {images.length}
            </div>
            <div className="property-type-badge">
              {property.property_type || property.type}
            </div>
          </div>
          
          {/* Creative thumbnail grid */}
          <div className="thumbnails-grid">
            {images.map((image, index) => (
              <div
                key={index}
                className={`thumbnail-item ${index === activeImageIndex ? 'active' : ''}`}
                onClick={() => setActiveImageIndex(index)}
              >
                <img src={image} alt={`View ${index + 1}`} />
                <div className="thumbnail-overlay"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property Information */}
      <div className="property-info">
        <div className="property-header">
          <h1 className="property-title">{property.name}</h1>
          <div className="property-location">
            {property.location}
          </div>
          <div className="property-price">
            {formatPrice(property.price || property.cost)}
          </div>
        </div>

        <div className="property-stats">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">ERF Size</span>
              <span className="stat-value">{property.erf_size || 'Contact for details'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Developer</span>
              <span className="stat-value">{property.developer || 'Contact for details'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Location</span>
              <span className="stat-value">{property.suburb || property.area}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Type</span>
              <span className="stat-value">{property.property_type || property.type}</span>
            </div>
          </div>
        </div>

        <div className="property-actions">
          <button className="action-button primary" onClick={() => {
            alert('Contact form would open here in a real application');
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
            Contact Agent
          </button>
          
          <button className="action-button secondary" onClick={handleSaveProperty}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
            Save Property
          </button>
          
          <button className="action-button tertiary" onClick={() => {
            alert('Viewing scheduled! We will contact you to confirm the appointment.');
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Schedule Viewing
          </button>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="property-content">
        <div className="content-main">
          {/* Property Information Section */}
          <section className="property-section">
            <h2 className="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="section-icon">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              Property Information
            </h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Property Name</span>
                <span className="info-value">{property.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">ERF Number</span>
                <span className="info-value">{property.erf_number || property.erf_size || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Street Address</span>
                <span className="info-value">{property.address || property.street_address || property.location || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Suburb</span>
                <span className="info-value">{property.suburb || property.area || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">City</span>
                <span className="info-value">{property.city || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Province</span>
                <span className="info-value">{property.province || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Postal Code</span>
                <span className="info-value">{property.postal_code || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Property Type</span>
                <span className="info-value">{property.property_type || property.type || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Building Size</span>
                <span className="info-value">{property.building_size || property.erf_size || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Condition</span>
                <span className="info-value">{property.condition || 'Good'}</span>
              </div>
            </div>
          </section>

          {/* Owner Information Section */}
          <section className="property-section">
            <h2 className="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="section-icon">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              Owner Information
            </h2>
            <div className="owner-info-grid">
              <div className="owner-card">
                <div className="owner-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="owner-details">
                  <h4>Owner Name</h4>
                  <p>{property.owner_name || property.developer || 'N/A'}</p>
                </div>
              </div>
              <div className="owner-card">
                <div className="owner-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="owner-details">
                  <h4>Ownership Type</h4>
                  <p>{property.ownership_type || 'Freehold'}</p>
                </div>
              </div>
              <div className="owner-card">
                <div className="owner-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="owner-details">
                  <h4>Purchase Price</h4>
                  <p>{property.purchase_price ? formatPrice(property.purchase_price) : property.cost ? formatPrice(property.cost) : 'N/A'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Public Valuations Section */}
          <section className="property-section">
            <h2 className="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="section-icon">
                <path d="M9 11H7a2 2 0 00-2 2v7a2 2 0 002 2h2a2 2 0 002-2v-7a2 2 0 00-2-2zM13 7H11a2 2 0 00-2 2v11a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 00-2-2zM17 3h-2a2 2 0 00-2 2v15a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              Public Valuations
            </h2>
            <div className="valuations-container">
              {property.valuations && property.valuations.length > 0 ? (
                property.valuations.map((valuation, index) => (
                  <div key={index} className="valuation-card">
                    <div className="valuation-header">
                      <div className="valuation-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                      </div>
                      <h4>{valuation.type || 'Municipal Valuation'}</h4>
                    </div>
                    <div className="valuation-details">
                      <div className="valuation-item">
                        <span className="valuation-label">Amount</span>
                        <span className="valuation-value">{valuation.amount ? formatPrice(valuation.amount) : 'N/A'}</span>
                      </div>
                      <div className="valuation-item">
                        <span className="valuation-label">Date</span>
                        <span className="valuation-value">{valuation.date || 'N/A'}</span>
                      </div>
                      <div className="valuation-item">
                        <span className="valuation-label">Source</span>
                        <span className="valuation-value">{valuation.source || 'Municipal Records'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="valuation-card">
                  <div className="valuation-header">
                    <div className="valuation-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                    <h4>Current Market Valuation</h4>
                  </div>
                  <div className="valuation-details">
                    <div className="valuation-item">
                      <span className="valuation-label">Amount</span>
                      <span className="valuation-value">{property.cost ? formatPrice(property.cost) : 'Contact for Valuation'}</span>
                    </div>
                    <div className="valuation-item">
                      <span className="valuation-label">Date</span>
                      <span className="valuation-value">{new Date().getFullYear()}</span>
                    </div>
                    <div className="valuation-item">
                      <span className="valuation-label">Source</span>
                      <span className="valuation-value">Market Analysis</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Zoning Information Section */}
          <section className="property-section">
            <h2 className="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="section-icon">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              Zoning Information
            </h2>
            <div className="zoning-grid">
              <div className="zoning-item">
                <div className="zoning-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="zoning-content">
                  <h4>Zoning Classification</h4>
                  <p>{property.zoning_classification || property.zoning || 'Residential'}</p>
                </div>
              </div>
              
              <div className="zoning-item">
                <div className="zoning-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 11H7a2 2 0 00-2 2v7a2 2 0 002 2h2a2 2 0 002-2v-7a2 2 0 00-2-2zM13 7H11a2 2 0 00-2 2v11a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 00-2-2zM17 3h-2a2 2 0 00-2 2v15a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="zoning-content">
                  <h4>Permissible Use</h4>
                  <p>{property.permissible_use || 'Residential Development, Single Family Homes'}</p>
                </div>
              </div>
              
              <div className="zoning-item">
                <div className="zoning-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="zoning-content">
                  <h4>Restrictions</h4>
                  <p>{property.zoning_restrictions || 'Standard municipal building regulations apply'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Additional Notes Section */}
          <section className="property-section">
            <h2 className="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="section-icon">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              Additional Information
            </h2>
            <div className="property-description">
              <p>
                {property.description || `This ${property.type?.toLowerCase() || 'property'} in ${property.area || 'the area'} offers excellent potential for investment or development. Located in one of ${property.city || 'the city'}'s most desirable areas, this property combines convenience with quality.`}
              </p>
              {property.developer && (
                <p>
                  Developed by {property.developer}, this property represents quality construction and attention to detail. The location provides easy access to major transport routes, shopping centers, schools, and other essential amenities.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
