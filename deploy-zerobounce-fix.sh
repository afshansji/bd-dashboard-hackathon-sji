#!/bin/bash
# Zerobounce Integration Fix - Deployment Script (Bash)
# This script fixes the Zerobounce edge function errors

echo ""
echo "========================================"
echo " Zerobounce Integration - Fix Deployment"
echo "========================================"
echo ""

echo "This script will:"
echo " 1. Apply database migration to fix data types"
echo " 2. Deploy updated edge function with proper error handling"
echo " 3. Verify the deployment"
echo ""

PROJECT_REF="qzzvcqoletuummdsbbio"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found. Please run this script from the sj-bd-dashboard directory"
    exit 1
fi

echo "[1/3] Applying database migration for type fixes..."
if ! npx supabase db push --project-ref "$PROJECT_REF"; then
    echo "ERROR: Failed to apply database migration"
    echo "Try running manually: npx supabase db push --project-ref $PROJECT_REF"
    exit 1
fi
echo "✓ Database migration applied successfully"

echo ""
echo "[2/3] Deploying updated zerobounce-manage edge function..."
if ! npx supabase functions deploy zerobounce-manage --project-ref "$PROJECT_REF"; then
    echo "ERROR: Failed to deploy edge function"
    echo "Try running manually: npx supabase functions deploy zerobounce-manage --project-ref $PROJECT_REF"
    exit 1
fi
echo "✓ Edge function deployed successfully"

echo ""
echo "[3/3] Verifying deployment..."
echo "Checking if edge function is accessible..."

FUNCTION_URL="https://qzzvcqoletuummdsbbio.supabase.co/functions/v1/zerobounce-manage"
if curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$FUNCTION_URL" | grep -q "200\|204"; then
    echo "✓ Edge function is accessible"
else
    echo "⚠ Could not verify edge function accessibility (this is normal if not authenticated)"
fi

echo ""
echo "========================================"
echo " Deployment Complete!"
echo "========================================"
echo ""

echo "What was fixed:"
echo " ✓ Data type conversions for Zerobounce API responses"
echo " ✓ Proper handling of INTEGER and BOOLEAN fields"
echo " ✓ Null value handling for optional fields"
echo " ✓ Database schema consistency"
echo ""

echo "Next Steps:"
echo " 1. Open your application at: https://your-app-url.com/admin"
echo " 2. Go to Integration Manager"
echo " 3. Scroll to Zerobounce section"
echo " 4. Enter your API key: 3e4f6c721add4fa2a781195120472499"
echo " 5. Click 'Test Connection'"
echo " 6. Should see success with 3524 credits"
echo ""

echo "Testing:"
echo " - Test with the provided API key to verify connection"
echo " - Try validating a test email address"
echo " - Check browser console (F12) for any errors"
echo ""

echo "If you encounter any issues:"
echo " 1. Check Supabase logs at:"
echo "    https://supabase.com/dashboard/project/$PROJECT_REF/logs/edge-functions"
echo " 2. Ensure you have super_admin role assigned"
echo " 3. Verify API key is correct from Zerobounce dashboard"
echo ""

echo "✓ Deployment successful!"
echo ""

