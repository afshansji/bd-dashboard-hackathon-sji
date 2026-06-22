# n8n + Google Analytics Integration Setup Guide

## Overview

This guide will walk you through setting up an n8n workflow to automatically fetch Google Analytics data and send it to your SJ Marketing AI platform via webhooks.

## Prerequisites

- Active n8n account (self-hosted or cloud)
- Google Analytics account with API access
- Access to SJ Marketing AI Admin Panel
- Brand configured in the platform

## Step 1: Generate Webhook Credentials

1. **Log in to SJ Marketing AI Admin Panel**
   - Navigate to **Admin** → **Integration Manager**
   - Go to the **Brand Integrations** tab

2. **Configure n8n Analytics Integration**
   - Find the "n8n + Google Analytics" card
   - Click **Configure**
   - Select your brand from the dropdown
   - Click **Generate Webhook**

3. **Copy Credentials**
   - Copy the **Webhook URL** (you'll need this in n8n)
   - Copy the **Webhook Secret** (required for authentication)
   - Keep these values secure!

## Step 2: Set Up Google Analytics API Access

1. **Enable Google Analytics API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the **Google Analytics Data API**

2. **Create Service Account Credentials**
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **Service Account**
   - Download the JSON key file

3. **Grant Analytics Access**
   - Open [Google Analytics](https://analytics.google.com/)
   - Go to **Admin** → **Account Access Management**
   - Add the service account email with **Viewer** permissions

## Step 3: Create n8n Workflow

### Import Workflow Template

```json
{
  "name": "Google Analytics to SJ Marketing AI",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 0 * * *"
            }
          ]
        }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [250, 300],
      "typeVersion": 1.1
    },
    {
      "parameters": {
        "authentication": "serviceAccount",
        "serviceAccountEmail": "={{ $credentials.googleServiceAccount.email }}",
        "operation": "getReport",
        "propertyId": "YOUR_GA4_PROPERTY_ID",
        "startDate": "={{ $now.minus({days: 1}).toFormat('yyyy-MM-dd') }}",
        "endDate": "={{ $now.toFormat('yyyy-MM-dd') }}",
        "metrics": [
          "sessions",
          "activeUsers",
          "pageviews",
          "bounceRate",
          "averageSessionDuration",
          "conversions"
        ],
        "dimensions": [
          "date",
          "deviceCategory",
          "sessionSource"
        ]
      },
      "name": "Google Analytics",
      "type": "n8n-nodes-base.googleAnalytics",
      "position": [450, 300],
      "typeVersion": 1,
      "credentials": {
        "googleServiceAccount": {
          "id": "YOUR_CREDENTIAL_ID",
          "name": "Google Service Account"
        }
      }
    },
    {
      "parameters": {
        "functionCode": "// Transform GA data to SJ Marketing AI format\nconst gaData = $input.all();\n\n// Extract metrics from GA response\nconst metrics = {};\nconst dimensions = {};\n\nif (gaData[0]?.json?.rows) {\n  gaData[0].json.rows.forEach(row => {\n    // Aggregate metrics\n    row.metricValues?.forEach((metric, idx) => {\n      const metricName = gaData[0].json.metricHeaders[idx].name;\n      if (!metrics[metricName]) {\n        metrics[metricName] = 0;\n      }\n      metrics[metricName] += parseFloat(metric.value) || 0;\n    });\n    \n    // Collect dimension values\n    row.dimensionValues?.forEach((dim, idx) => {\n      const dimName = gaData[0].json.dimensionHeaders[idx].name;\n      if (!dimensions[dimName]) {\n        dimensions[dimName] = [];\n      }\n      if (!dimensions[dimName].includes(dim.value)) {\n        dimensions[dimName].push(dim.value);\n      }\n    });\n  });\n}\n\n// Format for SJ Marketing AI webhook\nconst payload = {\n  data_type: 'traffic',\n  date_range_start: $now.minus({days: 1}).toFormat('yyyy-MM-dd'),\n  date_range_end: $now.toFormat('yyyy-MM-dd'),\n  metrics: {\n    sessions: Math.round(metrics.sessions || 0),\n    users: Math.round(metrics.activeUsers || 0),\n    pageviews: Math.round(metrics.pageviews || 0),\n    bounce_rate: parseFloat((metrics.bounceRate || 0).toFixed(2)),\n    avg_session_duration: Math.round(metrics.averageSessionDuration || 0),\n    conversions: Math.round(metrics.conversions || 0)\n  },\n  dimensions: dimensions,\n  raw_data: gaData[0]?.json || {}\n};\n\nreturn [{ json: payload }];"
      },
      "name": "Transform Data",
      "type": "n8n-nodes-base.function",
      "position": [650, 300],
      "typeVersion": 1
    },
    {
      "parameters": {
        "url": "YOUR_WEBHOOK_URL_HERE",
        "method": "POST",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-Webhook-Secret",
              "value": "YOUR_WEBHOOK_SECRET_HERE"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": []
        },
        "options": {}
      },
      "name": "Send to SJ Marketing AI",
      "type": "n8n-nodes-base.httpRequest",
      "position": [850, 300],
      "typeVersion": 4.1
    },
    {
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{ $json.statusCode }}",
              "operation": "equal",
              "value2": 200
            }
          ]
        }
      },
      "name": "Check Success",
      "type": "n8n-nodes-base.if",
      "position": [1050, 300],
      "typeVersion": 1
    },
    {
      "parameters": {
        "message": "✅ Analytics data sent successfully to SJ Marketing AI",
        "additionalFields": {
          "priority": "low"
        }
      },
      "name": "Success Notification",
      "type": "n8n-nodes-base.slack",
      "position": [1250, 200],
      "typeVersion": 1
    },
    {
      "parameters": {
        "message": "❌ Failed to send analytics data: {{ $json.error }}",
        "additionalFields": {
          "priority": "high"
        }
      },
      "name": "Error Notification",
      "type": "n8n-nodes-base.slack",
      "position": [1250, 400],
      "typeVersion": 1
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "Google Analytics",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Google Analytics": {
      "main": [
        [
          {
            "node": "Transform Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Transform Data": {
      "main": [
        [
          {
            "node": "Send to SJ Marketing AI",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send to SJ Marketing AI": {
      "main": [
        [
          {
            "node": "Check Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check Success": {
      "main": [
        [
          {
            "node": "Success Notification",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Error Notification",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

### Workflow Configuration Steps

1. **Import the Template**
   - In n8n, click **Workflows** → **Import from File/URL**
   - Paste the JSON above or upload it as a file

2. **Configure Google Analytics Node**
   - Click the "Google Analytics" node
   - Add your Google Service Account credentials
   - Replace `YOUR_GA4_PROPERTY_ID` with your GA4 property ID
   - Adjust metrics and dimensions as needed

3. **Configure HTTP Request Node**
   - Click "Send to SJ Marketing AI" node
   - Replace `YOUR_WEBHOOK_URL_HERE` with the webhook URL from Step 1
   - Replace `YOUR_WEBHOOK_SECRET_HERE` with the secret from Step 1

4. **Adjust Schedule** (Optional)
   - Click "Schedule Trigger" node
   - Modify cron expression for your preferred frequency:
     - `0 0 * * *` = Daily at midnight
     - `0 */6 * * *` = Every 6 hours
     - `0 * * * *` = Every hour

5. **Configure Notifications** (Optional)
   - Add Slack, Email, or other notification nodes
   - Connect them to success/error paths

## Step 4: Test the Workflow

1. **Manual Test Execution**
   - Click **Execute Workflow** button in n8n
   - Check the execution log for any errors

2. **Verify in SJ Marketing AI**
   - Go back to Admin Panel → Integration Manager
   - Click **View Data** on the n8n Analytics card
   - You should see the test payload

3. **Test Webhook Connection**
   - In the Integration Manager dialog
   - Click **Test Webhook** button
   - Should return success if configured correctly

## Step 5: Activate the Workflow

1. **Enable Auto-Execution**
   - Toggle the **Active** switch in n8n
   - Workflow will now run on the configured schedule

2. **Monitor Execution**
   - Check **Executions** tab in n8n regularly
   - View analytics data in SJ Marketing AI dashboard

## Payload Structure Reference

The webhook expects this JSON structure:

```json
{
  "data_type": "traffic",
  "date_range_start": "2024-01-01",
  "date_range_end": "2024-01-31",
  "metrics": {
    "sessions": 15000,
    "users": 12000,
    "pageviews": 45000,
    "bounce_rate": 45.5,
    "avg_session_duration": 180,
    "conversions": 250
  },
  "dimensions": {
    "source": ["organic", "direct", "referral"],
    "device": ["desktop", "mobile", "tablet"],
    "date": ["2024-01-01", "2024-01-02", "..."]
  },
  "raw_data": {
    // Optional: Complete GA response for debugging
  }
}
```

### Supported Data Types

- `traffic` - Website traffic metrics
- `conversions` - Conversion and goal data
- `demographics` - User demographics
- `behavior` - User behavior patterns
- `acquisition` - Traffic source and campaigns

## Troubleshooting

### Common Issues

**1. "Invalid webhook secret" error**
- Verify the secret matches exactly (no extra spaces)
- Check the `X-Webhook-Secret` header is set correctly
- Regenerate webhook if needed

**2. "Integration not configured" error**
- Ensure webhook was generated in Admin Panel
- Verify brand ID in webhook URL is correct

**3. "Rate limit exceeded" error**
- Webhook accepts max 100 requests per minute per brand
- Adjust n8n schedule frequency
- Contact support to increase limit if needed

**4. Missing data in dashboard**
- Check payload structure matches expected format
- Verify `data_type`, `date_range_start`, `date_range_end`, and `metrics` are present
- Check Analytics Data viewer for received payloads

**5. GA API authentication fails**
- Verify service account has Analytics API enabled
- Check service account has Viewer permissions in GA
- Ensure JSON credentials are correctly configured in n8n

## Advanced Configuration

### Multiple Brands

To send data to multiple brands:

1. Create separate webhook configurations for each brand
2. Duplicate the workflow in n8n
3. Update webhook URL/secret for each brand's workflow

### Custom Metrics

Modify the Transform Data function to include additional metrics:

```javascript
metrics: {
  // ... existing metrics
  custom_metric: metrics.customMetric || 0,
  calculated_value: (metrics.sessions / metrics.users).toFixed(2)
}
```

### Error Handling

Add error handling to the Transform Data node:

```javascript
try {
  // ... transformation logic
} catch (error) {
  return [{
    json: {
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }];
}
```

## Security Best Practices

1. **Never expose webhook secret** in logs or error messages
2. **Use HTTPS only** for webhook URLs
3. **Rotate secrets regularly** (monthly recommended)
4. **Monitor for suspicious activity** in execution logs
5. **Restrict n8n access** to authorized personnel only

## Support

For issues or questions:
- Check n8n execution logs for detailed error messages
- Review SJ Marketing AI Edge Function logs in Supabase Dashboard
- Contact your system administrator
- Email: support@sjmarketingai.com

---

**Last Updated:** 2025-01-08  
**Version:** 1.0.0
