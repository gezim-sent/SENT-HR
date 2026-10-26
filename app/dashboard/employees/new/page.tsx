import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewEmployeeForm from '@/components/employees/NewEmployeeForm'

export default async function NewEmployeePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only admins can add employees
  if (!profile || profile.role !== 'admin') redirect('/dashboard/employees')

  const [{ data: departments }, { data: managers }] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
    supabase
      .from('profiles')
      .select('id, full_name, job_title')
      .in('role', ['admin', 'hr_manager'])
      .order('full_name'),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a
          href="/dashboard/employees"
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to employees
        </a>
      </div>

      <NewEmployeeForm
        departments={departments ?? []}
        managers={managers ?? []}
      />
    </div>
  )
}
