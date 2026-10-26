import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DepartmentActions from '@/components/departments/DepartmentActions'

export default async function DepartmentsPage() {
  const supabase = await createClient()

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

  const [{ data: departments }, { data: employees }] = await Promise.all([
    supabase
      .from('departments')
      .select('*, profiles!fk_dept_head(id, full_name, job_title, avatar_url)')
      .order('name'),
    supabase
      .from('profiles')
      .select('id, full_name, job_title, role, department_id, avatar_url, status, departments(name)')
      .eq('status', 'active')
      .order('full_name'),
  ])

  // Group employees by department
  const byDept: Record<string, typeof employees> = {}
  employees?.forEach((emp) => {
    const deptId = emp.department_id ?? 'unassigned'
    if (!byDept[deptId]) byDept[deptId] = []
    byDept[deptId]!.push(emp)
  })

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Departments</h1>
          <p className="text-sm mt-0.5 text-zinc-400">
            {departments?.length ?? 0} departments · {employees?.length ?? 0} active employees
          </p>
        </div>
        {profile.role === 'admin' && (
          <DepartmentActions employees={employees ?? []} departments={(departments ?? []) as any} />
        )}
      </div>

      {/* Department cards */}
      <div className="grid grid-cols-1 gap-4">
        {departments?.map((dept) => {
          const members = byDept[dept.id] ?? []
          const head = (dept as any).profiles

          return (
            <div key={dept.id} className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
              {/* Dept header */}
              <div className="px-5 py-4 flex items-start justify-between border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">
                      {dept.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">{dept.name}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{dept.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                  {profile.role === 'admin' && (
                    <button
                      onClick={() => (window as any).__editDept?.(dept.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Department head */}
              {head && (
                <div className="px-5 py-3 flex items-center gap-2 bg-zinc-50 border-b border-zinc-100">
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="text-xs text-zinc-500">Department head:</span>
                  <span className="text-xs font-medium text-zinc-700">{head.full_name}</span>
                  <span className="text-xs text-zinc-400">· {head.job_title}</span>
                </div>
              )}

              {/* Members */}
              {members.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-zinc-400">No employees in this department.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {members.map((emp) => {
                    const initials = emp.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    const roleStyles: Record<string, string> = {
                      admin:      'bg-zinc-900 text-white',
                      hr_manager: 'bg-zinc-100 text-zinc-700',
                      employee:   'bg-zinc-50 text-zinc-500',
                    }
                    return (
                      <div key={emp.id} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {emp.avatar_url ? (
                            <img src={emp.avatar_url} alt={emp.full_name} className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-zinc-600">{initials}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{emp.full_name}</p>
                            <p className="text-xs text-zinc-400">{emp.job_title ?? 'No title'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleStyles[emp.role]}`}>
                          {emp.role.replace('_', ' ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Unassigned employees */}
        {(byDept['unassigned']?.length ?? 0) > 0 && (
          <div className="rounded-xl bg-white border border-amber-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <span className="text-sm">⚠️</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Unassigned</h2>
                <p className="text-xs text-zinc-400">Employees without a department</p>
              </div>
            </div>
            <div className="divide-y divide-zinc-50">
              {byDept['unassigned']!.map((emp) => {
                const initials = emp.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <div key={emp.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-zinc-600">{initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{emp.full_name}</p>
                      <p className="text-xs text-zinc-400">{emp.job_title ?? 'No title'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
