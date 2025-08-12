// Frontend API Connection Test
// Add this to browser console to test API connection

console.log('🔍 Testing API Connection...');

// Get the API URL from the environment
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
console.log('🌐 API URL:', apiUrl);

// Test health check
fetch(`${apiUrl}/`)
  .then(response => response.json())
  .then(data => {
    console.log('✅ Health Check Response:', data);
  })
  .catch(error => {
    console.error('❌ Health Check Error:', error);
  });

// Test properties endpoint
fetch(`${apiUrl}/api/properties`)
  .then(response => response.json())
  .then(data => {
    console.log('✅ Properties Response:', data);
    console.log(`📊 Found ${data.length} properties`);
  })
  .catch(error => {
    console.error('❌ Properties Error:', error);
  });

// Check for CORS issues
console.log('🔍 Check Network tab for CORS errors...');
