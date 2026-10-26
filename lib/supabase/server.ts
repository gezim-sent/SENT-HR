import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — safe to ignore
            // since middleware handles session refresh
          }
        },
      },
    }
  )
}

export async function getAuthenticatedUserAndProfile() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { user: null, profile: null, error: userError }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profile || !profileError) {
    return { user, profile, error: null }
  }

  const adminClient = await createAdminClient()
  const displayName =
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : user.email?.split('@')[0] ?? 'User'

  const { data: createdProfile, error: insertError } = await adminClient
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email ?? '',
      full_name: displayName,
      role: 'employee',
      status: 'active',
    })
    .select('*')
    .single()

  if (insertError) {
    console.error('Failed to create missing profile for authenticated user', insertError)
    return { user, profile: null, error: insertError }
  }

  return { user, profile: createdProfile, error: null }
}

// Admin client — only use in trusted server contexts, never expose to client
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
