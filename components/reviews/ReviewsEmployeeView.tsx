'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  cycle: {
    id: string
    name: string
    start_date: string
    end_date: string
    status: string
  }
  reviewer: {
    id: string
    full_name: string
    avatar_url: string | null
    job_title: string | null
  }
}

type Cycle = { id: string; name: string; status: string }

const REVIEW_STATUS: Record<string, { label: string; bg: string; text: string; border: string; desc: string }> = {
  pending:        { label: 'Pending',         bg: 'bg-zinc-100',   text: 'text-zinc-500',    border: 'border-zinc-200',   desc: 'Waiting to start' },
  self_review:    { label: 'Self Review',     bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  desc: 'Complete your self-assessment' },
  manager_review: { label: 'Manager Review',  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   desc: 'Your manager is reviewing' },
  completed:      { label: 'Completed',       bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', desc: 'Review finished' },
}

function StarDisplay({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-zinc-300">Not rated yet</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} className={`w-4 h-4 ${s <= value ? 'text-amber-400' : 'text-zinc-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-sm font-semibold text-zinc-700 ml-1">{value}<span className="text-xs font-normal text-zinc-400">/5</span></span>
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className={`w-8 h-8 rounded-lg border text-lg transition-all ${
            (hovered || value) >= s
              ? 'bg-amber-400 border-amber-400 text-white scale-110'
              : 'border-zinc-200 text-zinc-300 hover:border-amber-300 hover:scale-105'
          }`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-zinc-600 self-center">
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
        </span>
      )}
    </div>
  )
}

export default function ReviewsEmployeeView({
  reviews,
  cycles,
  employeeId,
  employeeName,
}: {
  reviews: Review[]
  cycles: Cycle[]
  employeeId: string
  employeeName: string
}) {
  const router = useRouter()
  const [activeReview, setActiveReview] = useState<string | null>(null)
  const [selfRating, setSelfRating] = useState<Record<string, number>>({})
  const [selfComment, setSelfComment] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const selfReviewPending = reviews.filter((r) => r.status === 'self_review')

  async function submitSelfReview(reviewId: string) {
    const rating = selfRating[reviewId]
    if (!rating) { alert('Please select a rating.'); return }
    setLoading(true)
    const supabase = createClient()
    await supabase.from('reviews').update({
      self_rating: rating,
      self_comments: selfComment[reviewId] ?? null,
      status: 'manager_review',
      submitted_at: new Date().toISOString(),
    } as any).eq('id', reviewId)
    setLoading(false)
    setActiveReview(null)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">My Reviews</h1>
        <p className="text-sm mt-0.5 text-zinc-400">Your performance review history and pending assessments.</p>
      </div>

      {/* Action needed banner */}
      {selfReviewPending.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Action required</p>
              <p className="text-xs text-amber-700">
                You have {selfReviewPending.length} self-review{selfReviewPending.length !== 1 ? 's' : ''} to complete.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveReview(selfReviewPending[0].id)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors flex-shrink-0"
          >
            Start Review
          </button>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="rounded-xl bg-white border border-zinc-200 px-5 py-16 text-center">
          <p className="text-2xl mb-3">📊</p>
          <p className="text-sm font-medium text-zinc-900">No reviews yet</p>
          <p className="text-xs text-zinc-400 mt-1">Your manager will assign a review when a cycle is active.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const sCfg = REVIEW_STATUS[review.status] ?? REVIEW_STATUS.pending
            const isActive = activeReview === review.id
            const isSelfReview = review.status === 'self_review'

            return (
              <div key={review.id} className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-zinc-900">{review.cycle.name}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}>
                        {sCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {sCfg.desc} · Reviewer: {review.reviewer.full_name}
                    </p>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      {new Date(review.cycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –
                      {new Date(review.cycle.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {isSelfReview && (
                    <button
                      onClick={() => setActiveReview(isActive ? null : review.id)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors flex-shrink-0"
                    >
                      {isActive ? 'Cancel' : 'Complete Self-Review'}
                    </button>
                  )}
                </div>

                {/* Self-review form */}
                {isActive && isSelfReview && (
                  <div className="px-5 pb-5 border-t border-zinc-100 bg-zinc-50 space-y-4 pt-4">
                    <h3 className="text-sm font-semibold text-zinc-900">Self Assessment</h3>

                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-2">
                        Overall Rating *
                      </label>
                      <StarPicker
                        value={selfRating[review.id] ?? 0}
                        onChange={(v) => setSelfRating((p) => ({ ...p, [review.id]: v }))}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">
                        Self Assessment Comments
                      </label>
                      <textarea
                        value={selfComment[review.id] ?? ''}
                        onChange={(e) => setSelfComment((p) => ({ ...p, [review.id]: e.target.value }))}
                        placeholder="Reflect on your achievements, challenges, and areas for growth this period…"
                        rows={5}
                        className="w-full px-3 py-2 rounded-lg text-sm border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => submitSelfReview(review.id)}
                      disabled={loading || !selfRating[review.id]}
                      className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Submitting…' : 'Submit Self Review'}
                    </button>
                    <p className="text-xs text-zinc-400 text-center">
                      Once submitted your manager will be notified to complete their review.
                    </p>
                  </div>
                )}

                {/* Completed review summary */}
                {review.status === 'completed' && (
                  <div className="px-5 pb-5 border-t border-zinc-100 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                        <p className="text-xs font-medium text-zinc-500 mb-2">Your Rating</p>
                        <StarDisplay value={review.self_rating} />
                        {review.self_comments && (
                          <p className="text-xs text-zinc-500 mt-2 italic">"{review.self_comments}"</p>
                        )}
                      </div>
                      <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                        <p className="text-xs font-medium text-zinc-500 mb-2">Manager Rating</p>
                        <StarDisplay value={review.manager_rating} />
                        {review.manager_comments && (
                          <p className="text-xs text-zinc-500 mt-2 italic">"{review.manager_comments}"</p>
                        )}
                      </div>
                    </div>
                    {review.submitted_at && (
                      <p className="text-xs text-zinc-300 mt-3 text-center">
                        Completed {new Date(review.submitted_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                )}

                {/* Manager reviewing */}
                {review.status === 'manager_review' && (
                  <div className="px-5 pb-4 border-t border-zinc-100 pt-4">
                    <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-3">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-blue-800">Your self-review has been submitted</p>
                        <p className="text-xs text-blue-600">{review.reviewer.full_name} is completing their review.</p>
                      </div>
                    </div>
                    {review.self_rating && (
                      <div className="mt-3">
                        <p className="text-xs text-zinc-400 mb-1">Your self rating</p>
                        <StarDisplay value={review.self_rating} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
