'use client'

type LeaveTypeConfig = {
  type: string
  label: string
  paid: boolean | null
  deducts_balance: boolean
  default_days: number | null
  notes: string | null
}

type Props = {
  leaveTypes: LeaveTypeConfig[]
  usageByType: Record<string, number>
  annualTotal: number
  annualUsed: number
  sickTotal: number
  sickUsed: number
  carriedOverDays: number
  carriedOverExpired: boolean
  carriedOverExpires: string
  year: number
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; bar: string; icon: string }> = {
  annual:         { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   bar: 'bg-blue-400',   icon: '🏖️' },
  sick:           { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    bar: 'bg-red-400',    icon: '🏥' },
  maternity:      { bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   bar: 'bg-pink-400',   icon: '🤱' },
  paternity:      { bg: 'bg-cyan-50',   border: 'border-cyan-200',   text: 'text-cyan-700',   bar: 'bg-cyan-400',   icon: '👨‍👧' },
  unpaid:         { bg: 'bg-zinc-50',   border: 'border-zinc-200',   text: 'text-zinc-600',   bar: 'bg-zinc-400',   icon: '📋' },
  marriage:       { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', bar: 'bg-purple-400', icon: '💍' },
  bereavement:    { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-600',  bar: 'bg-slate-400',  icon: '🕊️' },
  blood_donation: { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   bar: 'bg-rose-400',   icon: '🩸' },
  work_from_home: { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   bar: 'bg-teal-400',   icon: '🏠' },
  other:          { bg: 'bg-zinc-50',   border: 'border-zinc-200',   text: 'text-zinc-600',   bar: 'bg-zinc-300',   icon: '📁' },
}

function getStyle(type: string) {
  return TYPE_STYLES[type] ?? TYPE_STYLES.other
}

export default function LeaveBalanceSection({
  leaveTypes,
  usageByType,
  annualTotal,
  annualUsed,
  sickTotal,
  sickUsed,
  carriedOverDays,
  carriedOverExpired,
  carriedOverExpires,
  year,
}: Props) {
  const expiryFormatted = new Date(carriedOverExpires).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long',
  })

  // Build unified items list
  const items = leaveTypes.map((lt) => {
    const used = lt.type === 'annual' ? annualUsed : lt.type === 'sick' ? sickUsed : usageByType[lt.type] ?? 0
    let total: number | null = null
    let remaining: number | null = null
    let pct = 0

    if (lt.type === 'annual') {
      total = annualTotal + (carriedOverExpired ? 0 : carriedOverDays)
      remaining = total - annualUsed
      pct = total > 0 ? Math.round((annualUsed / total) * 100) : 0
    } else if (lt.type === 'sick') {
      total = sickTotal
      remaining = total - sickUsed
      pct = total > 0 ? Math.round((sickUsed / total) * 100) : 0
    } else if (lt.default_days) {
      total = lt.default_days
      remaining = total - used
      pct = total > 0 ? Math.round((used / total) * 100) : 0
    }

    return { ...lt, used, total, remaining, pct }
  })

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-700">Leave Balance — {year}</h2>
        <span className="text-xs text-zinc-400">{year} · all approved leave</span>
      </div>

      {/* Uniform grid — all types same size */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const style = getStyle(item.type)
          const hasLimit = item.total !== null
          const isDepleted = hasLimit && (item.remaining ?? 0) <= 0
          const isWarning  = hasLimit && (item.remaining ?? 0) > 0 && (item.remaining ?? 0) <= 3

          return (
            <div
              key={item.type}
              className={`rounded-xl border p-3.5 flex flex-col gap-2.5 ${style.bg} ${style.border}`}
            >
              {/* Top row — icon + label + badge */}
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none flex-shrink-0">{style.icon}</span>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold leading-tight truncate ${style.text}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {item.paid === true ? 'Paid' : item.paid === false ? 'Unpaid' : ''}
                    </p>
                  </div>
                </div>
                {isDepleted && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 flex-shrink-0">
                    Done
                  </span>
                )}
                {isWarning && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex-shrink-0">
                    Low
                  </span>
                )}
              </div>

              {/* Balance number */}
              <div className="flex items-end gap-1">
                <span className={`text-2xl font-bold tabular-nums leading-none ${
                  isDepleted ? 'text-red-500' : isWarning ? 'text-amber-600' : 'text-zinc-900'
                }`}>
                  {hasLimit ? (item.remaining ?? 0) : item.used}
                </span>
                <span className="text-xs text-zinc-400 mb-0.5 leading-none">
                  {hasLimit ? `/ ${item.total}d left` : 'd used'}
                </span>
              </div>

              {/* Progress bar — only for types with a limit */}
              {hasLimit && (
                <div>
                  <div className="w-full bg-white/70 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        isDepleted ? 'bg-red-400' : isWarning ? 'bg-amber-400' : style.bar
                      }`}
                      style={{ width: `${Math.min(item.pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-zinc-400">{item.used}d used</span>
                    <span className="text-xs text-zinc-400">{item.pct}%</span>
                  </div>
                </div>
              )}

              {/* Carried over note */}
              {item.type === 'annual' && carriedOverDays > 0 && (
                <p className={`text-xs flex items-center gap-1 pt-1 border-t ${style.border} ${
                  carriedOverExpired ? 'text-zinc-400 line-through' : 'text-amber-700'
                }`}>
                  <span>↩</span>
                  {carriedOverDays}d carried over
                  {carriedOverExpired ? ` · expired ${expiryFormatted}` : ` · expires ${expiryFormatted}`}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
