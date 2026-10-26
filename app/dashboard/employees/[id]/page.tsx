import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EmployeeLeaveHistory from '@/components/employees/EmployeeLeaveHistory'
import EmployeeEquipment from '@/components/employees/EmployeeEquipment'

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: viewer } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isHR = viewer?.role === 'admin' || viewer?.role === 'hr_manager'
  const isOwn = user.id === id

  // Only HR or the employee themselves can view
  if (!isHR && !isOwn) redirect('/dashboard')

  const { data: employee } = await supabase
    .from('profiles')
    .select('*, departments!profiles_department_id_fkey(id, name)')
    .eq('id', id)
    .single()

  if (!employee) notFound()

  const [
    { data: manager },
    { data: leaveRequests },
    { data: balance },
    { data: equipment },
    { data: documents },
    { data: leaveTypes },
  ] = await Promise.all([
    employee.manager_id
      ? supabase.from('profiles').select('id, full_name, job_title, avatar_url').eq('id', employee.manager_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', id)
      .eq('year', new Date().getFullYear())
      .single(),
    supabase
      .from('equipment' as any)
      .select('*')
      .eq('employee_id', id)
      .order('assigned_date', { ascending: false }),
    supabase
      .from('documents')
      .select('*')
      .eq('employee_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('leave_type_config' as any)
      .select('type, label')
      .eq('active', true),
  ])

  const dept = (employee as any).departments
  const initials = employee.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const annualRemaining = balance ? (balance as any).annual_total - (balance as any).annual_used : 0
  const sickRemaining = balance ? (balance as any).sick_total - (balance as any).sick_used : 0
  const carriedOver = (balance as any)?.annual_carried_over ?? 0

  const statusStyles: Record<string, string> = {
    active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    on_leave: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  const roleStyles: Record<string, string> = {
    admin:      'bg-zinc-900 text-white',
    hr_manager: 'bg-zinc-100 text-zinc-700',
    employee:   'bg-zinc-50 text-zinc-500 border border-zinc-200',
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/dashboard/employees" className="hover:text-zinc-700 transition-colors">
          Employees
        </Link>
        <span>/</span>
        <span className="text-zinc-700">{employee.full_name}</span>
      </div>

      {/* Profile card */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-6 py-5 flex items-start gap-5">
          {employee.avatar_url ? (
            <img src={employee.avatar_url} alt={employee.full_name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-semibold text-white">{initials}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-lg font-semibold text-zinc-900">{employee.full_name}</h1>
                <p className="text-sm text-zinc-400 mt-0.5">{employee.job_title ?? 'No title set'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[employee.status]}`}>
                  {employee.status.replace('_', ' ')}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleStyles[employee.role]}`}>
                  {employee.role.replace('_', ' ')}
                </span>
                {isHR && (
                  <Link
                    href={`/dashboard/employees/${id}/edit`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {employee.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {employee.phone}
                </span>
              )}
              {dept && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {dept.name}
                </span>
              )}
              {employee.hire_date && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Joined {new Date(employee.hire_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
              {employee.employee_id && (
                <span className="text-xs text-zinc-400 font-mono">{employee.employee_id}</span>
              )}
            </div>
          </div>
        </div>

        {/* Manager row */}
        {manager && (
          <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center gap-3">
            <span className="text-xs text-zinc-400">Reports to:</span>
            <div className="flex items-center gap-2">
              {(manager as any).avatar_url ? (
                <img src={(manager as any).avatar_url} alt={(manager as any).full_name} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center">
                  <span className="text-xs font-semibold text-zinc-600">{(manager as any).full_name?.charAt(0)}</span>
                </div>
              )}
              <span className="text-xs font-medium text-zinc-700">{(manager as any).full_name}</span>
              {(manager as any).job_title && <span className="text-xs text-zinc-400">· {(manager as any).job_title}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Leave balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Annual Leave', remaining: annualRemaining, total: (balance as any)?.annual_total ?? 20, used: (balance as any)?.annual_used ?? 0, color: 'blue' },
          { label: 'Sick Leave', remaining: sickRemaining, total: (balance as any)?.sick_total ?? 20, used: (balance as any)?.sick_used ?? 0, color: 'red' },
        ].map((b) => (
          <div key={b.label} className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{b.label}</p>
            <p className="text-2xl font-semibold text-zinc-900 tabular-nums mt-1">
              {b.remaining}<span className="text-sm text-zinc-400 font-normal"> / {b.total}d</span>
            </p>
            <div className="mt-2 bg-zinc-100 rounded-full h-1.5">
              <div
                className="bg-zinc-900 h-1.5 rounded-full"
                style={{ width: `${b.total > 0 ? Math.round((b.used / b.total) * 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">{b.used}d used</p>
          </div>
        ))}
        {carriedOver > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Carried Over</p>
            <p className="text-2xl font-semibold text-zinc-900 tabular-nums mt-1">
              {carriedOver}<span className="text-sm text-zinc-400 font-normal">d</span>
            </p>
            <p className="text-xs text-amber-600 mt-2">
              Expires {new Date().getFullYear()}-06-30
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal details */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Personal Information</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {[
              { label: 'Employee ID',    value: employee.employee_id ?? '—' },
              { label: 'First Name',     value: (employee as any).first_name ?? '—' },
              { label: 'Last Name',      value: (employee as any).last_name ?? '—' },
              { label: 'Full Name',      value: employee.full_name },
              { label: 'Work Email',     value: employee.email },
              { label: 'Personal Email', value: (employee as any).personal_email ?? '—' },
              { label: 'Personal Phone', value: employee.phone ?? '—' },
              { label: 'Date of Birth',  value: (employee as any).date_of_birth ? new Date((employee as any).date_of_birth).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Gender',         value: (employee as any).gender ?? '—' },
              { label: 'Nationality',    value: (employee as any).nationality ?? '—' },
              { label: 'Languages',      value: (employee as any).languages?.join(', ') || '—' },
            ].map((row) => (
              <div key={row.label} className="px-5 py-2.5 flex items-center justify-between gap-4">
                <span className="text-xs text-zinc-400 flex-shrink-0">{row.label}</span>
                <span className="text-xs font-medium text-zinc-700 capitalize text-right truncate">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Home Address */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Home Address</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {[
              { label: 'Street',       value: (employee as any).street ?? '—' },
              { label: 'City',         value: (employee as any).city ?? '—' },
              { label: 'State/Region', value: (employee as any).state_region ?? '—' },
              { label: 'Postal Code',  value: (employee as any).postal_code ?? '—' },
              { label: 'Country',      value: (employee as any).country ?? '—' },
            ].map((row) => (
              <div key={row.label} className="px-5 py-2.5 flex items-center justify-between gap-4">
                <span className="text-xs text-zinc-400 flex-shrink-0">{row.label}</span>
                <span className="text-xs font-medium text-zinc-700 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employment Information */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Employment Information</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {[
              { label: 'Status',         value: employee.status.replace(/_/g, ' ') },
              { label: 'Employee Type',  value: ((employee as any).contract_type ?? '—').replace(/_/g, ' ') },
              { label: 'Job Title',      value: employee.job_title ?? '—' },
              { label: 'Department',     value: dept?.name ?? '—' },
              { label: 'Manager',        value: (employee as any).manager?.full_name ?? '—' },
              { label: 'Office',         value: ((employee as any).office ?? '—').replace(/_/g, ' ') },
              { label: 'Work Arrangement', value: ((employee as any).work_arrangement ?? '—').replace(/_/g, ' ') },
              { label: 'Employee ID',    value: employee.employee_id ?? '—' },
              { label: 'Work Schedule',  value: (employee as any).work_schedule ?? '—' },
              { label: 'Time Zone',      value: (employee as any).timezone ?? '—' },
            ].map((row) => (
              <div key={row.label} className="px-5 py-2.5 flex items-center justify-between">
                <span className="text-xs text-zinc-400">{row.label}</span>
                <span className="text-xs font-medium text-zinc-700 capitalize">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Dates */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Key Dates</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {[
              { label: 'Start Date',          value: employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Contract End Date',   value: (employee as any).contract_end_date ? new Date((employee as any).contract_end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Probation Start',     value: (employee as any).probation_start_date ? new Date((employee as any).probation_start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Probation End',       value: (employee as any).probation_end_date ? new Date((employee as any).probation_end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Probation Status',    value: ((employee as any).probation_status ?? '—').replace(/_/g, ' ') },
              { label: 'Performance Review',  value: (employee as any).performance_evaluation_date ? new Date((employee as any).performance_evaluation_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            ].map((row) => (
              <div key={row.label} className="px-5 py-2.5 flex items-center justify-between">
                <span className="text-xs text-zinc-400">{row.label}</span>
                <span className="text-xs font-medium text-zinc-700 capitalize">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Account */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Bank Account</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            <div className="px-5 py-2.5 flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-400 flex-shrink-0">Health Insurance</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                (employee as any).health_insurance
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-zinc-100 text-zinc-500 border-zinc-200'
              }`}>
                {(employee as any).health_insurance ? 'Active' : 'Not Active'}
              </span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-400 flex-shrink-0">Bank Name</span>
              <span className="text-xs font-medium text-zinc-700">{(employee as any).bank_name ?? '—'}</span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-400 flex-shrink-0">Account Number</span>
              <span className="text-xs font-mono text-zinc-700">{(employee as any).bank_account_number ?? '—'}</span>
            </div>
            <div className="px-5 py-2.5 flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-400 flex-shrink-0">IBAN</span>
              <span className="text-xs font-mono text-zinc-700">{(employee as any).iban ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Emergency Contact</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {[
              { label: 'Name',         value: (employee as any).emergency_contact_name ?? '—' },
              { label: 'Relationship', value: (employee as any).emergency_contact_relation ?? '—' },
              { label: 'Phone',        value: (employee as any).emergency_contact_phone ?? '—' },
              { label: 'Email',        value: (employee as any).emergency_contact_email ?? '—' },
            ].map((row) => (
              <div key={row.label} className="px-5 py-2.5 flex items-center justify-between gap-4">
                <span className="text-xs text-zinc-400 flex-shrink-0">{row.label}</span>
                <span className="text-xs font-medium text-zinc-700 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden lg:col-span-2">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Documents</h2>
          </div>
          {(documents ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">No documents uploaded.</div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {documents?.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="w-8 h-8 bg-white rounded-lg border border-zinc-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 truncate">{doc.name}</p>
                    <p className="text-xs text-zinc-400 capitalize">{doc.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Equipment */}
      <EmployeeEquipment
        equipment={(equipment as any) ?? []}
        employeeId={id}
        canManage={isHR}
      />

      {/* Leave history */}
      <EmployeeLeaveHistory
        requests={leaveRequests ?? []}
        leaveTypes={(leaveTypes as any[]) ?? []}
        isHR={isHR}
      />
    </div>
  )
}
