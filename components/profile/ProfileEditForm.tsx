'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  profile: {
    id: string
    full_name: string
    job_title: string | null
    phone: string | null
    department_id: string | null
    manager_id: string | null
    hire_date: string | null
    employee_id: string | null
  }
  departments: { id: string; name: string }[]
  managers: { id: string; full_name: string; job_title: string | null }[]
}

export default function ProfileEditForm({ profile, departments, managers }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: profile.full_name,
    job_title: profile.job_title ?? '',
    phone: profile.phone ?? '',
    department_id: profile.department_id ?? '',
    manager_id: profile.manager_id ?? '',
    hire_date: profile.hire_date ?? '',
    employee_id: profile.employee_id ?? '',
  })

  const router = useRouter()
  const supabase = createClient()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSave() {
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        job_title: form.job_title || null,
        phone: form.phone || null,
        department_id: form.department_id || null,
        manager_id: form.manager_id || null,
        hire_date: form.hire_date || null,
        employee_id: form.employee_id || null,
      })
      .eq('id', profile.id)

    setLoading(false)

    if (error) { setError(error.message); return }

    setSuccess(true)
    setOpen(false)
    router.refresh()
    setTimeout(() => setSuccess(false), 3000)
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-zinc-900 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
  const labelClass = "block text-xs font-medium text-zinc-600 mb-1"

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-900">Edit Profile</h3>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          {open ? 'Cancel' : 'Edit →'}
        </button>
      </div>

      {success && (
        <div className="mx-5 mt-4 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Profile updated successfully.
        </div>
      )}

      {open && (
        <div className="p-5 space-y-4">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Job Title</label>
              <input name="job_title" value={form.job_title} onChange={handleChange} placeholder="e.g. Software Engineer" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 890" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Employee ID</label>
              <input name="employee_id" value={form.employee_id} onChange={handleChange} placeholder="e.g. EMP-0042" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Start Date</label>
              <input name="hire_date" type="date" value={form.hire_date} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <select name="department_id" value={form.department_id} onChange={handleChange} className={inputClass}>
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Manager</label>
              <select name="manager_id" value={form.manager_id} onChange={handleChange} className={inputClass}>
                <option value="">No manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name} · {m.job_title ?? 'No title'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
