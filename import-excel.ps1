# Digital Estate Excel Import Tool
Write-Host "🏠 Digital Estate Excel Import Tool" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend directory
Set-Location "C:\Users\amoge\Digital Estate\backend"

# Check for virtual environment
$venvPaths = @("venv\Scripts\Activate.ps1", ".venv\Scripts\Activate.ps1")
$venvFound = $false

foreach ($venvPath in $venvPaths) {
    if (Test-Path $venvPath) {
        Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
        & $venvPath
        $venvFound = $true
        break
    }
}

if (-not $venvFound) {
    Write-Host "⚠️ No virtual environment found, using system Python" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 Starting Excel import..." -ForegroundColor Green
Write-Host ""

# Run the import tool
python excel_import_tool.py

Write-Host ""
Write-Host "✅ Import process completed" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"
