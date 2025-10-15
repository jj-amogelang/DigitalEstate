param(
    [string]$Port = "5001",
    [string]$DatabaseUrl = "postgresql://postgres:01092002@localhost:5432/digitalestate",
    [switch]$VerboseEnv
)

Write-Host "Starting backend/main.py on port $Port using DATABASE_URL=$DatabaseUrl" -ForegroundColor Cyan
$env:PORT = $Port
$env:DATABASE_URL = $DatabaseUrl

if ($VerboseEnv) {
    Write-Host "ENV: PORT=$($env:PORT)" -ForegroundColor DarkGray
    Write-Host "ENV: DATABASE_URL=$($env:DATABASE_URL)" -ForegroundColor DarkGray
}

# Prefer python if available; fallback to py launcher
if (Get-Command python -ErrorAction SilentlyContinue) {
    python "$(Join-Path $PSScriptRoot 'main.py')"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    py "$(Join-Path $PSScriptRoot 'main.py')"
} else {
    Write-Error "Neither 'python' nor 'py' was found on PATH. Install Python 3.13+ and try again."
    exit 1
}
