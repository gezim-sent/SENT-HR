'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Result = {
  id: string
  type: 'employee' | 'leave' | 'document' | 'page'
  title: string
  subtitle: string
  href: string
  icon: string
}

const QUICK_LINKS: Result[] = [
  { id: 'ql-1', type: 'page', title: 'Leave Management',   subtitle: 'Request or manage leave',      href: '/dashboard/leave',       icon: '📅' },
  { id: 'ql-2', type: 'page', title: 'Employees',          subtitle: 'Browse employee directory',    href: '/dashboard/employees',   icon: '👥' },
  { id: 'ql-3', type: 'page', title: 'Documents',          subtitle: 'Certificates and files',       href: '/dashboard/documents',   icon: '📄' },
  { id: 'ql-4', type: 'page', title: 'Onboarding',         subtitle: 'Track onboarding tasks',       href: '/dashboard/onboarding',  icon: '✅' },
  { id: 'ql-5', type: 'page', title: 'Reviews',            subtitle: 'Performance review cycles',    href: '/dashboard/reviews',     icon: '⭐' },
  { id: 'ql-6', type: 'page', title: 'Analytics',          subtitle: 'HR analytics and reports',     href: '/dashboard/analytics',   icon: '📊' },
  { id: 'ql-7', type: 'page', title: 'Calendar',           subtitle: 'Team leave calendar',          href: '/dashboard/calendar',    icon: '🗓️' },
  { id: 'ql-8', type: 'page', title: 'Audit Trail',        subtitle: 'Leave activity log',           href: '/dashboard/leave/audit', icon: '📋' },
]

export default function CommandPalette({ isHR }: { isHR: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)

    const lq = `%${q}%`
    const promises: Promise<Result[]>[] = []

    if (isHR) {
      promises.push(
        supabase
          .from('profiles')
          .select('id, full_name, email, job_title')
          .or(`full_name.ilike.${lq},email.ilike.${lq},job_title.ilike.${lq}`)
          .eq('status', 'active')
          .limit(5)
          .then(({ data }) =>
            (data ?? []).map((e): Result => ({
              id: `emp-${e.id}`,
              type: 'employee',
              title: e.full_name,
              subtitle: e.job_title ?? e.email,
              href: `/dashboard/employees/${e.id}`,
              icon: '👤',
            }))
          )
      )
    }

    promises.push(
      supabase
        .from('leave_requests')
        .select('id, request_id, type, status, start_date, end_date')
        .or(`request_id.ilike.${lq},type.ilike.${lq}`)
        .order('created_at', { ascending: false })
        .limit(4)
        .then(({ data }) =>
          (data ?? []).map((r): Result => ({
            id: `lr-${r.id}`,
            type: 'leave',
            title: r.request_id ?? `${r.type} leave`,
            subtitle: `${r.type.replace(/_/g, ' ')} · ${r.status} · ${new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            href: '/dashboard/leave',
            icon: '📅',
          }))
        )
    )

    promises.push(
      supabase
        .from('documents')
        .select('id, name, type, expiry_date')
        .ilike('name', lq)
        .limit(4)
        .then(({ data }) =>
          (data ?? []).map((d): Result => ({
            id: `doc-${d.id}`,
            type: 'document',
            title: d.name,
            subtitle: `${d.type}${d.expiry_date ? ` · expires ${new Date(d.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`,
            href: '/dashboard/documents',
            icon: '📄',
          }))
        )
    )

    const pageResults = QUICK_LINKS.filter(
      (p) =>
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.subtitle.toLowerCase().includes(q.toLowerCase())
    )

    const allResults = await Promise.all(promises)
    setResults([...allResults.flat(), ...pageResults])
    setSelectedIndex(0)
    setLoading(false)
  }, [isHR])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  function handleKeyDown(e: React.KeyboardEvent) {
    const items = query ? results : QUICK_LINKS
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { const item = items[selectedIndex]; if (item) navigate(item) }
  }

  function navigate(result: Result) {
    router.push(result.href)
    setOpen(false)
  }

  const displayItems = query ? results : QUICK_LINKS
  const grouped = query ? {
    employees: results.filter((r) => r.type === 'employee'),
    leave:     results.filter((r) => r.type === 'leave'),
    documents: results.filter((r) => r.type === 'document'),
    pages:     results.filter((r) => r.type === 'page'),
  } : null

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors text-sm text-zinc-400"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Search…</span>
        <span className="flex items-center gap-0.5 ml-1">
          <kbd className="px-1.5 py-0.5 rounded text-xs bg-white border border-zinc-200 font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 rounded text-xs bg-white border border-zinc-200 font-mono">K</kbd>
        </span>
      </button>

      {/* Palette modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100">
              <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search employees, leave requests, documents…"
                className="flex-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none bg-transparent"
              />
              {loading && (
                <svg className="animate-spin w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <kbd className="px-2 py-1 rounded text-xs bg-zinc-100 border border-zinc-200 text-zinc-400 font-mono">Esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[420px] overflow-y-auto">
              {!query && (
                <>
                  <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Quick Links</p>
                  {QUICK_LINKS.map((item, i) => (
                    <ResultRow key={item.id} item={item} selected={selectedIndex === i} onClick={() => navigate(item)} onHover={() => setSelectedIndex(i)} />
                  ))}
                </>
              )}

              {query && !loading && results.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm text-zinc-400">No results for "<span className="text-zinc-700">{query}</span>"</p>
                  <p className="text-xs text-zinc-300 mt-1">Try a name, email, or request ID like LR-2026-0001</p>
                </div>
              )}

              {query && grouped && (
                <>
                  {[
                    { label: 'Employees',       items: grouped.employees },
                    { label: 'Leave Requests',   items: grouped.leave },
                    { label: 'Documents',        items: grouped.documents },
                    { label: 'Pages',            items: grouped.pages },
                  ].filter((g) => g.items.length > 0).map((group) => (
                    <div key={group.label}>
                      <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">{group.label}</p>
                      {group.items.map((item) => {
                        const idx = displayItems.findIndex((r) => r.id === item.id)
                        return (
                          <ResultRow key={item.id} item={item} selected={selectedIndex === idx} onClick={() => navigate(item)} onHover={() => setSelectedIndex(idx)} />
                        )
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50 flex items-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white border border-zinc-200 font-mono text-xs">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white border border-zinc-200 font-mono text-xs">↵</kbd> Open</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white border border-zinc-200 font-mono text-xs">Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ResultRow({ item, selected, onClick, onHover }: {
  item: Result
  selected: boolean
  onClick: () => void
  onHover: () => void
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        selected ? 'bg-zinc-900' : 'hover:bg-zinc-50'
      }`}
    >
      <span className="text-lg flex-shrink-0 leading-none">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${selected ? 'text-white' : 'text-zinc-900'}`}>{item.title}</p>
        <p className={`text-xs truncate mt-0.5 ${selected ? 'text-zinc-300' : 'text-zinc-400'}`}>{item.subtitle}</p>
      </div>
      <svg className={`w-4 h-4 flex-shrink-0 ${selected ? 'text-zinc-400' : 'text-zinc-200'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
