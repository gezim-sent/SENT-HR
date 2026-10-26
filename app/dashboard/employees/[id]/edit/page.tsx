import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EmployeeEditForm from '@/components/employees/EmployeeEditForm'

export default async function EmployeeEditPage({
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

  if (!viewer || (viewer.role !== 'admin' && viewer.role !== 'hr_manager')) {
    redirect('/dashboard/employees')
  }

  const { data: employee } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!employee) notFound()

  const [{ data: departments }, { data: managers }] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
    supabase
      .from('profiles')
      .select('id, full_name, job_title')
      .in('role', ['admin', 'hr_manager'])
      .neq('id', id)
      .order('full_name'),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/employees/${id}`}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {employee.full_name}
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Edit Employee</h1>
        <p className="text-sm mt-0.5 text-zinc-400">Update {employee.full_name}'s profile information.</p>
      </div>

      <EmployeeEditForm
        employee={employee as any}
        departments={departments ?? []}
        managers={managers ?? []}
        isAdmin={viewer.role === 'admin'}
      />
    </div>
  )
}
