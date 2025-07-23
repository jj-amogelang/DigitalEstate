@echo off
echo Deploying Digital Estate Backend to Vercel...
echo.

cd backend

echo Checking if Vercel CLI is installed...
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Vercel CLI is not installed.
    echo Please install it with: npm install -g vercel
    echo Then run: vercel login
    pause
    exit /b 1
)

echo Starting deployment...
vercel --prod

echo.
echo Backend deployment complete!
echo.
echo Next steps:
echo 1. Note your backend URL from the deployment output
echo 2. Update your frontend .env.production file with the backend URL
echo 3. Redeploy your frontend if needed
echo.
pause
