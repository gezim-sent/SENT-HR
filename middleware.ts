import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/auth/login', '/auth/callback']
const ADMIN_ONLY_ROUTES = ['/dashboard/settings', '/dashboard/employees/new']
const HR_ROUTES = ['/dashboard/reviews', '/dashboard/onboarding']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Always let public routes through — no Supabase call at all
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Role-based route protection
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  if (ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (
    HR_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== 'admin' &&
    role !== 'hr_manager'
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}