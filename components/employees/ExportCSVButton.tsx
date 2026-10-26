'use client'

type Employee = {
  full_name: string
  email: string
  phone: string | null
  job_title: string | null
  role: string
  status: string
  employee_id: string | null
  hire_date: string | null
  department_id: string | null
  departments?: { name: string } | null
}

export default function ExportExcelButton({ employees }: { employees: Employee[] }) {
  function exportExcel() {
    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'Job Title',
      'Department',
      'Role',
      'Status',
      'Employee ID',
      'Start Date',
    ]

    const rows = employees.map((e) => [
      e.full_name,
      e.email,
      e.phone ?? '',
      e.job_title ?? '',
      (e.departments as any)?.name ?? '',
      e.role.replace('_', ' '),
      e.status.replace('_', ' '),
      e.employee_id ?? '',
      e.hire_date
        ? new Date(e.hire_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        : '',
    ])

    // Build HTML table — Excel opens this natively and preserves formatting
    const today = new Date().toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric'
    })

    const tableRows = rows.map((row) =>
      `<tr>${row.map((cell) => `<td style="border:1px solid #e4e4e7;padding:8px 12px;font-size:13px;">${cell}</td>`).join('')}</tr>`
    ).join('')

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
          <x:Name>Employees</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          .title { font-size: 18px; font-weight: bold; color: #18181b; padding: 12px 0 4px; }
          .subtitle { font-size: 12px; color: #71717a; padding-bottom: 16px; }
          th {
            background: #18181b;
            color: #ffffff;
            font-weight: 600;
            font-size: 12px;
            padding: 10px 12px;
            border: 1px solid #18181b;
            text-align: left;
            white-space: nowrap;
          }
          td { vertical-align: middle; }
          tr:nth-child(even) td { background: #f4f4f5; }
        </style>
      </head>
      <body>
        <p class="title">Employee Directory</p>
        <p class="subtitle">Sent People HR · Exported ${today} · ${employees.length} employees</p>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([html], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `employees-${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={exportExcel}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
    >
      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export Excel
    </button>
  )
}
