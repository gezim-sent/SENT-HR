'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  departments: { id: string; name: string }[]
  managers: { id: string; full_name: string; job_title: string | null }[]
}

function generatePassword(): string {
  return 'Sent123!'
}

export default function NewEmployeeForm({ departments, managers }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdEmployee, setCreatedEmployee] = useState<{
    name: string
    email: string
    password: string
    id: string
  } | null>(null)

  const [form, setForm] = useState({
    username: '',       // only the part before @sent.dm
    full_name: '',
    job_title: '',
    role: 'employee' as 'admin' | 'hr_manager' | 'employee',
    department_id: '',
    manager_id: '',
    hire_date: new Date().toISOString().split('T')[0],
    phone: '',
    employee_id: '',
    gender: '',
    date_of_birth: '',
    personal_email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    iban: '',
    contract_type: 'full_time',
    annual_days: '20',
    sick_days: '20',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.full_name || !form.username) {
      setError('Full name and email are required.')
      return
    }

    // Enforce @sent.dm
    const username = form.username.replace('@sent.dm', '').replace(/\s/g, '').toLowerCase()
    if (!username) {
      setError('Please enter a valid email username.')
      return
    }
    const email = `${username}@sent.dm`

    const tempPassword = generatePassword()

    setLoading(true)
    setError(null)

    const res = await fetch('/api/employees/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: tempPassword,
        full_name: form.full_name,
        job_title: form.job_title || null,
        role: form.role,
        department_id: form.department_id || null,
        manager_id: form.manager_id || null,
        hire_date: form.hire_date || null,
        phone: form.phone || null,
        employee_id: form.employee_id || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        personal_email: form.personal_email || null,
        address: form.address || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        emergency_contact_relation: form.emergency_contact_relation || null,
        iban: form.iban || null,
        contract_type: form.contract_type || 'full_time',
        annual_days: parseInt(form.annual_days) || 20,
        sick_days: parseInt(form.sick_days) || 20,
        status: 'active',
        must_change_password: true,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to create employee.')
      return
    }

    // Show credentials to HR
    setCreatedEmployee({
      name: form.full_name,
      email,
      password: tempPassword,
      id: data.id,
    })
  }

  function handleDone() {
    router.push(`/dashboard/employees/${createdEmployee?.id}`)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl text-sm text-zinc-900 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-300'
  const labelClass = 'block text-xs font-medium text-zinc-600 mb-1.5'

  if (createdEmployee) {
    return (
      <div className="space-y-6 max-w-lg">
        {/* Success banner */}
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">Account created for {createdEmployee.name}!</p>
            <p className="text-xs text-emerald-700 mt-0.5">They can now log in and will be asked to set a new password.</p>
          </div>
        </div>

        {/* Credentials to share */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50">
            <h2 className="text-sm font-semibold text-zinc-900">Share these login details</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Tell the employee to log in and change their password immediately.</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-1.5">Email</p>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-sm font-mono text-zinc-900">{createdEmployee.email}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(createdEmployee.email)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-400 mb-1.5">Temporary Password</p>
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-sm font-mono text-zinc-900">Sent123!</span>
                <button
                  onClick={() => navigator.clipboard.writeText('Sent123!')}
                  className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-800">
                When {createdEmployee.name} first logs in they will be automatically prompted to change their password before accessing the platform.
              </p>
            </div>

            {/* Copy all */}
            <button
              onClick={() => navigator.clipboard.writeText(
                `Your Sent People HR account is ready!\n\nEmail: ${createdEmployee.email}\nPassword: Sent123!\n\nLog in at: ${window.location.origin}/auth/login\n\nYou will be asked to change your password on first login.`
              )}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy as Message
            </button>
          </div>
        </div>

        <button
          onClick={handleDone}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
        >
          View Employee Profile →
        </button>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Add New Employee</h1>
        <p className="text-sm mt-0.5 text-zinc-400">Create a Sent People account for a new team member.</p>
      </div>

      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">Personal Information</h2>
        </div>
        <div className="p-6 space-y-5">
          {error && (
            <div className="px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5C2.3 17.333 3.262 19 4.8 19z" />
              </svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full name */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Name *</label>
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="e.g. Sara Johnson"
                className={inputClass}
              />
            </div>

            {/* Email — locked to @sent.dm */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Work Email *</label>
              <div className="flex items-center rounded-xl border border-zinc-200 bg-white focus-within:ring-2 focus-within:ring-zinc-900 overflow-hidden">
                <input
                  name="username"
                  value={form.username}
                  onChange={(e) => {
                    const val = e.target.value.replace('@sent.dm', '').replace(/\s/g, '').toLowerCase()
                    setForm((p) => ({ ...p, username: val }))
                  }}
                  placeholder="e.g. sara.johnson"
                  className="flex-1 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none placeholder:text-zinc-300 bg-transparent"
                />
                <div className="px-3 py-2.5 bg-zinc-50 border-l border-zinc-200 text-sm text-zinc-500 font-medium select-none whitespace-nowrap">
                  @sent.dm
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Only @sent.dm accounts are allowed on this platform.</p>
            </div>

            {/* Phone */}
            <div>
              <label className={labelClass}>Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+383 44 123 456"
                className={inputClass}
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className={labelClass}>Employee ID</label>
              <input
                name="employee_id"
                value={form.employee_id}
                onChange={handleChange}
                placeholder="e.g. EMP-0042"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Job details */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">Job Details</h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={labelClass}>Job Title</label>
              <input
                name="job_title"
                value={form.job_title}
                onChange={handleChange}
                placeholder="e.g. Software Engineer"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
                <option value="">Not specified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
              <p className="text-xs text-zinc-400 mt-1">Determines maternity or paternity leave entitlement.</p>
            </div>
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                name="hire_date"
                type="date"
                value={form.hire_date}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contract Type</label>
              <select name="contract_type" value={form.contract_type} onChange={handleChange} className={inputClass}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contractor">Contractor</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <select name="role" value={form.role} onChange={handleChange} className={inputClass}>
                <option value="employee">Employee</option>
                <option value="hr_manager">HR Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <select name="department_id" value={form.department_id} onChange={handleChange} className={inputClass}>
                <option value="">No department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Manager</label>
              <select name="manager_id" value={form.manager_id} onChange={handleChange} className={inputClass}>
                <option value="">No manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}{m.job_title ? ` · ${m.job_title}` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Allocation */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">Leave Allocation — {new Date(form.hire_date).getFullYear()}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Set the number of leave days for this employee's first year.</p>
        </div>
        <div className="p-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Annual Leave Days</label>
              <input
                name="annual_days"
                type="number"
                min="0"
                max="365"
                value={form.annual_days}
                onChange={handleChange}
                className={inputClass}
              />
              <p className="text-xs text-zinc-400 mt-1">Standard: 20 days/year</p>
            </div>
            <div>
              <label className={labelClass}>Sick Leave Days</label>
              <input
                name="sick_days"
                type="number"
                min="0"
                max="365"
                value={form.sick_days}
                onChange={handleChange}
                className={inputClass}
              />
              <p className="text-xs text-zinc-400 mt-1">Standard: 20 days/year</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal details */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">Personal Details</h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Personal Email</label>
              <input name="personal_email" value={form.personal_email} onChange={handleChange} placeholder="personal@gmail.com" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Address</label>
              <input name="address" value={form.address} onChange={handleChange} placeholder="Prishtinë, Kosovo" className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Financial */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">Financial</h2>
        </div>
        <div className="p-6">
          <label className={labelClass}>IBAN</label>
          <input name="iban" value={form.iban} onChange={handleChange} placeholder="XK05 0000 0000 0000 0000" className={inputClass} />
          <p className="text-xs text-zinc-400 mt-1">Used for payroll processing.</p>
        </div>
      </div>

      {/* Emergency contact */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">Emergency Contact</h2>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Name</label>
              <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} placeholder="e.g. John Johnson" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Relationship</label>
              <input name="emergency_contact_relation" value={form.emergency_contact_relation} onChange={handleChange} placeholder="e.g. Spouse, Parent, Sibling" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} placeholder="+383 44 123 456" className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-50 border border-blue-200">
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-xs text-blue-800">
          <p className="font-medium">Default password is <span className="font-mono">Sent123!</span></p>
          <p className="mt-0.5">Tell the employee to log in with this password. They will be asked to change it before accessing the platform.</p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <a href="/dashboard/employees" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          Cancel
        </a>
        <button
          onClick={handleSubmit}
          disabled={loading || !form.full_name || !form.username}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating account…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create Employee Account
            </>
          )}
        </button>
      </div>
    </div>
  )
}
