import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamCalendar from '@/components/calendar/TeamCalendar'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; employee?: string; view?: string; date?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, full_name, department_id')
    .eq('id', user.id)
    .single()

  if (!currentProfile) redirect('/auth/login')

  const isHR = currentProfile.role === 'admin' || currentProfile.role === 'hr_manager'

  // Fetch approved leave requests — employees see all approved but without reasons/docs
  const [
    { data: leaveRequests },
    { data: holidays },
    { data: departments },
    { data: employees },
  ] = await Promise.all([
    supabase
      .from('leave_requests')
      .select(`
        id, type, start_date, end_date, days_count, status,
        reason,
        employee_id,
        profiles!leave_requests_employee_id_fkey(
          id, full_name, avatar_url, department_id,
          departments!profiles_department_id_fkey(id, name)
        )
      `)
      .eq('status', 'approved')
      .order('start_date'),
    supabase
      .from('holidays')
      .select('*')
      .order('date'),
    supabase.from('departments').select('id, name').order('name'),
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, department_id, hire_date')
      .eq('status', 'active')
      .order('full_name'),
  ])

  // Apply privacy — employees never see reason or document info
  const sanitizedRequests = (leaveRequests ?? []).map((r) => ({
    ...r,
    reason: isHR ? r.reason : null, // hide reason from regular employees
  }))

  // Filter by department if set
  let filteredRequests = sanitizedRequests
  if (params.dept) {
    filteredRequests = filteredRequests.filter(
      (r) => (r as any).profiles?.department_id === params.dept
    )
  }
  if (params.employee) {
    filteredRequests = filteredRequests.filter(
      (r) => (r as any).profiles?.id === params.employee
    )
  }

  return (
    <TeamCalendar
      leaveRequests={filteredRequests as any}
      holidays={holidays ?? []}
      departments={departments ?? []}
      employees={employees ?? []}
      currentUserId={user.id}
      isHR={isHR}
      initialView={(params.view as 'month' | 'week' | 'day') ?? 'month'}
      initialDate={params.date ?? new Date().toISOString().split('T')[0]}
      activeDept={params.dept ?? ''}
      activeEmployee={params.employee ?? ''}
    />
  )
}
