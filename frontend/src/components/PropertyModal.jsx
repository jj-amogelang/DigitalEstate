import React from 'react';
import './PropertyModalAWS.css';
import './AWSComponents.css';

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
    <div className="modal-overlay-classic" onClick={handleOverlayClick}>
      <div className="modal-container-classic">
        <button className="modal-close-classic" onClick={onClose}>
          ✕
        </button>
        
        <div className="modal-content-classic">
          <div className="modal-image-section-classic">
            <img 
              src={property.image_url} 
              alt={property.name}
              className="modal-property-image-classic"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop';
              }}
            />
            <div className="modal-image-overlay-classic">
              <div className="modal-price-classic">{formatPrice(property.cost)}</div>
              <div className="modal-status-classic">Premium Property</div>
            </div>
          </div>
          
          <div className="modal-details-section-classic">
            <div className="modal-header-classic">
              <h2 className="modal-title-classic">{property.name}</h2>
              <div className="modal-status-badge-classic">Available</div>
            </div>
            
            <div className="modal-description-classic">
              <p>
                Experience distinguished living in this premium property located in one of South Africa's most prestigious areas. 
                This exceptional development offers world-class amenities and unparalleled comfort for the discerning homeowner.
              </p>
            </div>
            
            <div className="modal-details-grid-classic">
              <div className="modal-detail-item-classic">
                <div className="detail-icon-classic">📐</div>
                <div className="detail-content-classic">
                  <div className="detail-label-classic">Plot Size</div>
                  <div className="detail-value-classic">{property.erf_size}</div>
                </div>
              </div>
              
              <div className="modal-detail-item-classic">
                <div className="detail-icon-classic">🏗️</div>
                <div className="detail-content-classic">
                  <div className="detail-label-classic">Developer</div>
                  <div className="detail-value-classic">{property.developer}</div>
                </div>
              </div>
              
              <div className="modal-detail-item-classic">
                <div className="detail-icon-classic">🏠</div>
                <div className="detail-content-classic">
                  <div className="detail-label-classic">Property Type</div>
                  <div className="detail-value-classic">Premium Residential</div>
                </div>
              </div>
              
              <div className="modal-detail-item-classic">
                <div className="detail-icon-classic">📅</div>
                <div className="detail-content-classic">
                  <div className="detail-label-classic">Availability</div>
                  <div className="detail-value-classic">Immediate</div>
                </div>
              </div>
            </div>
            
            <div className="modal-features-classic">
              <h3 className="features-title-classic">Distinguished Features</h3>
              <div className="features-list-classic">
                <div className="feature-item-classic">Premium finishes throughout</div>
                <div className="feature-item-classic">Secure parking facilities</div>
                <div className="feature-item-classic">Swimming pool and fitness center</div>
                <div className="feature-item-classic">24/7 security and concierge</div>
                <div className="feature-item-classic">Landscaped gardens and grounds</div>
                <div className="feature-item-classic">Prime location amenities</div>
              </div>
            </div>
            
            <div className="modal-actions-classic">
              <button className="btn-primary-modal-classic" onClick={handleContactAgent}>
                Contact Agent
              </button>
              <button className="btn-secondary-modal-classic" onClick={handleRequestInfo}>
                Request Information
              </button>
              <button className="btn-outline-modal-classic" onClick={handleScheduleViewing}>
                Schedule Viewing
              </button>
            </div>
            
            <div className="modal-contact-info-classic">
              <div className="contact-item-classic">
                <span className="contact-label-classic">Sales Agent:</span>
                <span className="contact-value-classic">Sarah Johnson</span>
              </div>
              <div className="contact-item-classic">
                <span className="contact-label-classic">Phone:</span>
                <span className="contact-value-classic">+27 11 123 4567</span>
              </div>
              <div className="contact-item-classic">
                <span className="contact-label-classic">Email:</span>
                <span className="contact-value-classic">sarah.johnson@digitalestate.co.za</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyModal;
