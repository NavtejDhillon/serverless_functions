@echo off
echo ====================================
echo    Building Serverless Platform
echo ====================================

:: 1. Install backend dependencies
echo Installing backend dependencies...
call npm install

:: 2. Install frontend dependencies
echo Installing frontend dependencies...
cd frontend && call npm install

:: 3. Build frontend
echo Building frontend...
call npm run build
cd ..

:: 4. Ensure public directory exists
echo Setting up public directory...
if not exist public mkdir public

:: 5. Copy frontend build to public
echo Copying frontend build to public directory...
xcopy /E /I /Y frontend\dist\* public\

:: 6. Build backend
echo Building backend...
call npm run build

:: 7. Set permissions to ensure serverless directories exist
echo Setting up serverless directories...
if not exist functions mkdir functions
if not exist uploads mkdir uploads
if not exist dist\functions mkdir dist\functions
if not exist tmp mkdir tmp

echo ====================================
echo Build completed successfully!
echo ====================================
echo Run the application with: npm start
echo For development, use: npm run dev:all

pause 