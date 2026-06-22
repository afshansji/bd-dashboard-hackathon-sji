# Data Sync Center Guide

## Overview
The Data Sync Center keeps your BD Portal synchronized with Control Tower CRM.

## Understanding Data Types

### Deals
- Includes active deals from Control Tower
- Also syncs associated projects and checklists
- Requires Employees and PODs to be synced first

### Projects
- Project data is included when you sync Deals
- Projects are linked to deals in Control Tower
- Contains timeline, budget, and resource information

### Clients
- Two sync methods:
  1. **REST API** (Recommended): Official API, secure and rate-limited
  2. **Full Sync**: Included as part of deals sync
- Contains company information, contacts, and history

### Employees
- Team member data from Control Tower
- Required for deal owner mapping
- Synced from Control Tower user directory

### PODs
- Team structure and organization
- Links employees to their working groups
- Used for deal assignment and tracking

## How to Get Updated Data

### Option 1: Full Sync (Recommended)
Best for: Daily updates, ensuring all data is current

**What it does:**
1. Syncs Employees first
2. Then PODs (needs employees)
3. Then Deals & Projects (needs PODs)
4. Then Clients
5. Finally Checklists

**When to use:** 
- First thing each morning
- After major changes in Control Tower
- When you need everything up to date

### Option 2: Individual Syncs
Best for: Quick updates during the day

**Deals Only:**
- Updates active deals and projects
- Faster than full sync
- Use when you know deals have changed

**Clients Only (API):**
- Uses official REST API
- Secure and efficient
- Best for client-specific updates

**Push Changes:**
- Sends your BD Portal updates to Control Tower
- Includes comments and checklist completions
- Run this before end of day

## Automatic Sync Schedule

- **Employees:** Every 6 hours
- **PODs:** Every 12 hours
- **Deals:** Every hour
- **Clients (API):** On-demand only
- **Push:** Every 2 hours (if there are pending changes)

## Troubleshooting

### "Unmapped Owners" Warning
**Problem:** Some deals have owners not found in your employee list
**Solution:** Run "Sync Employees Only" then "Sync Deals Only"

### "Sync Failed" Error
**Problem:** Connection to Control Tower failed
**Solution:** 
1. Check Control Tower Config in Integration Manager
2. Verify API credentials are valid
3. Check Health & Alerts tab for details

### Data Looks Stale
**Problem:** Last sync was hours/days ago
**Solution:** 
1. Check if automatic sync is enabled (Config tab)
2. Manually trigger appropriate sync
3. Review Activity Log for failed syncs

## Best Practices

1. **Daily Routine:**
   - Morning: Run Full Sync
   - Throughout day: Individual syncs as needed
   - End of day: Push Changes

2. **Before Important Meetings:**
   - Sync Deals to get latest status
   - Sync Clients if discussing specific companies

3. **Weekly Maintenance:**
   - Review Health & Alerts tab
   - Check for unmapped owners or PODs
   - Clear old activity logs if needed

4. **Performance Tips:**
   - Use individual syncs for speed
   - Only run Full Sync when necessary
   - Let automatic sync handle routine updates
