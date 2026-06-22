@echo off
echo ===============================================
echo  Email Automation Bug Fixes - Deployment
echo ===============================================
echo.
echo This script will deploy the fixed email functions.
echo.
echo Bugs Fixed:
echo  1. Immediate/Scheduled modes now work
echo  2. Time restrictions only apply to drip mode
echo.
echo ===============================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Supabase CLI...
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI not found!
    echo.
    echo Please install it first:
    echo   npm install -g supabase
    echo.
    pause
    exit /b 1
)
echo OK: Supabase CLI found
echo.

echo [2/3] Deploying sequence-enroll-contacts function...
supabase functions deploy sequence-enroll-contacts
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy sequence-enroll-contacts
    pause
    exit /b 1
)
echo OK: sequence-enroll-contacts deployed
echo.

echo [3/3] Deploying sequence-process-batches function...
supabase functions deploy sequence-process-batches
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy sequence-process-batches
    pause
    exit /b 1
)
echo OK: sequence-process-batches deployed
echo.

echo ===============================================
echo  DEPLOYMENT COMPLETE!
echo ===============================================
echo.
echo What's Fixed:
echo  - Immediate mode now works
echo  - Scheduled mode now works  
echo  - Time restrictions only apply to drip mode
echo  - Emails send anytime for immediate/scheduled
echo.
echo Next Steps:
echo  1. Go to Sequences page
echo  2. Click "Enroll Contacts"
echo  3. Select your email
echo  4. Choose "Immediate" mode
echo  5. Click "Enroll"
echo  6. Wait 5-10 minutes
echo  7. Check your email!
echo.
echo ===============================================
pause





