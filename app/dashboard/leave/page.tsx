import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeaveRequestForm from '@/components/leave/LeaveRequestForm'
import LeaveApprovalList from '@/components/leave/LeaveApprovalList'
import LeaveHistoryTable from '@/components/leave/LeaveHistoryTable'
import HolidaysWidget from '@/components/leave/HolidaysWidget'
import LeaveBalanceSection from '@/components/leave/LeaveBalanceSection'

export default async function LeavePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, department_id, gender')
    .eq('id', user.id)
    .single()

  const isManager = profile?.role === 'admin' || profile?.role === 'hr_manager'

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in90Str = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
  const in60Str = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]
  const currentYear = today.getFullYear()

  const [
    { data: myRequests },
    { data: balance },
    { data: pendingRequests },
    { data: holidays },
    { data: leaveTypes },
    { data: maternityTypes },
    { data: deptLeave },
  ] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', user.id)
      .eq('year', currentYear)
      .single(),
    isManager
      ? supabase
          .from('leave_requests')
          .select('*, profiles!leave_requests_employee_id_fkey(full_name, avatar_url, job_title, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('holidays')
      .select('*')
      .eq('year', currentYear)
      .order('date'),
    supabase
      .from('leave_type_config' as any)
      .select('*')
      .eq('active', true)
      .order('label'),
    // Also fetch maternity + paternity separately (filtered by gender below)
    supabase
      .from('leave_type_config' as any)
      .select('*')
      .in('type', ['maternity', 'paternity'])
      .order('label'),
    profile?.department_id
      ? supabase
          .from('leave_requests')
          .select('*, profiles!leave_requests_employee_id_fkey(id, full_name, avatar_url, department_id)')
          .eq('status', 'approved')
          .neq('employee_id', user.id)
          .gte('end_date', todayStr)
          .lte('start_date', in90Str)
          .order('start_date')
      : Promise.resolve({ data: [] }),
  ])

  const holidayDates = holidays?.map((h: any) => h.day_off ?? h.date) ?? []

  // Filter leave types by gender
  // Female → show maternity, hide paternity
  // Male → show paternity, hide maternity
  // Other/unknown → show neither (HR assigns manually)
  const gender = (profile as any)?.gender
  const genderLeaveType = (maternityTypes as any[])?.find((t: any) =>
    gender === 'female' ? t.type === 'maternity' :
    gender === 'male'   ? t.type === 'paternity' : false
  )
  const filteredLeaveTypes = [
    ...((leaveTypes as any[]) ?? []),
    ...(genderLeaveType ? [genderLeaveType] : []),
  ]

  // Carried-over days
  const june30 = `${currentYear}-06-30`
  const carriedOverDaysTotal = (balance as any)?.annual_carried_over ?? 0
  const carriedOverExpired = todayStr > june30
  const carriedOverDaysAvailable = carriedOverExpired ? 0 : carriedOverDaysTotal

  // Compute per-type usage from approved requests this year
  const thisYearRequests = (myRequests ?? []).filter(
    (r) => r.created_at.startsWith(currentYear.toString()) && r.status === 'approved'
  )
  const usageByType: Record<string, number> = {}
  thisYearRequests.forEach((r) => {
    usageByType[r.type] = (usageByType[r.type] ?? 0) + r.days_count
  })

  const deptColleagues = (deptLeave ?? []).filter(
    (r: any) => r.profiles?.department_id === profile?.department_id
  )

  const upcomingHolidays = (holidays ?? []).filter(
    (h: any) => h.date >= todayStr && h.date <= in60Str
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Leave Management</h1>
        <p className="text-sm mt-0.5 text-zinc-400">
          Request time off, track your balance and view your history.
        </p>
      </div>

      {/* Leave balance section — all types */}
      <LeaveBalanceSection
        leaveTypes={(filteredLeaveTypes as any[]) ?? []}
        usageByType={usageByType}
        annualTotal={(balance as any)?.annual_total ?? 20}
        annualUsed={(balance as any)?.annual_used ?? 0}
        sickTotal={(balance as any)?.sick_total ?? 20}
        sickUsed={(balance as any)?.sick_used ?? 0}
        carriedOverDays={carriedOverDaysTotal}
        carriedOverExpired={carriedOverExpired}
        carriedOverExpires={june30}
        year={currentYear}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request form */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">New Leave Request</h2>
          </div>
          <div className="p-5">
            <LeaveRequestForm
              employeeId={user.id}
              employeeName={profile?.full_name ?? ''}
              holidayDates={holidayDates}
              leaveTypes={(filteredLeaveTypes as any[]) ?? []}
              carriedOverDays={carriedOverDaysAvailable}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <HolidaysWidget
            upcomingHolidays={upcomingHolidays as any}
            allHolidays={(holidays ?? []) as any}
            year={currentYear}
          />

          <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-zinc-900">Team Away</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Colleagues on leave — next 90 days</p>
              </div>
              <a href="/dashboard/calendar" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
                Full calendar →
              </a>
            </div>
            {deptColleagues.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-zinc-400">No colleagues on leave soon.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50 max-h-64 overflow-y-auto">
                {deptColleagues.map((leave: any) => {
                  const name = leave.profiles?.full_name ?? 'Unknown'
                  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  const isActive = leave.start_date <= todayStr && leave.end_date >= todayStr
                  const typeLabel = (leaveTypes as any[])?.find((t: any) => t.type === leave.type)?.label ?? leave.type
                  const typeColors: Record<string, string> = {
                    annual: 'bg-blue-100 text-blue-700', sick: 'bg-red-100 text-red-700',
                    maternity: 'bg-pink-100 text-pink-700', paternity: 'bg-cyan-100 text-cyan-700',
                    work_from_home: 'bg-teal-100 text-teal-700', business_travel: 'bg-indigo-100 text-indigo-700',
                    training: 'bg-green-100 text-green-700',
                  }
                  const typeColor = typeColors[leave.type] ?? 'bg-zinc-100 text-zinc-600'
                  return (
                    <div key={leave.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {leave.profiles?.avatar_url ? (
                          <img src={leave.profiles.avatar_url} alt={name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-zinc-600">{initials}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-zinc-900 truncate">{name}</p>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-zinc-400">
                            {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' – '}
                            {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' · '}{leave.days_count}d
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${typeColor}`}>
                        {typeLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isManager && (pendingRequests?.length ?? 0) > 0 && (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h2 className="text-sm font-medium text-zinc-900">Pending Approvals</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {pendingRequests?.length} request{pendingRequests?.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
          <LeaveApprovalList requests={pendingRequests ?? []} approverId={user.id} />
        </div>
      )}

      <LeaveHistoryTable requests={myRequests ?? []} leaveTypes={(filteredLeaveTypes as any[]) ?? []} />
    </div>
  )
}
