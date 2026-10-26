import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { sendEmail } from '@/lib/email/send'
import {
  leaveRequestEmail,
  leaveApprovedEmail,
  leaveRejectedEmail,
} from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, leaveRequestId } = body

  if (!type || !leaveRequestId) {
    return NextResponse.json({ error: 'Missing type or leaveRequestId' }, { status: 400 })
  }

  // Fetch the full leave request with explicit column selection to avoid ambiguity
  const { data: leave } = await supabase
    .from('leave_requests')
    .select(`
      id, type, start_date, end_date, days_count, reason,
      request_id, approver_note, status,
      employee:profiles!leave_requests_employee_id_fkey(id, full_name, email, manager_id),
      approver:profiles!leave_requests_approver_id_fkey(id, full_name, email)
    `)
    .eq('id', leaveRequestId)
    .single()

  if (!leave) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
  }

  // Fetch leave type label
  const { data: leaveTypeConfig } = await supabase
    .from('leave_type_config' as any)
    .select('label')
    .eq('type', leave.type)
    .single()

  const typeLabel = (leaveTypeConfig as any)?.label ?? leave.type

  const employee = (leave as any).employee
  const approver = (leave as any).approver

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

  let sent = false

  // ── Email type: new request → notify manager ──────────────────────────────
  if (type === 'submitted') {
    // Get manager email
    let managerEmail: string | null = null
    let managerName = 'Manager'

    if (employee?.manager_id) {
      const { data: manager } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', employee.manager_id)
        .single()
      if (manager) {
        managerEmail = manager.email
        managerName = manager.full_name
      }
    }

    if (managerEmail) {
      const { subject, html } = leaveRequestEmail({
        managerName,
        employeeName: employee.full_name,
        leaveType: typeLabel,
        startDate: formatDate(leave.start_date),
        endDate: formatDate(leave.end_date),
        daysCount: leave.days_count,
        reason: leave.reason,
        requestId: leave.request_id,
      })
      sent = await sendEmail({ to: managerEmail, subject, html })
    }
  }

  // ── Email type: approved → notify employee ────────────────────────────────
  else if (type === 'approved') {
    const { subject, html } = leaveApprovedEmail({
      employeeName: employee.full_name,
      leaveType: typeLabel,
      startDate: formatDate(leave.start_date),
      endDate: formatDate(leave.end_date),
      daysCount: leave.days_count,
      approverName: approver?.full_name ?? 'Your manager',
      approverNote: leave.approver_note,
      requestId: leave.request_id,
    })
    sent = await sendEmail({ to: employee.email, subject, html })
  }

  // ── Email type: rejected → notify employee ────────────────────────────────
  else if (type === 'rejected') {
    const { subject, html } = leaveRejectedEmail({
      employeeName: employee.full_name,
      leaveType: typeLabel,
      startDate: formatDate(leave.start_date),
      endDate: formatDate(leave.end_date),
      daysCount: leave.days_count,
      approverName: approver?.full_name ?? 'Your manager',
      approverNote: leave.approver_note,
      requestId: leave.request_id,
    })
    sent = await sendEmail({ to: employee.email, subject, html })
  }

  return NextResponse.json({ success: true, sent })
}