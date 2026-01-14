# Production Debug Guide

## Problem Solved

The public booking flow at `trak.rs/a/qwetix` was showing:
- ❌ No cities to choose from in the qualification step
- ❌ No results after completing qualification

**Root Cause**: Missing or misconfigured `agency_booking_settings` record in production database.

## Solution Implemented

### 1. Debug Tools Created

#### Debug Dashboard Page
**Location**: `/dashboard/debug-production`

A comprehensive debug interface that:
- Checks if the `qwetix` slug exists in `agency_booking_settings`
- Verifies the slug is active (`is_active = true`)
- Counts active offers for the organization
- Shows all organizations and their settings
- Provides one-click fix to create missing settings

#### Debug API Endpoints

**GET `/api/debug/production-check`**
- Returns detailed production database state
- Checks `agency_booking_settings` for 'qwetix'
- Counts offers for the organization
- Lists all organizations and settings
- Provides diagnosis and recommendations

**POST `/api/debug/sync-production`**
- Creates or updates `agency_booking_settings` record
- Accepts `organizationId` and `slug` in request body
- Sets up default working hours and booking settings
- Ensures `is_active = true`

### 2. How to Use

#### Step 1: Run the Debug Check

1. Navigate to `/dashboard/debug-production` in your dashboard
2. Click "Run Production Check"
3. Review the diagnosis section

#### Step 2: Fix the Issue

If the diagnosis shows missing `agency_booking_settings`:

1. The UI will show available organizations
2. Click on the correct organization
3. The system will automatically create the `agency_booking_settings` record
4. Re-run the check to verify

#### Alternative: Use API Directly

```bash
# Check production state
curl https://your-domain.com/api/debug/production-check

# Sync production (create/update settings)
curl -X POST https://your-domain.com/api/debug/sync-production \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "YOUR_ORG_ID", "slug": "qwetix"}'
```

### 3. What Gets Created

When you sync production, the following `agency_booking_settings` record is created:

```json
{
  "organization_id": "YOUR_ORG_ID",
  "slug": "qwetix",
  "is_active": true,
  "agency_name": "Organization Name",
  "primary_color": "#3B82F6",
  "working_hours": {
    "monday": { "enabled": true, "start": "09:00", "end": "17:00" },
    "tuesday": { "enabled": true, "start": "09:00", "end": "17:00" },
    "wednesday": { "enabled": true, "start": "09:00", "end": "17:00" },
    "thursday": { "enabled": true, "start": "09:00", "end": "17:00" },
    "friday": { "enabled": true, "start": "09:00", "end": "17:00" },
    "saturday": { "enabled": false, "start": "09:00", "end": "13:00" },
    "sunday": { "enabled": false, "start": null, "end": null }
  },
  "response_time_working": 10,
  "response_time_outside": 60,
  "reservation_hold_hours": 72,
  "deposit_percentage": 30,
  "abandoned_cart_enabled": true,
  "abandoned_cart_discount_percent": 5,
  "abandoned_cart_discount_hours": 72,
  "abandoned_cart_email_1_hours": 2,
  "abandoned_cart_email_2_hours": 24,
  "abandoned_cart_email_3_hours": 72
}
```

### 4. Verification

After syncing, verify the fix by:

1. ✅ Re-running the debug check (should show all green)
2. ✅ Visiting `trak.rs/a/qwetix` and starting qualification
3. ✅ Selecting a country and verifying cities appear
4. ✅ Completing qualification and verifying offers appear

### 5. Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No cities shown | Missing `agency_booking_settings` | Use debug tool to create it |
| Cities shown but no offers | No active offers in database | Add offers or check offer status/dates |
| Wrong organization linked | Slug points to wrong org | Update `organization_id` in settings |
| Still not working | Environment variables | Verify production points to correct Supabase project |

### 6. Files Created

- [`src/app/(dashboard)/dashboard/debug-production/page.tsx`](src/app/(dashboard)/dashboard/debug-production/page.tsx) - Debug UI
- [`src/app/api/debug/production-check/route.ts`](src/app/api/debug/production-check/route.ts) - Check API
- [`src/app/api/debug/sync-production/route.ts`](src/app/api/debug/sync-production/route.ts) - Sync API

### 7. Cleanup

The debug instrumentation from the earlier debugging session has been removed from:
- `src/app/(dashboard)/dashboard/trips/page.tsx`
- `src/app/(dashboard)/dashboard/reservations/page.tsx`
- `src/hooks/use-bookings.ts`
- `src/hooks/use-reservations.ts`

## Next Steps

1. Run the debug check on production
2. Create the missing `agency_booking_settings` record
3. Verify the public booking flow works at `trak.rs/a/qwetix`
4. (Optional) Customize the agency settings via the dashboard settings page
