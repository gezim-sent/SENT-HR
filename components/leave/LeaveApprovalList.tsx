'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type LeaveRequest = {
  id: string
  type: string
  start_date: string
  end_date: string
  return_date: string | null
  days_count: number
  reason: string | null
  status: string
  request_id: string | null
  document_path: string | null
  document_name: string | null
  profiles: {
    full_name: string
    avatar_url: string | null
    job_title: string | null
    email: string
  }
}

const TYPE_COLORS: Record<string, string> = {
  annual:          'bg-blue-50 text-blue-700 border-blue-200',
  sick:            'bg-red-50 text-red-700 border-red-200',
  maternity:       'bg-pink-50 text-pink-700 border-pink-200',
  paternity:       'bg-cyan-50 text-cyan-700 border-cyan-200',
  unpaid:          'bg-zinc-100 text-zinc-600 border-zinc-200',
  marriage:        'bg-purple-50 text-purple-700 border-purple-200',
  bereavement:     'bg-slate-50 text-slate-600 border-slate-200',
  work_from_home:  'bg-teal-50 text-teal-700 border-teal-200',
  business_travel: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  training:        'bg-green-50 text-green-700 border-green-200',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function getDayOfWeek(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long' })
}

export default function LeaveApprovalList({
  requests,
  approverId,
}: {
  requests: LeaveRequest[]
  approverId: string
}) {
  const [modalReq, setModalReq] = useState<LeaveRequest | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [docLoading, setDocLoading] = useState(false)
  const router = useRouter()

  async function viewDocument(path: string) {
    setDocLoading(true)
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('leave-documents')
      .createSignedUrl(path, 60)
    setDocLoading(false)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleReview(requestId: string, status: 'approved' | 'rejected') {
    if (status === 'rejected' && !note.trim()) {
      alert('Please add a reason when rejecting a request.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { data: oldReq } = await supabase
      .from('leave_requests')
      .select('status')
      .eq('id', requestId)
      .single()

    await supabase
      .from('leave_requests')
      .update({
        status,
        approver_id: approverId,
        approver_note: note.trim() || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    await supabase.from('leave_audit_log' as any).insert({
      request_id: requestId,
      action: status === 'approved' ? 'APPROVED' : 'REJECTED',
      performed_by: approverId,
      old_status: oldReq?.status ?? 'pending',
      new_status: status,
      comment: note.trim() || null,
    })

    fetch('/api/email/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: status, leaveRequestId: requestId }),
    }).catch(() => {})

    setLoading(false)
    setModalReq(null)
    setNote('')
    router.refresh()
  }

  return (
    <>
      {/* Request cards */}
      <div className="divide-y divide-zinc-100">
        {requests.map((req) => {
          const initials = req.profiles.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
          const typeColor = TYPE_COLORS[req.type] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
          const typeLabel = req.type.replace(/_/g, ' ')

          return (
            <div key={req.id} className="px-5 py-4 hover:bg-zinc-50 transition-colors">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {req.profiles.avatar_url ? (
                  <img src={req.profiles.avatar_url} alt={req.profiles.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-white">{initials}</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{req.profiles.full_name}</p>
                      <p className="text-xs text-zinc-400">{req.profiles.job_title ?? 'Employee'} · {req.profiles.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.request_id && <span className="text-xs font-mono text-zinc-400">{req.request_id}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${typeColor}`}>{typeLabel}</span>
                    </div>
                  </div>

                  {/* Date summary */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –
                      {new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {req.days_count} working day{req.days_count !== 1 ? 's' : ''}
                    </span>
                    {req.reason && <span className="italic truncate max-w-48">"{req.reason}"</span>}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => { setModalReq(req); setNote('') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Review
                    </button>
                    {req.document_path && (
                      <button
                        onClick={() => viewDocument(req.document_path!)}
                        disabled={docLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {docLoading ? 'Opening…' : 'Document'}
                      </button>
                    )}
                    <button
                      onClick={() => window.open(`/api/leave/pdf?id=${req.id}`, '_blank')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Review Modal */}
      {modalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setModalReq(null); setNote('') }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Review Leave Request</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">{modalReq.request_id}</p>
                </div>
                <button
                  onClick={() => { setModalReq(null); setNote('') }}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-700"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Employee */}
            <div className="px-6 py-4 flex items-center gap-3 bg-zinc-50 border-b border-zinc-100">
              {modalReq.profiles.avatar_url ? (
                <img src={modalReq.profiles.avatar_url} alt={modalReq.profiles.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">
                    {modalReq.profiles.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-zinc-900">{modalReq.profiles.full_name}</p>
                <p className="text-xs text-zinc-400">{modalReq.profiles.job_title ?? 'Employee'} · {modalReq.profiles.email}</p>
              </div>
            </div>

            {/* Leave details */}
            <div className="px-6 py-4 space-y-3">
              {/* Type badge */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${TYPE_COLORS[modalReq.type] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                  {modalReq.type.replace(/_/g, ' ')} Leave
                </span>
                <span className="text-sm font-bold text-zinc-900">
                  {modalReq.days_count} day{modalReq.days_count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Date details */}
              <div className="rounded-xl bg-zinc-50 border border-zinc-100 divide-y divide-zinc-100">
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Start</span>
                  <div className="text-right">
                    <span className="text-xs font-medium text-zinc-900">{formatDate(modalReq.start_date)}</span>
                    <span className="text-xs text-zinc-400 ml-1.5">({getDayOfWeek(modalReq.start_date)})</span>
                  </div>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">End</span>
                  <div className="text-right">
                    <span className="text-xs font-medium text-zinc-900">{formatDate(modalReq.end_date)}</span>
                    <span className="text-xs text-zinc-400 ml-1.5">({getDayOfWeek(modalReq.end_date)})</span>
                  </div>
                </div>
                {modalReq.return_date && (
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Return to work</span>
                    <span className="text-xs font-medium text-zinc-900">{formatDate(modalReq.return_date)}</span>
                  </div>
                )}
              </div>

              {/* Reason */}
              {modalReq.reason && (
                <div className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <p className="text-xs text-zinc-400 mb-1">Reason</p>
                  <p className="text-sm text-zinc-700 italic">"{modalReq.reason}"</p>
                </div>
              )}

              {/* Document */}
              {modalReq.document_path && (
                <button
                  onClick={() => viewDocument(modalReq.document_path!)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-100 transition-all text-left"
                >
                  <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-700 truncate">{modalReq.document_name ?? 'View document'}</p>
                    <p className="text-xs text-zinc-400">Click to open</p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              )}

              {/* Note input */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Note <span className="text-zinc-400 font-normal">(required when rejecting)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for the employee…"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-zinc-100 flex items-center gap-3">
              <button
                onClick={() => handleReview(modalReq.id, 'approved')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Approve
              </button>
              <button
                onClick={() => handleReview(modalReq.id, 'rejected')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
