import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingBoard from '@/components/onboarding/OnboardingBoard'
import OnboardingHRView from '@/components/onboarding/OnboardingHRView'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, hire_date')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const isHR = profile.role === 'admin' || profile.role === 'hr_manager'

  // HR sees selected employee or overview; employee sees own tasks
  const targetEmployeeId = isHR ? (params.employee ?? null) : user.id

  const [
    { data: templates },
    { data: employees },
  ] = await Promise.all([
    supabase
      .from('onboarding_templates' as any)
      .select('*')
      .eq('active', true)
      .order('order_index'),
    isHR
      ? supabase
          .from('profiles')
          .select('id, full_name, hire_date, status, avatar_url, departments!profiles_department_id_fkey(name)')
          .eq('status', 'active')
          .order('full_name')
      : Promise.resolve({ data: [] }),
  ])

  // Fetch tasks for target employee
  const { data: tasks } = targetEmployeeId
    ? await supabase
        .from('onboarding_tasks')
        .select('*, assigned:profiles!assigned_to(id, full_name, avatar_url)')
        .eq('employee_id', targetEmployeeId)
        .order('order_index')
    : { data: [] }

  // Fetch target employee profile if HR selected one
  const { data: targetEmployee } = targetEmployeeId && isHR
    ? await supabase
        .from('profiles')
        .select('id, full_name, hire_date, avatar_url, departments!profiles_department_id_fkey(name)')
        .eq('id', targetEmployeeId)
        .single()
    : { data: null }

  // For HR overview — fetch all tasks grouped by employee
  const { data: allTasks } = isHR && !targetEmployeeId
    ? await supabase
        .from('onboarding_tasks')
        .select('*, profiles!employee_id(id, full_name, avatar_url, hire_date)')
        .order('created_at', { ascending: false })
    : { data: [] }

  if (isHR) {
    return (
      <OnboardingHRView
        employees={(employees as any[]) ?? []}
        allTasks={(allTasks as any[]) ?? []}
        selectedEmployeeId={targetEmployeeId}
        selectedEmployee={targetEmployee as any}
        selectedTasks={(tasks as any[]) ?? []}
        templates={(templates as any[]) ?? []}
        currentUserId={user.id}
      />
    )
  }

  return (
    <OnboardingBoard
      tasks={(tasks as any[]) ?? []}
      templates={(templates as any[]) ?? []}
      employeeId={user.id}
      employeeName={profile.full_name}
      hireDate={profile.hire_date}
    />
  )
}
