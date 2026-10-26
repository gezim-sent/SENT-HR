import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/types'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected:  'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const isHR = profile.role === 'admin' || profile.role === 'hr_manager'
  return isHR
    ? <AdminHRDashboard profile={profile} userId={user.id} />
    : <EmployeeDashboard profile={profile} />
}

// ─── Admin / HR Dashboard ────────────────────────────────────────────────────

async function AdminHRDashboard({ profile, userId }: { profile: Profile; userId: string }) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()

  const [
    { count: activeCount },
    { count: pendingCount },
    { count: onboardingCount },
    { count: expiringDocsCount },
    { data: pendingLeave },
    { data: outToday },
    { data: upcomingLeave },
    { data: departments },
    { data: recentAudit },
    { data: todayHolidays },
    { data: activeReviews },
    { data: nearLimitBalances },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('onboarding_tasks').select('*', { count: 'exact', head: true }).is('completed_at', null),
    supabase.from('documents').select('*', { count: 'exact', head: true })
      .not('expiry_date', 'is', null)
      .gte('expiry_date', today)
      .lte('expiry_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]),
    // Pending leave requests
    supabase
      .from('leave_requests')
      .select('*, profiles!leave_requests_employee_id_fkey(id, full_name, avatar_url, job_title)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    // Who's out today
    supabase
      .from('leave_requests')
      .select('*, profiles!leave_requests_employee_id_fkey(id, full_name, avatar_url, departments!profiles_department_id_fkey(name))')
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today),
    // Upcoming leave next 14 days
    supabase
      .from('leave_requests')
      .select('*, profiles!leave_requests_employee_id_fkey(id, full_name, avatar_url)')
      .eq('status', 'approved')
      .gt('start_date', today)
      .lte('start_date', in30)
      .order('start_date')
      .limit(6),
    // Department headcount
    supabase
      .from('departments')
      .select('id, name, profiles!profiles_department_id_fkey(id, status)')
      .order('name'),
    // Recent audit activity
    supabase
      .from('leave_audit_log')
      .select(`
        *,
        performer:profiles!leave_audit_log_performed_by_fkey(full_name, avatar_url),
        leave_request:leave_requests!leave_audit_log_request_id_fkey(request_id, type, profiles!leave_requests_employee_id_fkey(full_name))
      `)
      .order('created_at', { ascending: false })
      .limit(8),
    // Today's holidays
    supabase
      .from('holidays')
      .select('*')
      .eq('date', today),
    // Active review cycles
    supabase
      .from('review_cycles')
      .select('*, reviews(id, status)')
      .eq('status', 'active')
      .limit(3),
    // Employees near leave limit
    supabase
      .from('leave_balances')
      .select('*, profiles!leave_requests_employee_id_fkey(full_name)')
      .eq('year', currentYear)
      .lte('annual_used', 20)
      .order('annual_used', { ascending: false })
      .limit(5),
  ])

  const todayHoliday = (todayHolidays ?? [])[0] ?? null

  // Compute dept stats
  const deptStats = (departments ?? []).map((dept: any) => {
    const members = dept.profiles ?? []
    const active = members.filter((p: any) => p.status === 'active').length
    return { name: dept.name, active, total: members.length }
  }).filter((d: any) => d.total > 0)

  const ACTION_COLORS: Record<string, string> = {
    SUBMITTED:   'bg-blue-100 text-blue-700',
    APPROVED:    'bg-emerald-100 text-emerald-700',
    REJECTED:    'bg-red-100 text-red-700',
    EDITED:      'bg-amber-100 text-amber-700',
    CANCELLED:   'bg-zinc-100 text-zinc-600',
    RESUBMITTED: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
            {greeting()}, {profile.full_name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm mt-0.5 text-zinc-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {todayHoliday && <span className="ml-2 text-amber-600">· 🎌 {todayHoliday.name}</span>}
          </p>
        </div>
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

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Employees', value: activeCount ?? 0, icon: '👥', href: '/dashboard/employees', color: 'text-zinc-900' },
          { label: 'Pending Approvals', value: pendingCount ?? 0, icon: '📋', href: '/dashboard/leave', color: pendingCount ? 'text-amber-600' : 'text-zinc-900' },
          { label: 'Out Today', value: (outToday ?? []).length, icon: '🏖️', href: '/dashboard/calendar', color: (outToday ?? []).length ? 'text-blue-600' : 'text-zinc-900' },
          { label: 'Docs Expiring Soon', value: expiringDocsCount ?? 0, icon: '📄', href: '/dashboard/documents', color: expiringDocsCount ? 'text-red-500' : 'text-zinc-900' },
        ].map((kpi) => (
          <Link key={kpi.href} href={kpi.href} className="rounded-xl bg-white border border-zinc-200 p-4 hover:border-zinc-400 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{kpi.icon}</span>
              <p className="text-xs text-zinc-400">{kpi.label}</p>
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col — out today + upcoming */}
        <div className="space-y-4">
          {/* Out today */}
          <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-900">Out Today</h2>
              <span className="text-xs text-zinc-400">{(outToday ?? []).length} people</span>
            </div>
            {(outToday ?? []).length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-zinc-400">Everyone's in today 🎉</div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {(outToday ?? []).slice(0, 5).map((leave: any) => {
                  const emp = leave.profiles
                  const initials = emp?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={leave.id} className="px-4 py-3 flex items-center gap-2.5">
                      {emp?.avatar_url ? (
                        <img src={emp.avatar_url} alt={emp.full_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-white">{initials}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-900 truncate">{emp?.full_name}</p>
                        <p className="text-xs text-zinc-400 capitalize">{leave.type.replace('_', ' ')} · until {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Upcoming leave */}
          <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-900">Upcoming Leave</h2>
              <Link href="/dashboard/calendar" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Calendar →</Link>
            </div>
            {(upcomingLeave ?? []).length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-zinc-400">No upcoming leave.</div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {(upcomingLeave ?? []).map((leave: any) => {
                  const emp = leave.profiles
                  const daysUntil = Math.ceil((new Date(leave.start_date).getTime() - Date.now()) / 86400000)
                  return (
                    <div key={leave.id} className="px-4 py-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-zinc-900">{emp?.full_name}</p>
                        <p className="text-xs text-zinc-400">
                          {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' · '}{leave.days_count}d
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400 flex-shrink-0">in {daysUntil}d</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Middle col — pending approvals + dept breakdown */}
        <div className="space-y-4">
          {/* Pending approvals */}
          <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-900">Pending Approvals</h2>
              <Link href="/dashboard/leave" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Review all →</Link>
            </div>
            {(pendingLeave ?? []).length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-zinc-400">No pending requests 🎉</div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {(pendingLeave ?? []).map((leave: any) => {
                  const emp = leave.profiles
                  const initials = emp?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={leave.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {emp?.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.full_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-zinc-600">{initials}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-zinc-900">{emp?.full_name}</p>
                          <p className="text-xs text-zinc-400 capitalize">
                            {leave.type.replace('_', ' ')} · {leave.days_count}d
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={leave.status} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Dept headcount */}
          <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-900">By Department</h2>
              <Link href="/dashboard/employees" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">All →</Link>
            </div>
            <div className="divide-y divide-zinc-50">
              {deptStats.map((dept: any) => (
                <div key={dept.name} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-700">{dept.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-zinc-100 rounded-full h-1.5">
                      <div
                        className="bg-zinc-900 h-1.5 rounded-full"
                        style={{ width: `${(dept.active / (activeCount || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 tabular-nums w-4 text-right">{dept.active}</span>
                  </div>
                </div>
              ))}
              {deptStats.length === 0 && (
                <div className="px-5 py-6 text-center text-sm text-zinc-400">No departments yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right col — activity feed + review cycles */}
        <div className="space-y-4">
          {/* Active review cycles */}
          {(activeReviews ?? []).length > 0 && (
            <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-900">Active Reviews</h2>
                <Link href="/dashboard/reviews" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Manage →</Link>
              </div>
              <div className="divide-y divide-zinc-50">
                {(activeReviews ?? []).map((cycle: any) => {
                  const total = cycle.reviews?.length ?? 0
                  const done = cycle.reviews?.filter((r: any) => r.status === 'completed').length ?? 0
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <div key={cycle.id} className="px-5 py-3.5">
                      <p className="text-xs font-medium text-zinc-900">{cycle.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-zinc-100 rounded-full h-1.5">
                          <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-zinc-400">{done}/{total}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Activity feed */}
          <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-900">Recent Activity</h2>
              <Link href="/dashboard/leave/audit" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Full log →</Link>
            </div>
            {(recentAudit ?? []).length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-zinc-400">No recent activity.</div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {(recentAudit ?? []).map((log: any) => {
                  const actionColor = ACTION_COLORS[log.action] ?? 'bg-zinc-100 text-zinc-600'
                  const req = log.leave_request
                  const diff = Date.now() - new Date(log.created_at).getTime()
                  const timeAgo = diff < 3600000
                    ? `${Math.floor(diff / 60000)}m ago`
                    : diff < 86400000
                    ? `${Math.floor(diff / 3600000)}h ago`
                    : `${Math.floor(diff / 86400000)}d ago`

                  return (
                    <div key={log.id} className="px-4 py-3 flex items-start gap-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 mt-0.5 ${actionColor}`}>
                        {log.action.charAt(0) + log.action.slice(1).toLowerCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-700 truncate">
                          <span className="font-medium">{log.performer?.full_name}</span>
                          {req?.profiles?.full_name && ` · ${req.profiles.full_name}`}
                          {req?.request_id && <span className="text-zinc-400 font-mono ml-1">{req.request_id}</span>}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">{timeAgo}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl bg-white border border-zinc-200 p-5">
        <h2 className="text-sm font-medium text-zinc-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Add Employee', href: '/dashboard/employees/new', icon: '➕', roles: ['admin'] },
            { label: 'Review Leave', href: '/dashboard/leave', icon: '📋', roles: ['admin', 'hr_manager'] },
            { label: 'Onboarding', href: '/dashboard/onboarding', icon: '🚀', roles: ['admin', 'hr_manager'] },
            { label: 'Analytics', href: '/dashboard/analytics', icon: '📊', roles: ['admin', 'hr_manager'] },
          ].filter((a) => a.roles.includes(profile.role)).map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 transition-all text-center"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-xs font-medium text-zinc-600">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Employee Dashboard ──────────────────────────────────────────────────────

async function EmployeeDashboard({ profile }: { profile: Profile }) {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const today = new Date().toISOString().split('T')[0]
  const june30 = `${year}-06-30`

  const [
    { data: balance },
    { data: myLeave },
    { data: tasks },
    { data: pendingReview },
    { data: todayHolidays },
    { data: colleagues },
  ] = await Promise.all([
    supabase.from('leave_balances').select('*').eq('employee_id', profile.id).eq('year', year).single(),
    supabase.from('leave_requests').select('*').eq('employee_id', profile.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('onboarding_tasks').select('*').eq('employee_id', profile.id).order('order_index'),
    supabase.from('reviews').select('*, review_cycles(name, end_date)').eq('employee_id', profile.id).in('status', ['pending', 'self_review']).limit(1).single(),
    supabase.from('holidays').select('*').eq('date', today),
    // Team members out today (same department)
    profile.department_id
      ? supabase
          .from('leave_requests')
          .select('*, profiles!leave_requests_employee_id_fkey(id, full_name, avatar_url, department_id)')
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today)
          .neq('employee_id', profile.id)
      : Promise.resolve({ data: [] }),
  ])

  const completedTasks = (tasks ?? []).filter((t) => t.completed_at).length
  const totalTasks = tasks?.length ?? 0
  const onboardingPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const todayHoliday = (todayHolidays ?? [])[0] ?? null
  const carriedOver = (balance as any)?.annual_carried_over ?? 0
  const carriedOverExpired = today > june30
  const carriedOverAvailable = carriedOverExpired ? 0 : carriedOver
  const annualRemaining = ((balance as any)?.annual_total ?? 20) - ((balance as any)?.annual_used ?? 0)
  const sickRemaining = ((balance as any)?.sick_total ?? 20) - ((balance as any)?.sick_used ?? 0)

  const teamOut = (colleagues ?? []).filter(
    (r: any) => r.profiles?.department_id === profile.department_id
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
          {greeting()}, {profile.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm mt-0.5 text-zinc-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          {todayHoliday && <span className="ml-2 text-amber-600">· 🎌 {todayHoliday.name} — Public Holiday</span>}
        </p>
      </div>

      {/* Action alerts */}
      <div className="space-y-2">
        {pendingReview && (
          <Link
            href="/dashboard/reviews"
            className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <span className="text-2xl">⭐</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Performance review pending</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {(pendingReview as any).review_cycles?.name} · Complete your self-assessment
              </p>
            </div>
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
        {carriedOverAvailable > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-sm font-medium text-amber-900">
                {carriedOverAvailable} carried-over days expire on 30 June {year}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">These are deducted first when you request annual leave.</p>
            </div>
          </div>
        )}
      </div>

      {/* Balance cards */}
      <div className={`grid gap-3 ${carriedOverAvailable > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <BalanceCard label="Annual Leave" remaining={annualRemaining} total={(balance as any)?.annual_total ?? 20} used={(balance as any)?.annual_used ?? 0} />
        <BalanceCard label="Sick Leave" remaining={sickRemaining} total={(balance as any)?.sick_total ?? 20} used={(balance as any)?.sick_used ?? 0} />
        {carriedOverAvailable > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Carried Over</p>
            <p className="text-3xl font-semibold text-zinc-900 tabular-nums mt-2">
              {carriedOverAvailable}<span className="text-base text-zinc-400 font-normal">d</span>
            </p>
            <p className="text-xs text-amber-600 mt-2">Expires 30 Jun {year}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My recent leave */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900">My Leave Requests</h2>
            <Link href="/dashboard/leave" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Request leave →</Link>
          </div>
          {(myLeave ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-400">No leave requests yet.</div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {(myLeave ?? []).map((leave) => (
                <div key={leave.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 capitalize">{leave.type.replace('_', ' ')} leave</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {leave.days_count}d
                    </p>
                  </div>
                  <StatusBadge status={leave.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team out today + onboarding */}
        <div className="space-y-4">
          {teamOut.length > 0 && (
            <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-100">
                <h2 className="text-sm font-medium text-zinc-900">Team Out Today</h2>
              </div>
              <div className="divide-y divide-zinc-50">
                {teamOut.slice(0, 4).map((leave: any) => {
                  const emp = leave.profiles
                  const initials = emp?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={leave.id} className="px-5 py-3 flex items-center gap-2.5">
                      {emp?.avatar_url ? (
                        <img src={emp.avatar_url} alt={emp.full_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-zinc-600">{initials}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-zinc-900">{emp?.full_name}</p>
                        <p className="text-xs text-zinc-400 capitalize">{leave.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {totalTasks > 0 && (
            <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-900">My Onboarding</h2>
                <Link href="/dashboard/onboarding" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">View all →</Link>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-500">{completedTasks}/{totalTasks} tasks</span>
                    <span className="text-xs font-medium text-zinc-900">{onboardingPct}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${onboardingPct === 100 ? 'bg-emerald-500' : 'bg-zinc-900'}`} style={{ width: `${onboardingPct}%` }} />
                  </div>
                </div>
                {(tasks ?? []).filter((t) => !t.completed_at).slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-zinc-300 flex-shrink-0" />
                    <span className="text-xs text-zinc-700">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl bg-white border border-zinc-200 p-5">
        <h2 className="text-sm font-medium text-zinc-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Request Leave', href: '/dashboard/leave', icon: '📅' },
            { label: 'My Profile', href: '/dashboard/profile', icon: '👤' },
            { label: 'My Reviews', href: '/dashboard/reviews', icon: '⭐' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 transition-all text-center"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-xs font-medium text-zinc-600">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function BalanceCard({ label, remaining, total, used }: { label: string; remaining: number; total: number; used: number }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  return (
    <div className="rounded-xl bg-white border border-zinc-200 p-5">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-semibold text-zinc-900 tabular-nums mt-2">
        {remaining}<span className="text-base text-zinc-400 font-normal"> / {total}d</span>
      </p>
      <div className="mt-3 bg-zinc-100 rounded-full h-1.5">
        <div className="bg-zinc-900 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-zinc-400 mt-1">{used}d used</p>
    </div>
  )
}
