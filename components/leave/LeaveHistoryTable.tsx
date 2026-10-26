'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type LeaveRequest = {
  id: string
  request_id: string | null
  type: string
  start_date: string
  end_date: string
  return_date: string | null
  days_count: number
  reason: string | null
  status: string
  approver_note: string | null
  reviewed_at: string | null
  created_at: string
}

function DownloadButton({ id, requestId, status }: { id: string; requestId: string | null; status: string }) {
  const [loading, setLoading] = useState(false)

  function handleDownload() {
    setLoading(true)
    const win = window.open(`/api/leave/pdf?id=${id}`, '_blank')
    if (win) {
      win.addEventListener('load', () => setLoading(false))
      setTimeout(() => setLoading(false), 3000) // fallback
    } else {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Download PDF"
      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {loading ? 'Opening…' : 'PDF'}
    </button>
  )
}

export default function LeaveHistoryTable({ requests, leaveTypes = [] }: { requests: LeaveRequest[], leaveTypes?: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ start_date: '', end_date: '', return_date: '', reason: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function startEdit(req: LeaveRequest) {
    setEditingId(req.id)
    setEditForm({
      start_date: req.start_date,
      end_date: req.end_date,
      reason: req.reason ?? '',
    })
  }

  async function handleCancelRequest(id: string) {
    if (!confirm('Cancel this leave request?')) return
    const supabase = createClient()
    await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', id)
    router.refresh()
  }

  async function handleEdit(req: LeaveRequest) {
    setLoading(true)
    const supabase = createClient()

    await supabase
      .from('leave_requests')
      .update({
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        return_date: editForm.return_date || null,
        reason: editForm.reason || null,
        status: 'pending',
        previous_status: req.status,
        edited_at: new Date().toISOString(),
        approver_id: null,
        approver_note: null,
        reviewed_at: null,
      } as any)
      .eq('id', req.id)

    await supabase.from('leave_audit_log' as any).insert({
      request_id: req.id,
      action: 'EDITED',
      performed_by: (await supabase.auth.getUser()).data.user?.id,
      old_status: req.status,
      new_status: 'pending',
      comment: 'Request edited by employee — reset to pending approval',
    })

    setLoading(false)
    setEditingId(null)
    router.refresh()
  }

  const statusStyles: Record<string, string> = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected:  'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }

  if (requests.length === 0) return null

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100">
        <h2 className="text-sm font-medium text-zinc-900">Leave History</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Complete audit trail of all your requests</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400">Request ID</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400">Type</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400">Dates</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400">Days</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400">Submitted</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {requests.map((req) => (
              <React.Fragment key={req.id}>
                <tr className="hover:bg-zinc-50 transition-colors group">
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono text-zinc-500">{req.request_id ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium text-zinc-700">
                      {leaveTypes.find((t) => t.type === req.type)?.label ?? req.type}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-zinc-600">
                      {new Date(req.start_date).toLocaleDateString()} – {new Date(req.end_date).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-zinc-600">{req.days_count}d</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[req.status] ?? statusStyles.pending}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-zinc-400">
                      {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Download PDF — always available */}
                      <DownloadButton id={req.id} requestId={req.request_id} status={req.status} />

                      {/* Edit / Cancel — pending only */}
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => startEdit(req)}
                            className="px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Edit row */}
                {editingId === req.id && (
                  <tr key={`${req.id}-edit`} className="bg-zinc-50">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={editForm.start_date}
                            onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
                            className="px-3 py-1.5 rounded-lg text-xs border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">End Date</label>
                          <input
                            type="date"
                            value={editForm.end_date}
                            onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                            className="px-3 py-1.5 rounded-lg text-xs border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">Return to Work *</label>
                          <input
                            type="date"
                            value={editForm.return_date}
                            min={editForm.end_date || undefined}
                            onChange={(e) => setEditForm((p) => ({ ...p, return_date: e.target.value }))}
                            className="px-3 py-1.5 rounded-lg text-xs border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>
                        <div className="flex-1 min-w-48">
                          <label className="block text-xs font-medium text-zinc-500 mb-1">Reason</label>
                          <input
                            type="text"
                            value={editForm.reason}
                            onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))}
                            placeholder="Update reason…"
                            className="w-full px-3 py-1.5 rounded-lg text-xs border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(req)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                          >
                            {loading ? 'Saving…' : 'Save & Resubmit'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 mt-2">
                        ⚠️ Editing will reset this request to pending and require re-approval.
                      </p>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
