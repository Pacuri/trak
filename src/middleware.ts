import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Onboarding route
  const isOnboardingRoute = pathname === '/onboarding'

  // If user is not logged in
  if (!user) {
    if (!isPublicRoute && !isOnboardingRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // User is logged in - check if they have an organization
  const { data: userRecord } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const hasOrganization = !!userRecord?.organization_id

  // If user has no organization, redirect to onboarding (unless already there)
  if (!hasOrganization) {
    if (!isOnboardingRoute) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    return response
  }

  // User has organization
  // Redirect from onboarding to dashboard if they try to access onboarding
  if (isOnboardingRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect from auth pages to dashboard if logged in with organization
  if (isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
