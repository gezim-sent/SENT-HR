// ─── Leave Request PDF Generator ─────────────────────────────────────────────
// Generates an official "Kërkesë për Pushim" document matching the Sent HR format
// Language: Albanian (as per company standard)

export type LeaveRequestPDFData = {
  // Employee
  employee_name: string
  employee_email: string
  submitted_at: string

  // Leave details
  leave_type_label: string
  start_date: string
  end_date: string
  return_date?: string | null
  days_count: number
  reason?: string | null

  // Request identification
  request_id: string | null

  // Manager decision
  status: string
  approver_name?: string | null
  approver_email?: string | null
  approver_note?: string | null
  reviewed_at?: string | null
  approver_signature?: string | null // base64 image or null

  // HR
  hr_email?: string
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function statusAlbanian(status: string): { label: string; color: string; icon: string } {
  switch (status) {
    case 'approved': return { label: 'MIRATUAR', color: '#7c3aed', icon: '☑' }
    case 'rejected': return { label: 'REFUZUAR', color: '#dc2626', icon: '☒' }
    case 'pending':  return { label: 'NË PRITJE', color: '#d97706', icon: '◉' }
    default:         return { label: status.toUpperCase(), color: '#52525b', icon: '○' }
  }
}

function leaveTypeAlbanian(type: string, label: string): string {
  // Map English labels to Albanian
  const map: Record<string, string> = {
    'Annual Leave':       'Pushim Vjetor',
    'Sick Leave':         'Pushim Mjekësor',
    'Maternity Leave':    'Leje Lindje (Nënë)',
    'Paternity Leave':    'Leje Lindje (Baba)',
    'Unpaid Leave':       'Pushim pa Pagesë',
    'Marriage Leave':     'Leje Martese',
    'Bereavement Leave':  'Leje Zie',
    'Blood Donation Leave': 'Leje Dhurimi Gjaku',
    'Child Care Leave':   'Leje Kujdesi për Fëmijë',
    'Compassionate Leave':'Leje Humanitare',
    'Work From Home':     'Punë nga Shtëpia',
    'Business Travel':    'Udhëtim Biznesi',
    'Training Leave':     'Leje Trajnimi',
  }
  return map[label] ?? label
}

export function generateLeaveRequestHTML(data: LeaveRequestPDFData): string {
  const statusInfo = statusAlbanian(data.status)
  const leaveLabel = leaveTypeAlbanian(data.leave_type_label, data.leave_type_label)
  const requestNum = data.request_id ?? '—'
  const submittedDate = formatDate(data.submitted_at)
  const reviewedDate = data.reviewed_at ? formatDate(data.reviewed_at) : '—'

  const declarationText = `Deklaroj se informacioni i paraqitur është i saktë dhe i plotë. Jam i vetëdijshëm se miratimi i kësaj kërkese është subjekt i politikave të kompanisë dhe legjislacionit në fuqi të Republikës së Kosovës.`

  const footerNote = `Ky dokument ruhet automatikisht në Drive dhe është evidencë elektronike e kërkesës për pushim.`

  return `<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="utf-8" />
  <title>Kërkesë për Pushim — ${requestNum}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #18181b;
      background: #fff;
      padding: 40px 48px;
      max-width: 800px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 2px solid #7c3aed;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
    }
    .logo-text {
      font-size: 22px;
      font-weight: 700;
      color: #18181b;
      letter-spacing: -0.5px;
    }
    .header-right {
      text-align: right;
    }
    .doc-title {
      font-size: 22px;
      font-weight: 800;
      color: #7c3aed;
      letter-spacing: -0.3px;
      text-transform: uppercase;
    }
    .doc-meta {
      font-size: 11px;
      color: #52525b;
      margin-top: 4px;
      line-height: 1.6;
    }
    .doc-meta strong { color: #18181b; }

    /* Sections */
    .section {
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .section-header {
      background: #f4f4f5;
      padding: 7px 14px;
      font-size: 10px;
      font-weight: 700;
      color: #71717a;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-bottom: 1px solid #e4e4e7;
    }

    /* Two-column layout for employee + leave details */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }

    /* Table rows */
    table { width: 100%; border-collapse: collapse; }
    td {
      padding: 9px 14px;
      border-bottom: 1px solid #f4f4f5;
      vertical-align: top;
      line-height: 1.5;
    }
    td:last-child { border-bottom: none; }
    tr:last-child td { border-bottom: none; }
    .td-label {
      font-weight: 700;
      color: #18181b;
      width: 44%;
      font-size: 12.5px;
    }
    .td-value {
      color: #3f3f46;
      font-size: 12.5px;
    }

    /* Reason box */
    .reason-box {
      padding: 10px 14px;
      font-size: 12.5px;
      color: #3f3f46;
      min-height: 40px;
      line-height: 1.6;
    }

    /* Status decision */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 17px;
      font-weight: 800;
      color: ${statusInfo.color};
      padding: 10px 14px 6px;
      letter-spacing: 0.05em;
    }
    .status-icon { font-size: 20px; }

    /* Signature box */
    .sig-box {
      margin: 0 14px 14px;
      border: 1px solid #e4e4e7;
      border-radius: 4px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
    }
    .sig-box img {
      max-height: 80px;
      max-width: 260px;
      object-fit: contain;
    }
    .sig-placeholder {
      color: #d4d4d8;
      font-size: 11px;
    }

    /* Declaration */
    .declaration {
      font-size: 11.5px;
      color: #52525b;
      line-height: 1.65;
    }

    /* Footer */
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e4e4e7;
      font-size: 10.5px;
      color: #a1a1aa;
      text-align: center;
    }

    @media print {
      body { padding: 24px 32px; }
      .two-col { break-inside: avoid; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="logo">
      <!-- Sent logo SVG -->
      <svg class="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="#18181b"/>
        <path d="M8 12l8-5 8 5v10l-8 5-8-5V12z" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M8 12l8 5 8-5" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M16 17v10" stroke="white" stroke-width="1.5"/>
      </svg>
      <span class="logo-text">Sent</span>
    </div>
    <div class="header-right">
      <div class="doc-title">Kërkesë për Pushim</div>
      <div class="doc-meta">
        Nr. i Kërkesës: <strong>${requestNum}</strong><br/>
        Data: <strong>${submittedDate}</strong>
      </div>
    </div>
  </div>

  <!-- Employee + Leave details side by side -->
  <div class="two-col">
    <!-- Employee details -->
    <div class="section">
      <div class="section-header">Të Dhënat e Punonjësit</div>
      <table>
        <tr>
          <td class="td-label">Emri dhe Mbiemri</td>
          <td class="td-value">${data.employee_name}</td>
        </tr>
        <tr>
          <td class="td-label">Email në listë</td>
          <td class="td-value">${data.employee_email}</td>
        </tr>
        <tr>
          <td class="td-label">Email i verifikuar nga Google Form</td>
          <td class="td-value">${data.employee_email}</td>
        </tr>
        <tr>
          <td class="td-label">Koha e dorëzimit</td>
          <td class="td-value">${submittedDate}</td>
        </tr>
      </table>
    </div>

    <!-- Leave details -->
    <div class="section">
      <div class="section-header">Detajet e Pushimit</div>
      <table>
        <tr>
          <td class="td-label">Lloji i Pushimit</td>
          <td class="td-value">${leaveLabel}</td>
        </tr>
        <tr>
          <td class="td-label">Data e Fillimit</td>
          <td class="td-value">${formatDate(data.start_date)}</td>
        </tr>
        <tr>
          <td class="td-label">Data e Përfundimit</td>
          <td class="td-value">${formatDate(data.end_date)}</td>
        </tr>
        <tr>
          <td class="td-label">Data e Kthimit</td>
          <td class="td-value">${data.return_date ? formatDate(data.return_date) : '—'}</td>
        </tr>
        <tr>
          <td class="td-label">Ditë Pune</td>
          <td class="td-value">${data.days_count}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Reason -->
  <div class="section">
    <div class="section-header">Arsyeja</div>
    <div class="reason-box">${data.reason || '—'}</div>
  </div>

  <!-- Request identification -->
  <div class="section">
    <div class="section-header">Identifikimi i Kërkesës</div>
    <table>
      <tr>
        <td class="td-label">Email i verifikuar</td>
        <td class="td-value">${data.employee_email}</td>
      </tr>
      <tr>
        <td class="td-label">Request ID</td>
        <td class="td-value">${requestNum}</td>
      </tr>
      <tr>
        <td class="td-label">Timestamp</td>
        <td class="td-value">${submittedDate}</td>
      </tr>
      <tr>
        <td class="td-label">Deklarata</td>
        <td class="td-value declaration">${declarationText}</td>
      </tr>
    </table>
  </div>

  <!-- Manager decision -->
  <div class="section">
    <div class="section-header">Vendimi i Menaxherit</div>
    <div class="status-badge">
      <span class="status-icon">${statusInfo.icon}</span>
      ${statusInfo.label}
    </div>
    <table>
      <tr>
        <td class="td-label">Menaxheri</td>
        <td class="td-value">${data.approver_name ?? '—'}</td>
      </tr>
      <tr>
        <td class="td-label">Email i Menaxherit</td>
        <td class="td-value">${data.approver_email ?? '—'}</td>
      </tr>
      <tr>
        <td class="td-label">Koment i Menaxherit</td>
        <td class="td-value">${data.approver_note ?? '—'}</td>
      </tr>
      <tr>
        <td class="td-label">Data e Vendimit</td>
        <td class="td-value">${reviewedDate}</td>
      </tr>
      <tr>
        <td class="td-label">Nënshkrimi i Menaxherit</td>
        <td class="td-value"></td>
      </tr>
    </table>
    <!-- Signature box -->
    <div class="sig-box">
      ${data.approver_signature
        ? `<img src="${data.approver_signature}" alt="Nënshkrimi" />`
        : `<span class="sig-placeholder">Nënshkrimi elektronik nuk është vendosur</span>`
      }
    </div>
  </div>

  <!-- HR confirmation -->
  <div class="section">
    <div class="section-header">Konfirmimi i HR</div>
    <table>
      <tr>
        <td class="td-label">HR</td>
        <td class="td-value">${data.hr_email ?? 'hr@sent.dm'}</td>
      </tr>
      <tr>
        <td class="td-label">Shënim</td>
        <td class="td-value">Ky dokument është gjeneruar automatikisht nga sistemi SENT HR.</td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    ${footerNote}
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`
}
