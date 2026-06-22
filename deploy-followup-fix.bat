@echo off
echo Deploying updated generate-followup-suggestions edge function...
echo.

supabase functions deploy generate-followup-suggestions

echo.
echo Deployment complete!
echo The AI suggestions feature should now work correctly.
pause

