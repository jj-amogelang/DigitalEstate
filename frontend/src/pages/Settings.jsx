import React, { useState } from 'react';
import './styles/settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('Account');
  const [selectedPlan, setSelectedPlan] = useState('Growth Plan');
  const [billingCycle, setBillingCycle] = useState('Monthly');

  const tabs = [
    'Account',
    'Team Management', 
    'Preferences',
    'Integration',
    'Billing & Subscription',
    'Security',
    'Report & Analytics'
  ];

  const plans = [
    {
      name: 'Starter Plan',
      price: 10.00,
      badge: 'FREE',
      badgeColor: 'orange',
      features: [
        'Manage up to 1,000 contacts',
        'Basic customer management tools',
        'Task and workflow automation',
        'Integration with third-party apps (limited)',
        'Customizable dashboards'
      ],
      isCurrent: false
    },
    {
      name: 'Growth Plan',
      price: 79.00,
      badge: 'PRO',
      badgeColor: 'orange',
      features: [
        'Manage up to 10,000 contacts',
        'Advanced customer management',
        'Full automation capabilities',
        'Real time reporting and analytics',
        'Collaborative team features'
      ],
      isCurrent: true,
      isHighlighted: true
    },
    {
      name: 'Enterprise Plan',
      price: 'Custom',
      badge: 'ADVANCE',
      badgeColor: 'green',
      features: [
        'Unlimited contacts and data storage',
        'Custom workflow and automation setups',
        'Dedicated account manager',
        'Advanced analytics and reporting',
        'Full API access and custom integrations'
      ],
      isCurrent: false,
      isCustom: true
    }
  ];

  const billingHistory = [
    {
      planName: 'Starter Plan - Jun 2024',
      amount: 10.00,
      purchaseDate: '2024-06-01',
      endDate: '2024-06-31',
      status: 'Processing'
    },
    {
      planName: 'Growth Plan - May 2024',
      amount: 79.00,
      purchaseDate: '2024-05-01',
      endDate: '2024-05-31',
      status: 'Success'
    },
    {
      planName: 'Starter Plan - Apr 2024',
      amount: 10.00,
      purchaseDate: '2024-04-01',
      endDate: '2024-04-30',
      status: 'Success'
    },
    {
      planName: 'Starter Plan - Mar 2024',
      amount: 10.00,
      purchaseDate: '2024-03-01',
      endDate: '2024-03-31',
      status: 'Success'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Account':
        return (
          <div className="settings-tab-content">
            <h2>Account Settings</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" className="form-input" defaultValue="John Doe" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-input" defaultValue="john@example.com" />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" className="form-input" defaultValue="+1 (555) 123-4567" />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input type="text" className="form-input" defaultValue="Digital Estate Co." />
              </div>
              <div className="form-actions">
                <button className="btn btn-primary">Save Changes</button>
                <button className="btn btn-outline">Cancel</button>
              </div>
            </div>
          </div>
        );

      case 'Team Management':
        return (
          <div className="settings-tab-content">
            <h2>Team Management</h2>
            <div className="team-section">
              <div className="team-header">
                <h3>Team Members</h3>
                <button className="btn btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Member
                </button>
              </div>
              <div className="team-list">
                {['John Doe (Admin)', 'Jane Smith (Editor)', 'Mike Johnson (Viewer)'].map((member, index) => (
                  <div key={index} className="team-member">
                    <div className="member-info">
                      <div className="member-avatar">{member.charAt(0)}</div>
                      <span>{member}</span>
                    </div>
                    <button className="btn-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="19" cy="12" r="1"/>
                        <circle cx="5" cy="12" r="1"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'Preferences':
        return (
          <div className="settings-tab-content">
            <h2>Preferences</h2>
            <div className="preferences-section">
              <div className="preference-group">
                <h3>Theme</h3>
                <div className="theme-options">
                  {['Light', 'Dark', 'Auto'].map(theme => (
                    <button key={theme} className={`theme-btn ${theme === 'Dark' ? 'active' : ''}`}>
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
              <div className="preference-group">
                <h3>Language</h3>
                <select className="form-select">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
              <div className="preference-group">
                <h3>Notifications</h3>
                <div className="toggle-group">
                  <div className="toggle-item">
                    <label>Email Notifications</label>
                    <div className="toggle-switch active">
                      <span className="toggle-slider"></span>
                    </div>
                  </div>
                  <div className="toggle-item">
                    <label>Push Notifications</label>
                    <div className="toggle-switch">
                      <span className="toggle-slider"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Integration':
        return (
          <div className="settings-tab-content">
            <h2>Integration</h2>
            <div className="integration-section">
              <div className="integration-list">
                {['Slack', 'Zapier', 'Google Workspace', 'Microsoft 365'].map((integration, index) => (
                  <div key={index} className="integration-item">
                    <div className="integration-info">
                      <div className="integration-icon">{integration.charAt(0)}</div>
                      <div>
                        <h4>{integration}</h4>
                        <p>Connect your {integration} account</p>
                      </div>
                    </div>
                    <button className="btn btn-outline">Connect</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'Billing & Subscription':
        return (
          <div className="settings-tab-content">
            <div className="billing-header">
              <h2>Billing & Subscription</h2>
              <p className="billing-subtitle">Keep track of your subscription details, update your billing information, and control your account's payment</p>
              <div className="billing-cycle-toggle">
                <button 
                  className={`cycle-btn ${billingCycle === 'Monthly' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('Monthly')}
                >
                  Monthly
                </button>
                <button 
                  className={`cycle-btn ${billingCycle === 'Yearly' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('Yearly')}
                >
                  Yearly
                </button>
              </div>
            </div>
            
            <div className="subscription-plans">
              {plans.map((plan, index) => (
                <div key={index} className={`plan-card ${plan.isHighlighted ? 'highlighted' : ''} ${plan.isCurrent ? 'current' : ''}`}>
                  <div className="plan-header">
                    <div className="plan-title">
                      <h3>{plan.name}</h3>
                      <span className={`plan-badge ${plan.badgeColor}`}>{plan.badge}</span>
                    </div>
                    <div className="plan-price">
                      {plan.isCustom ? (
                        <span className="custom-price">Custom</span>
                      ) : (
                        <>
                          <span className="price">${plan.price}</span>
                          <span className="period">/{billingCycle.toLowerCase().slice(0, -2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="plan-features">
                    {plan.features.map((feature, fIndex) => (
                      <div key={fIndex} className="feature-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>
                  
                  <div className="plan-action">
                    {plan.isCurrent ? (
                      <button className="btn btn-current">Current Plan</button>
                    ) : plan.isCustom ? (
                      <button className="btn btn-contact">Contact Us</button>
                    ) : (
                      <button className="btn btn-upgrade">Upgrade Plan</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="billing-history">
              <div className="history-header">
                <h3>Billing History</h3>
                <div className="history-actions">
                  <input type="text" placeholder="Search..." className="search-input" />
                  <button className="btn-icon" title="Filter">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
                    </svg>
                  </button>
                  <button className="btn-icon" title="Export">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="history-table">
                <div className="table-header">
                  <div>Plan Name</div>
                  <div>Amounts</div>
                  <div>Purchase Date</div>
                  <div>End Date</div>
                  <div>Status</div>
                  <div>Action</div>
                </div>
                {billingHistory.map((record, index) => (
                  <div key={index} className="table-row">
                    <div>{record.planName}</div>
                    <div>${record.amount.toFixed(2)}</div>
                    <div>{record.purchaseDate}</div>
                    <div>{record.endDate}</div>
                    <div>
                      <span className={`status ${record.status.toLowerCase()}`}>
                        {record.status}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button className="btn-icon" title="Download">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      <button className="btn-icon" title="View">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'Security':
        return (
          <div className="settings-tab-content">
            <h2>Security Settings</h2>
            <div className="security-section">
              <div className="security-group">
                <h3>Password</h3>
                <p>Ensure your account is using a strong password</p>
                <button className="btn btn-outline">Change Password</button>
              </div>
              <div className="security-group">
                <h3>Two-Factor Authentication</h3>
                <p>Add an extra layer of security to your account</p>
                <div className="toggle-item">
                  <label>Enable 2FA</label>
                  <div className="toggle-switch">
                    <span className="toggle-slider"></span>
                  </div>
                </div>
              </div>
              <div className="security-group">
                <h3>Login History</h3>
                <p>Review recent login activity</p>
                <div className="login-history">
                  {['Chrome on Windows - 2 hours ago', 'Safari on iPhone - 1 day ago', 'Firefox on macOS - 3 days ago'].map((login, index) => (
                    <div key={index} className="login-item">
                      <span>{login}</span>
                      <button className="btn-text">Revoke</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'Report & Analytics':
        return (
          <div className="settings-tab-content">
            <h2>Report & Analytics</h2>
            <div className="analytics-section">
              <div className="analytics-group">
                <h3>Data Export</h3>
                <p>Export your data in various formats</p>
                <div className="export-options">
                  <button className="btn btn-outline">Export CSV</button>
                  <button className="btn btn-outline">Export PDF</button>
                  <button className="btn btn-outline">Export Excel</button>
                </div>
              </div>
              <div className="analytics-group">
                <h3>Report Frequency</h3>
                <p>Choose how often you receive reports</p>
                <select className="form-select">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div className="analytics-group">
                <h3>Data Retention</h3>
                <p>Control how long your data is stored</p>
                <select className="form-select">
                  <option>6 months</option>
                  <option>1 year</option>
                  <option>2 years</option>
                  <option>Forever</option>
                </select>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header-section">
        <div className="header-content">
          <h1>Settings</h1>
          <div className="header-actions">
            <button className="btn btn-outline">Cancel</button>
            <button className="btn btn-primary">Save Changes</button>
          </div>
        </div>
      </div>

      <div className="settings-tabs">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Settings;
