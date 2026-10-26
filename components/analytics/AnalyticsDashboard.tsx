'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type AnalyticsData = {
  totalRequests: number
  approved: number
  rejected: number
  pending: number
  totalDaysTaken: number
  avgApprovalHours: number
  leaveByType: { type: string; label: string; count: number }[]
  leaveByDept: { name: string; count: number; days: number }[]
  topEmployees: { name: string; days: number; count: number }[]
  sickTrendData: { month: string; days: number }[]
  utilizationData: { name: string; used: number; total: number; pct: number }[]
  upcomingLeave: { id: string; employee_name: string; type: string; start_date: string; end_date: string; days_count: number }[]
  nearLimit: { name: string; remaining: number; total: number }[]
  departments: { id: string; name: string }[]
  leaveTypes: { type: string; label: string }[]
  activeFilters: Record<string, string | undefined>
  allRequests: any[]
}

export default function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const router = useRouter()
  const [filters, setFilters] = useState({
    dept: data.activeFilters.dept ?? '',
    type: data.activeFilters.type ?? '',
    status: data.activeFilters.status ?? '',
    from: data.activeFilters.from ?? '',
    to: data.activeFilters.to ?? '',
  })

  function applyFilters() {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
    router.push(`/dashboard/analytics?${params.toString()}`)
  }

  function clearFilters() {
    setFilters({ dept: '', type: '', status: '', from: '', to: '' })
    router.push('/dashboard/analytics')
  }

  function exportCSV() {
    const headers = ['Request ID', 'Employee', 'Type', 'Start Date', 'End Date', 'Days', 'Status', 'Submitted', 'Reviewed At', 'Note']
    const rows = data.allRequests.map((r) => [
      r.request_id ?? '',
      r.profiles?.full_name ?? '',
      r.type,
      r.start_date,
      r.end_date,
      r.days_count,
      r.status,
      new Date(r.created_at).toLocaleDateString(),
      r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : '',
      r.approver_note ?? '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    download(csv, `leave-report-${today()}.csv`, 'text/csv')
  }

  function exportPDF() {
    // Build a clean printable HTML document and open in new window
    const activeFilterLabels = [
      filters.dept && `Department: ${data.departments.find((d) => d.id === filters.dept)?.name ?? filters.dept}`,
      filters.type && `Leave Type: ${data.leaveTypes.find((t) => t.type === filters.type)?.label ?? filters.type}`,
      filters.status && `Status: ${filters.status}`,
      filters.from && `From: ${filters.from}`,
      filters.to && `To: ${filters.to}`,
    ].filter(Boolean)

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>HR Leave Analytics Report — ${today()}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #18181b; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #18181b; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .brand span { color: #71717a; font-weight: 400; font-size: 14px; display: block; margin-top: 2px; }
    .report-meta { text-align: right; color: #71717a; font-size: 11px; line-height: 1.6; }
    .filters-bar { background: #f4f4f5; border-radius: 8px; padding: 10px 14px; margin-bottom: 28px; font-size: 11px; color: #52525b; }
    .filters-bar strong { color: #18181b; }
    .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 32px; }
    .kpi { background: #f4f4f5; border-radius: 8px; padding: 14px; }
    .kpi-value { font-size: 24px; font-weight: 700; color: #18181b; }
    .kpi-value.green { color: #16a34a; }
    .kpi-value.red { color: #dc2626; }
    .kpi-value.amber { color: #d97706; }
    .kpi-label { font-size: 10px; color: #71717a; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 13px; font-weight: 600; color: #18181b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e4e4e7; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .bar-label { width: 130px; font-size: 11px; color: #52525b; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { flex: 1; background: #e4e4e7; border-radius: 3px; height: 8px; }
    .bar-fill { background: #18181b; height: 8px; border-radius: 3px; }
    .bar-fill.amber { background: #f59e0b; }
    .bar-fill.red { background: #ef4444; }
    .bar-count { font-size: 11px; font-weight: 600; color: #18181b; min-width: 28px; text-align: right; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead { background: #18181b; color: #fff; }
    thead th { padding: 8px 10px; text-align: left; font-weight: 600; letter-spacing: 0.03em; }
    tbody tr:nth-child(even) { background: #f4f4f5; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #e4e4e7; color: #3f3f46; }
    tbody td:first-child { font-family: monospace; color: #71717a; }
    .status { display: inline-block; padding: 2px 7px; border-radius: 20px; font-size: 10px; font-weight: 600; }
    .status.approved { background: #dcfce7; color: #16a34a; }
    .status.pending { background: #fef9c3; color: #ca8a04; }
    .status.rejected { background: #fee2e2; color: #dc2626; }
    .status.cancelled { background: #f4f4f5; color: #71717a; }
    .trend-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; align-items: end; height: 60px; margin-bottom: 6px; }
    .trend-bar-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .trend-bar { width: 100%; background: #18181b; border-radius: 2px; min-height: 2px; }
    .trend-label { font-size: 8px; color: #a1a1aa; white-space: nowrap; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e4e4e7; display: flex; justify-content: space-between; color: #a1a1aa; font-size: 10px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Sent People<span>HR Leave Analytics Report</span></div>
    </div>
    <div class="report-meta">
      Generated: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
      Period: ${filters.from || 'All time'} – ${filters.to || 'Present'}<br/>
      Total records: ${data.allRequests.length}
    </div>
  </div>

  ${activeFilterLabels.length > 0 ? `
  <div class="filters-bar">
    <strong>Active filters:</strong> ${activeFilterLabels.join(' · ')}
  </div>` : ''}

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-value">${data.totalRequests}</div><div class="kpi-label">Total Requests</div></div>
    <div class="kpi"><div class="kpi-value green">${data.approved}</div><div class="kpi-label">Approved</div></div>
    <div class="kpi"><div class="kpi-value red">${data.rejected}</div><div class="kpi-label">Rejected</div></div>
    <div class="kpi"><div class="kpi-value amber">${data.pending}</div><div class="kpi-label">Pending</div></div>
    <div class="kpi"><div class="kpi-value">${data.totalDaysTaken}</div><div class="kpi-label">Days Taken</div></div>
    <div class="kpi"><div class="kpi-value">${data.avgApprovalHours}h</div><div class="kpi-label">Avg Approval</div></div>
  </div>

  <!-- Charts -->
  <div class="two-col">
    <div class="section">
      <div class="section-title">Requests by Leave Type</div>
      ${data.leaveByType.map((item) => {
        const max = data.leaveByType[0]?.count ?? 1
        const pct = Math.round((item.count / max) * 100)
        return `<div class="bar-row">
          <div class="bar-label">${item.label}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-count">${item.count}</div>
        </div>`
      }).join('') || '<p style="color:#71717a;font-size:11px">No data</p>'}
    </div>
    <div class="section">
      <div class="section-title">Requests by Department</div>
      ${data.leaveByDept.map((dept) => {
        const max = data.leaveByDept[0]?.count ?? 1
        const pct = Math.round((dept.count / max) * 100)
        return `<div class="bar-row">
          <div class="bar-label">${dept.name}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-count">${dept.count}</div>
        </div>`
      }).join('') || '<p style="color:#71717a;font-size:11px">No data</p>'}
    </div>
  </div>

  <!-- Sick trend -->
  <div class="section">
    <div class="section-title">Sick Leave Trend — Last 12 Months (approved days)</div>
    ${(() => {
      const maxDays = Math.max(...data.sickTrendData.map(d => d.days), 1)
      return `<div class="trend-grid">
        ${data.sickTrendData.map(d => {
          const h = Math.round((d.days / maxDays) * 56)
          return `<div class="trend-bar-wrap">
            <div class="trend-bar" style="height:${Math.max(h,2)}px" title="${d.days}d"></div>
            <div class="trend-label">${d.month}</div>
          </div>`
        }).join('')}
      </div>`
    })()}
  </div>

  <div class="two-col">
    <div class="section">
      <div class="section-title">Top Employees by Leave Days</div>
      ${data.topEmployees.map((emp, i) => {
        const max = data.topEmployees[0]?.days ?? 1
        const pct = Math.round((emp.days / max) * 100)
        return `<div class="bar-row">
          <div class="bar-label">${i + 1}. ${emp.name}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-count">${emp.days}d</div>
        </div>`
      }).join('') || '<p style="color:#71717a;font-size:11px">No data</p>'}
    </div>
    <div class="section">
      <div class="section-title">Annual Leave Utilization</div>
      ${data.utilizationData.map((emp) => {
        const color = emp.pct >= 90 ? 'red' : emp.pct >= 70 ? 'amber' : ''
        return `<div class="bar-row">
          <div class="bar-label">${emp.name}</div>
          <div class="bar-track"><div class="bar-fill ${color}" style="width:${emp.pct}%"></div></div>
          <div class="bar-count">${emp.used}/${emp.total}</div>
        </div>`
      }).join('') || '<p style="color:#71717a;font-size:11px">No data</p>'}
    </div>
  </div>

  <!-- Upcoming leave -->
  ${data.upcomingLeave.length > 0 ? `
  <div class="section">
    <div class="section-title">Upcoming Leave (next 30 days)</div>
    <table>
      <thead><tr><th>Employee</th><th>Type</th><th>Start</th><th>End</th><th>Days</th></tr></thead>
      <tbody>
        ${data.upcomingLeave.map(l => `
          <tr>
            <td style="font-family:inherit">${l.employee_name}</td>
            <td>${l.type.replace('_',' ')}</td>
            <td>${new Date(l.start_date).toLocaleDateString()}</td>
            <td>${new Date(l.end_date).toLocaleDateString()}</td>
            <td>${l.days_count}d</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- Full requests table -->
  <div class="section">
    <div class="section-title">Leave Requests — All Records (${data.allRequests.length})</div>
    <table>
      <thead>
        <tr>
          <th>Request ID</th>
          <th>Employee</th>
          <th>Type</th>
          <th>Start</th>
          <th>End</th>
          <th>Days</th>
          <th>Status</th>
          <th>Submitted</th>
        </tr>
      </thead>
      <tbody>
        ${data.allRequests.map(r => `
          <tr>
            <td>${r.request_id ?? '—'}</td>
            <td style="font-family:inherit;color:#18181b;font-weight:500">${r.profiles?.full_name ?? '—'}</td>
            <td>${r.type.replace('_',' ')}</td>
            <td>${new Date(r.start_date).toLocaleDateString()}</td>
            <td>${new Date(r.end_date).toLocaleDateString()}</td>
            <td>${r.days_count}d</td>
            <td><span class="status ${r.status}">${r.status}</span></td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>Sent People — Confidential HR Report</span>
    <span>Generated ${new Date().toISOString()}</span>
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  function download(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function today() {
    return new Date().toISOString().split('T')[0]
  }

  const hasFilters = Object.values(filters).some(Boolean)
  const maxSickDays = Math.max(...data.sickTrendData.map((d) => d.days), 1)
  const maxDeptCount = Math.max(...data.leaveByDept.map((d) => d.count), 1)
  const maxEmpDays = Math.max(...data.topEmployees.map((e) => e.days), 1)

  const selectClass = 'px-3 py-2 rounded-lg text-sm text-zinc-700 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">HR Analytics</h1>
          <p className="text-sm mt-0.5 text-zinc-400">
            {data.totalRequests} records
            {hasFilters && ' · filtered'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border border-zinc-200 p-4">
        <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide">Filters</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Department</label>
            <select
              value={filters.dept}
              onChange={(e) => setFilters((p) => ({ ...p, dept: e.target.value }))}
              className={selectClass}
            >
              <option value="">All departments</option>
              {data.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Leave Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
              className={selectClass}
            >
              <option value="">All types</option>
              {data.leaveTypes.map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className={selectClass}
            >
              <option value="">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              className={selectClass}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
              className={selectClass}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
            >
              Apply
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg text-sm text-zinc-500 border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.dept && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-900 text-white">
                Dept: {data.departments.find((d) => d.id === filters.dept)?.name}
              </span>
            )}
            {filters.type && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-900 text-white">
                Type: {data.leaveTypes.find((t) => t.type === filters.type)?.label}
              </span>
            )}
            {filters.status && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-900 text-white capitalize">
                Status: {filters.status}
              </span>
            )}
            {filters.from && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-900 text-white">
                From: {filters.from}
              </span>
            )}
            {filters.to && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-900 text-white">
                To: {filters.to}
              </span>
            )}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Requests', value: data.totalRequests, color: 'text-zinc-900' },
          { label: 'Approved', value: data.approved, color: 'text-emerald-600' },
          { label: 'Rejected', value: data.rejected, color: 'text-red-500' },
          { label: 'Pending', value: data.pending, color: 'text-amber-500' },
          { label: 'Days Taken', value: data.totalDaysTaken, color: 'text-zinc-900' },
          { label: 'Avg Approval', value: `${data.avgApprovalHours}h`, color: 'text-zinc-900' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className={`text-2xl font-semibold tabular-nums ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Requests by Leave Type">
          {data.leaveByType.length === 0 ? <Empty /> : data.leaveByType.slice(0, 8).map((item) => {
            const pct = Math.round((item.count / (data.leaveByType[0]?.count ?? 1)) * 100)
            return (
              <BarRow key={item.type} label={item.label} value={item.count} pct={pct} unit="" />
            )
          })}
        </ChartCard>

        <ChartCard title="Requests by Department">
          {data.leaveByDept.length === 0 ? <Empty /> : data.leaveByDept.map((dept) => {
            const pct = Math.round((dept.count / maxDeptCount) * 100)
            return (
              <BarRow
                key={dept.name}
                label={dept.name}
                value={dept.count}
                pct={pct}
                unit=""
                sub={`${dept.days}d taken`}
              />
            )
          })}
        </ChartCard>
      </div>

      {/* Sick trend */}
      <div className="rounded-xl bg-white border border-zinc-200 p-5">
        <h2 className="text-sm font-medium text-zinc-900 mb-1">Sick Leave Trend</h2>
        <p className="text-xs text-zinc-400 mb-5">Approved sick days per month (last 12 months)</p>
        <div className="flex items-end gap-1.5 h-32">
          {data.sickTrendData.map((d) => {
            const heightPct = (d.days / maxSickDays) * 100
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex items-end justify-center" style={{ height: '96px' }}>
                  <div
                    className="w-full bg-zinc-200 group-hover:bg-zinc-900 rounded-sm transition-colors"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    title={`${d.days} days`}
                  >
                    {d.days > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-zinc-600 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {d.days}d
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-zinc-400">{d.month}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Employees by Leave Days">
          {data.topEmployees.length === 0 ? <Empty /> : data.topEmployees.map((emp, i) => {
            const pct = Math.round((emp.days / maxEmpDays) * 100)
            return (
              <BarRow key={emp.name} label={`${i + 1}. ${emp.name}`} value={emp.days} pct={pct} unit="d" />
            )
          })}
        </ChartCard>

        <ChartCard title="Annual Leave Utilization" sub={`${new Date().getFullYear()}`}>
          {data.utilizationData.length === 0 ? <Empty /> : data.utilizationData.map((emp) => {
            const color = emp.pct >= 90 ? 'bg-red-400' : emp.pct >= 70 ? 'bg-amber-400' : 'bg-zinc-900'
            return (
              <div key={emp.name} className="mb-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-600 truncate">{emp.name}</span>
                  <span className={`text-xs font-medium tabular-nums ml-2 ${emp.pct >= 90 ? 'text-red-500' : emp.pct >= 70 ? 'text-amber-500' : 'text-zinc-900'}`}>
                    {emp.used}/{emp.total}d
                  </span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-1.5">
                  <div className={`${color} h-1.5 rounded-full`} style={{ width: `${emp.pct}%` }} />
                </div>
              </div>
            )
          })}
        </ChartCard>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Upcoming Leave" sub="Next 30 days">
          {data.upcomingLeave.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">No upcoming leave.</div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {data.upcomingLeave.map((leave) => (
                <div key={leave.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{leave.employee_name}</p>
                    <p className="text-xs text-zinc-400 capitalize mt-0.5">{leave.type.replace('_', ' ')} · {leave.days_count}d</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-zinc-700">
                      {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-zinc-400">
                      – {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Near Leave Limit" sub="≤ 5 days remaining">
          {data.nearLimit.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">All balances healthy.</div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {data.nearLimit.map((emp) => (
                <div key={emp.name} className="px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-900">{emp.name}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-20 bg-zinc-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${emp.remaining <= 0 ? 'bg-red-500' : emp.remaining <= 2 ? 'bg-red-400' : 'bg-amber-400'}`}
                        style={{ width: `${Math.max((emp.remaining / emp.total) * 100, 2)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold tabular-nums ${emp.remaining <= 0 ? 'text-red-500' : 'text-amber-600'}`}>
                      {emp.remaining}d left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Full table */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">All Leave Requests</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{data.allRequests.length} records</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                {['Request ID', 'Employee', 'Type', 'Dates', 'Days', 'Status', 'Submitted'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {data.allRequests.slice(0, 100).map((r) => {
                const statusStyles: Record<string, string> = {
                  pending: 'bg-amber-50 text-amber-700 border-amber-200',
                  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  rejected: 'bg-red-50 text-red-700 border-red-200',
                  cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
                }
                return (
                  <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-zinc-400">{r.request_id ?? '—'}</td>
                    <td className="px-5 py-3 text-xs font-medium text-zinc-900">{r.profiles?.full_name ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-zinc-600 capitalize">{r.type.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-xs text-zinc-600">
                      {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-600">{r.days_count}d</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[r.status] ?? statusStyles.pending}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-400">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                )
              })}
              {data.allRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-400">
                    No records found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {data.allRequests.length > 100 && (
            <div className="px-5 py-3 border-t border-zinc-100 text-xs text-zinc-400 text-center">
              Showing 100 of {data.allRequests.length} records. Export CSV to see all.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-zinc-200 p-5">
      <h2 className="text-sm font-medium text-zinc-900 mb-0.5">{title}</h2>
      {sub && <p className="text-xs text-zinc-400 mb-4">{sub}</p>}
      {!sub && <div className="mb-4" />}
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100">
        <h2 className="text-sm font-medium text-zinc-900">{title}</h2>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function BarRow({ label, value, pct, unit, sub }: { label: string; value: number; pct: number; unit: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-600 truncate">{label}</span>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          {sub && <span className="text-xs text-zinc-400">{sub}</span>}
          <span className="text-xs font-medium text-zinc-900 tabular-nums">{value}{unit}</span>
        </div>
      </div>
      <div className="w-full bg-zinc-100 rounded-full h-1.5">
        <div className="bg-zinc-900 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-zinc-400 text-center py-4">No data for current filters.</p>
}
