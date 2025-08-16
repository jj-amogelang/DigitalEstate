# Digital Estate - File Naming Standards & Renaming Plan

## 🎯 Professional File Naming Standards

### Naming Conventions:
- **PascalCase**: For React components (PropertyList.jsx)
- **kebab-case**: For CSS files (property-list.css)
- **snake_case**: For Python modules (property_service.py)
- **SCREAMING_SNAKE_CASE**: For constants and config files (DATABASE_CONFIG.py)
- **Descriptive names**: Clear purpose indication
- **No spaces**: Use underscores or hyphens
- **Professional suffixes**: .service.py, .model.py, .component.jsx, etc.

## 📝 Frontend Files Renaming Plan

### Current → Professional Name → Purpose
```
Properties.jsx → PropertyListPage.jsx (Main property listing page)
PropertyDetails.jsx → PropertyDetailsPage.jsx (Individual property details page)
PropertiesSimplified.jsx → PropertyListSimplified.jsx (Simplified version - can be removed)
PropertiesNew.jsx → PropertyListModern.jsx (Modern version - can be removed)
PropertiesZara.css → property-list-page.css (Styles for property list)
PropertiesModern.css → property-list-modern.css (Modern styles)
PropertyDetailsZara.css → property-details-page.css (Styles for property details)
Dashboard.jsx → DashboardPage.jsx (Main dashboard page)
ResearchDashboard.jsx → MarketResearchDashboard.jsx (Market research dashboard)
Settings.jsx → SettingsPage.jsx (Settings page)
APITest.jsx → ApiConnectionTest.jsx (API connection test component)
```

## 🐍 Backend Files Renaming Plan

### Core Application Files:
```
app.py → main.py (Main Flask application)
models.py → database_models.py (Database models)
config.py → app_config.py (Application configuration)
wsgi.py → wsgi_entry.py (WSGI entry point)
```

### Database & Import Scripts:
```
setup_db.py → database_setup.py
init_sqlite.py → sqlite_database_init.py
excel_import.py → excel_data_importer.py
update_from_excel.py → excel_data_updater.py
import_exact_excel.py → excel_exact_importer.py
seed.py → database_seeder.py
```

### Testing & Debugging Scripts:
```
test_api.py → api_endpoint_tests.py
test_connectivity.py → database_connectivity_test.py
test_connection.py → connection_validator.py
debug_config.py → configuration_debugger.py
production_check.py → production_readiness_checker.py
```

### Data Processing Scripts:
```
analyze_excel.py → excel_data_analyzer.py
check_properties.py → property_data_validator.py
inspect_db.py → database_inspector.py
show_hierarchy.py → location_hierarchy_viewer.py
```

### Utility Scripts:
```
quick_import.py → quick_data_importer.py
simple_import.py → simple_data_importer.py
final_import.py → final_data_importer.py
reset_ids.py → database_id_resetter.py
```

## 📊 Documentation Files Renaming Plan

### Current → Professional Name
```
README_POSTGRESQL.md → DATABASE_SETUP_GUIDE.md
RENDER_DEPLOYMENT.md → DEPLOYMENT_GUIDE.md
POST_DEPLOYMENT_SETUP.md → POST_DEPLOYMENT_CHECKLIST.md
TROUBLESHOOTING_GUIDE.md → TROUBLESHOOTING_MANUAL.md
MARKET_RESEARCH_INTEGRATION.md → MARKET_RESEARCH_FEATURES.md
```

## 🗂️ Directory Structure Improvements

### Suggested Backend Structure:
```
backend/
├── core/
│   ├── main.py (app.py)
│   ├── app_config.py (config.py)
│   ├── database_models.py (models.py)
│   └── wsgi_entry.py (wsgi.py)
├── services/
│   ├── excel_data_importer.py
│   ├── excel_data_updater.py
│   └── database_seeder.py
├── scripts/
│   ├── database_setup.py
│   ├── production_readiness_checker.py
│   └── database_inspector.py
├── tests/
│   ├── api_endpoint_tests.py
│   ├── database_connectivity_test.py
│   └── property_data_validator.py
└── utils/
    ├── excel_data_analyzer.py
    └── configuration_debugger.py
```

### Frontend Structure:
```
frontend/src/
├── pages/
│   ├── PropertyListPage.jsx
│   ├── PropertyDetailsPage.jsx
│   ├── DashboardPage.jsx
│   └── SettingsPage.jsx
├── components/
│   ├── PropertyCard.jsx
│   ├── PropertyModal.jsx
│   └── ApiConnectionTest.jsx
├── styles/
│   ├── property-list-page.css
│   ├── property-details-page.css
│   └── dashboard-page.css
└── config/
    └── api.js
```

## 🚀 Implementation Priority

### Phase 1 (Critical - Core Application):
1. app.py → main.py
2. Properties.jsx → PropertyListPage.jsx  
3. PropertyDetails.jsx → PropertyDetailsPage.jsx
4. models.py → database_models.py
5. config.py → app_config.py

### Phase 2 (Important - Main Features):
1. Dashboard.jsx → DashboardPage.jsx
2. excel_import.py → excel_data_importer.py
3. CSS files professional renaming
4. Documentation files

### Phase 3 (Clean-up):
1. Remove duplicate/unused files
2. Test scripts renaming
3. Utility scripts renaming
4. Directory restructuring

## ⚠️ Important Notes

1. **Update Import Statements**: All imports must be updated after renaming
2. **Configuration Updates**: Update package.json, requirements.txt references
3. **Documentation Updates**: Update all documentation with new file names
4. **Git History**: Use `git mv` to preserve file history
5. **Deployment Scripts**: Update build scripts and deployment configurations
6. **IDE Configuration**: Update IDE project settings if applicable

## 🎯 Benefits of Professional Naming

✅ **Clarity**: Purpose is immediately clear from filename  
✅ **Consistency**: Follows industry standards  
✅ **Maintainability**: Easier for new developers to understand  
✅ **Professionalism**: Looks polished and well-organized  
✅ **Scalability**: Easy to add new files following the pattern  
