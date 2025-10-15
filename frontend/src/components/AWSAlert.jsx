import React from 'react';
import './styles/AWSComponents.css';

// type: 'success' | 'warning' | 'error' | 'info'
export default function AWSAlert({ type = 'info', title, message, onClose }) {
  const typeClass = {
    success: 'aws-alert-success',
    warning: 'aws-alert-warning',
    error: 'aws-alert-error',
    info: 'aws-alert-info',
  }[type] || 'aws-alert-info';

  return (
    <div className={`aws-alert ${typeClass}`} role="alert">
      <div className="aws-alert-content">
        {title && <div className="aws-alert-title">{title}</div>}
        {message && <div className="aws-alert-message">{message}</div>}
      </div>
      {onClose && (
        <button className="aws-button aws-button--link" onClick={onClose} aria-label="Close">
          Dismiss
        </button>
      )}
    </div>
  );
}
