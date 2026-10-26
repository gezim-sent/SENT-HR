import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { generateLeaveRequestHTML } from '@/lib/pdf/leave-request'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('id')

  if (!requestId) {
    return NextResponse.json({ error: 'Missing leave request id' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single()

  if (!currentProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const isHR = currentProfile.role === 'admin' || currentProfile.role === 'hr_manager'

  // Fetch the leave request
  const { data: leave, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      profiles!leave_requests_employee_id_fkey(id, full_name, email, role),
      approver:profiles!leave_requests_approver_id_fkey(id, full_name, email)
    `)
    .eq('id', requestId)
    .single()

  if (error || !leave) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
  }

  // Access control — employee can only download their own
  if (!isHR && leave.employee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch leave type label
  const { data: leaveTypeConfig } = await supabase
    .from('leave_type_config' as any)
    .select('label')
    .eq('type', leave.type)
    .single()

  const typeLabel = (leaveTypeConfig as any)?.label ?? leave.type

  const employee = (leave as any).profiles
  const approver = (leave as any).approver

  // Build PDF data
  const pdfData = {
    employee_name: employee?.full_name ?? 'Unknown',
    employee_email: employee?.email ?? '',
    submitted_at: leave.created_at,
    leave_type_label: typeLabel,
    start_date: leave.start_date,
    end_date: leave.end_date,
    return_date: (leave as any).return_date ?? null,
    days_count: leave.days_count,
    reason: isHR ? leave.reason : null, // hide reason from other employees
    request_id: leave.request_id,
    status: leave.status,
    approver_name: approver?.full_name ?? null,
    approver_email: approver?.email ?? null,
    approver_note: leave.approver_note,
    reviewed_at: leave.reviewed_at,
    approver_signature: null,
    hr_email: 'hr@sent.dm',
  }

  const html = generateLeaveRequestHTML(pdfData)

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
