# Deploy Zerobounce Edge Function Script (PowerShell)
# This script deploys the zerobounce-manage edge function to Supabase

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploying Zerobounce Edge Function" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_REF = "qzzvcqoletuummdsbbio"
$FUNCTION_NAME = "zerobounce-manage"

# Check if we're in the right directory
if (-not (Test-Path "supabase\functions\$FUNCTION_NAME")) {
    Write-Host "❌ Error: supabase\functions\$FUNCTION_NAME directory not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run this script from the sj-bd-dashboard directory:" -ForegroundColor Yellow
    Write-Host "  cd sj-bd-dashboard" -ForegroundColor White
    Write-Host "  .\deploy-zerobounce-function.ps1" -ForegroundColor White
    exit 1
}

Write-Host "✅ Found $FUNCTION_NAME function directory" -ForegroundColor Green
Write-Host ""

Write-Host "Step 1: Checking Supabase CLI..." -ForegroundColor Yellow
try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "✅ Supabase CLI installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

Write-Host "Step 2: Checking authentication..." -ForegroundColor Yellow
try {
    $null = supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not logged in to Supabase" -ForegroundColor Red
        Write-Host ""
        Write-Host "Running: supabase login" -ForegroundColor Yellow
        supabase login
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Login failed" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "❌ Authentication check failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Authenticated" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Deploying $FUNCTION_NAME function..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Command: supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF" -ForegroundColor Cyan
Write-Host ""

supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "✅ SUCCESS: Function deployed!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Integration Manager in your app" -ForegroundColor White
    Write-Host "2. Enter your Zerobounce API key" -ForegroundColor White
    Write-Host "3. Click 'Test' to verify connection" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "❌ DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Check the error message above for details." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}


