'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database.types'
import CommandPalette from '@/components/search/CommandPalette'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  created_at: string
}

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

export default function TopBar({ profile }: { profile: Profile }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [reviewModal, setReviewModal] = useState<LeaveRequest | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [docLoading, setDocLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications' as any)
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifications((data as Notification[]) ?? [])
  }

  async function markAllRead() {
    await supabase
      .from('notifications' as any)
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function handleNotificationClick(n: Notification) {
    // Mark as read
    await supabase.from('notifications' as any).update({ read: true }).eq('id', n.id)
    fetchNotifications()
    setBellOpen(false)

    // For leave requests — fetch and open review modal instead of navigating
    if (n.type === 'leave_request') {
      // Extract request_id from message or fetch the latest pending request
      const { data: requests } = await supabase
        .from('leave_requests')
        .select(`
          id, type, start_date, end_date, return_date, days_count,
          reason, status, request_id, document_path, document_name,
          profiles!leave_requests_employee_id_fkey(full_name, avatar_url, job_title, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)

      // Find the most relevant request mentioned in notification message
      if (requests && requests.length > 0) {
        const req = requests[0] as any
        setReviewModal({
          ...req,
          profiles: req.profiles,
        })
        setReviewNote('')
      } else {
        // No pending requests — just navigate
        if (n.link) router.push(n.link)
      }
      return
    }

    // All other notifications — navigate normally
    if (n.link) router.push(n.link)
  }

  async function viewDocument(path: string) {
    setDocLoading(true)
    const { data } = await supabase.storage.from('leave-documents').createSignedUrl(path, 60)
    setDocLoading(false)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleReview(requestId: string, status: 'approved' | 'rejected') {
    if (status === 'rejected' && !reviewNote.trim()) {
      alert('Please add a reason when rejecting a request.')
      return
    }
    setReviewLoading(true)

    const { data: oldReq } = await supabase
      .from('leave_requests')
      .select('status')
      .eq('id', requestId)
      .single()

    await supabase.from('leave_requests').update({
      status,
      approver_id: profile.id,
      approver_note: reviewNote.trim() || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId)

    await supabase.from('leave_audit_log' as any).insert({
      request_id: requestId,
      action: status === 'approved' ? 'APPROVED' : 'REJECTED',
      performed_by: profile.id,
      old_status: oldReq?.status ?? 'pending',
      new_status: status,
      comment: reviewNote.trim() || null,
    })

    fetch('/api/email/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: status, leaveRequestId: requestId }),
    }).catch(() => {})

    setReviewLoading(false)
    setReviewModal(null)
    setReviewNote('')
    router.refresh()
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => fetchNotifications()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const NOTIF_CONFIG: Record<string, { icon: string; color: string; dot: string }> = {
    leave_request:  { icon: '📋', color: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400' },
    leave_approved: { icon: '✅', color: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
    leave_rejected: { icon: '❌', color: 'bg-red-50 border-red-200',        dot: 'bg-red-400' },
    leave_cancelled:{ icon: '🚫', color: 'bg-zinc-50 border-zinc-200',      dot: 'bg-zinc-400' },
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
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Group by today vs earlier
  const todayStr = new Date().toISOString().split('T')[0]
  const todayNotifs = notifications.filter((n) => n.created_at.startsWith(todayStr))
  const earlierNotifs = notifications.filter((n) => !n.created_at.startsWith(todayStr))

  return (
    <>
    <header className="h-14 flex items-center justify-between px-5 flex-shrink-0 bg-white border-b border-zinc-200">
      <div />

      <div className="flex items-center gap-3">
        {/* Status */}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-400">All systems operational</span>
        </div>

        <div className="w-px h-4 bg-zinc-200" />

        {/* Command palette search */}
        <CommandPalette isHR={profile.role === 'admin' || profile.role === 'hr_manager'} />

        <div className="w-px h-4 bg-zinc-200" />

        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => { setBellOpen((o) => !o); setMenuOpen(false) }}
            className="relative p-2 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-zinc-900 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 rounded-2xl shadow-xl bg-white border border-zinc-200 z-50 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-zinc-400 mt-0.5">{unreadCount} unread</p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-50"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-2xl mb-2">🔔</p>
                    <p className="text-sm font-medium text-zinc-900">All caught up!</p>
                    <p className="text-xs text-zinc-400 mt-1">No notifications yet.</p>
                  </div>
                ) : (
                  <>
                    {todayNotifs.length > 0 && (
                      <div>
                        <p className="px-5 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-50">Today</p>
                        {todayNotifs.map((n) => {
                          const cfg = NOTIF_CONFIG[n.type] ?? { icon: '📌', color: 'bg-zinc-50 border-zinc-200', dot: 'bg-zinc-400' }
                          return (
                            <button
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`w-full text-left px-5 py-3.5 hover:bg-zinc-50 transition-colors border-b border-zinc-50 ${!n.read ? 'bg-zinc-50/80' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border ${cfg.color}`}>
                                  {cfg.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-xs font-semibold ${!n.read ? 'text-zinc-900' : 'text-zinc-700'}`}>{n.title}</p>
                                    <span className="text-xs text-zinc-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                                  </div>
                                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{n.message}</p>
                                  {n.link && (
                                    <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                                      <span>View details</span>
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </p>
                                  )}
                                </div>
                                {!n.read && (
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {earlierNotifs.length > 0 && (
                      <div>
                        <p className="px-5 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-50">Earlier</p>
                        {earlierNotifs.map((n) => {
                          const cfg = NOTIF_CONFIG[n.type] ?? { icon: '📌', color: 'bg-zinc-50 border-zinc-200', dot: 'bg-zinc-400' }
                          return (
                            <button
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`w-full text-left px-5 py-3.5 hover:bg-zinc-50 transition-colors border-b border-zinc-50 ${!n.read ? 'bg-zinc-50/80' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border ${cfg.color}`}>
                                  {cfg.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-xs font-semibold ${!n.read ? 'text-zinc-900' : 'text-zinc-700'}`}>{n.title}</p>
                                    <span className="text-xs text-zinc-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                                  </div>
                                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{n.message}</p>
                                </div>
                                {!n.read && (
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50">
                  <a
                    href="/dashboard/leave/audit"
                    onClick={() => setBellOpen(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1"
                  >
                    View all activity
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-zinc-200" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setMenuOpen((o) => !o); setBellOpen(false) }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 transition-colors"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-white">{initials}</span>
              </div>
            )}
            <span className="text-sm font-medium text-zinc-700 hidden sm:block">
              {profile.full_name}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg py-1 z-50 shadow-lg bg-white border border-zinc-200">
              <div className="px-3 py-2 border-b border-zinc-100">
                <p className="text-xs font-medium text-zinc-900">{profile.full_name}</p>
                <p className="text-xs mt-0.5 text-zinc-400">{profile.email}</p>
              </div>
              <a
                href="/dashboard/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </a>
              <hr className="border-zinc-100" />
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Review Modal — opened from notification click */}
    {reviewModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => { setReviewModal(null); setReviewNote('') }}
        />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Review Leave Request</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{reviewModal.request_id}</p>
              </div>
              <button
                onClick={() => { setReviewModal(null); setReviewNote('') }}
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
            {reviewModal.profiles.avatar_url ? (
              <img src={reviewModal.profiles.avatar_url} alt={reviewModal.profiles.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {reviewModal.profiles.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-zinc-900">{reviewModal.profiles.full_name}</p>
              <p className="text-xs text-zinc-400">{reviewModal.profiles.job_title ?? 'Employee'} · {reviewModal.profiles.email}</p>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${TYPE_COLORS[reviewModal.type] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                {reviewModal.type.replace(/_/g, ' ')} Leave
              </span>
              <span className="text-sm font-bold text-zinc-900">
                {reviewModal.days_count} day{reviewModal.days_count !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="rounded-xl bg-zinc-50 border border-zinc-100 divide-y divide-zinc-100">
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Start</span>
                <div className="text-right">
                  <span className="text-xs font-medium text-zinc-900">{formatDate(reviewModal.start_date)}</span>
                  <span className="text-xs text-zinc-400 ml-1.5">({getDayOfWeek(reviewModal.start_date)})</span>
                </div>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs text-zinc-400">End</span>
                <div className="text-right">
                  <span className="text-xs font-medium text-zinc-900">{formatDate(reviewModal.end_date)}</span>
                  <span className="text-xs text-zinc-400 ml-1.5">({getDayOfWeek(reviewModal.end_date)})</span>
                </div>
              </div>
              {reviewModal.return_date && (
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Return to work</span>
                  <span className="text-xs font-medium text-zinc-900">{formatDate(reviewModal.return_date)}</span>
                </div>
              )}
            </div>

            {reviewModal.reason && (
              <div className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <p className="text-xs text-zinc-400 mb-1">Reason</p>
                <p className="text-sm text-zinc-700 italic">"{reviewModal.reason}"</p>
              </div>
            )}

            {reviewModal.document_path && (
              <button
                onClick={() => viewDocument(reviewModal.document_path!)}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-100 transition-all text-left"
              >
                <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-700 truncate">{reviewModal.document_name ?? 'View document'}</p>
                  <p className="text-xs text-zinc-400">Click to open</p>
                </div>
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                Note <span className="text-zinc-400 font-normal">(required when rejecting)</span>
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a note for the employee…"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-zinc-100 flex items-center gap-3">
            <button
              onClick={() => handleReview(reviewModal.id, 'approved')}
              disabled={reviewLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
            >
              {reviewLoading ? (
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
              onClick={() => handleReview(reviewModal.id, 'rejected')}
              disabled={reviewLoading}
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
