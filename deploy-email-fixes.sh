#!/bin/bash

echo "==============================================="
echo " Email Automation Bug Fixes - Deployment"
echo "==============================================="
echo ""
echo "This script will deploy the fixed email functions."
echo ""
echo "Bugs Fixed:"
echo " 1. Immediate/Scheduled modes now work"
echo " 2. Time restrictions only apply to drip mode"
echo ""
echo "==============================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

echo "[1/3] Supabase CLI found ✓"
echo ""

echo "[2/3] Deploying sequence-enroll-contacts function..."
if ! supabase functions deploy sequence-enroll-contacts; then
    echo "ERROR: Failed to deploy sequence-enroll-contacts"
    exit 1
fi
echo "OK: sequence-enroll-contacts deployed ✓"
echo ""

echo "[3/3] Deploying sequence-process-batches function..."
if ! supabase functions deploy sequence-process-batches; then
    echo "ERROR: Failed to deploy sequence-process-batches"
    exit 1
fi
echo "OK: sequence-process-batches deployed ✓"
echo ""

echo "==============================================="
echo " DEPLOYMENT COMPLETE!"
echo "==============================================="
echo ""
echo "What's Fixed:"
echo " ✓ Immediate mode now works"
echo " ✓ Scheduled mode now works"
echo " ✓ Time restrictions only apply to drip mode"
echo " ✓ Emails send anytime for immediate/scheduled"
echo ""
echo "Next Steps:"
echo " 1. Go to Sequences page"
echo " 2. Click 'Enroll Contacts'"
echo " 3. Select your email"
echo " 4. Choose 'Immediate' mode"
echo " 5. Click 'Enroll'"
echo " 6. Wait 5-10 minutes"
echo " 7. Check your email!"
echo ""
echo "==============================================="





