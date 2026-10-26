import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileEditForm from '@/components/profile/ProfileEditForm'
import EquipmentSection from '@/components/profile/EquipmentSection'
import AvatarUpload from '@/components/profile/AvatarUpload'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, departments!profiles_department_id_fkey(id, name)')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) redirect('/auth/login')

  const [
    departmentsResult,
    managersResult,
    balanceResult,
    leaveHistoryResult,
    documentsResult,
  ] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
    supabase
      .from('profiles')
      .select('id, full_name, job_title, avatar_url')
      .in('role', ['admin', 'hr_manager'])
      .neq('id', user.id)
      .order('full_name'),
    supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', user.id)
      .eq('year', new Date().getFullYear())
      .single(),
    supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('documents')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  // Equipment — safe fetch, returns [] if table doesn't exist yet
  let equipment: any[] = []
  try {
    const { data } = await supabase
      .from('equipment' as any)
      .select('*')
      .eq('employee_id', user.id)
      .is('returned_date', null)
      .order('assigned_date', { ascending: false })
    equipment = data ?? []
  } catch {
    equipment = []
  }

  // Get manager details if assigned
  let manager = null
  if (profile.manager_id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, job_title, avatar_url')
      .eq('id', profile.manager_id)
      .single()
    manager = data
  }

  const departments = departmentsResult.data ?? []
  const managers = managersResult.data ?? []
  const balance = balanceResult.data
  const leaveHistory = leaveHistoryResult.data ?? []
  const documents = documentsResult.data ?? []

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const dept = (profile as any).departments
  const annualRemaining = balance ? balance.annual_total - balance.annual_used : 0
  const sickRemaining = balance ? balance.sick_total - balance.sick_used : 0

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
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">My Profile</h1>
        <p className="text-sm mt-0.5 text-zinc-400">Your personal information and employment details.</p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-6 py-5 flex items-start gap-5">
          <AvatarUpload
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            fullName={profile.full_name}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">{profile.full_name}</h2>
                <p className="text-sm text-zinc-500 mt-0.5">{profile.job_title ?? 'No title set'}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[profile.status]}`}>
                  {profile.status.replace('_', ' ')}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleStyles[profile.role]}`}>
                  {profile.role.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <Detail icon="✉️" value={profile.email} />
              {profile.phone && <Detail icon="📞" value={profile.phone} />}
              {dept && <Detail icon="🏢" value={dept.name} />}
              {profile.hire_date && (
                <Detail icon="📅" value={`Joined ${new Date(profile.hire_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`} />
              )}
              {profile.employee_id && <Detail icon="🪪" value={profile.employee_id} />}
            </div>
          </div>
        </div>

        {manager && (
          <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center gap-3">
            <span className="text-xs text-zinc-400">Reports to:</span>
            <div className="flex items-center gap-2">
              {manager.avatar_url ? (
                <img src={manager.avatar_url} alt={manager.full_name} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center">
                  <span className="text-xs font-semibold text-zinc-600">{manager.full_name.charAt(0)}</span>
                </div>
              )}
              <span className="text-xs font-medium text-zinc-700">{manager.full_name}</span>
              {manager.job_title && <span className="text-xs text-zinc-400">· {manager.job_title}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave balance */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h3 className="text-sm font-medium text-zinc-900">Leave Balance {new Date().getFullYear()}</h3>
          </div>
          <div className="p-5 space-y-4">
            <LeaveBalanceRow label="Annual Leave" used={balance?.annual_used ?? 0} total={balance?.annual_total ?? 20} remaining={annualRemaining} />
            <LeaveBalanceRow label="Sick Leave" used={balance?.sick_used ?? 0} total={balance?.sick_total ?? 20} remaining={sickRemaining} />
          </div>
          {leaveHistory.length > 0 && (
            <div className="border-t border-zinc-100">
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">Recent requests</span>
                <a href="/dashboard/leave" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">View all →</a>
              </div>
              <div className="divide-y divide-zinc-50">
                {leaveHistory.slice(0, 3).map((leave) => (
                  <div key={leave.id} className="px-5 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-zinc-700 capitalize">{leave.type}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(leave.start_date).toLocaleDateString()} – {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <LeaveStatusBadge status={leave.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Employment info */}
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h3 className="text-sm font-medium text-zinc-900">Employment Details</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            <InfoRow label="Full Name" value={profile.full_name} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Phone" value={profile.phone ?? '—'} />
            <InfoRow label="Job Title" value={profile.job_title ?? '—'} />
            <InfoRow label="Department" value={dept?.name ?? '—'} />
            <InfoRow label="Role" value={profile.role.replace('_', ' ')} />
            <InfoRow label="Manager" value={manager?.full_name ?? '—'} />
            <InfoRow
              label="Start Date"
              value={profile.hire_date ? new Date(profile.hire_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            />
            <InfoRow label="Employee ID" value={profile.employee_id ?? '—'} />
            <InfoRow label="Status" value={profile.status.replace('_', ' ')} />
          </div>
        </div>
      </div>

      <EquipmentSection
        equipment={equipment}
        employeeId={profile.id}
        canManage={profile.role === 'admin' || profile.role === 'hr_manager'}
      />

      {documents.length > 0 && (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100">
            <h3 className="text-sm font-medium text-zinc-900">Documents</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
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
        </div>
      )}

      <ProfileEditForm profile={profile as any} departments={departments} managers={managers} />
    </div>
  )
}

function Detail({ icon, value }: { icon: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
      <span>{icon}</span>{value}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-2.5 flex items-center justify-between">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-xs font-medium text-zinc-700 capitalize">{value}</span>
    </div>
  )
}

function LeaveBalanceRow({ label, used, total, remaining }: { label: string; used: number; total: number; remaining: number }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-zinc-700">{label}</span>
        <span className="text-xs text-zinc-400">{remaining} of {total} days remaining</span>
      </div>
      <div className="w-full bg-zinc-100 rounded-full h-1.5">
        <div className="bg-zinc-900 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-zinc-400 mt-1">{used} days used</p>
    </div>
  )
}

function LeaveStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected:  'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  )
}
