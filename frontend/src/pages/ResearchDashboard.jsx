import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { API_ENDPOINTS } from '../config/api';
import './styles/research-dashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ResearchDashboard = () => {
  const [marketTrends, setMarketTrends] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterType, setFilterType] = useState('all');

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trendsResponse, propertiesResponse] = await Promise.all([
        axios.get(API_ENDPOINTS.MARKET_TRENDS),
        axios.get(API_ENDPOINTS.RESEARCH_PROPERTIES)
      ]);
      
      setMarketTrends(trendsResponse.data);
      setProperties(propertiesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadStatus('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploadStatus('Uploading...');
      await axios.post(API_ENDPOINTS.UPLOAD_EXCEL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadStatus('Upload successful! Data refreshed.');
      setSelectedFile(null);
      // Refresh data after successful upload
      fetchData();
    } catch (error) {
      setUploadStatus('Upload failed: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Sorting logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort properties
  const filteredAndSortedProperties = React.useMemo(() => {
    let filtered = properties.filter(property => {
      const matchesSearch = property.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           property.property_type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || property.property_type.toLowerCase() === filterType.toLowerCase();
      return matchesSearch && matchesType;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [properties, searchTerm, filterType, sortConfig]);

  // Chart data preparation
  const avgPriceChartData = {
    labels: marketTrends.map(trend => trend.area),
    datasets: [
      {
        label: 'Average Price (R)',
        data: marketTrends.map(trend => trend.avg_price),
        backgroundColor: 'rgba(255, 215, 0, 0.8)',
        borderColor: 'rgba(255, 215, 0, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const rentalYieldChartData = {
    labels: marketTrends.map(trend => trend.area),
    datasets: [
      {
        label: 'Rental Yield (%)',
        data: marketTrends.map(trend => trend.rental_yield),
        backgroundColor: 'rgba(76, 175, 80, 0.8)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const growthRateChartData = {
    labels: marketTrends.map(trend => trend.area),
    datasets: [
      {
        label: 'Growth Rate (%)',
        data: marketTrends.map(trend => trend.growth_rate),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffffff',
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        color: '#ffffff',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#ffffff',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        ticks: {
          color: '#ffffff',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  const lineChartOptions = {
    ...chartOptions,
    elements: {
      point: {
        radius: 6,
        hoverRadius: 8,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#ffffff',
          padding: 20,
        },
      },
      title: {
        display: true,
        text: 'Growth Rate Distribution',
        color: '#ffffff',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return '⇅';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="research-loading">
        <div className="loading-spinner"></div>
        <p>Loading market research data...</p>
      </div>
    );
  }

  return (
    <div className="research-dashboard">
      <div className="research-header">
        <h1>Property Market Research Dashboard</h1>
        <p>Comprehensive insights into Sandton, Centurion, and Rosebank property markets</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>Total Properties</h3>
            <div className="metric-value">{properties.length}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">🏢</div>
          <div className="metric-content">
            <h3>Average Price</h3>
            <div className="metric-value">
              {marketTrends.length > 0 && formatCurrency(
                marketTrends.reduce((sum, trend) => sum + trend.avg_price, 0) / marketTrends.length
              )}
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <h3>Average Yield</h3>
            <div className="metric-value">
              {marketTrends.length > 0 && formatPercentage(
                marketTrends.reduce((sum, trend) => sum + trend.rental_yield, 0) / marketTrends.length
              )}
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>Areas Analyzed</h3>
            <div className="metric-value">{marketTrends.length}</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Average Property Prices by Area</h3>
          <div className="chart-wrapper">
            <Bar data={avgPriceChartData} options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Average Property Prices by Area'}}}} />
          </div>
        </div>

        <div className="chart-container">
          <h3>Rental Yield Trends</h3>
          <div className="chart-wrapper">
            <Line data={rentalYieldChartData} options={{...lineChartOptions, plugins: {...lineChartOptions.plugins, title: {...lineChartOptions.plugins.title, text: 'Rental Yield by Area'}}}} />
          </div>
        </div>

        <div className="chart-container">
          <h3>Growth Rate Distribution</h3>
          <div className="chart-wrapper">
            <Doughnut data={growthRateChartData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="upload-section">
        <h3>Update Market Data</h3>
        <form onSubmit={handleFileUpload} className="upload-form">
          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="file-input"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="file-label">
              {selectedFile ? selectedFile.name : 'Choose Excel file'}
            </label>
          </div>
          <button type="submit" className="upload-btn" disabled={!selectedFile}>
            Upload Data
          </button>
        </form>
        {uploadStatus && (
          <div className={`upload-status ${uploadStatus.includes('successful') ? 'success' : 'error'}`}>
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Properties Table */}
      <div className="properties-table-section">
        <div className="table-header">
          <h3>Property Research Data</h3>
          <div className="table-controls">
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="Search by area or property type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Property Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="properties-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('area')} className="sortable">
                  Area {getSortIcon('area')}
                </th>
                <th onClick={() => handleSort('property_type')} className="sortable">
                  Property Type {getSortIcon('property_type')}
                </th>
                <th onClick={() => handleSort('avg_price')} className="sortable">
                  Avg Price {getSortIcon('avg_price')}
                </th>
                <th onClick={() => handleSort('rental_yield')} className="sortable">
                  Rental Yield {getSortIcon('rental_yield')}
                </th>
                <th onClick={() => handleSort('vacancy_rate')} className="sortable">
                  Vacancy Rate {getSortIcon('vacancy_rate')}
                </th>
                <th onClick={() => handleSort('growth_rate')} className="sortable">
                  Growth Rate {getSortIcon('growth_rate')}
                </th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProperties.map((property) => (
                <tr key={property.id}>
                  <td className="area-cell">{property.area}</td>
                  <td className="type-cell">
                    <span className={`type-badge ${property.property_type.toLowerCase()}`}>
                      {property.property_type}
                    </span>
                  </td>
                  <td className="price-cell">{formatCurrency(property.avg_price)}</td>
                  <td className="yield-cell">{formatPercentage(property.rental_yield)}</td>
                  <td className="vacancy-cell">{formatPercentage(property.vacancy_rate)}</td>
                  <td className="growth-cell">
                    <span className={`growth-indicator ${property.growth_rate >= 0 ? 'positive' : 'negative'}`}>
                      {formatPercentage(property.growth_rate)}
                    </span>
                  </td>
                  <td className="date-cell">{new Date(property.last_updated).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedProperties.length === 0 && (
          <div className="no-results">
            <p>No properties found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchDashboard;
