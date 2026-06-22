# N8n Workflow Setup for EOD Integration

## Overview
This workflow will fetch task data and time records from ActiveCollab daily and send them to our Supabase Edge Function.

## Workflow Trigger
**Schedule:** Daily at 6:00 PM (end of business day)
- Cron expression: `0 18 * * *`

## Workflow Steps

### Step 1: Fetch Tasks Updated Today
**Node Type:** HTTP Request

**Configuration:**
- Method: `GET`
- URL: `https://[your-activecollab-url]/api/v1/projects/[project-id]/tasks`
- Authentication: Bearer Token (ActiveCollab API Key)
- Query Parameters:
  ```
  updated_on_from: {{ $now.format('YYYY-MM-DD') }}
  updated_on_to: {{ $now.format('YYYY-MM-DD') }}
  ```

**Response Structure Expected:**
```json
{
  "tasks": [
    {
      "id": 123,
      "name": "Implement feature X",
      "assignee_id": 456,
      "project_id": 789,
      "completed_on": "2025-10-08T15:30:00Z",
      "is_completed": true,
      "comments": [...]
    }
  ]
}
```

### Step 2: Fetch Time Records for Today
**Node Type:** HTTP Request

**Configuration:**
- Method: `GET`
- URL: `https://[your-activecollab-url]/api/v1/projects/[project-id]/time-records`
- Authentication: Bearer Token (ActiveCollab API Key)
- Query Parameters:
  ```
  from: {{ $now.format('YYYY-MM-DD') }}
  to: {{ $now.format('YYYY-MM-DD') }}
  ```

**Response Structure Expected:**
```json
{
  "time_records": [
    {
      "id": 111,
      "task_id": 123,
      "user_id": 456,
      "value": 5.5,
      "record_date": "2025-10-08",
      "summary": "Implemented feature and tested"
    }
  ]
}
```

### Step 3: Transform Data
**Node Type:** Function / Code

Combine tasks and time records into the format our edge function expects:

```javascript
// Get tasks from previous node
const tasks = $input.first().json.tasks;
const timeRecords = $input.all()[1].json.time_records;

// Create a map of task_id -> hours
const hoursMap = {};
timeRecords.forEach(record => {
  if (!hoursMap[record.task_id]) {
    hoursMap[record.task_id] = 0;
  }
  hoursMap[record.task_id] += record.value;
});

// Transform to our format
const transformedData = {
  sync_date: new Date().toISOString().split('T')[0],
  tasks: tasks.map(task => ({
    external_task_id: task.id.toString(),
    task_name: task.name,
    assignee_email: task.assignee_email || null, // You'll need to fetch this
    assignee_id: task.assignee_id,
    project_id: task.project_id.toString(),
    status: task.is_completed ? 'completed' : 'in_progress',
    last_comment: task.comments && task.comments.length > 0 
      ? task.comments[task.comments.length - 1].body 
      : null,
    last_comment_date: task.comments && task.comments.length > 0
      ? task.comments[task.comments.length - 1].created_on
      : null,
    hours_logged: hoursMap[task.id] || 0,
    raw_data: task
  }))
};

return transformedData;
```

### Step 4: Send to Supabase Edge Function
**Node Type:** HTTP Request

**Configuration:**
- Method: `POST`
- URL: `https://fzknasqrludvoyxdzbxl.supabase.co/functions/v1/eod-data-sync`
- Headers:
  ```
  Content-Type: application/json
  Authorization: Bearer [SUPABASE_ANON_KEY]
  x-webhook-secret: [WEBHOOK_SECRET]
  ```
- Body: Use output from Step 3

## Data You Need to Provide

### 1. ActiveCollab API Credentials
- **API URL:** `https://[your-company].activecollab.com/api/v1`
- **API Token:** Your ActiveCollab API key
- **Project IDs:** List of project IDs to monitor

### 2. User Email Mapping
We need to map ActiveCollab user IDs/emails to our internal user IDs. Please provide:

```json
{
  "activecollab_users": [
    {
      "ac_user_id": 456,
      "ac_email": "john@company.com",
      "our_user_id": "uuid-from-our-system"
    }
  ]
}
```

You can export this from our users table or provide a mapping spreadsheet.

### 3. Project Mapping
Map ActiveCollab projects to our internal projects:

```json
{
  "project_mappings": [
    {
      "ac_project_id": 789,
      "our_project_id": "uuid-from-our-system",
      "project_name": "Client Website Redesign"
    }
  ]
}
```

### 4. Webhook Secret
Generate a secure webhook secret (random string) that will be used to authenticate requests from N8n to our edge function.

**Example:** `whs_7f8d9e6c5b4a3f2e1d0c9b8a7f6e5d4c`

Share this with me so I can configure the edge function to validate it.

## Testing the Workflow

### Manual Trigger
1. Create the workflow in N8n
2. Use "Execute Workflow" button to test
3. Check the edge function logs in Supabase dashboard
4. Verify data appears in `activecollab_task_data` table

### Expected Payload Example
```json
{
  "sync_date": "2025-10-08",
  "tasks": [
    {
      "external_task_id": "123",
      "task_name": "Implement user authentication",
      "assignee_email": "john@company.com",
      "assignee_id": 456,
      "project_id": "789",
      "status": "completed",
      "last_comment": "Feature completed and tested in staging",
      "last_comment_date": "2025-10-08T15:30:00Z",
      "hours_logged": 5.5,
      "raw_data": {...}
    }
  ]
}
```

## Troubleshooting

### Common Issues:
1. **401 Unauthorized:** Check ActiveCollab API token
2. **403 Forbidden:** Verify webhook secret matches
3. **404 Not Found:** Verify edge function is deployed
4. **500 Server Error:** Check edge function logs in Supabase

### Debug Checklist:
- [ ] ActiveCollab API token is valid
- [ ] N8n has network access to ActiveCollab
- [ ] Supabase edge function is deployed
- [ ] Webhook secret is configured correctly
- [ ] User email mappings are correct
- [ ] Project ID mappings are correct

## Next Steps
1. Set up the workflow in N8n
2. Test with manual execution
3. Provide me with:
   - User mapping JSON
   - Project mapping JSON
   - Webhook secret
4. Schedule the workflow for daily execution
5. Monitor for the first few days

## Contact
If you encounter issues, share:
- N8n workflow execution ID
- Error messages from N8n
- Expected vs actual behavior
