'use client'

import { useState } from 'react'

export default function CarryOverManager({ currentYear }: { currentYear: number }) {
  const fromYear = currentYear - 1
  const toYear = currentYear
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    affectedEmployees: number
    fromYear: number
    toYear: number
    details: { employee_id: string; annual_carried_over: number }[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function handleRunCarryOver() {
    if (!confirmed) {
      setError('Please confirm before running.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await fetch('/api/admin/carry-over', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_year: fromYear }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      return
    }

    setResult(data)
    setConfirmed(false)
  }

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900">Year-End Leave Carry Over</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Transfer all unused annual leave days from {fromYear} to {toYear}.
          Carried-over days expire on 30 June {toYear}.
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-800 space-y-1">
            <p className="font-medium">How it works</p>
            <p>
              All unused annual days from {fromYear} are carried over to {toYear} for every employee.
              These days are deducted first when an annual leave request is approved,
              and expire on <strong>30 June {toYear}</strong>.
            </p>
            <p className="text-blue-600">⚠️ Only run this once — running it again will overwrite existing carry-over values.</p>
          </div>
        </div>

        {/* From → To */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-center">
            <p className="text-xs text-zinc-400 mb-1">From year</p>
            <p className="text-2xl font-bold text-zinc-900">{fromYear}</p>
            <p className="text-xs text-zinc-400 mt-1">Unused days</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span className="text-xs text-zinc-400">All days</span>
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
            <p className="text-xs text-amber-600 mb-1">To year</p>
            <p className="text-2xl font-bold text-zinc-900">{toYear}</p>
            <p className="text-xs text-amber-600 mt-1">Expires 30 Jun</p>
          </div>
        </div>

        {/* Confirmation */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="rounded border-zinc-300 mt-0.5"
          />
          <span className="text-sm text-zinc-600">
            I confirm I want to carry over <strong>all unused {fromYear} annual leave days</strong> to {toYear} for all employees.
            These days will expire on <strong>30 June {toYear}</strong>.
          </span>
        </label>

        {error && (
          <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleRunCarryOver}
          disabled={loading || !confirmed}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Run Carry Over {fromYear} → {toYear}
            </>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-emerald-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-semibold text-emerald-800">
                Done — {result.affectedEmployees} employee{result.affectedEmployees !== 1 ? 's' : ''} updated
              </p>
            </div>
            <div className="divide-y divide-emerald-100 max-h-48 overflow-y-auto">
              {result.details.map((d) => (
                <div key={d.employee_id} className="px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-700 font-mono">{d.employee_id.slice(0, 8)}…</span>
                  <span className="text-xs font-semibold text-emerald-800">
                    +{d.annual_carried_over}d → {result.toYear}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
