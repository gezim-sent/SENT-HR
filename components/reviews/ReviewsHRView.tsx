'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Cycle = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
  description: string | null
}

type Review = {
  id: string
  cycle_id: string
  status: string
  self_rating: number | null
  manager_rating: number | null
  self_comments: string | null
  manager_comments: string | null
  goals: any
  submitted_at: string | null
  created_at: string
  employee: { id: string; full_name: string; avatar_url: string | null; job_title: string | null; departments: { name: string } | null }
  reviewer: { id: string; full_name: string; avatar_url: string | null }
}

type Employee = {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  departments: { name: string } | null
}

const CYCLE_STATUS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  draft:     { label: 'Draft',     bg: 'bg-zinc-100',    text: 'text-zinc-600',   border: 'border-zinc-200' },
  active:    { label: 'Active',    bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  completed: { label: 'Completed', bg: 'bg-blue-50',     text: 'text-blue-700',   border: 'border-blue-200' },
}

const REVIEW_STATUS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:        { label: 'Pending',         bg: 'bg-zinc-100',   text: 'text-zinc-500',   border: 'border-zinc-200' },
  self_review:    { label: 'Self Review',     bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
  manager_review: { label: 'Manager Review',  bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
  completed:      { label: 'Completed',       bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
}

function StarRating({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-zinc-300">Not rated</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= value ? 'text-amber-400' : 'text-zinc-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs text-zinc-500 ml-1">{value}/5</span>
    </div>
  )
}

export default function ReviewsHRView({
  cycles,
  reviews,
  employees,
  currentUserId,
}: {
  cycles: Cycle[]
  reviews: Review[]
  employees: Employee[]
  currentUserId: string
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'cycles' | 'reviews'>('cycles')
  const [showNewCycle, setShowNewCycle] = useState(false)
  const [showAssign, setShowAssign] = useState<string | null>(null)
  const [expandedReview, setExpandedReview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [managerComment, setManagerComment] = useState<Record<string, string>>({})
  const [managerRating, setManagerRating] = useState<Record<string, number>>({})

  const [cycleForm, setCycleForm] = useState({
    name: '', description: '', start_date: '', end_date: '',
  })
  const [assignForm, setAssignForm] = useState({
    employee_id: '', reviewer_id: '',
  })

  async function createCycle() {
    if (!cycleForm.name || !cycleForm.start_date || !cycleForm.end_date) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('review_cycles').insert({
      name: cycleForm.name,
      description: cycleForm.description || null,
      start_date: cycleForm.start_date,
      end_date: cycleForm.end_date,
      status: 'draft',
    })
    setLoading(false)
    setShowNewCycle(false)
    setCycleForm({ name: '', description: '', start_date: '', end_date: '' })
    router.refresh()
  }

  async function updateCycleStatus(cycleId: string, status: string) {
    const supabase = createClient()
    await supabase.from('review_cycles').update({ status } as any).eq('id', cycleId)
    router.refresh()
  }

  async function assignReview(cycleId: string) {
    if (!assignForm.employee_id || !assignForm.reviewer_id) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('reviews').insert({
      cycle_id: cycleId,
      employee_id: assignForm.employee_id,
      reviewer_id: assignForm.reviewer_id,
      status: 'pending',
    })
    setLoading(false)
    setShowAssign(null)
    setAssignForm({ employee_id: '', reviewer_id: '' })
    router.refresh()
  }

  async function submitManagerReview(reviewId: string) {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('reviews').update({
      manager_rating: managerRating[reviewId] ?? null,
      manager_comments: managerComment[reviewId] ?? null,
      status: 'completed',
      submitted_at: new Date().toISOString(),
    } as any).eq('id', reviewId)
    setLoading(false)
    setExpandedReview(null)
    router.refresh()
  }

  const activeCycle = cycles.find((c) => c.status === 'active')
  const pendingManagerReview = reviews.filter((r) => r.status === 'manager_review')
  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Performance Reviews</h1>
          <p className="text-sm mt-0.5 text-zinc-400">Manage review cycles and employee evaluations.</p>
        </div>
        <button
          onClick={() => setShowNewCycle(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Cycle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Reviews', value: reviews.length, color: 'text-zinc-900' },
          { label: 'Pending Manager', value: pendingManagerReview.length, color: 'text-blue-600' },
          { label: 'Completed', value: reviews.filter((r) => r.status === 'completed').length, color: 'text-emerald-600' },
          { label: 'Active Cycle', value: activeCycle ? '1' : '0', color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className={`text-2xl font-semibold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1 w-fit">
        {(['cycles', 'reviews'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab} {tab === 'reviews' && `(${reviews.length})`}
          </button>
        ))}
      </div>

      {/* New cycle form */}
      {showNewCycle && (
        <div className="rounded-xl bg-white border border-zinc-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">New Review Cycle</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Cycle Name *</label>
              <input value={cycleForm.name} onChange={(e) => setCycleForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Q2 2026 Performance Review" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
              <input value={cycleForm.description} onChange={(e) => setCycleForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Start Date *</label>
              <input type="date" value={cycleForm.start_date} onChange={(e) => setCycleForm((p) => ({ ...p, start_date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">End Date *</label>
              <input type="date" value={cycleForm.end_date} onChange={(e) => setCycleForm((p) => ({ ...p, end_date: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createCycle} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Cycle'}
            </button>
            <button onClick={() => setShowNewCycle(false)} className="px-4 py-2 rounded-lg text-sm text-zinc-500 border border-zinc-200 hover:bg-zinc-50 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Cycles tab */}
      {activeTab === 'cycles' && (
        <div className="space-y-4">
          {cycles.length === 0 ? (
            <div className="rounded-xl bg-white border border-zinc-200 px-5 py-16 text-center">
              <p className="text-sm text-zinc-400">No review cycles yet.</p>
              <button onClick={() => setShowNewCycle(true)} className="mt-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Create your first cycle →</button>
            </div>
          ) : cycles.map((cycle) => {
            const cycleReviews = reviews.filter((r) => r.cycle_id === cycle.id)
            const completed = cycleReviews.filter((r) => r.status === 'completed').length
            const pct = cycleReviews.length > 0 ? Math.round((completed / cycleReviews.length) * 100) : 0
            const statusCfg = CYCLE_STATUS[cycle.status] ?? CYCLE_STATUS.draft
            const isAssigning = showAssign === cycle.id

            return (
              <div key={cycle.id} className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-zinc-900">{cycle.name}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    {cycle.description && <p className="text-xs text-zinc-400 mt-0.5">{cycle.description}</p>}
                    <p className="text-xs text-zinc-400 mt-1">
                      {new Date(cycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –
                      {new Date(cycle.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {cycleReviews.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-zinc-400">{completed}/{cycleReviews.length} completed</span>
                          <span className="text-xs text-zinc-400">{pct}%</span>
                        </div>
                        <div className="w-48 bg-zinc-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${pct === 100 ? 'bg-emerald-400' : 'bg-zinc-900'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cycle.status === 'draft' && (
                      <button onClick={() => updateCycleStatus(cycle.id, 'active')} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
                        Activate
                      </button>
                    )}
                    {cycle.status === 'active' && (
                      <button onClick={() => updateCycleStatus(cycle.id, 'completed')} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
                        Complete
                      </button>
                    )}
                    <button onClick={() => setShowAssign(isAssigning ? null : cycle.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
                      + Assign
                    </button>
                  </div>
                </div>

                {/* Assign review */}
                {isAssigning && (
                  <div className="px-5 pb-4 pt-0 border-t border-zinc-100 bg-zinc-50">
                    <p className="text-xs font-medium text-zinc-600 mb-3 pt-3">Assign Review</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Employee</label>
                        <select value={assignForm.employee_id} onChange={(e) => setAssignForm((p) => ({ ...p, employee_id: e.target.value }))} className={inputClass}>
                          <option value="">Select employee…</option>
                          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Reviewer (Manager)</label>
                        <select value={assignForm.reviewer_id} onChange={(e) => setAssignForm((p) => ({ ...p, reviewer_id: e.target.value }))} className={inputClass}>
                          <option value="">Select reviewer…</option>
                          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => assignReview(cycle.id)} disabled={loading} className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50">
                        {loading ? 'Assigning…' : 'Assign'}
                      </button>
                      <button onClick={() => setShowAssign(null)} className="px-4 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-700 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Reviews in cycle */}
                {cycleReviews.length > 0 && (
                  <div className="border-t border-zinc-100 divide-y divide-zinc-50">
                    {cycleReviews.map((review) => {
                      const sCfg = REVIEW_STATUS[review.status] ?? REVIEW_STATUS.pending
                      const initials = review.employee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                      return (
                        <div key={review.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            {review.employee.avatar_url ? (
                              <img src={review.employee.avatar_url} alt={review.employee.full_name} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center">
                                <span className="text-xs font-semibold text-zinc-600">{initials}</span>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-zinc-900">{review.employee.full_name}</p>
                              <p className="text-xs text-zinc-400">Reviewer: {review.reviewer.full_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {review.self_rating && <StarRating value={review.self_rating} />}
                            {review.manager_rating && <StarRating value={review.manager_rating} />}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}>
                              {sCfg.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reviews tab */}
      {activeTab === 'reviews' && (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">All Reviews</h2>
          </div>
          {reviews.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-400">No reviews yet.</div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {reviews.map((review) => {
                const sCfg = REVIEW_STATUS[review.status] ?? REVIEW_STATUS.pending
                const isExpanded = expandedReview === review.id
                const initials = review.employee.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

                return (
                  <div key={review.id}>
                    <button
                      onClick={() => setExpandedReview(isExpanded ? null : review.id)}
                      className="w-full text-left px-5 py-4 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {review.employee.avatar_url ? (
                            <img src={review.employee.avatar_url} alt={review.employee.full_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-white">{initials}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{review.employee.full_name}</p>
                            <p className="text-xs text-zinc-400">
                              {review.employee.job_title ?? ''} · Reviewer: {review.reviewer.full_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {review.self_rating && <div className="hidden sm:block"><StarRating value={review.self_rating} /></div>}
                          {review.manager_rating && <div className="hidden sm:block"><StarRating value={review.manager_rating} /></div>}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}>
                            {sCfg.label}
                          </span>
                          <svg className={`w-4 h-4 text-zinc-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4 bg-zinc-50 border-t border-zinc-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                          {/* Self review */}
                          <div className="rounded-xl bg-white border border-zinc-200 p-4 space-y-3">
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Self Review</h3>
                            <div>
                              <p className="text-xs text-zinc-400 mb-1">Rating</p>
                              <StarRating value={review.self_rating} />
                            </div>
                            {review.self_comments && (
                              <div>
                                <p className="text-xs text-zinc-400 mb-1">Comments</p>
                                <p className="text-xs text-zinc-700">{review.self_comments}</p>
                              </div>
                            )}
                          </div>

                          {/* Manager review */}
                          <div className="rounded-xl bg-white border border-zinc-200 p-4 space-y-3">
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Manager Review</h3>
                            {review.status === 'manager_review' ? (
                              <>
                                <div>
                                  <p className="text-xs text-zinc-400 mb-2">Rating</p>
                                  <div className="flex gap-1">
                                    {[1,2,3,4,5].map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => setManagerRating((p) => ({ ...p, [review.id]: s }))}
                                        className={`w-7 h-7 rounded-lg border text-sm transition-colors ${
                                          (managerRating[review.id] ?? 0) >= s
                                            ? 'bg-amber-400 border-amber-400 text-white'
                                            : 'border-zinc-200 text-zinc-300 hover:border-amber-300'
                                        }`}
                                      >
                                        ★
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-zinc-400 mb-1">Comments</p>
                                  <textarea
                                    value={managerComment[review.id] ?? ''}
                                    onChange={(e) => setManagerComment((p) => ({ ...p, [review.id]: e.target.value }))}
                                    placeholder="Add your review comments…"
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg text-xs border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                                  />
                                </div>
                                <button
                                  onClick={() => submitManagerReview(review.id)}
                                  disabled={loading}
                                  className="w-full py-2 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                >
                                  {loading ? 'Submitting…' : 'Submit Manager Review'}
                                </button>
                              </>
                            ) : (
                              <>
                                <div>
                                  <p className="text-xs text-zinc-400 mb-1">Rating</p>
                                  <StarRating value={review.manager_rating} />
                                </div>
                                {review.manager_comments && (
                                  <div>
                                    <p className="text-xs text-zinc-400 mb-1">Comments</p>
                                    <p className="text-xs text-zinc-700">{review.manager_comments}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
