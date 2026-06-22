@echo off
echo Deploying updated admin-campaigns edge function...
echo This will fix the campaign progress and statistics display.
echo.

npx supabase functions deploy admin-campaigns --project-ref qzzvcqoletuummdsbbio

echo.
echo Deployment complete!
echo The campaign statistics should now update based on actual contacts.
pause

