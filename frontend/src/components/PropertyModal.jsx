import React from 'react';
import './PropertyModal.css';

const PropertyModal = ({ property, onClose }) => {
  if (!property) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleContactAgent = () => {
    window.open('tel:+27111234567', '_self');
  };

  const handleRequestInfo = () => {
    window.open(`mailto:info@digitalestate.co.za?subject=Property Inquiry: ${property.name}`, '_self');
  };

  const handleScheduleViewing = () => {
    alert('Viewing request submitted! Our agent will contact you within 24 hours.');
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        
        <div className="modal-content">
          <div className="modal-image-section">
            <img 
              src={property.image_url} 
              alt={property.name}
              className="modal-property-image"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop';
              }}
            />
            <div className="modal-image-overlay">
              <div className="modal-price">{formatPrice(property.cost)}</div>
              <div className="modal-status">✨ Premium Property</div>
            </div>
          </div>
          
          <div className="modal-details-section">
            <div className="modal-header">
              <h2 className="modal-title">{property.name}</h2>
              <div className="modal-status-badge">Available</div>
            </div>
            
            <div className="modal-description">
              <p>
                Experience luxury living at its finest in this premium property located in one of South Africa's most prestigious areas. 
                This exceptional development offers world-class amenities and unparalleled comfort for the discerning homeowner.
              </p>
            </div>
            
            <div className="modal-details-grid">
              <div className="modal-detail-item">
                <div className="detail-icon">📐</div>
                <div className="detail-content">
                  <div className="detail-label">Plot Size</div>
                  <div className="detail-value">{property.erf_size}</div>
                </div>
              </div>
              
              <div className="modal-detail-item">
                <div className="detail-icon">🏗️</div>
                <div className="detail-content">
                  <div className="detail-label">Developer</div>
                  <div className="detail-value">{property.developer}</div>
                </div>
              </div>
              
              <div className="modal-detail-item">
                <div className="detail-icon">🏠</div>
                <div className="detail-content">
                  <div className="detail-label">Property Type</div>
                  <div className="detail-value">Premium Residential</div>
                </div>
              </div>
              
              <div className="modal-detail-item">
                <div className="detail-icon">📅</div>
                <div className="detail-content">
                  <div className="detail-label">Availability</div>
                  <div className="detail-value">Immediate</div>
                </div>
              </div>
            </div>
            
            <div className="modal-features">
              <h3 className="features-title">Key Features</h3>
              <div className="features-list">
                <div className="feature-item">✨ Premium finishes throughout</div>
                <div className="feature-item">🚗 Secure parking available</div>
                <div className="feature-item">🏊 Swimming pool and gym facilities</div>
                <div className="feature-item">🛡️ 24/7 security and access control</div>
                <div className="feature-item">🌳 Beautifully landscaped gardens</div>
                <div className="feature-item">🏪 Close to shopping and entertainment</div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-primary-modal" onClick={handleContactAgent}>
                📞 Contact Agent
              </button>
              <button className="btn-secondary-modal" onClick={handleRequestInfo}>
                📧 Request Info
              </button>
              <button className="btn-outline-modal" onClick={handleScheduleViewing}>
                📅 Schedule Viewing
              </button>
            </div>
            
            <div className="modal-contact-info">
              <div className="contact-item">
                <strong>Sales Agent:</strong> Sarah Johnson
              </div>
              <div className="contact-item">
                <strong>Phone:</strong> +27 11 123 4567
              </div>
              <div className="contact-item">
                <strong>Email:</strong> sarah.johnson@digitalestate.co.za
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyModal;
