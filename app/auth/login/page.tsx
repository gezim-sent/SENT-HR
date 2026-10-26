'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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
