'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Update password
    const { error: pwError } = await supabase.auth.updateUser({
      password: form.password,
      data: { must_change_password: false },
    })

    setLoading(false)

    if (pwError) { setError(pwError.message); return }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <img src="/sent-logo.png" alt="Sent" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-zinc-900 tracking-tight">Sent People</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Set your password</h1>
          <p className="text-sm text-zinc-400 mt-1">
            You're using a temporary password. Please set a new one to continue.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">New Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Min. 8 characters"
                required
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Repeat password"
                required
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            {/* Password strength hints */}
            <ul className="space-y-1">
              {[
                { label: 'At least 8 characters', ok: form.password.length >= 8 },
                { label: 'Passwords match', ok: form.password === form.confirm && form.password.length > 0 },
              ].map((hint) => (
                <li key={hint.label} className={`flex items-center gap-1.5 text-xs ${hint.ok ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={hint.ok ? 3 : 1.5} d={hint.ok ? 'M5 13l4 4L19 7' : 'M12 12h.01'} />
                  </svg>
                  {hint.label}
                </li>
              ))}
            </ul>

            <button
              type="submit"
              disabled={loading || form.password.length < 8 || form.password !== form.confirm}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
