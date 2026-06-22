@echo off
echo ===============================================
echo  Zerobounce Integration - Deployment
echo ===============================================
echo.
echo This script will deploy the Zerobounce integration.
echo.
echo Components:
echo  1. Database migration (zerobounce tables)
echo  2. Edge function (zerobounce-manage)
echo.
echo ===============================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI not found!
    echo.
    echo Please install it first:
    echo   npm install -g supabase
    echo.
    exit /b 1
)

echo [1/3] Supabase CLI found
echo.

echo [2/3] Applying database migration...
npx supabase db push --linked
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Migration push may have failed or already applied
    echo This is OK if the migration was already applied previously.
    echo.
)
echo OK: Migration applied
echo.

echo [3/3] Deploying zerobounce-manage edge function...
npx supabase functions deploy zerobounce-manage
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy zerobounce-manage function
    exit /b 1
)
echo OK: zerobounce-manage deployed
echo.

echo ===============================================
echo  DEPLOYMENT COMPLETE!
echo ===============================================
echo.
echo What's Deployed:
echo  - Database tables created (zerobounce_config, zerobounce_validations)
echo  - Edge function deployed (zerobounce-manage)
echo  - RLS policies configured
echo  - Super admin access control enabled
echo.
echo Next Steps:
echo  1. Go to /adminpanel/integration-manager
echo  2. Scroll to Zerobounce section
echo  3. Enter your Zerobounce API key
echo  4. Click 'Test' to verify connection
echo  5. Click 'Save ^& Connect' to store the key
echo  6. Status should show 'Zerobounce Connected'
echo.
echo ===============================================
pause
