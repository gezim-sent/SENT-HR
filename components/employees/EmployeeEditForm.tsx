'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  employee: {
    id: string
    full_name: string
    email: string
    phone: string | null
    job_title: string | null
    role: string
    department_id: string | null
    manager_id: string | null
    hire_date: string | null
    employee_id: string | null
    status: string
    gender?: string | null
    date_of_birth?: string | null
    personal_email?: string | null
    address?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
    emergency_contact_relation?: string | null
    emergency_contact_email?: string | null
    iban?: string | null
    contract_type?: string | null
    office?: string | null
    work_arrangement?: string | null
    probation_start_date?: string | null
    probation_end_date?: string | null
    probation_status?: string | null
    contract_end_date?: string | null
    work_schedule?: string | null
    timezone?: string | null
    performance_evaluation_date?: string | null
    health_insurance?: boolean | null
    first_name?: string | null
    last_name?: string | null
    street?: string | null
    city?: string | null
    state_region?: string | null
    postal_code?: string | null
    country?: string | null
    nationality?: string | null
    languages?: string[] | null
    bank_account_number?: string | null
    bank_name?: string | null
  }
  departments: { id: string; name: string }[]
  managers: { id: string; full_name: string; job_title: string | null }[]
  isAdmin: boolean
}

export default function EmployeeEditForm({ employee, departments, managers, isAdmin }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    // Personal
    first_name:                 employee.first_name ?? '',
    last_name:                  employee.last_name ?? '',
    full_name:                  employee.full_name,
    phone:                      employee.phone ?? '',
    personal_email:             employee.personal_email ?? '',
    date_of_birth:              employee.date_of_birth ?? '',
    gender:                     employee.gender ?? '',
    nationality:                employee.nationality ?? '',
    languages:                  (employee.languages ?? []).join(', '),
    // Address
    street:                     employee.street ?? '',
    city:                       employee.city ?? '',
    state_region:               employee.state_region ?? '',
    postal_code:                employee.postal_code ?? '',
    country:                    employee.country ?? '',
    // Emergency
    emergency_contact_name:     employee.emergency_contact_name ?? '',
    emergency_contact_phone:    employee.emergency_contact_phone ?? '',
    emergency_contact_relation: employee.emergency_contact_relation ?? '',
    emergency_contact_email:    employee.emergency_contact_email ?? '',
    // Financial
    iban:                       employee.iban ?? '',
    bank_account_number:        employee.bank_account_number ?? '',
    bank_name:                  employee.bank_name ?? '',
    // Employment
    employee_id:                employee.employee_id ?? '',
    job_title:                  employee.job_title ?? '',
    role:                       employee.role,
    status:                     employee.status,
    contract_type:              employee.contract_type ?? 'full_time',
    department_id:              employee.department_id ?? '',
    manager_id:                 employee.manager_id ?? '',
    office:                     employee.office ?? '',
    work_arrangement:           employee.work_arrangement ?? '',
    hire_date:                  employee.hire_date ?? '',
    probation_start_date:       employee.probation_start_date ?? '',
    probation_end_date:         employee.probation_end_date ?? '',
    probation_status:           employee.probation_status ?? '',
    contract_end_date:          employee.contract_end_date ?? '',
    work_schedule:              employee.work_schedule ?? '',
    timezone:                   employee.timezone ?? '',
    performance_evaluation_date: employee.performance_evaluation_date ?? '',
    health_insurance:           employee.health_insurance ? 'true' : 'false',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.full_name) { setError('Full name is required.'); return }
    setLoading(true); setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name:                 form.first_name || null,
        last_name:                  form.last_name || null,
        full_name:                  form.full_name,
        phone:                      form.phone || null,
        personal_email:             form.personal_email || null,
        date_of_birth:              form.date_of_birth || null,
        gender:                     form.gender || null,
        nationality:                form.nationality || null,
        languages:                  form.languages ? form.languages.split(',').map((l: string) => l.trim()).filter(Boolean) : [],
        street:                     form.street || null,
        city:                       form.city || null,
        state_region:               form.state_region || null,
        postal_code:                form.postal_code || null,
        country:                    form.country || null,
        emergency_contact_name:     form.emergency_contact_name || null,
        emergency_contact_phone:    form.emergency_contact_phone || null,
        emergency_contact_relation: form.emergency_contact_relation || null,
        emergency_contact_email:    form.emergency_contact_email || null,
        iban:                       form.iban || null,
        bank_account_number:        form.bank_account_number || null,
        bank_name:                  form.bank_name || null,
        employee_id:                form.employee_id || null,
        job_title:                  form.job_title || null,
        role:                       form.role as any,
        status:                     form.status as any,
        contract_type:              form.contract_type || null,
        department_id:              form.department_id || null,
        manager_id:                 form.manager_id || null,
        office:                     form.office || null,
        work_arrangement:           form.work_arrangement || null,
        hire_date:                  form.hire_date || null,
        probation_start_date:       form.probation_start_date || null,
        probation_end_date:         form.probation_end_date || null,
        probation_status:           form.probation_status || null,
        contract_end_date:          form.contract_end_date || null,
        work_schedule:              form.work_schedule || null,
        timezone:                   form.timezone || null,
        performance_evaluation_date: form.performance_evaluation_date || null,
        health_insurance:           form.health_insurance === 'true',
      } as any)
      .eq('id', employee.id)

    setLoading(false)
    if (updateError) { setError(updateError.message); return }
    setSuccess(true)
    router.refresh()
    setTimeout(() => router.push(`/dashboard/employees/${employee.id}`), 1000)
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm text-zinc-900 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-300'
  const labelClass = 'block text-xs font-medium text-zinc-600 mb-1'

  return (
    <div className="space-y-6">
      {success && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved! Redirecting…
        </div>
      )}
      {error && <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

      {/* ── Personal Information ────────────────────────────── */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Personal Information</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Core identity and contact information</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>First Name</label>
            <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="Sara" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Johnson" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Full Name *</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Work Email</label>
            <input value={employee.email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
            <p className="text-xs text-zinc-400 mt-1">Cannot be changed here</p>
          </div>
          <div>
            <label className={labelClass}>Personal Email</label>
            <input name="personal_email" value={form.personal_email} onChange={handleChange} placeholder="personal@gmail.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Personal Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="+383 44 123 456" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Nationality / Citizenship</label>
            <input name="nationality" value={form.nationality} onChange={handleChange} placeholder="e.g. Kosovo" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Language Skills</label>
            <input name="languages" value={form.languages} onChange={handleChange} placeholder="e.g. Albanian, English, Serbian (comma separated)" className={inputClass} />
            <p className="text-xs text-zinc-400 mt-1">Separate languages with commas</p>
          </div>
        </div>
      </div>

      {/* ── Home Address ────────────────────────────────────── */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Home Address</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Street</label>
            <input name="street" value={form.street} onChange={handleChange} placeholder="Rruga e Dibrës 12" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input name="city" value={form.city} onChange={handleChange} placeholder="Prishtinë" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>State / Region</label>
            <input name="state_region" value={form.state_region} onChange={handleChange} placeholder="e.g. Prishtinë" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Postal Code</label>
            <input name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="10000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <input name="country" value={form.country} onChange={handleChange} placeholder="Kosovo" className={inputClass} />
          </div>
        </div>
      </div>

      {/* ── Employment Information ──────────────────────────── */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Employment Information</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Employment Status</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="probation">Probation</option>
              <option value="on_leave">On Leave</option>
              <option value="notice_period">Notice Period</option>
              <option value="terminated">Terminated</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Employee Type</label>
            <select name="contract_type" value={form.contract_type} onChange={handleChange} className={inputClass}>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contractor">Contractor</option>
              <option value="intern">Intern</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Job Title</label>
            <input name="job_title" value={form.job_title} onChange={handleChange} placeholder="e.g. Software Engineer" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Employee ID</label>
            <input name="employee_id" value={form.employee_id} onChange={handleChange} placeholder="EMP-0001" className={inputClass} />
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
              {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}{m.job_title ? ` · ${m.job_title}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Office</label>
            <select name="office" value={form.office} onChange={handleChange} className={inputClass}>
              <option value="">Not assigned</option>
              <option value="ks_office">KS Office</option>
              <option value="us_office">US Office</option>
              <option value="remote">Remote</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Work Arrangement</label>
            <select name="work_arrangement" value={form.work_arrangement} onChange={handleChange} className={inputClass}>
              <option value="">Not specified</option>
              <option value="on_site">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </div>
          {isAdmin && (
            <div>
              <label className={labelClass}>Platform Role</label>
              <select name="role" value={form.role} onChange={handleChange} className={inputClass}>
                <option value="employee">Employee</option>
                <option value="hr_manager">HR Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Standard Work Schedule</label>
            <input name="work_schedule" value={form.work_schedule} onChange={handleChange} placeholder="e.g. Mon–Fri 09:00–17:00" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Time Zone</label>
            <input name="timezone" value={form.timezone} onChange={handleChange} placeholder="e.g. Europe/Pristina" className={inputClass} />
          </div>
        </div>
      </div>

      {/* ── Dates ──────────────────────────────────────────── */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Key Dates</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Date</label>
            <input name="hire_date" type="date" value={form.hire_date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Contract End Date</label>
            <input name="contract_end_date" type="date" value={form.contract_end_date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Probation Start Date</label>
            <input name="probation_start_date" type="date" value={form.probation_start_date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Probation End Date</label>
            <input name="probation_end_date" type="date" value={form.probation_end_date} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Probation Status</label>
            <select name="probation_status" value={form.probation_status} onChange={handleChange} className={inputClass}>
              <option value="">N/A</option>
              <option value="ongoing">Ongoing</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="extended">Extended</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Performance Evaluation Date</label>
            <input name="performance_evaluation_date" type="date" value={form.performance_evaluation_date} onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      {/* ── Benefits ───────────────────────────────────────── */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Benefits</h2>
        </div>
        <div className="p-5">
          <label className={labelClass}>Health Insurance</label>
          <div className="flex items-center gap-4 mt-1">
            {['true', 'false'].map((v) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="health_insurance"
                  value={v}
                  checked={form.health_insurance === v}
                  onChange={handleChange}
                  className="accent-zinc-900"
                />
                <span className="text-sm text-zinc-700">{v === 'true' ? 'Active' : 'Not Active'}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Financial ──────────────────────────────────────── */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Bank Account Information</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Bank Name</label>
            <input name="bank_name" value={form.bank_name} onChange={handleChange} placeholder="e.g. ProCredit Bank" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Account Number</label>
            <input name="bank_account_number" value={form.bank_account_number} onChange={handleChange} placeholder="e.g. 1234567890" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>IBAN</label>
            <input name="iban" value={form.iban} onChange={handleChange} placeholder="XK05 0000 0000 0000 0000" className={inputClass} />
          </div>
        </div>
      </div>

      {/* ── Emergency Contact ───────────────────────────────── */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Emergency Contact</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} placeholder="e.g. John Johnson" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Relationship</label>
            <input name="emergency_contact_relation" value={form.emergency_contact_relation} onChange={handleChange} placeholder="e.g. Spouse, Parent" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} placeholder="+383 44 123 456" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input name="emergency_contact_email" value={form.emergency_contact_email} onChange={handleChange} placeholder="contact@email.com" className={inputClass} />
          </div>
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <a href={`/dashboard/employees/${employee.id}`} className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
          Cancel
        </a>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
