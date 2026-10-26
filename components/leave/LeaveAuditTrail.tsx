'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type AuditLog = {
  id: string
  created_at: string
  action: string
  old_status: string | null
  new_status: string | null
  comment: string | null
  ip_address: string | null
  device_info: string | null
  performed_by: string
  performer: {
    id: string
    full_name: string
    avatar_url: string | null
    role: string
  } | null
  leave_request: {
    id: string
    request_id: string | null
    type: string
    start_date: string
    end_date: string
    days_count: number
    status: string
    employee: {
      id: string
      full_name: string
      avatar_url: string | null
    } | null
  } | null
}

const ACTION_CONFIG: Record<string, {
  label: string
  icon: string
  bg: string
  text: string
  border: string
  dot: string
}> = {
  SUBMITTED:   { label: 'Submitted',   icon: '📤', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400' },
  APPROVED:    { label: 'Approved',    icon: '✅', bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-400' },
  REJECTED:    { label: 'Rejected',    icon: '❌', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400' },
  EDITED:      { label: 'Edited',      icon: '✏️', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
  CANCELLED:   { label: 'Cancelled',   icon: '🚫', bg: 'bg-zinc-50',   text: 'text-zinc-600',   border: 'border-zinc-200',   dot: 'bg-zinc-400' },
  RESUBMITTED: { label: 'Resubmitted', icon: '🔄', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400' },
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:  'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual', sick: 'Sick', maternity: 'Maternity',
  paternity: 'Paternity', unpaid: 'Unpaid', marriage: 'Marriage',
  bereavement: 'Bereavement', blood_donation: 'Blood Donation',
  child_care: 'Child Care', compassionate: 'Compassionate',
  work_from_home: 'WFH', business_travel: 'Business Travel',
  training: 'Training', other: 'Other',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function LeaveAuditTrail({
  logs,
  isHR,
  employees,
  activeFilters,
}: {
  logs: AuditLog[]
  isHR: boolean
  employees: { id: string; full_name: string }[]
  activeFilters: Record<string, string | undefined>
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    request: activeFilters.request ?? '',
    employee: activeFilters.employee ?? '',
    action: activeFilters.action ?? '',
    from: activeFilters.from ?? '',
    to: activeFilters.to ?? '',
  })

  function applyFilters() {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    router.push(`/dashboard/leave/audit?${params.toString()}`)
  }

  function clearFilters() {
    setFilters({ request: '', employee: '', action: '', from: '', to: '' })
    router.push('/dashboard/leave/audit')
  }

  const hasFilters = Object.values(filters).some(Boolean)

  const selectClass = 'px-3 py-2 rounded-lg text-sm text-zinc-700 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'
  const inputClass = selectClass

  // Stats
  const stats = {
    total: logs.length,
    approved: logs.filter((l) => l.action === 'APPROVED').length,
    rejected: logs.filter((l) => l.action === 'REJECTED').length,
    edited: logs.filter((l) => l.action === 'EDITED').length,
  }

  function exportCSV() {
    const headers = ['Date', 'Action', 'Performed By', 'Employee', 'Request ID', 'Leave Type', 'Old Status', 'New Status', 'Comment', 'IP Address']
    const rows = logs.map((l) => [
      new Date(l.created_at).toLocaleString(),
      l.action,
      l.performer?.full_name ?? '',
      l.leave_request?.employee?.full_name ?? '',
      l.leave_request?.request_id ?? '',
      l.leave_request?.type ?? '',
      l.old_status ?? '',
      l.new_status ?? '',
      l.comment ?? '',
      l.ip_address ?? '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leave-audit-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Actions', value: stats.total, color: 'text-zinc-900' },
          { label: 'Approved', value: stats.approved, color: 'text-emerald-600' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-500' },
          { label: 'Edited', value: stats.edited, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className={`text-2xl font-semibold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border border-zinc-200 p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Request ID</label>
            <input
              type="text"
              value={filters.request}
              onChange={(e) => setFilters((p) => ({ ...p, request: e.target.value }))}
              placeholder="LR-2026-..."
              className={inputClass + ' w-36'}
            />
          </div>
          {isHR && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Employee</label>
              <select
                value={filters.employee}
                onChange={(e) => setFilters((p) => ({ ...p, employee: e.target.value }))}
                className={selectClass}
              >
                <option value="">All employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
              className={selectClass}
            >
              <option value="">All actions</option>
              {Object.entries(ACTION_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">From</label>
            <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">To</label>
            <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex gap-2">
            <button onClick={applyFilters} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors">
              Apply
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="px-4 py-2 rounded-lg text-sm text-zinc-500 border border-zinc-200 hover:bg-zinc-50 transition-colors">
                Clear
              </button>
            )}
          </div>
          <button onClick={exportCSV} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-500 border border-zinc-200 hover:bg-zinc-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Timeline */}
      {logs.length === 0 ? (
        <div className="rounded-xl bg-white border border-zinc-200 px-5 py-16 text-center">
          <p className="text-zinc-400 text-sm">No audit entries found.</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 text-xs text-zinc-500 hover:text-zinc-800 transition-colors">
              Clear filters →
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900">Activity Timeline</h2>
            <span className="text-xs text-zinc-400">{logs.length} entries</span>
          </div>

          <div className="divide-y divide-zinc-50">
            {logs.map((log) => {
              const config = ACTION_CONFIG[log.action] ?? {
                label: log.action, icon: '📋',
                bg: 'bg-zinc-50', text: 'text-zinc-600',
                border: 'border-zinc-200', dot: 'bg-zinc-400',
              }
              const isOpen = expanded === log.id
              const req = log.leave_request
              const performer = log.performer
              const perfInitials = performer?.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
              const empInitials = req?.employee?.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

              return (
                <div key={log.id} className="hover:bg-zinc-50/60 transition-colors">
                  <button
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    className="w-full text-left px-5 py-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Action dot + icon */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${config.bg} border ${config.border}`}>
                          {config.icon}
                        </div>
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
                              {config.label}
                            </span>
                            {req?.request_id && (
                              <span className="text-xs font-mono text-zinc-400">{req.request_id}</span>
                            )}
                            {req && (
                              <span className="text-xs text-zinc-400 capitalize">
                                {LEAVE_TYPE_LABELS[req.type] ?? req.type} · {req.days_count}d
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-400 flex-shrink-0" title={formatFull(log.created_at)}>
                            {timeAgo(log.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {/* Performer */}
                          <div className="flex items-center gap-1.5">
                            {performer?.avatar_url ? (
                              <img src={performer.avatar_url} alt={performer.full_name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center">
                                <span className="text-xs font-semibold text-zinc-600">{perfInitials}</span>
                              </div>
                            )}
                            <span className="text-xs font-medium text-zinc-700">{performer?.full_name ?? 'Unknown'}</span>
                            <span className="text-xs text-zinc-400 capitalize">({performer?.role?.replace('_', ' ') ?? 'user'})</span>
                          </div>

                          {/* Status change */}
                          {log.old_status && log.new_status && log.old_status !== log.new_status && (
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-xs border capitalize ${STATUS_STYLES[log.old_status] ?? 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}>
                                {log.old_status}
                              </span>
                              <svg className="w-3 h-3 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className={`px-1.5 py-0.5 rounded text-xs border capitalize ${STATUS_STYLES[log.new_status] ?? 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}>
                                {log.new_status}
                              </span>
                            </div>
                          )}

                          {/* Employee (HR view) */}
                          {isHR && req?.employee && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-400">for</span>
                              {req.employee.avatar_url ? (
                                <img src={req.employee.avatar_url} alt={req.employee.full_name} className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-white">{empInitials}</span>
                                </div>
                              )}
                              <span className="text-xs font-medium text-zinc-700">{req.employee.full_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Comment preview */}
                        {log.comment && !isOpen && (
                          <p className="text-xs text-zinc-500 mt-1.5 italic truncate">
                            "{log.comment}"
                          </p>
                        )}
                      </div>

                      {/* Expand chevron */}
                      <svg
                        className={`w-4 h-4 text-zinc-300 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-5 pb-4 ml-12">
                      <div className="rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
                          {/* Left — action details */}
                          <div className="p-4 space-y-2.5">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Action Details</p>
                            <DetailRow label="Action" value={config.label} />
                            <DetailRow label="Performed by" value={`${performer?.full_name ?? 'Unknown'} (${performer?.role?.replace('_', ' ') ?? ''})`} />
                            <DetailRow label="Timestamp" value={formatFull(log.created_at)} />
                            {log.old_status && <DetailRow label="From status" value={log.old_status} capitalize />}
                            {log.new_status && <DetailRow label="To status" value={log.new_status} capitalize />}
                            {log.comment && <DetailRow label="Comment" value={log.comment} />}
                            {log.ip_address && <DetailRow label="IP address" value={log.ip_address} mono />}
                            {log.device_info && <DetailRow label="Device" value={log.device_info} />}
                          </div>

                          {/* Right — leave request details */}
                          {req && (
                            <div className="p-4 space-y-2.5">
                              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Leave Request</p>
                              {req.request_id && <DetailRow label="Request ID" value={req.request_id} mono />}
                              {req.employee && <DetailRow label="Employee" value={req.employee.full_name} />}
                              <DetailRow label="Leave type" value={LEAVE_TYPE_LABELS[req.type] ?? req.type} />
                              <DetailRow label="Start date" value={new Date(req.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} />
                              <DetailRow label="End date" value={new Date(req.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} />
                              <DetailRow label="Working days" value={`${req.days_count} day${req.days_count !== 1 ? 's' : ''}`} />
                              <DetailRow label="Current status" value={req.status} capitalize />
                              <div className="pt-2">
                                <a
                                  href={`/api/leave/pdf?id=${req.id}`}
                                  target="_blank"
                                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Download PDF
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, capitalize = false, mono = false }: {
  label: string
  value: string
  capitalize?: boolean
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-zinc-400 flex-shrink-0">{label}</span>
      <span className={`text-xs font-medium text-zinc-700 text-right ${capitalize ? 'capitalize' : ''} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}
