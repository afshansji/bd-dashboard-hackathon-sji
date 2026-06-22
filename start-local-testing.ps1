# Local Zerobounce Testing Setup Script (PowerShell)
# This script sets up and verifies your local environment for testing

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Zerobounce Integration - Local Test Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$hasErrors = $false

# Check 1: Docker Desktop
Write-Host "Step 1: Checking Docker Desktop..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker installed: $dockerVersion" -ForegroundColor Green
        
        # Check if Docker is running
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker is running" -ForegroundColor Green
        } else {
            Write-Host "❌ Docker is installed but not running" -ForegroundColor Red
            Write-Host "   Please start Docker Desktop and try again" -ForegroundColor Yellow
            Write-Host "   1. Open Docker Desktop application" -ForegroundColor White
            Write-Host "   2. Wait for it to fully start (whale icon should be steady)" -ForegroundColor White
            Write-Host "   3. Run this script again" -ForegroundColor White
            $hasErrors = $true
        }
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "❌ Docker Desktop not found" -ForegroundColor Red
    Write-Host "   Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "   After installing, restart this script" -ForegroundColor White
    $hasErrors = $true
}
Write-Host ""

# Check 2: Node.js
Write-Host "Step 2: Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node not found"
    }
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    $hasErrors = $true
}
Write-Host ""

# Check 3: npm
Write-Host "Step 3: Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ npm installed: $npmVersion" -ForegroundColor Green
    } else {
        throw "npm not found"
    }
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    $hasErrors = $true
}
Write-Host ""

if ($hasErrors) {
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "❌ Prerequisites Missing" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please install the missing prerequisites above and try again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check 4: Supabase Status
Write-Host "Step 4: Checking Supabase local instance..." -ForegroundColor Yellow
$supabaseStatus = npx supabase status 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Supabase is running" -ForegroundColor Green
    Write-Host ""
    Write-Host $supabaseStatus
} else {
    Write-Host "⚠️  Supabase is not running" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Starting Supabase..." -ForegroundColor Yellow
    
    npx supabase start
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Supabase started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Getting status..." -ForegroundColor Yellow
        npx supabase status
    } else {
        Write-Host ""
        Write-Host "❌ Failed to start Supabase" -ForegroundColor Red
        Write-Host "   Make sure Docker Desktop is running and try again" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ""

# Check 5: Database Tables
Write-Host "Step 5: Checking database tables..." -ForegroundColor Yellow
$tableCheck = npx supabase db shell -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('zerobounce_config', 'zerobounce_validations');" 2>&1

if ($tableCheck -match "2") {
    Write-Host "✅ Zerobounce tables exist" -ForegroundColor Green
} else {
    Write-Host "⚠️  Zerobounce tables not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Applying migrations..." -ForegroundColor Yellow
    npx supabase db reset --skip-seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations applied" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to apply migrations" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Check 6: Test User
Write-Host "Step 6: Checking for test user..." -ForegroundColor Yellow
$userCheck = npx supabase db shell -c "SELECT COUNT(*) FROM auth.users WHERE email = 'test@example.com';" 2>&1

if ($userCheck -match "[1-9]") {
    Write-Host "✅ Test user exists (test@example.com)" -ForegroundColor Green
    
    # Check role
    $roleCheck = npx supabase db shell -c "SELECT role FROM user_roles ur JOIN auth.users u ON ur.user_id = u.id WHERE u.email = 'test@example.com';" 2>&1
    
    if ($roleCheck -match "super_admin") {
        Write-Host "✅ Test user has super_admin role" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Test user missing super_admin role" -ForegroundColor Yellow
        Write-Host "   Granting role..." -ForegroundColor Yellow
        
        npx supabase db shell -c "INSERT INTO user_roles (user_id, role) SELECT id, 'super_admin'::app_role FROM auth.users WHERE email = 'test@example.com' ON CONFLICT DO NOTHING;" 2>&1
        
        Write-Host "✅ Role granted" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Test user not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating test user (test@example.com / TestPassword123!)..." -ForegroundColor Yellow
    Write-Host ""
    
    # Note: This is a simplified version. For production, use proper user creation
    Write-Host "⚠️  Please create user manually:" -ForegroundColor Yellow
    Write-Host "   1. Open Supabase Studio: http://localhost:54323" -ForegroundColor White
    Write-Host "   2. Go to Authentication -> Users" -ForegroundColor White
    Write-Host "   3. Click 'Add user'" -ForegroundColor White
    Write-Host "   4. Email: test@example.com" -ForegroundColor White
    Write-Host "   5. Password: TestPassword123!" -ForegroundColor White
    Write-Host "   6. Auto Confirm: Yes" -ForegroundColor White
    Write-Host "   7. Then run this command:" -ForegroundColor White
    Write-Host ""
    Write-Host "   npx supabase db shell -c `"INSERT INTO user_roles (user_id, role) SELECT id, 'super_admin'::app_role FROM auth.users WHERE email = 'test@example.com' ON CONFLICT DO NOTHING;`"" -ForegroundColor Cyan
    Write-Host ""
}
Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Make sure your .env.local has local Supabase URL" -ForegroundColor White
Write-Host "2. Start dev server: npm run dev" -ForegroundColor White
Write-Host "3. Open app: http://localhost:8080" -ForegroundColor White
Write-Host "4. Login with: test@example.com / TestPassword123!" -ForegroundColor White
Write-Host "5. Go to Admin Panel -> Integration Manager" -ForegroundColor White
Write-Host "6. Test Zerobounce integration" -ForegroundColor White
Write-Host ""
Write-Host "For detailed testing guide, see: LOCAL_TEST_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start edge functions locally:" -ForegroundColor Yellow
Write-Host "  npx supabase functions serve zerobounce-manage" -ForegroundColor White
Write-Host ""


