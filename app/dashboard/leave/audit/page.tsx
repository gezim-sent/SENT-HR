import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeaveAuditTrail from '@/components/leave/LeaveAuditTrail'

export default async function LeaveAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    request?: string
    employee?: string
    action?: string
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

  // Employees can see their own audit logs; HR/admin see all
  const isHR = profile?.role === 'admin' || profile?.role === 'hr_manager'

  // Build query
  let query = supabase
    .from('leave_audit_log')
    .select(`
      *,
      performer:profiles!leave_audit_log_performed_by_fkey(id, full_name, avatar_url, role),
      leave_request:leave_requests!leave_audit_log_request_id_fkey(
        id, request_id, type, start_date, end_date, days_count, status,
        employee:profiles!employee_id(id, full_name, avatar_url)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  // Employees only see their own
  if (!isHR) {
    query = query.eq('performed_by', user.id)
  }

  // Filters
  if (params.action) query = query.eq('action', params.action)
  if (params.from)   query = query.gte('created_at', params.from)
  if (params.to)     query = query.lte('created_at', params.to + 'T23:59:59')

  const { data: logs } = await query

  // Filter by employee or request in JS (nested relation filtering)
  let filteredLogs = logs ?? []
  if (params.employee) {
    filteredLogs = filteredLogs.filter(
      (l: any) => l.leave_request?.employee?.id === params.employee
    )
  }
  if (params.request) {
    filteredLogs = filteredLogs.filter(
      (l: any) => l.leave_request?.request_id?.toLowerCase().includes(params.request!.toLowerCase())
    )
  }

  // Get employee list for filter dropdown (HR only)
  const { data: employees } = isHR
    ? await supabase.from('profiles').select('id, full_name').order('full_name')
    : { data: [] }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Leave Audit Trail</h1>
        <p className="text-sm mt-0.5 text-zinc-400">
          Complete activity log of all leave actions — submissions, approvals, rejections and edits.
        </p>
      </div>

      <LeaveAuditTrail
        logs={filteredLogs as any}
        isHR={isHR}
        employees={employees ?? []}
        activeFilters={params}
      />
    </div>
  )
}
