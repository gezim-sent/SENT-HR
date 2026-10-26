'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Task = {
  id: string
  title: string
  description: string | null
  category: string
  due_date: string | null
  completed_at: string | null
  order_index: number
  notes: string | null
}

type Template = {
  id: string
  title: string
  description: string | null
  category: string
  due_days: number | null
  order_index: number
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  documentation: { label: 'Documentation', icon: '📄', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  training:      { label: 'Training',       icon: '📚', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  setup:         { label: 'Setup',          icon: '⚙️', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  meeting:       { label: 'Meeting',        icon: '🤝', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  other:         { label: 'Other',          icon: '📌', bg: 'bg-zinc-50',   text: 'text-zinc-600',   border: 'border-zinc-200' },
}

function categoryFor(cat: string) {
  return CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other
}

export default function OnboardingBoard({
  tasks,
  templates,
  employeeId,
  employeeName,
  hireDate,
}: {
  tasks: Task[]
  templates: Template[]
  employeeId: string
  employeeName: string
  hireDate: string | null
}) {
  const router = useRouter()
  const [completing, setCompleting] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const completed = tasks.filter((t) => t.completed_at)
  const pending = tasks.filter((t) => !t.completed_at)
  const progress = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0

  // Group pending by category
  const byCategory: Record<string, Task[]> = {}
  pending.forEach((t) => {
    if (!byCategory[t.category]) byCategory[t.category] = []
    byCategory[t.category].push(t)
  })

  async function toggleComplete(task: Task) {
    setCompleting(task.id)
    const supabase = createClient()

    await supabase
      .from('onboarding_tasks')
      .update({
        completed_at: task.completed_at ? null : new Date().toISOString(),
        notes: notes[task.id] || task.notes || null,
      } as any)
      .eq('id', task.id)

    setCompleting(null)
    router.refresh()
  }

  const daysSinceHire = hireDate
    ? Math.floor((Date.now() - new Date(hireDate).getTime()) / 86400000)
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Onboarding</h1>
        <p className="text-sm mt-0.5 text-zinc-400">
          Welcome, {employeeName.split(' ')[0]}!
          {daysSinceHire !== null && ` Day ${daysSinceHire + 1} at Sent.`}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl bg-white border border-zinc-200 px-6 py-16 text-center">
          <p className="text-2xl mb-3">🎉</p>
          <p className="text-sm font-medium text-zinc-900">No onboarding tasks yet</p>
          <p className="text-xs text-zinc-400 mt-1">Your HR team will assign tasks shortly.</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="rounded-xl bg-white border border-zinc-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Overall Progress</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {completed.length} of {tasks.length} tasks completed
                </p>
              </div>
              <span className={`text-2xl font-bold tabular-nums ${
                progress === 100 ? 'text-emerald-600' : 'text-zinc-900'
              }`}>
                {progress}%
              </span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  progress === 100 ? 'bg-emerald-500' : 'bg-zinc-900'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Category breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
                const catTasks = tasks.filter((t) => t.category === cat)
                const catDone = catTasks.filter((t) => t.completed_at).length
                if (catTasks.length === 0) return null
                return (
                  <div key={cat} className={`rounded-lg px-3 py-2 border ${config.bg} ${config.border}`}>
                    <p className="text-xs font-medium text-zinc-700">{config.icon} {config.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${config.text}`}>
                      {catDone}/{catTasks.length}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pending tasks by category */}
          {Object.entries(byCategory).map(([cat, catTasks]) => {
            const config = categoryFor(cat)
            return (
              <div key={cat} className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
                <div className={`px-5 py-3 border-b ${config.border} ${config.bg} flex items-center gap-2`}>
                  <span>{config.icon}</span>
                  <h2 className={`text-sm font-semibold ${config.text}`}>{config.label}</h2>
                  <span className={`ml-auto text-xs ${config.text} opacity-70`}>
                    {catTasks.length} task{catTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-zinc-50">
                  {catTasks.map((task) => {
                    const isExpanded = expandedId === task.id
                    const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0]
                    return (
                      <div key={task.id} className="px-5 py-3.5">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleComplete(task)}
                            disabled={completing === task.id}
                            className="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 border-zinc-300 hover:border-zinc-900 transition-colors flex items-center justify-center disabled:opacity-50"
                          >
                            {completing === task.id && (
                              <svg className="animate-spin w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : task.id)}
                                className="text-sm font-medium text-zinc-900 text-left hover:text-zinc-600 transition-colors"
                              >
                                {task.title}
                              </button>
                              {task.due_date && (
                                <span className={`text-xs flex-shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
                                  {isOverdue ? '⚠️ ' : ''}Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-xs text-zinc-400 mt-0.5">{task.description}</p>
                            )}

                            {/* Expanded notes */}
                            {isExpanded && (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={notes[task.id] ?? task.notes ?? ''}
                                  onChange={(e) => setNotes((p) => ({ ...p, [task.id]: e.target.value }))}
                                  placeholder="Add notes about this task…"
                                  rows={2}
                                  className="w-full px-3 py-2 rounded-lg text-xs border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                                />
                                <button
                                  onClick={() => toggleComplete(task)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
                                >
                                  ✓ Mark complete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Completed tasks */}
          {completed.length > 0 && (
            <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100 bg-emerald-50 flex items-center gap-2">
                <span>✅</span>
                <h2 className="text-sm font-semibold text-emerald-700">Completed</h2>
                <span className="ml-auto text-xs text-emerald-600">{completed.length} task{completed.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-zinc-50">
                {completed.map((task) => (
                  <div key={task.id} className="px-5 py-3 flex items-center gap-3">
                    <button
                      onClick={() => toggleComplete(task)}
                      className="flex-shrink-0 w-5 h-5 rounded border-2 border-emerald-400 bg-emerald-400 flex items-center justify-center hover:border-zinc-300 hover:bg-white transition-colors"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-400 line-through truncate">{task.title}</p>
                      {task.completed_at && (
                        <p className="text-xs text-zinc-300 mt-0.5">
                          Completed {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-xs text-zinc-300 italic truncate max-w-32">"{task.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All done! */}
          {progress === 100 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-sm font-semibold text-emerald-900">Onboarding complete!</p>
              <p className="text-xs text-emerald-700 mt-1">You've completed all your onboarding tasks. Welcome to the team!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
