import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    dept?: string
    type?: string
    status?: string
    from?: string
    to?: string
  }>
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

  // Fetch all data — filter in JS since Supabase can't filter on nested relations
  const [
    { data: allRequests },
    { data: departments },
    { data: balances },
    { data: leaveTypes },
  ] = await Promise.all([
    supabase
      .from('leave_requests')
      .select(`
        *,
        profiles!leave_requests_employee_id_fkey(
          id, full_name, department_id, manager_id,
          departments!profiles_department_id_fkey(id, name)
        )
      `)
      .order('created_at', { ascending: false }),
    supabase.from('departments').select('id, name').order('name'),
    supabase
      .from('leave_balances')
      .select('*, profiles!leave_requests_employee_id_fkey(id, full_name, department_id)')
      .eq('year', new Date().getFullYear()),
    supabase
      .from('leave_type_config' as any)
      .select('type, label')
      .eq('active', true),
  ])

  // ── Apply filters in JS ───────────────────────────────────────────────────
  let requests = allRequests ?? []

  if (params.dept) {
    requests = requests.filter(
      (r) => (r as any).profiles?.department_id === params.dept
    )
  }
  if (params.type) {
    requests = requests.filter((r) => r.type === params.type)
  }
  if (params.status) {
    requests = requests.filter((r) => r.status === params.status)
  }
  if (params.from) {
    requests = requests.filter((r) => r.created_at >= params.from!)
  }
  if (params.to) {
    requests = requests.filter(
      (r) => r.created_at <= params.to! + 'T23:59:59'
    )
  }

  // ── Compute metrics ───────────────────────────────────────────────────────

  const totalRequests = requests.length
  const approved = requests.filter((r) => r.status === 'approved').length
  const rejected = requests.filter((r) => r.status === 'rejected').length
  const pending = requests.filter((r) => r.status === 'pending').length
  const totalDaysTaken = requests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.days_count, 0)

  // Leave by type
  const byType: Record<string, number> = {}
  requests.forEach((r) => { byType[r.type] = (byType[r.type] ?? 0) + 1 })
  const leaveByType = Object.entries(byType)
    .map(([type, count]) => ({
      type,
      label: (leaveTypes as any[])?.find((t) => t.type === type)?.label ?? type,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  // Leave by department
  const byDept: Record<string, { name: string; count: number; days: number }> = {}
  requests.forEach((r) => {
    const dept = (r as any).profiles?.departments
    if (dept) {
      const key = dept.id ?? dept.name
      if (!byDept[key]) byDept[key] = { name: dept.name, count: 0, days: 0 }
      byDept[key].count++
      if (r.status === 'approved') byDept[key].days += r.days_count
    }
  })
  const leaveByDept = Object.values(byDept).sort((a, b) => b.count - a.count)

  // Top employees by approved days
  const byEmployee: Record<string, { name: string; days: number; count: number }> = {}
  requests
    .filter((r) => r.status === 'approved')
    .forEach((r) => {
      const emp = (r as any).profiles
      if (emp) {
        if (!byEmployee[emp.id]) byEmployee[emp.id] = { name: emp.full_name, days: 0, count: 0 }
        byEmployee[emp.id].days += r.days_count
        byEmployee[emp.id].count++
      }
    })
  const topEmployees = Object.values(byEmployee).sort((a, b) => b.days - a.days).slice(0, 10)

  // Sick leave monthly trend (last 12 months)
  const sickTrend: Record<string, number> = {}
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    sickTrend[key] = 0
  }
  requests
    .filter((r) => r.type === 'sick' && r.status === 'approved')
    .forEach((r) => {
      const key = r.created_at.slice(0, 7)
      if (key in sickTrend) sickTrend[key] += r.days_count
    })
  const sickTrendData = Object.entries(sickTrend).map(([month, days]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    days,
  }))

  // Average approval time
  const approvedWithTime = requests.filter((r) => r.status === 'approved' && r.reviewed_at)
  const avgApprovalHours =
    approvedWithTime.length > 0
      ? Math.round(
          approvedWithTime.reduce((sum, r) => {
            const ms = new Date(r.reviewed_at!).getTime() - new Date(r.created_at).getTime()
            return sum + ms / (1000 * 60 * 60)
          }, 0) / approvedWithTime.length
        )
      : 0

  // Annual utilization
  const utilizationData = (balances ?? [])
    .map((b: any) => ({
      id: b.employee_id,
      name: b.profiles?.full_name ?? 'Unknown',
      deptId: b.profiles?.department_id,
      used: b.annual_used,
      total: b.annual_total,
      pct: b.annual_total > 0 ? Math.round((b.annual_used / b.annual_total) * 100) : 0,
    }))
    // Apply dept filter to balances too
    .filter((b) => !params.dept || b.deptId === params.dept)
    .sort((a, b) => b.pct - a.pct)

  // Upcoming leave (next 30 days)
  const todayStr = new Date().toISOString().split('T')[0]
  const in30Str = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const upcomingLeave = requests
    .filter((r) => r.status === 'approved' && r.start_date >= todayStr && r.start_date <= in30Str)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 10)
    .map((r) => ({ ...r, employee_name: (r as any).profiles?.full_name ?? 'Unknown' }))

  // Near limit
  const nearLimit = (balances ?? [])
    .filter((b: any) => {
      const remaining = b.annual_total - b.annual_used
      const deptMatch = !params.dept || b.profiles?.department_id === params.dept
      return remaining <= 5 && b.annual_total > 0 && deptMatch
    })
    .map((b: any) => ({
      name: b.profiles?.full_name ?? 'Unknown',
      remaining: b.annual_total - b.annual_used,
      total: b.annual_total,
    }))
    .sort((a, b) => a.remaining - b.remaining)

  return (
    <AnalyticsDashboard
      data={{
        totalRequests, approved, rejected, pending,
        totalDaysTaken, avgApprovalHours,
        leaveByType, leaveByDept, topEmployees,
        sickTrendData,
        utilizationData: utilizationData.slice(0, 10),
        upcomingLeave, nearLimit,
        departments: departments ?? [],
        leaveTypes: (leaveTypes as any[]) ?? [],
        activeFilters: params,
        allRequests: requests,
      }}
    />
  )
}
