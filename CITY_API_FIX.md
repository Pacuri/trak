# City API Fix - Desktop vs Mobile Issue

## Problem
The qualification flow was failing on desktop (Mac) but working on mobile with error:
```
SyntaxError: The string did not match the expected pattern.
```

This error occurs when JavaScript tries to parse non-JSON (usually HTML) as JSON.

## Root Cause
The API endpoint `/api/public/agencies/[slug]/cities` was failing because:
1. **Middleware was blocking public API routes** - redirecting to /login
2. Desktop had cached the redirect HTML response
3. Frontend tried to parse HTML as JSON → SyntaxError

## Fixes Applied

### 1. **Middleware** (`src/middleware.ts`) - **CRITICAL FIX**

**Problem:** Middleware was redirecting ALL unauthenticated requests to `/login`, including public API routes.

**Solution:** Added exception for `/api/public/*` routes:
```typescript
// Public API routes (e.g., /api/public/*)
const isPublicApiRoute = pathname.startsWith('/api/public/')

// If user is not logged in
if (!user) {
  if (!isPublicRoute && !isOnboardingRoute && !isPublicAgencyRoute && !isPublicApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}
```

Now `/api/public/*` routes are accessible without authentication, just like `/a/*` pages.

### 2. API Route (`src/app/api/public/agencies/[slug]/cities/route.ts`)

**Added environment validation:**
```typescript
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  return NextResponse.json({ error: 'Server configuration error', cities: [] }, { status: 500 })
}
```

**Graceful fallback on agency not found:**
- Instead of returning 404, now returns fallback cities
- Ensures the frontend always gets valid JSON

**Enhanced error handling:**
- Always returns JSON, never throws unhandled errors
- Returns fallback cities on any error
- Logs errors for debugging

### 3. Frontend (`src/components/qualification/CityStep.tsx`)

**Better error handling:**
```typescript
const contentType = response.headers.get('content-type')
if (contentType && contentType.includes('application/json')) {
  const data = await response.json()
  setPopularCities(data.cities || [])
} else {
  // Got HTML or non-JSON response
  console.error('API returned non-JSON response:', await response.text())
  setPopularCities([])
}
```

**Graceful degradation:**
- If API fails, user can still type a city manually
- No crash, no blocking errors

## Testing

### Option 1: Use Test Page
1. Start your dev server: `npm run dev`
2. Open `http://localhost:3000/test-cities-api.html`
3. Click buttons to test different countries
4. Check console for detailed logs

### Option 2: Test in Browser Console
```javascript
// On your qualification page (F12 → Console)
fetch('/api/public/agencies/qwetix/cities?country=Grčka')
  .then(r => {
    console.log('Status:', r.status)
    console.log('Content-Type:', r.headers.get('content-type'))
    return r.json()
  })
  .then(data => console.log('Data:', data))
  .catch(err => console.error('Error:', err))
```

## How to Fix on Your Mac

### Step 1: Clear All Caches
1. **Hard refresh**: `Cmd + Shift + R`
2. **Clear site data**: DevTools → Application → Clear Storage → Clear site data
3. **Try incognito/private window**

### Step 2: Verify Environment Variables
Make sure your `.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

### Step 3: Restart Dev Server
```bash
# Kill the dev server (Ctrl+C)
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Step 4: Check Production Build
If you're testing a production build locally:
```bash
npm run build
npm run start
```

Make sure environment variables are loaded for production builds.

## Why It Worked on Mobile But Not Desktop

**Most likely reasons:**
1. **Browser cache**: Desktop had cached a bad/old response
2. **Service worker**: Desktop had an outdated service worker
3. **Different browser**: Mobile using Safari, desktop using Chrome (different cache)
4. **Network conditions**: Mobile on cellular, desktop on WiFi (different CDN edge)

## Verification Checklist

After applying fixes:
- [ ] Clear browser cache on Mac
- [ ] Hard refresh (`Cmd + Shift + R`)
- [ ] Open `/test-cities-api.html` - should show cities
- [ ] Go through qualification flow - cities should appear
- [ ] Check browser console - no errors
- [ ] Test in incognito window
- [ ] Test on production URL (`trak.rs/a/qwetix`)

## Still Not Working?

If the issue persists:

1. **Check Network tab** (F12 → Network):
   - Find the `/api/public/agencies/qwetix/cities` request
   - Check Status code (should be 200)
   - Check Response tab (should be JSON, not HTML)
   - Check Headers tab (Content-Type should be `application/json`)

2. **Check Console logs**:
   - Any errors about environment variables?
   - Any Supabase connection errors?

3. **Verify Supabase connection**:
   ```javascript
   // In browser console
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
   // Should NOT be undefined
   ```

4. **Check if it's a deployment issue**:
   - Does it work on `localhost:3000`?
   - Does it fail on `trak.rs`?
   - If yes → deployment environment variables are missing

## Files Changed
- ✅ `src/middleware.ts` - **CRITICAL**: Allow `/api/public/*` without auth
- ✅ `src/app/api/public/agencies/[slug]/cities/route.ts` - Enhanced error handling
- ✅ `src/components/qualification/CityStep.tsx` - Better JSON parsing
- ✅ `test-cities-api.html` - New test page
- ✅ `CITY_API_FIX.md` - This documentation

## Most Important Fix

**The middleware was blocking all `/api/public/*` routes!** This was causing:
1. Unauthenticated requests → redirected to `/login`
2. Desktop cached the HTML redirect page
3. Frontend tried to parse HTML as JSON → crash

The middleware now correctly allows:
- `/a/*` - Public agency pages (qualification flow)
- `/api/public/*` - Public API endpoints
- `/login`, `/register` - Auth pages
