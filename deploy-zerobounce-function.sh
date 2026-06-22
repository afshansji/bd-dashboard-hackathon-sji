#!/bin/bash
# Deploy Zerobounce Edge Function Script
# This script deploys the zerobounce-manage edge function to Supabase

echo "=========================================="
echo "Deploying Zerobounce Edge Function"
echo "=========================================="
echo ""

PROJECT_REF="qzzvcqoletuummdsbbio"
FUNCTION_NAME="zerobounce-manage"

# Check if we're in the right directory
if [ ! -d "supabase/functions/$FUNCTION_NAME" ]; then
    echo "❌ Error: supabase/functions/$FUNCTION_NAME directory not found"
    echo ""
    echo "Please run this script from the sj-bd-dashboard directory:"
    echo "  cd sj-bd-dashboard"
    echo "  bash deploy-zerobounce-function.sh"
    exit 1
fi

echo "✅ Found $FUNCTION_NAME function directory"
echo ""

echo "Step 1: Checking Supabase CLI..."
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI not found"
    echo ""
    echo "Install with: npm install -g supabase"
    exit 1
fi
echo "✅ Supabase CLI installed"
echo ""

echo "Step 2: Checking authentication..."
if ! supabase projects list &> /dev/null
then
    echo "❌ Not logged in to Supabase"
    echo ""
    echo "Running: supabase login"
    supabase login
    
    if [ $? -ne 0 ]; then
        echo "❌ Login failed"
        exit 1
    fi
fi
echo "✅ Authenticated"
echo ""

echo "Step 3: Deploying $FUNCTION_NAME function..."
echo ""
echo "Command: supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF"
echo ""

supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ SUCCESS: Function deployed!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Go to Integration Manager in your app"
    echo "2. Enter your Zerobounce API key"
    echo "3. Click 'Test' to verify connection"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "❌ DEPLOYMENT FAILED"
    echo "=========================================="
    echo ""
    echo "Check the error message above for details."
    echo ""
    exit 1
fi


