import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { sendEmail } from '@/lib/email/send'

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
      hire_date, phone, employee_id, status,
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
      status: status ?? 'active',
    })

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Step 3 — create leave balance for current year
    await supabase.from('leave_balances').insert({
      employee_id: authData.user.id,
      year: new Date().getFullYear(),
      annual_total: 20,
      annual_used: 0,
      sick_total: 20,
      sick_used: 0,
    })

    // Step 4 — send welcome email (fire and forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    sendEmail({
      to: email,
      subject: 'Welcome to Sent People HR 👋',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr>
          <td style="background:#18181b;padding:24px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;">✦ Sent People</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Welcome, ${full_name}! 👋</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#71717a;">Your Sent People HR account has been created. You can now log in using the details below.</p>

            <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#71717a;width:40%;">Platform</td>
                  <td style="padding:6px 0;font-size:12px;color:#18181b;font-weight:500;"><a href="${appUrl}" style="color:#18181b;">${appUrl}</a></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#71717a;">Email</td>
                  <td style="padding:6px 0;font-size:12px;color:#18181b;font-weight:500;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#71717a;">Password</td>
                  <td style="padding:6px 0;font-size:12px;color:#18181b;font-weight:500;font-family:monospace;">${password}</td>
                </tr>
              </table>
            </div>

            <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#713f12;">⚠️ You will be asked to <strong>change your password</strong> after your first login. Please do so immediately.</p>
            </div>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#18181b;border-radius:8px;">
                  <a href="${appUrl}/auth/login" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Log in to Sent People →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f4f4f5;padding:16px 32px;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">Sent People HR Platform · hr@sent.dm</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }).catch(() => {}) // silently ignore email errors

    return NextResponse.json({ success: true, id: authData.user.id })
  } catch (err) {
    console.error('[create employee]', err)
    return NextResponse.json({ error: 'Unexpected error occurred.' }, { status: 500 })
  }
}
