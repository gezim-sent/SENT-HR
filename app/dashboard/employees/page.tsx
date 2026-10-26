import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ExportCSVButton from '@/components/employees/ExportCSVButton'

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; role?: string; status?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'hr_manager')) {
    redirect('/dashboard')
  }

  // Fetch employees + departments in parallel
  const [{ data: allEmployees, error: empError }, { data: departments }] = await Promise.all([
    supabase
      .from('profiles')
      .select(`
        id, full_name, email, phone, job_title, role, status,
        department_id, manager_id, hire_date, employee_id, avatar_url,
        departments:departments!profiles_department_id_fkey(id, name)
      `)
      .order('full_name'),
    supabase
      .from('departments')
      .select('id, name')
      .order('name'),
  ])

  if (empError) console.error('[employees page]', empError.message)

  // Filter client-side based on search params
  let employees = allEmployees ?? []

  if (params.q) {
    const q = params.q.toLowerCase()
    employees = employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.job_title ?? '').toLowerCase().includes(q)
    )
  }
  if (params.dept) {
    employees = employees.filter((e) => e.department_id === params.dept)
  }
  if (params.role) {
    employees = employees.filter((e) => e.role === params.role)
  }
  if (params.status) {
    employees = employees.filter((e) => e.status === params.status)
  }

  // Stats
  const total       = allEmployees?.length ?? 0
  const active      = allEmployees?.filter((e) => e.status === 'active').length ?? 0
  const onLeave     = allEmployees?.filter((e) => e.status === 'on_leave').length ?? 0
  const onboarding  = allEmployees?.filter((e) => e.status === 'onboarding').length ?? 0
  const terminated  = allEmployees?.filter((e) => e.status === 'terminated').length ?? 0

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Employees</h1>
          <p className="text-sm mt-0.5 text-zinc-400">{total} people in your organization</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCSVButton employees={employees as any} />
          {profile.role === 'admin' && (
            <Link
              href="/dashboard/employees/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Employee
            </Link>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',       value: total,      color: 'text-zinc-900' },
          { label: 'Active',      value: active,     color: 'text-emerald-600' },
          { label: 'On Leave',    value: onLeave,    color: 'text-amber-600' },
          { label: 'Onboarding',  value: onboarding, color: 'text-blue-600' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className={`text-2xl font-semibold tabular-nums ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search name, email, title…"
          className="px-3.5 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 w-56"
        />
        <select
          name="dept"
          defaultValue={params.dept}
          className="px-3.5 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">All departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          name="role"
          defaultValue={params.role}
          className="px-3.5 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="hr_manager">HR Manager</option>
          <option value="employee">Employee</option>
        </select>
        <select
          name="status"
          defaultValue={params.status}
          className="px-3.5 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="probation">Probation</option>
          <option value="on_leave">On Leave</option>
          <option value="notice_period">Notice Period</option>
          <option value="terminated">Terminated</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          Filter
        </button>
        {(params.q || params.dept || params.role || params.status) && (
          <a
            href="/dashboard/employees"
            className="px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-500 text-sm hover:bg-zinc-50 transition-colors"
          >
            Clear
          </a>
        )}
      </form>

      {/* Employee grid */}
      {employees.length === 0 ? (
        <div className="rounded-xl bg-white border border-zinc-200 px-5 py-16 text-center">
          <p className="text-sm text-zinc-400">No employees found.</p>
          {(params.q || params.dept || params.role || params.status) && (
            <a href="/dashboard/employees" className="inline-block mt-2 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
              Clear filters →
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const dept = (emp as any).departments
            const initials = emp.full_name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            const statusStyles: Record<string, string> = {
              active:        'bg-emerald-50 text-emerald-700 border-emerald-200',
              onboarding:    'bg-blue-50 text-blue-700 border-blue-200',
              probation:     'bg-purple-50 text-purple-700 border-purple-200',
              on_leave:      'bg-amber-50 text-amber-700 border-amber-200',
              notice_period: 'bg-orange-50 text-orange-700 border-orange-200',
              terminated:    'bg-red-50 text-red-700 border-red-200',
              inactive:      'bg-zinc-100 text-zinc-500 border-zinc-200',
            }

            const roleStyles: Record<string, string> = {
              admin:      'bg-zinc-900 text-white',
              hr_manager: 'bg-zinc-100 text-zinc-600',
              employee:   'bg-zinc-50 text-zinc-400',
            }

            return (
              <Link
                key={emp.id}
                href={`/dashboard/employees/${emp.id}`}
                className="group rounded-xl bg-white border border-zinc-200 p-5 hover:border-zinc-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {emp.avatar_url ? (
                    <img
                      src={emp.avatar_url}
                      alt={emp.full_name}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-white">{initials}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{emp.full_name}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{emp.job_title ?? 'No title'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${statusStyles[emp.status]}`}>
                        {emp.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-zinc-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-zinc-400 truncate">{emp.email}</p>
                      </div>
                      {dept && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-zinc-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <p className="text-xs text-zinc-400 truncate">{dept.name}</p>
                        </div>
                      )}
                      {emp.hire_date && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-zinc-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs text-zinc-400">
                            Since {new Date(emp.hire_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleStyles[emp.role]}`}>
                        {emp.role.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-zinc-300 group-hover:text-zinc-500 transition-colors">
                        View →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
