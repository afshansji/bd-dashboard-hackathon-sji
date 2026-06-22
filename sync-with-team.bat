@echo off
REM ================================
REM Daily Team Sync - Simple Version
REM ================================

echo.
echo ================================
echo    DAILY TEAM SYNC
echo ================================
echo.

cd /d "C:\Users\pc\Documents\Agents\SJ-BD-AI\sj-bd-dashboard"

echo [1/5] Checking for changes...
git status

echo.
echo [2/5] Saving your work...
git add .
git commit -m "WIP: daily work in progress"

echo.
echo [3/5] Getting team updates...
git fetch origin

echo.
echo [4/5] Merging team changes...
git merge origin/main

echo.
echo [5/5] Pushing to GitHub...
git push

echo.
echo ================================
echo    SYNC COMPLETE!
echo ================================
echo.
echo You're ready to code! Press any key to exit...
pause >nul















