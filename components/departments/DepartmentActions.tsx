'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Department } from '@/types/database.types'

type Props = {
  employees: Pick<Profile, 'id' | 'full_name' | 'job_title' | 'role' | 'department_id'>[]
  departments: (Pick<Department, 'id' | 'name' | 'description'> & { head_id?: string | null })[]
}

type Modal = 'assign' | 'create' | 'edit' | null

export default function DepartmentActions({ employees, departments }: Props) {
  const [modal, setModal] = useState<Modal>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Assign employee
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedRole, setSelectedRole] = useState<'admin' | 'hr_manager' | 'employee'>('employee')
  const [selectedManager, setSelectedManager] = useState('')

  // Create department
  const [deptName, setDeptName] = useState('')
  const [deptDesc, setDeptDesc] = useState('')
  const [deptHead, setDeptHead] = useState('')

  // Edit department
  const [editDeptId, setEditDeptId] = useState('')
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editHead, setEditHead] = useState('')

  const router = useRouter()
  const supabase = createClient()

  function openEdit(dept: Props['departments'][0]) {
    setEditDeptId(dept.id)
    setEditName(dept.name)
    setEditDesc(dept.description ?? '')
    setEditHead(dept.head_id ?? '')
    setError(null)
    setModal('edit')
  }

  async function handleAssign() {
    if (!selectedEmployee || !selectedDept) { setError('Please select an employee and department.'); return }
    setLoading(true); setError(null)
    const updates: Record<string, string> = { department_id: selectedDept, role: selectedRole }
    if (selectedManager) updates.manager_id = selectedManager
    const { error } = await supabase.from('profiles').update(updates).eq('id', selectedEmployee)
    setLoading(false)
    if (error) { setError(error.message); return }
    setModal(null); setSelectedEmployee(''); setSelectedDept(''); setSelectedRole('employee'); setSelectedManager('')
    router.refresh()
  }

  async function handleCreateDept() {
    if (!deptName) { setError('Department name is required.'); return }
    setLoading(true); setError(null)
    const insert: Record<string, string> = { name: deptName }
    if (deptDesc) insert.description = deptDesc
    if (deptHead) insert.head_id = deptHead
    const { error } = await supabase.from('departments').insert(insert)
    setLoading(false)
    if (error) { setError(error.message); return }
    setModal(null); setDeptName(''); setDeptDesc(''); setDeptHead('')
    router.refresh()
  }

  async function handleEditDept() {
    if (!editName) { setError('Department name is required.'); return }
    setLoading(true); setError(null)
    const { error } = await supabase
      .from('departments')
      .update({
        name: editName,
        description: editDesc || null,
        head_id: editHead || null,
      } as any)
      .eq('id', editDeptId)
    setLoading(false)
    if (error) { setError(error.message); return }
    setModal(null)
    router.refresh()
  }

  async function handleDeleteDept(deptId: string, deptName: string) {
    if (!confirm(`Delete "${deptName}"? Employees in this department will become unassigned.`)) return
    await supabase.from('profiles').update({ department_id: null } as any).eq('department_id', deptId)
    await supabase.from('departments').delete().eq('id', deptId)
    router.refresh()
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-zinc-900 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
  const labelClass = "block text-xs font-medium text-zinc-600 mb-1"

  return (
    <>
      {/* Trigger buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setModal('assign'); setError(null) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Assign Employee
        </button>
        <button
          onClick={() => { setModal('create'); setError(null) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Department
        </button>

        {/* Per-department edit buttons rendered inline next to each dept */}
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => openEdit(dept)}
            data-dept-edit={dept.id}
            className="hidden"
          />
        ))}
      </div>

      {/* Edit buttons exposed via window for dept cards to call */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__editDept = function(id) {
              document.querySelector('[data-dept-edit="' + id + '"]')?.click();
            };
            window.__deleteDept = function(id, name) {
              if (confirm('Delete "' + name + '"? Employees will become unassigned.')) {
                fetch('/api/departments/' + id, { method: 'DELETE' });
              }
            };
          `,
        }}
      />

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

            {/* Assign employee */}
            {modal === 'assign' && (
              <>
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Assign Employee to Department</h2>
                  <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>}
                  <div>
                    <label className={labelClass}>Employee *</label>
                    <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className={inputClass}>
                      <option value="">Select employee…</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} · {e.job_title ?? 'No title'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Department *</label>
                    <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className={inputClass}>
                      <option value="">Select department…</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Role</label>
                    <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as any)} className={inputClass}>
                      <option value="employee">Employee</option>
                      <option value="hr_manager">HR Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Manager (optional)</label>
                    <select value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)} className={inputClass}>
                      <option value="">No manager</option>
                      {employees.filter((e) => e.id !== selectedEmployee).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Cancel</button>
                  <button onClick={handleAssign} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50">
                    {loading ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}

            {/* Create department */}
            {modal === 'create' && (
              <>
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Create New Department</h2>
                  <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>}
                  <div>
                    <label className={labelClass}>Department name *</label>
                    <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Engineering" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <input type="text" value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} placeholder="e.g. Product engineering and infrastructure" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Department Head</label>
                    <select value={deptHead} onChange={(e) => setDeptHead(e.target.value)} className={inputClass}>
                      <option value="">Select head…</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} · {e.job_title ?? 'No title'}</option>)}
                    </select>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Cancel</button>
                  <button onClick={handleCreateDept} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50">
                    {loading ? 'Creating…' : 'Create Department'}
                  </button>
                </div>
              </>
            )}

            {/* Edit department */}
            {modal === 'edit' && (
              <>
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Edit Department</h2>
                  <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>}
                  <div>
                    <label className={labelClass}>Department name *</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Optional description" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Department Head</label>
                    <select value={editHead} onChange={(e) => setEditHead(e.target.value)} className={inputClass}>
                      <option value="">No head assigned</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.full_name} · {e.job_title ?? 'No title'}</option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-400 mt-1">The department head appears highlighted on the department card.</p>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between">
                  <button
                    onClick={() => handleDeleteDept(editDeptId, editName)}
                    className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                  >
                    Delete department
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Cancel</button>
                    <button onClick={handleEditDept} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50">
                      {loading ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  )
}
