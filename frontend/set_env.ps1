param(
	[string]$ApiUrl = "http://localhost:5001",
	[switch]$Start
)

Write-Host "Setting REACT_APP_API_URL to $ApiUrl for this session..."
$env:REACT_APP_API_URL = $ApiUrl
Write-Host "REACT_APP_API_URL=$($env:REACT_APP_API_URL)"

if ($Start) {
	if (Test-Path package.json) {
		Write-Host "Starting frontend dev server with the configured API URL..."
		npm start
	} else {
		Write-Warning "No package.json found. Run this script from the frontend folder."
	}
}
