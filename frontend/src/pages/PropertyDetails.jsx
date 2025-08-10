import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import './PropertyDetailsZara.css';

export default function PropertyDetails() {
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

  // Enhanced back navigation function
  const handleBackToProperties = () => {
    if (returnFilters) {
      navigate(returnUrl, {
        state: { filters: returnFilters }
      });
    } else {
      navigate(returnUrl);
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
    if (id) {
      fetchPropertyDetails();
    }
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.API_PROPERTY_BY_ID(id));
      setProperty(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching property details:', err);
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
        <div className="error-icon">⚠️</div>
        <h2>Error Loading Property</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={() => navigate('/properties')}>
          Back to Properties
        </button>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="property-details-error">
        <div className="error-icon">🏠</div>
        <h2>Property Not Found</h2>
        <p>The requested property could not be found.</p>
        <button className="btn-primary" onClick={() => navigate('/properties')}>
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
          <span>{property.area}</span>
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
              {property.type}
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
            {formatPrice(property.cost)}
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
              <span className="stat-value">{property.developer}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Location</span>
              <span className="stat-value">{property.area}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Type</span>
              <span className="stat-value">{property.type}</span>
            </div>
          </div>
        </div>

        <div className="property-actions">
          <button className="action-button" onClick={() => {
            alert('Contact form would open here in a real application');
          }}>
            Contact Agent
          </button>
          
          <button className="action-button" onClick={handleSaveProperty}>
            Save Property
          </button>
          
          <button className="action-button" onClick={() => {
            alert('Viewing scheduled! We will contact you to confirm the appointment.');
          }}>
            Schedule Viewing
          </button>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="property-content">
        <div className="content-main">
          <section className="property-section">
            <h2 className="section-title">Property Description</h2>
            <div className="property-description">
              <p>
                {property.description || `This ${property.type.toLowerCase()} property in ${property.area} offers excellent potential for investment or development. Located in one of ${property.city}'s most desirable areas, this property combines convenience with quality.`}
              </p>
              <p>
                Developed by {property.developer}, this property represents quality construction and attention to detail. The location provides easy access to major transport routes, shopping centers, schools, and other essential amenities.
              </p>
            </div>
          </section>

          <section className="property-section">
            <h2 className="section-title">Property Features</h2>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon">🏠</span>
                <div className="feature-content">
                  <h4>Property Type</h4>
                  <p>{property.type}</p>
                </div>
              </div>
              
              <div className="feature-item">
                <span className="feature-icon">📐</span>
                <div className="feature-content">
                  <h4>Property Size</h4>
                  <p>{property.erf_size || 'Contact for details'}</p>
                </div>
              </div>
              
              <div className="feature-item">
                <span className="feature-icon">🏗️</span>
                <div className="feature-content">
                  <h4>Developer</h4>
                  <p>{property.developer}</p>
                </div>
              </div>
              
              <div className="feature-item">
                <span className="feature-icon">📍</span>
                <div className="feature-content">
                  <h4>Location</h4>
                  <p>{property.location}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="property-section">
            <h2 className="section-title">Location & Amenities</h2>
            <div className="location-info">
              <div className="location-details">
                <h4>Neighborhood: {property.area}</h4>
                <p>
                  {property.area} is a well-established area in {property.city}, {property.province}. 
                  The location offers excellent connectivity and access to various amenities including 
                  shopping centers, schools, healthcare facilities, and recreational areas.
                </p>
              </div>
              
              <div className="amenities-list">
                <h4>Nearby Amenities</h4>
                <ul>
                  <li>🏪 Shopping Centers</li>
                  <li>🏫 Educational Institutions</li>
                  <li>🏥 Healthcare Facilities</li>
                  <li>🚗 Transport Links</li>
                  <li>🌳 Parks & Recreation</li>
                  <li>🍽️ Restaurants & Entertainment</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
