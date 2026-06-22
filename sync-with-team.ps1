# ================================
# Daily Team Sync Script
# ================================
# Run this every morning before starting work!

Write-Host "🔄 Starting Daily Team Sync..." -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
$projectPath = "C:\Users\pc\Documents\Agents\SJ-BD-AI\sj-bd-dashboard"
Set-Location $projectPath

# Step 1: Check current branch
Write-Host "📍 Checking current branch..." -ForegroundColor Yellow
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "   Current branch: $currentBranch" -ForegroundColor Green
Write-Host ""

# Step 2: Check for uncommitted changes
Write-Host "💾 Checking for uncommitted changes..." -ForegroundColor Yellow
$status = git status --porcelain

if ($status) {
    Write-Host "   Found uncommitted changes. Saving your work..." -ForegroundColor Yellow
    
    # Ask user for commit message
    $message = Read-Host "   Enter a commit message (or press Enter for 'WIP: daily work')"
    if ([string]::IsNullOrWhiteSpace($message)) {
        $message = "WIP: daily work in progress"
    }
    
    git add .
    git commit -m $message
    Write-Host "   ✅ Changes saved!" -ForegroundColor Green
} else {
    Write-Host "   ✅ No uncommitted changes" -ForegroundColor Green
}
Write-Host ""

# Step 3: Fetch latest from GitHub
Write-Host "📥 Fetching latest changes from GitHub..." -ForegroundColor Yellow
git fetch origin
Write-Host "   ✅ Fetched successfully!" -ForegroundColor Green
Write-Host ""

# Step 4: Check if main branch has updates
Write-Host "🔍 Checking for team updates..." -ForegroundColor Yellow
$LOCAL = git rev-parse @
$REMOTE = git rev-parse origin/main
$BASE = git merge-base @ origin/main

if ($LOCAL -eq $REMOTE) {
    Write-Host "   ✅ Already up to date!" -ForegroundColor Green
} elseif ($LOCAL -eq $BASE) {
    Write-Host "   📦 New changes from team found. Merging..." -ForegroundColor Yellow
    
    # Merge main into current branch
    git merge origin/main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Merged successfully!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  MERGE CONFLICTS DETECTED!" -ForegroundColor Red
        Write-Host "   Please resolve conflicts manually and run:" -ForegroundColor Red
        Write-Host "      git add ." -ForegroundColor Yellow
        Write-Host "      git commit" -ForegroundColor Yellow
        Write-Host "      git push" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "   ℹ️  Branches have diverged. Merging..." -ForegroundColor Yellow
    git merge origin/main
}
Write-Host ""

# Step 5: Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Pushed successfully!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Push failed. Please check errors above." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✨ Sync Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor White
Write-Host "   Branch: $currentBranch" -ForegroundColor Gray
Write-Host "   Status: ✅ Synced with team" -ForegroundColor Gray
Write-Host "   You're ready to start coding! 🚀" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")















