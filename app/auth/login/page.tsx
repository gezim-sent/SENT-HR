'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Read error from URL params (set by callback)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const urlError = params.get('error')
    if (urlError && !error) {
      if (urlError === 'unauthorized_domain') {
        setError('Only @sent.dm accounts are allowed. Please use your Sent work email.')
      } else if (urlError === 'auth_failed') {
        setError('Authentication failed. Please try again.')
      }
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        hd: 'sent.dm', // Google OAuth hint — only show @sent.dm accounts
        queryParams: {
          hd: 'sent.dm', // hosted domain restriction
          prompt: 'select_account',
        },
      },
    })

    if (oauthError) {
      setGoogleLoading(false)
      setError(oauthError.message)
    }
    // If successful, Google redirects — no need to set loading false
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <img src="/sent-logo.png" alt="Sent" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-zinc-900 tracking-tight">Sent People</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Welcome back</h1>
          <p className="text-sm text-zinc-400 mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 space-y-4">
            {error && (
              <div className="px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5C2.3 17.333 3.262 19 4.8 19z" />
                </svg>
                {error}
              </div>
            )}

            {/* Google login — primary */}
            {/* <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors font-medium text-sm text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {googleLoading ? (
                <svg className="animate-spin w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {googleLoading ? 'Signing in…' : 'Continue with Google'}
            </button> */}

            {/* <div className="text-xs text-zinc-400 text-center flex items-center gap-2">
              <div className="flex-1 h-px bg-zinc-100" />
              <span>or sign in with email</span>
              <div className="flex-1 h-px bg-zinc-100" />
            </div> */}

            {/* Email / password */}
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@sent.dm"
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-zinc-900 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-zinc-900 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-300"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-400">
              🔒 Only <span className="font-medium text-zinc-600">@sent.dm</span> accounts can access this platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
