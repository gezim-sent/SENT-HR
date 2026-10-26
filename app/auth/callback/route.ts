import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`)
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  const email = data.user.email ?? ''

  // ── Domain enforcement ────────────────────────────────────────────────────
  // Only @sent.dm Google accounts are allowed
  if (!email.endsWith('@sent.dm')) {
    // Sign them out immediately
    await supabase.auth.signOut()
    return NextResponse.redirect(
      `${origin}/auth/login?error=unauthorized_domain`
    )
  }

  // ── Ensure profile exists ─────────────────────────────────────────────────
  // Google OAuth users need a profile row if they don't have one yet
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .single()

  if (!existingProfile) {
    // Auto-create profile from Google account info
    const fullName = data.user.user_metadata?.full_name
      ?? data.user.user_metadata?.name
      ?? email.split('@')[0]

    const avatarUrl = data.user.user_metadata?.avatar_url
      ?? data.user.user_metadata?.picture
      ?? null

    await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      avatar_url: avatarUrl,
      role: 'employee', // default role — admin can change later
      status: 'active',
    })

    // Create leave balance for current year
    await supabase.from('leave_balances').insert({
      employee_id: data.user.id,
      year: new Date().getFullYear(),
      annual_total: 20,
      annual_used: 0,
      sick_total: 20,
      sick_used: 0,
    })
  }

  return NextResponse.redirect(`${origin}${next}`)
}
