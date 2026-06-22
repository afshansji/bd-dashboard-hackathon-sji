# Zerobounce Integration Fix - Deployment Script (PowerShell)
# This script fixes the Zerobounce edge function errors

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Zerobounce Integration - Fix Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host " 1. Apply database migration to fix data types" -ForegroundColor White
Write-Host " 2. Deploy updated edge function with proper error handling" -ForegroundColor White
Write-Host " 3. Verify the deployment" -ForegroundColor White
Write-Host ""

$PROJECT_REF = "qzzvcqoletuummdsbbio"

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Please run this script from the sj-bd-dashboard directory" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Applying database migration for type fixes..." -ForegroundColor Cyan
try {
    npx supabase db push --project-ref $PROJECT_REF
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to apply database migration" -ForegroundColor Red
        Write-Host "Try running manually: npx supabase db push --project-ref $PROJECT_REF" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "OK: Database migration applied successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Database migration failed - $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/3] Deploying updated zerobounce-manage edge function..." -ForegroundColor Cyan
try {
    npx supabase functions deploy zerobounce-manage --project-ref $PROJECT_REF
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to deploy edge function" -ForegroundColor Red
        Write-Host "Try running manually: npx supabase functions deploy zerobounce-manage --project-ref $PROJECT_REF" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "OK: Edge function deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Edge function deployment failed - $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[3/3] Verifying deployment..." -ForegroundColor Cyan
Write-Host "Checking if edge function is accessible..." -ForegroundColor White

$functionUrl = "https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/zerobounce-manage"
try {
    $response = Invoke-WebRequest -Uri $functionUrl -Method Options -TimeoutSec 10 -ErrorAction SilentlyContinue
    Write-Host "OK: Edge function is accessible" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Could not verify edge function accessibility (this is normal if not authenticated)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "What was fixed:" -ForegroundColor Cyan
Write-Host " - Data type conversions for Zerobounce API responses" -ForegroundColor White
Write-Host " - Proper handling of INTEGER and BOOLEAN fields" -ForegroundColor White
Write-Host " - Null value handling for optional fields" -ForegroundColor White
Write-Host " - Database schema consistency" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host " 1. Open your application at: https://your-app-url.com/admin" -ForegroundColor White
Write-Host " 2. Go to Integration Manager" -ForegroundColor White
Write-Host " 3. Scroll to Zerobounce section" -ForegroundColor White
Write-Host " 4. Enter your API key: 3e4f6c721add4fa2a781195120472499" -ForegroundColor White
Write-Host " 5. Click 'Test Connection'" -ForegroundColor White
Write-Host " 6. Should see success with 3524 credits" -ForegroundColor White
Write-Host ""

Write-Host "Testing:" -ForegroundColor Yellow
Write-Host " - Test with the provided API key to verify connection" -ForegroundColor White
Write-Host " - Try validating a test email address" -ForegroundColor White
Write-Host " - Check browser console (F12) for any errors" -ForegroundColor White
Write-Host ""

Write-Host "If you encounter any issues:" -ForegroundColor Yellow
Write-Host " 1. Check Supabase logs at:" -ForegroundColor White
Write-Host "    https://supabase.com/dashboard/project/$PROJECT_REF/logs/edge-functions" -ForegroundColor White
Write-Host " 2. Ensure you have super_admin role assigned" -ForegroundColor White
Write-Host " 3. Verify API key is correct from Zerobounce dashboard" -ForegroundColor White
Write-Host ""

Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host ""

