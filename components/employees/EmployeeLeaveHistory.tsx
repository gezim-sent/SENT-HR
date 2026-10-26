'use client'

type LeaveRequest = {
  id: string
  request_id: string | null
  type: string
  start_date: string
  end_date: string
  days_count: number
  status: string
  reason: string | null
  approver_note: string | null
  created_at: string
}

export default function EmployeeLeaveHistory({
  requests,
  leaveTypes,
  isHR,
}: {
  requests: LeaveRequest[]
  leaveTypes: { type: string; label: string }[]
  isHR: boolean
}) {
  const statusStyles: Record<string, string> = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected:  'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-900">Leave History</h2>
        <span className="text-xs text-zinc-400">{requests.length} requests</span>
      </div>

      {requests.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-400">No leave requests yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                {['Request ID', 'Type', 'Dates', 'Days', 'Status', 'Submitted'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-400">{h}</th>
                ))}
                {isHR && <th className="px-5 py-3 text-xs font-medium text-zinc-400">PDF</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-zinc-400">{r.request_id ?? '—'}</td>
                  <td className="px-5 py-3 text-xs font-medium text-zinc-700">
                    {leaveTypes.find((t) => t.type === r.type)?.label ?? r.type}
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-600">
                    {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-600">{r.days_count}d</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[r.status] ?? statusStyles.pending}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  {isHR && (
                    <td className="px-5 py-3">
                      <a
                        href={`/api/leave/pdf?id=${r.id}`}
                        target="_blank"
                        className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                      >
                        PDF
                      </a>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
