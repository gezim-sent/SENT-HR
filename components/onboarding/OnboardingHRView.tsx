'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Employee = {
  id: string
  full_name: string
  hire_date: string | null
  avatar_url: string | null
  status: string
  departments: { name: string } | null
}

type Task = {
  id: string
  employee_id: string
  title: string
  description: string | null
  category: string
  due_date: string | null
  completed_at: string | null
  order_index: number
  profiles?: { id: string; full_name: string; avatar_url: string | null; hire_date: string | null }
}

type Template = {
  id: string
  title: string
  description: string | null
  category: string
  due_days: number | null
  order_index: number
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  documentation: { label: 'Documentation', icon: '📄' },
  training:      { label: 'Training',       icon: '📚' },
  setup:         { label: 'Setup',          icon: '⚙️' },
  meeting:       { label: 'Meeting',        icon: '🤝' },
  other:         { label: 'Other',          icon: '📌' },
}

export default function OnboardingHRView({
  employees,
  allTasks,
  selectedEmployeeId,
  selectedEmployee,
  selectedTasks,
  templates,
  currentUserId,
}: {
  employees: Employee[]
  allTasks: Task[]
  selectedEmployeeId: string | null
  selectedEmployee: Employee | null
  selectedTasks: Task[]
  templates: Template[]
  currentUserId: string
}) {
  const router = useRouter()
  const [showAssign, setShowAssign] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [newTask, setNewTask] = useState({
    title: '', description: '', category: 'other', due_date: '',
  })

  // Overview stats per employee
  const tasksByEmployee: Record<string, { total: number; done: number }> = {}
  allTasks.forEach((t) => {
    if (!tasksByEmployee[t.employee_id]) tasksByEmployee[t.employee_id] = { total: 0, done: 0 }
    tasksByEmployee[t.employee_id].total++
    if (t.completed_at) tasksByEmployee[t.employee_id].done++
  })

  async function assignTemplates(employeeId: string) {
    if (!selectedTemplates.length) return
    setAssigning(true)
    const supabase = createClient()

    const tasksToInsert = templates
      .filter((t) => selectedTemplates.includes(t.id))
      .map((t) => {
        const dueDate = t.due_days
          ? new Date(Date.now() + t.due_days * 86400000).toISOString().split('T')[0]
          : null
        return {
          employee_id: employeeId,
          title: t.title,
          description: t.description,
          category: t.category,
          due_date: dueDate,
          order_index: t.order_index,
        }
      })

    await supabase.from('onboarding_tasks').insert(tasksToInsert as any)
    setAssigning(false)
    setShowAssign(false)
    setSelectedTemplates([])
    router.refresh()
  }

  async function addCustomTask(employeeId: string) {
    if (!newTask.title) return
    setAddingTask(true)
    const supabase = createClient()

    await supabase.from('onboarding_tasks').insert({
      employee_id: employeeId,
      title: newTask.title,
      description: newTask.description || null,
      category: newTask.category as any,
      due_date: newTask.due_date || null,
      order_index: selectedTasks.length + 1,
    } as any)

    setAddingTask(false)
    setShowAddTask(false)
    setNewTask({ title: '', description: '', category: 'other', due_date: '' })
    router.refresh()
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Remove this task?')) return
    const supabase = createClient()
    await supabase.from('onboarding_tasks').delete().eq('id', taskId)
    router.refresh()
  }

  async function toggleComplete(task: Task) {
    const supabase = createClient()
    await supabase
      .from('onboarding_tasks')
      .update({ completed_at: task.completed_at ? null : new Date().toISOString() } as any)
      .eq('id', task.id)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Onboarding</h1>
        <p className="text-sm mt-0.5 text-zinc-400">Manage employee onboarding tasks and progress.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee list */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Employees</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{employees.length} active</p>
          </div>
          <div className="divide-y divide-zinc-50 max-h-[600px] overflow-y-auto">
            {employees.map((emp) => {
              const stats = tasksByEmployee[emp.id] ?? { total: 0, done: 0 }
              const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
              const isSelected = selectedEmployeeId === emp.id
              const initials = emp.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

              return (
                <button
                  key={emp.id}
                  onClick={() => router.push(`/dashboard/onboarding?employee=${emp.id}`)}
                  className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors ${isSelected ? 'bg-zinc-50 border-l-2 border-zinc-900' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.full_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-zinc-600">{initials}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-900 truncate">{emp.full_name}</p>
                      <p className="text-xs text-zinc-400">
                        {stats.total === 0 ? 'No tasks' : `${stats.done}/${stats.total} done`}
                      </p>
                    </div>
                    {stats.total > 0 && (
                      <span className={`text-xs font-medium flex-shrink-0 ${pct === 100 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                  {stats.total > 0 && (
                    <div className="mt-2 w-full bg-zinc-100 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${pct === 100 ? 'bg-emerald-400' : 'bg-zinc-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Task detail panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedEmployeeId ? (
            /* Overview */
            <div className="rounded-xl bg-white border border-zinc-200 p-8 text-center">
              <p className="text-2xl mb-3">👈</p>
              <p className="text-sm font-medium text-zinc-900">Select an employee</p>
              <p className="text-xs text-zinc-400 mt-1">Choose an employee from the list to manage their onboarding tasks.</p>
            </div>
          ) : (
            <>
              {/* Selected employee header */}
              {selectedEmployee && (
                <div className="rounded-xl bg-white border border-zinc-200 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {selectedEmployee.avatar_url ? (
                      <img src={selectedEmployee.avatar_url} alt={selectedEmployee.full_name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {selectedEmployee.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{selectedEmployee.full_name}</p>
                      <p className="text-xs text-zinc-400">
                        {(selectedEmployee as any).departments?.name ?? 'No department'}
                        {selectedEmployee.hire_date && ` · Joined ${new Date(selectedEmployee.hire_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddTask((p) => !p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      + Custom Task
                    </button>
                    <button
                      onClick={() => setShowAssign((p) => !p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
                    >
                      + From Templates
                    </button>
                  </div>
                </div>
              )}

              {/* Add custom task */}
              {showAddTask && selectedEmployeeId && (
                <div className="rounded-xl bg-white border border-zinc-200 p-4 space-y-3">
                  <h3 className="text-sm font-medium text-zinc-900">Add Custom Task</h3>
                  <input
                    value={newTask.title}
                    onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Task title *"
                    className={inputClass}
                  />
                  <input
                    value={newTask.description}
                    onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className={inputClass}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newTask.category}
                      onChange={(e) => setNewTask((p) => ({ ...p, category: e.target.value }))}
                      className={inputClass}
                    >
                      {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addCustomTask(selectedEmployeeId)}
                      disabled={addingTask}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                      {addingTask ? 'Adding…' : 'Add Task'}
                    </button>
                    <button onClick={() => setShowAddTask(false)} className="px-4 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-700 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Assign from templates */}
              {showAssign && selectedEmployeeId && (
                <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-900">Assign from Templates</h3>
                    <span className="text-xs text-zinc-400">{selectedTemplates.length} selected</span>
                  </div>
                  <div className="divide-y divide-zinc-50 max-h-64 overflow-y-auto">
                    {templates.map((t) => {
                      const config = CATEGORY_CONFIG[t.category] ?? CATEGORY_CONFIG.other
                      const isSelected = selectedTemplates.includes(t.id)
                      return (
                        <label key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedTemplates((p) =>
                                e.target.checked ? [...p, t.id] : p.filter((id) => id !== t.id)
                              )
                            }}
                            className="rounded border-zinc-300"
                          />
                          <span className="text-sm">{config.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-900">{t.title}</p>
                            {t.due_days && (
                              <p className="text-xs text-zinc-400">Due in {t.due_days} day{t.due_days !== 1 ? 's' : ''}</p>
                            )}
                          </div>
                          <span className="text-xs text-zinc-400">{config.label}</span>
                        </label>
                      )
                    })}
                  </div>
                  <div className="px-5 py-3 border-t border-zinc-100 flex gap-2">
                    <button
                      onClick={() => setSelectedTemplates(templates.map((t) => t.id))}
                      className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => assignTemplates(selectedEmployeeId)}
                      disabled={assigning || !selectedTemplates.length}
                      className="ml-auto px-4 py-2 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                      {assigning ? 'Assigning…' : `Assign ${selectedTemplates.length} task${selectedTemplates.length !== 1 ? 's' : ''}`}
                    </button>
                    <button onClick={() => setShowAssign(false)} className="px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-700 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks list */}
              {selectedTasks.length === 0 ? (
                <div className="rounded-xl bg-white border border-zinc-200 px-5 py-12 text-center">
                  <p className="text-sm text-zinc-400">No tasks assigned yet.</p>
                  <p className="text-xs text-zinc-300 mt-1">Use "From Templates" to quickly assign the default onboarding checklist.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-900">Tasks</h3>
                    <span className="text-xs text-zinc-400">
                      {selectedTasks.filter((t) => t.completed_at).length}/{selectedTasks.length} completed
                    </span>
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {selectedTasks.map((task) => {
                      const config = CATEGORY_CONFIG[task.category] ?? CATEGORY_CONFIG.other
                      const isOverdue = task.due_date && !task.completed_at && task.due_date < new Date().toISOString().split('T')[0]
                      return (
                        <div key={task.id} className={`px-5 py-3.5 flex items-start gap-3 ${task.completed_at ? 'opacity-60' : ''}`}>
                          <button
                            onClick={() => toggleComplete(task)}
                            className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              task.completed_at
                                ? 'border-emerald-400 bg-emerald-400'
                                : 'border-zinc-300 hover:border-zinc-900'
                            }`}
                          >
                            {task.completed_at && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${task.completed_at ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                                {config.icon} {task.title}
                              </p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {task.due_date && (
                                  <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-zinc-400'}`}>
                                    {isOverdue ? '⚠️ ' : ''}
                                    {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="text-zinc-300 hover:text-red-500 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {task.description && (
                              <p className="text-xs text-zinc-400 mt-0.5">{task.description}</p>
                            )}
                            {task.completed_at && (
                              <p className="text-xs text-emerald-600 mt-0.5">
                                Completed {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
