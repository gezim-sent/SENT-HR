import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check — admin only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json()
  const fromYear = body.from_year ?? new Date().getFullYear() - 1
  const maxCarryOver = 365 // Carry over all unused days — no cap

  const adminClient = await createAdminClient()

  // Run the carry over function
  const { error } = await adminClient.rpc('carry_over_annual_leave', {
    from_year: fromYear,
    max_carry_over: maxCarryOver,
  } as any)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log it in audit trail for all affected employees
  const { data: balances } = await adminClient
    .from('leave_balances')
    .select('employee_id, annual_carried_over')
    .eq('year', fromYear + 1)
    .gt('annual_carried_over', 0)

  return NextResponse.json({
    success: true,
    fromYear,
    toYear: fromYear + 1,
    maxCarryOver,
    affectedEmployees: balances?.length ?? 0,
    details: balances ?? [],
  })
}
