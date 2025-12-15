#  Digital Estate Dashboard

A modern, professional property management dashboard built with React and Flask, featuring a minimalist design.

##  Live Demo

- **Dashboard**: https://digital-estate-dashboard.onrender.com
- **API**: https://digital-estate-backend.onrender.com

##  Features

###  Property Management
- Modern property listings with detailed information
- Advanced search and filtering capabilities
- Property type categorization (Residential, Commercial, Industrial)
- Geographic organization (City, Province, Area)

###  Owner Management
- Complete owner profiles and contact information
- Property ownership tracking
- Owner-property relationship management

###  Valuations & Analytics
- Property valuation tracking and history
- Market value assessments
- Dashboard analytics with charts and statistics

###  Zoning Information
- Detailed zoning codes and descriptions
- Municipal regulations and restrictions
- Permitted uses and building limitations

###  Professional Design
- Zara-inspired minimalist aesthetic
- Gold accent color scheme (#D4AF37)
- Responsive design for all devices
- Modern card-based layouts

##  Technology Stack

### Frontend
- **React.js** - Modern JavaScript framework
- **CSS3** - Custom styling with Flexbox/Grid
- **Responsive Design** - Mobile-first approach

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **PostgreSQL** - Production database
- **Flask-CORS** - Cross-origin resource sharing

### Deployment
- **Render** - Cloud hosting platform
- **GitHub** - Version control and CI/CD
- **PostgreSQL** - Managed database service

##  Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+ and pip
- PostgreSQL (for local development)

### Local Development

1. **Clone Repository**:
   ```bash
   git clone https://github.com/jj-amogelang/DigitalEstate.git
   cd DigitalEstate
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

##  Deployment

The application is configured for automatic deployment on Render. See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed deployment instructions.

### Automatic Deployment
- **Trigger**: Push to `master` branch
- **Backend**: Auto-deploys Flask API with database initialization
- **Frontend**: Auto-deploys React app with production configuration

##  API Endpoints

### Properties
- `GET /api/properties` - List all properties with pagination
- `GET /api/properties/<id>` - Get property details
- `GET /api/search/properties?q=<query>` - Search properties

### Owners
- `GET /api/owners` - List all owners
- `GET /api/owners/<id>` - Get owner details with properties

### Analytics
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/charts` - Chart data

### Utilities
- `POST /init-data` - Initialize database with sample data

##  Project Structure

```
Digital Estate/
├── backend/                 # Flask API
│   ├── app.py              # Main application
│   ├── models.py           # Database models
│   ├── config.py           # Configuration
│   ├── init_sqlite.py      # Database initialization
│   ├── requirements.txt    # Python dependencies
│   ├── render.yaml         # Render configuration
│   └── build.sh           # Build script
├── frontend/               # React Dashboard
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── config/        # Configuration
│   ├── package.json       # Dependencies
│   └── render.yaml        # Render configuration
└── RENDER_DEPLOYMENT.md    # Deployment guide
```

##  Key Features

### Dashboard Analytics
- Total properties and owners count
- Property type distribution
- Geographic distribution by province
- Average property values
- Recent listings and trends

### Advanced Search
- Filter by property type, city, status
- Text search across property names, addresses, descriptions
- Real-time search results

### Professional UI/UX
- Clean, minimalist design inspired by luxury brands
- Consistent color scheme and typography
- Intuitive navigation and user flow
- Mobile-responsive layouts

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=postgresql://user:pass@host:port/db
SECRET_KEY=your-secret-key
FLASK_ENV=production
```

**Frontend** (`.env.production`):
```
REACT_APP_API_URL=https://digital-estate-backend.onrender.com
```

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

- Built with modern web technologies
- Deployed on Render's reliable platform

---

**Built with ❤️ for modern property management**
