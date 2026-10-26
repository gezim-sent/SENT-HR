'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Policy = {
  id: string
  content: string
  updated_at: string
  version: number
  published: boolean
  updated_by: string | null
  updater: { full_name: string } | null
}

// Simple markdown renderer — handles headers, bold, lists, hr, paragraphs
function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-zinc-900 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-zinc-900 mt-8 mb-3 pb-2 border-b border-zinc-100">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-zinc-900 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-zinc-600 mb-1">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-1 my-2">$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm text-zinc-600 mb-1">$1</li>')
    .replace(/^---$/gm, '<hr class="border-zinc-200 my-6" />')
    .replace(/^\*(.+)\*$/gm, '<p class="text-xs text-zinc-400 italic mt-4">$1</p>')
    .replace(/^(?!<[h|u|l|h|p])(.+)$/gm, '<p class="text-sm text-zinc-600 mb-2 leading-relaxed">$1</p>')
    .replace(/\n\n/g, '')
}

export default function LeavePolicyView({
  policy,
  isHR,
  currentUserId,
}: {
  policy: Policy | null
  isHR: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(policy?.content ?? '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tab, setTab] = useState<'preview' | 'edit'>('preview')

  async function handleSave(publish: boolean) {
    setLoading(true)
    const supabase = createClient()

    if (policy?.id) {
      await supabase
        .from('leave_policy' as any)
        .update({
          content,
          published: publish,
          updated_by: currentUserId,
        })
        .eq('id', policy.id)
    } else {
      await supabase.from('leave_policy' as any).insert({
        content,
        published: publish,
        updated_by: currentUserId,
      })
    }

    setLoading(false)
    setEditing(false)
    setTab('preview')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    router.refresh()
  }

  const lastUpdated = policy?.updated_at
    ? new Date(policy.updated_at).toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Leave Policy</h1>
          <p className="text-sm mt-0.5 text-zinc-400">
            Company leave policy and entitlements for all employees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isHR && !editing && (
            <button
              onClick={() => { setEditing(true); setTab('edit') }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Policy
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Policy saved and published successfully.
        </div>
      )}

      {/* Not published warning for employees */}
      {!policy?.published && !isHR && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-amber-800">The leave policy has not been published yet. Contact HR for more information.</p>
        </div>
      )}

      {/* Draft badge for HR */}
      {!policy?.published && isHR && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-800">Draft</span>
          <p className="text-xs text-amber-700">This policy is not yet visible to employees. Click "Save & Publish" to make it live.</p>
        </div>
      )}

      {/* Edit mode */}
      {editing && isHR ? (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          {/* Editor tabs */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
            <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
              {(['edit', 'preview'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                    tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {t === 'edit' ? '✏️ Edit' : '👁 Preview'}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400">Supports Markdown formatting</p>
          </div>

          {tab === 'edit' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[600px] px-6 py-5 text-sm text-zinc-800 font-mono focus:outline-none resize-none bg-white leading-relaxed"
              placeholder="Write your leave policy here using Markdown…"
            />
          ) : (
            <div
              className="px-8 py-6 min-h-[600px] prose-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          )}

          {/* Editor actions */}
          <div className="px-5 py-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between gap-4">
            <button
              onClick={() => { setEditing(false); setContent(policy?.content ?? ''); setTab('preview') }}
              className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleSave(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Save & Publish
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Read mode */
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          {/* Meta bar */}
          {(lastUpdated || policy?.version) && (
            <div className="px-8 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {policy?.version && (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 font-mono">
                    v{policy.version}
                  </span>
                )}
                {lastUpdated && (
                  <span>
                    Last updated {lastUpdated}
                    {policy?.updater?.full_name && ` by ${policy.updater.full_name}`}
                  </span>
                )}
              </div>
              {policy?.published && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Published
                </span>
              )}
            </div>
          )}

          {/* Policy content */}
          {!policy || !policy.content ? (
            <div className="px-8 py-20 text-center">
              <p className="text-2xl mb-3">📋</p>
              <p className="text-sm font-medium text-zinc-900">No policy written yet</p>
              {isHR && (
                <button
                  onClick={() => { setEditing(true); setTab('edit') }}
                  className="mt-3 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  Write the leave policy →
                </button>
              )}
            </div>
          ) : (
            <div
              className="px-8 py-8"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(policy.content) }}
            />
          )}
        </div>
      )}

      {/* Quick reference cards */}
      {!editing && policy?.published && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Quick Reference</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '🏖️', label: 'Annual Leave', value: '20 days' },
              { icon: '🏥', label: 'Sick Leave',   value: '20 days' },
              { icon: '🤱', label: 'Maternity',    value: '12 months' },
              { icon: '👨‍👧', label: 'Paternity',   value: '5 days' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white border border-zinc-200 p-4 text-center">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-xs text-zinc-400 mt-2">{item.label}</p>
                <p className="text-sm font-semibold text-zinc-900 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
