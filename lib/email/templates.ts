// ─── Email HTML Templates ─────────────────────────────────────────────────────
// Clean, branded emails for leave request notifications

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function wrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sent People</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:24px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                    ✦ Sent People
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;padding:16px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
                Sent People HR Platform · This is an automated notification · 
                <a href="${BASE_URL}/dashboard" style="color:#71717a;">Open Dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function button(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="background:#18181b;border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#71717a;width:40%;">${label}</td>
          <td style="font-size:12px;color:#18181b;font-weight:500;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`
}

// ── Template 1: Manager notified of new leave request ──────────────────────────
export function leaveRequestEmail({
  managerName,
  employeeName,
  leaveType,
  startDate,
  endDate,
  daysCount,
  reason,
  requestId,
}: {
  managerName: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  daysCount: number
  reason: string | null
  requestId: string | null
}): { subject: string; html: string } {
  const subject = `Leave Request: ${employeeName} — ${leaveType} (${daysCount}d)`

  const html = wrapper(`
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">New Leave Request</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;">
      Hi ${managerName}, ${employeeName} has submitted a leave request that requires your approval.
    </p>

    <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Employee', employeeName)}
        ${infoRow('Leave Type', leaveType)}
        ${infoRow('Start Date', startDate)}
        ${infoRow('End Date', endDate)}
        ${infoRow('Working Days', `${daysCount} day${daysCount !== 1 ? 's' : ''}`)}
        ${requestId ? infoRow('Request ID', requestId) : ''}
        ${reason ? infoRow('Reason', reason) : ''}
      </table>
    </div>

    <p style="margin:0 0 4px;font-size:13px;color:#71717a;">
      Please review and approve or reject this request in the dashboard.
    </p>

    ${button('Review Request', `${BASE_URL}/dashboard/leave`)}
  `)

  return { subject, html }
}

// ── Template 2: Employee notified of approval ──────────────────────────────────
export function leaveApprovedEmail({
  employeeName,
  leaveType,
  startDate,
  endDate,
  daysCount,
  approverName,
  approverNote,
  requestId,
}: {
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  daysCount: number
  approverName: string
  approverNote: string | null
  requestId: string | null
}): { subject: string; html: string } {
  const subject = `✅ Leave Approved: ${leaveType} (${daysCount}d)`

  const html = wrapper(`
    <div style="display:inline-block;background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:8px 16px;margin-bottom:20px;">
      <span style="color:#16a34a;font-size:14px;font-weight:700;">✓ Approved</span>
    </div>

    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Your Leave Has Been Approved</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;">
      Hi ${employeeName}, your leave request has been approved by ${approverName}.
    </p>

    <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Leave Type', leaveType)}
        ${infoRow('Start Date', startDate)}
        ${infoRow('End Date', endDate)}
        ${infoRow('Working Days', `${daysCount} day${daysCount !== 1 ? 's' : ''}`)}
        ${requestId ? infoRow('Request ID', requestId) : ''}
        ${approverName ? infoRow('Approved By', approverName) : ''}
      </table>
    </div>

    ${approverNote ? `
    <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#a16207;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Note from manager</p>
      <p style="margin:0;font-size:13px;color:#713f12;">${approverNote}</p>
    </div>` : ''}

    ${button('View My Leave', `${BASE_URL}/dashboard/leave`)}
  `)

  return { subject, html }
}

// ── Template 3: Employee notified of rejection ─────────────────────────────────
export function leaveRejectedEmail({
  employeeName,
  leaveType,
  startDate,
  endDate,
  daysCount,
  approverName,
  approverNote,
  requestId,
}: {
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  daysCount: number
  approverName: string
  approverNote: string | null
  requestId: string | null
}): { subject: string; html: string } {
  const subject = `❌ Leave Request Declined: ${leaveType} (${daysCount}d)`

  const html = wrapper(`
    <div style="display:inline-block;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:8px 16px;margin-bottom:20px;">
      <span style="color:#dc2626;font-size:14px;font-weight:700;">✗ Declined</span>
    </div>

    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Your Leave Request Was Declined</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;">
      Hi ${employeeName}, unfortunately your leave request has been declined by ${approverName}.
    </p>

    <div style="background:#f4f4f5;border-radius:8px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Leave Type', leaveType)}
        ${infoRow('Start Date', startDate)}
        ${infoRow('End Date', endDate)}
        ${infoRow('Working Days', `${daysCount} day${daysCount !== 1 ? 's' : ''}`)}
        ${requestId ? infoRow('Request ID', requestId) : ''}
      </table>
    </div>

    ${approverNote ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#991b1b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Reason for decline</p>
      <p style="margin:0;font-size:13px;color:#7f1d1d;">${approverNote}</p>
    </div>` : ''}

    <p style="margin:0 0 4px;font-size:13px;color:#71717a;">
      You may submit a new request with different dates or contact your manager for more information.
    </p>

    ${button('Submit New Request', `${BASE_URL}/dashboard/leave`)}
  `)

  return { subject, html }
}
