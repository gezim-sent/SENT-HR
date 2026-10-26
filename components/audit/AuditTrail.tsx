'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Log = {
  id: string
  created_at: string
  performed_by: string | null
  action: string
  entity: string
  entity_id: string | null
  entity_name: string | null
  changes: Record<string, any> | null
  metadata: Record<string, any> | null
  performer: {
    id: string
    full_name: string
    avatar_url: string | null
    role: string
  } | null
}

const ACTION_CONFIG: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  // Profile
  EMPLOYEE_CREATED:    { label: 'Employee Created',    icon: '👤', bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  PROFILE_UPDATED:     { label: 'Profile Updated',     icon: '✏️', bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200' },
  // Leave
  LEAVE_SUBMITTED:     { label: 'Leave Submitted',     icon: '📅', bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200' },
  LEAVE_APPROVED:      { label: 'Leave Approved',      icon: '✅', bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  LEAVE_REJECTED:      { label: 'Leave Rejected',      icon: '❌', bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200' },
  LEAVE_CANCELLED:     { label: 'Leave Cancelled',     icon: '🚫', bg: 'bg-zinc-50',     text: 'text-zinc-600',    border: 'border-zinc-200' },
  LEAVE_UPDATED:       { label: 'Leave Updated',       icon: '🔄', bg: 'bg-zinc-50',     text: 'text-zinc-600',    border: 'border-zinc-200' },
  // Department
  DEPARTMENT_CREATED:  { label: 'Department Created',  icon: '🏢', bg: 'bg-purple-50',   text: 'text-purple-700',  border: 'border-purple-200' },
  DEPARTMENT_UPDATED:  { label: 'Department Updated',  icon: '🏢', bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200' },
  DEPARTMENT_DELETED:  { label: 'Department Deleted',  icon: '🗑️', bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200' },
}

const ENTITY_LABELS: Record<string, string> = {
  profile:        'Employee',
  leave_request:  'Leave Request',
  department:     'Department',
}

const FIELD_LABELS: Record<string, string> = {
  full_name:                    'Full Name',
  email:                        'Email',
  phone:                        'Phone',
  job_title:                    'Job Title',
  role:                         'Role',
  status:                       'Status',
  department_id:                'Department',
  manager_id:                   'Manager',
  hire_date:                    'Start Date',
  employee_id:                  'Employee ID',
  gender:                       'Gender',
  date_of_birth:                'Date of Birth',
  personal_email:               'Personal Email',
  address:                      'Address',
  emergency_contact_name:       'Emergency Contact',
  emergency_contact_phone:      'Emergency Phone',
  emergency_contact_relation:   'Emergency Relation',
  iban:                         'IBAN',
  contract_type:                'Contract Type',
  head_id:                      'Department Head',
  name:                         'Name',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function renderChanges(changes: Record<string, any> | null): React.ReactNode {
  if (!changes) return null
  const entries = Object.entries(changes).filter(([k]) => k !== 'status' || true)
  if (!entries.length) return null

  return (
    <div className="mt-2 space-y-1">
      {entries.map(([field, val]) => {
        const label = FIELD_LABELS[field] ?? field
        if (val && typeof val === 'object' && 'from' in val && 'to' in val) {
          return (
            <div key={field} className="flex items-center gap-1.5 text-xs text-zinc-500 flex-wrap">
              <span className="font-medium text-zinc-600">{label}:</span>
              <span className="line-through text-zinc-400">{val.from ?? '—'}</span>
              <svg className="w-3 h-3 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-zinc-700 font-medium">{val.to ?? '—'}</span>
            </div>
          )
        }
        return (
          <div key={field} className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="font-medium text-zinc-600">{label}:</span>
            <span className="text-zinc-700">{String(val)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AuditTrail({
  logs,
  users,
  stats,
  activeFilters,
}: {
  logs: Log[]
  users: { id: string; full_name: string }[]
  stats: { total: number; today: number; users: number }
  activeFilters: Record<string, string | undefined>
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    q:      activeFilters.q      ?? '',
    entity: activeFilters.entity ?? '',
    action: activeFilters.action ?? '',
    user:   activeFilters.user   ?? '',
    from:   activeFilters.from   ?? '',
    to:     activeFilters.to     ?? '',
  })

  function applyFilters() {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    router.push(`/dashboard/audit?${params.toString()}`)
  }

  function clearFilters() {
    setFilters({ q: '', entity: '', action: '', user: '', from: '', to: '' })
    router.push('/dashboard/audit')
  }

  const hasFilters = Object.values(filters).some(Boolean)

  function exportCSV() {
    const headers = ['Date', 'Action', 'Performed By', 'Entity', 'Entity Name', 'Changes']
    const rows = logs.map((l) => [
      new Date(l.created_at).toLocaleString(),
      l.action,
      l.performer?.full_name ?? 'System',
      ENTITY_LABELS[l.entity] ?? l.entity,
      l.entity_name ?? '',
      l.changes ? JSON.stringify(l.changes) : '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Group logs by date
  const grouped: Record<string, Log[]> = {}
  logs.forEach((log) => {
    const date = log.created_at.split('T')[0]
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(log)
  })

  const inputClass = 'px-3 py-2 rounded-lg text-sm text-zinc-700 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Events',    value: stats.total,  color: 'text-zinc-900' },
          { label: 'Today',           value: stats.today,  color: 'text-blue-600' },
          { label: 'Active Users',    value: stats.users,  color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className={`text-2xl font-semibold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border border-zinc-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Search</label>
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
              placeholder="Name, action…"
              className={inputClass + ' w-44'}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Entity</label>
            <select value={filters.entity} onChange={(e) => setFilters((p) => ({ ...p, entity: e.target.value }))} className={inputClass}>
              <option value="">All entities</option>
              <option value="profile">Employee</option>
              <option value="leave_request">Leave Request</option>
              <option value="department">Department</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Action</label>
            <select value={filters.action} onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))} className={inputClass}>
              <option value="">All actions</option>
              {Object.entries(ACTION_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">User</label>
            <select value={filters.user} onChange={(e) => setFilters((p) => ({ ...p, user: e.target.value }))} className={inputClass}>
              <option value="">All users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
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
          <p className="text-2xl mb-3">📋</p>
          <p className="text-sm font-medium text-zinc-900">No audit entries found</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              Clear filters →
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900">Activity Timeline</h2>
            <span className="text-xs text-zinc-400">{logs.length} events</span>
          </div>

          <div className="divide-y divide-zinc-50">
            {Object.entries(grouped).map(([date, dayLogs]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="px-5 py-2 bg-zinc-50 border-b border-zinc-100 sticky top-0 z-10">
                  <p className="text-xs font-semibold text-zinc-500">
                    {date === new Date().toISOString().split('T')[0]
                      ? 'Today'
                      : new Date(date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    }
                    <span className="ml-2 text-zinc-400 font-normal">{dayLogs.length} event{dayLogs.length !== 1 ? 's' : ''}</span>
                  </p>
                </div>

                {dayLogs.map((log) => {
                  const cfg = ACTION_CONFIG[log.action] ?? {
                    label: log.action.replace(/_/g, ' '),
                    icon: '📌',
                    bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200',
                  }
                  const isOpen = expanded === log.id
                  const initials = log.performer?.full_name
                    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

                  return (
                    <button
                      key={log.id}
                      onClick={() => setExpanded(isOpen ? null : log.id)}
                      className="w-full text-left px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Action icon */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border ${cfg.bg} ${cfg.border}`}>
                          {cfg.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {cfg.label}
                              </span>
                              {log.entity_name && (
                                <span className="text-sm font-medium text-zinc-900">{log.entity_name}</span>
                              )}
                              <span className="text-xs text-zinc-400 capitalize">
                                {ENTITY_LABELS[log.entity] ?? log.entity}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-400 flex-shrink-0" title={fullDate(log.created_at)}>
                              {timeAgo(log.created_at)}
                            </span>
                          </div>

                          {/* Performer */}
                          <div className="flex items-center gap-2 mt-1.5">
                            {log.performer?.avatar_url ? (
                              <img src={log.performer.avatar_url} alt={log.performer.full_name} className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-zinc-600" style={{ fontSize: '8px' }}>{initials}</span>
                              </div>
                            )}
                            <span className="text-xs text-zinc-500">
                              {log.performer?.full_name ?? 'System'}
                              {log.performer?.role && (
                                <span className="text-zinc-400 ml-1 capitalize">· {log.performer.role.replace('_', ' ')}</span>
                              )}
                            </span>
                          </div>

                          {/* Changes preview — collapsed */}
                          {!isOpen && log.changes && Object.keys(log.changes).length > 0 && (
                            <p className="text-xs text-zinc-400 mt-1">
                              {Object.keys(log.changes).map((f) => FIELD_LABELS[f] ?? f).join(', ')} changed
                            </p>
                          )}

                          {/* Changes expanded */}
                          {isOpen && log.changes && (
                            <div className="mt-3 px-3 py-3 rounded-xl bg-zinc-50 border border-zinc-100">
                              {renderChanges(log.changes)}
                              <p className="text-xs text-zinc-300 mt-2">{fullDate(log.created_at)}</p>
                            </div>
                          )}
                        </div>

                        <svg
                          className={`w-4 h-4 text-zinc-300 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
