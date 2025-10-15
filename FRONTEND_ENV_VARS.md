# Frontend Environment Variables

These variables control how the frontend connects to the backend and optional admin features.

- REACT_APP_API_URL
  - Description: Base URL for the backend API.
  - Example (local): http://localhost:5000
  - Example (Render): https://<your-backend-on-render>.onrender.com
  - Where to set: create a .env file in `frontend/` or configure in your hosting provider.

- REACT_APP_MV_REFRESH_TOKEN (optional)
  - Description: Admin token to authorize refreshing materialized views via the UI button on Explore page.
  - If your backend requires an auth token (recommended), set it here to enable the button to pass the token.
  - If not set, the button still attempts refresh, but backend may reject it.

How to use in development (Windows PowerShell):

- Create a file `frontend/.env.local` with contents:
  REACT_APP_API_URL=http://localhost:5000
  REACT_APP_MV_REFRESH_TOKEN=dev-secret-token

- Then start dev server from `frontend/` folder:
  npm start

Notes:
- Create React App exposes only variables prefixed with REACT_APP_.
- Restart the dev server after changing .env files.
