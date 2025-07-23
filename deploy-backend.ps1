Write-Host "Deploying Digital Estate Backend to Vercel..." -ForegroundColor Green
Write-Host ""

Set-Location backend

Write-Host "Checking if Vercel CLI is installed..." -ForegroundColor Yellow
try {
    $vercelVersion = vercel --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Vercel CLI not found"
    }
    Write-Host "Vercel CLI found: $vercelVersion" -ForegroundColor Green
}
catch {
    Write-Host "Error: Vercel CLI is not installed." -ForegroundColor Red
    Write-Host "Please install it with: npm install -g vercel" -ForegroundColor Yellow
    Write-Host "Then run: vercel login" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting deployment..." -ForegroundColor Yellow
vercel --prod

Write-Host ""
Write-Host "Backend deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Note your backend URL from the deployment output" -ForegroundColor White
Write-Host "2. Update your frontend .env.production file with the backend URL" -ForegroundColor White
Write-Host "3. Redeploy your frontend if needed" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"
