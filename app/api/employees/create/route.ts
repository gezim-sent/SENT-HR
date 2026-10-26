import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Auth check — only HR/admin can create employees
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await supabaseUser.from('profiles').select('role').eq('id', user.id).single()
    if (!caller || !['admin', 'hr_manager'].includes(caller.role)) {
      return NextResponse.json({ error: 'Only HR or Admin can create employees.' }, { status: 403 })
    }

    const body = await request.json()
    const {
      email, password, full_name, job_title,
      role, department_id, manager_id,
      hire_date, phone, employee_id, status, gender,
      date_of_birth, personal_email, address,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      iban, contract_type, annual_days, sick_days,
    } = body

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password and full name are required.' }, { status: 400 })
    }

    // Enforce @sent.dm domain
    if (!email.endsWith('@sent.dm')) {
      return NextResponse.json({ error: 'Only @sent.dm email addresses are allowed.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Step 1 — create auth user with email confirmed
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        must_change_password: true, // flag for first-login check
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? 'Failed to create account.' }, { status: 400 })
    }

    // Step 2 — create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name,
      job_title: job_title || null,
      role: role ?? 'employee',
      department_id: department_id || null,
      manager_id: manager_id || null,
      hire_date: hire_date || null,
      phone: phone || null,
      employee_id: employee_id || null,
      gender: gender || null,
      date_of_birth: date_of_birth || null,
      personal_email: personal_email || null,
      address: address || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      emergency_contact_relation: emergency_contact_relation || null,
      iban: iban || null,
      contract_type: contract_type || 'full_time',
      status: status ?? 'active',
    })

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Step 3 — create leave balance with prorated/custom days
    await supabase.from('leave_balances').insert({
      employee_id: authData.user.id,
      year: new Date().getFullYear(),
      annual_total: annual_days ?? 20,
      annual_used: 0,
      sick_total: sick_days ?? 20,
      sick_used: 0,
    })

    // Step 4 — skip welcome email, HR shares credentials manually
    // Employee logs in with Sent123! and is prompted to change password

    return NextResponse.json({ success: true, id: authData.user.id })
  } catch (err) {
    console.error('[create employee]', err)
    return NextResponse.json({ error: 'Unexpected error occurred.' }, { status: 500 })
  }
}
