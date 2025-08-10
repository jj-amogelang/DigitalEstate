@echo off
echo 🏠 Digital Estate Excel Import Tool
echo =====================================
echo.

:: Navigate to backend directory
cd /d "C:\Users\amoge\Digital Estate\backend"

:: Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo 🔧 Activating virtual environment...
    call venv\Scripts\activate.bat
) else if exist ".venv\Scripts\activate.bat" (
    echo 🔧 Activating virtual environment...
    call .venv\Scripts\activate.bat
) else (
    echo ⚠️ No virtual environment found, using system Python
)

echo.
echo 📊 Starting Excel import...
echo.

:: Run the import tool
python excel_import_tool.py

echo.
echo ✅ Import process completed
echo.
pause
