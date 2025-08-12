# Render Frontend Configuration

Service Type: Static Site
Name: digital-estate-frontend
Branch: master
Root Directory: frontend

Build Command: npm install && npm run build
Publish Directory: build

Auto-Deploy: Yes

# Environment Variables:
NODE_VERSION=18
REACT_APP_API_URL=https://[YOUR-BACKEND-URL].onrender.com

# Note: Replace [YOUR-BACKEND-URL] with the actual URL from step 8
