'use client'

import { useState } from 'react'

type Holiday = {
  id: string
  name: string
  date: string
  day_off: string
  year: number
  is_recurring: boolean
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function getHolidayIcon(name: string): string {
  if (name.includes('New Year'))     return '🎆'
  if (name.includes('Independence')) return '🇽🇰'
  if (name.includes('Constitution')) return '📜'
  if (name.includes('Easter'))       return '✝️'
  if (name.includes('Labour'))       return '⚒️'
  if (name.includes('Europe'))       return '🇪🇺'
  if (name.includes('Eid'))          return '🌙'
  if (name.includes('Christmas'))    return '🎄'
  if (name.includes('Orthodox'))     return '☦️'
  return '📅'
}

function fmt(dateStr: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleDateString('en-US', opts)
}

export default function HolidaysWidget({
  upcomingHolidays,
  allHolidays,
  year,
}: {
  upcomingHolidays: Holiday[]
  allHolidays: Holiday[]
  year: number
}) {
  const [showModal, setShowModal] = useState(false)
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Group all holidays by month for modal
  const byMonth: Record<number, Holiday[]> = {}
  allHolidays.forEach((h) => {
    const month = new Date(h.date).getMonth()
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(h)
  })

  function HolidayRow({ h, compact = false }: { h: Holiday; compact?: boolean }) {
    const dayOff = h.day_off
    const isShifted = dayOff !== h.date
    const d = new Date(h.date)
    const daysUntil = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isPast = dayOff < todayStr
    const isToday = h.date === todayStr || dayOff === todayStr
    const isThisWeek = !isPast && daysUntil >= 0 && daysUntil <= 7

    return (
      <div className={`flex items-center gap-3 ${
        compact
          ? 'px-5 py-3'
          : `px-3 py-3 rounded-xl border ${isToday ? 'bg-amber-50 border-amber-200' : isPast ? 'bg-zinc-50 border-zinc-100' : 'bg-white border-zinc-100'}`
      }`}>
        {/* Date block — shows holiday date */}
        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
          isThisWeek
            ? 'bg-amber-50 border border-amber-200'
            : isPast
            ? 'bg-zinc-100'
            : compact
            ? 'bg-zinc-50 border border-zinc-200'
            : 'bg-zinc-900'
        }`}>
          <span className={`text-xs font-bold leading-none ${
            isThisWeek ? 'text-amber-700' : isPast ? 'text-zinc-400' : compact ? 'text-zinc-700' : 'text-white'
          }`}>
            {String(d.getDate()).padStart(2, '0')}
          </span>
          <span className={`text-xs leading-none mt-0.5 ${
            isThisWeek ? 'text-amber-500' : isPast ? 'text-zinc-400' : 'text-zinc-400'
          }`}>
            {fmt(h.date, { month: 'short' })}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">{getHolidayIcon(h.name)}</span>
            <p className={`text-sm font-medium truncate ${isPast ? 'text-zinc-400' : 'text-zinc-900'}`}>
              {h.name}
            </p>
            {h.is_recurring && !compact && (
              <span className="text-xs text-zinc-300 flex-shrink-0">· Annual</span>
            )}
          </div>

          {/* Holiday date → Day off */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-zinc-400">
              {fmt(h.date, { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
            {isShifted && (
              <>
                <span className="text-xs text-zinc-300">→</span>
                <span className="text-xs font-medium text-amber-600">
                  Day off: {fmt(dayOff, { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Countdown */}
        <div className="flex-shrink-0 text-right">
          {isToday ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Today</span>
          ) : isPast ? (
            <span className="text-xs text-zinc-300">Passed</span>
          ) : daysUntil === 1 ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">Tomorrow</span>
          ) : daysUntil <= 14 ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">in {daysUntil}d</span>
          ) : (
            <span className="text-xs text-zinc-300">in {daysUntil}d</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Widget */}
      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">Kosovo Public Holidays</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Next 60 days</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            View all →
          </button>
        </div>

        {upcomingHolidays.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-zinc-400">No holidays in the next 60 days.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              View full year →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {upcomingHolidays.map((h) => (
              <HolidayRow key={h.id} h={h} compact />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Kosovo Public Holidays</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {year} · {allHolidays.length} official holidays
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Info banner */}
            <div className="mx-6 mt-4 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 flex-shrink-0">
              <p className="text-xs text-amber-800">
                <span className="font-medium">These days are excluded from leave calculations.</span>
                {' '}Per Law No. 03/L-064 on Official Holidays in Kosovo.
              </p>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {Object.entries(byMonth)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([monthIdx, monthHolidays]) => (
                  <div key={monthIdx}>
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      {MONTHS[parseInt(monthIdx)]}
                    </h3>
                    <div className="space-y-1.5">
                      {monthHolidays.map((h) => (
                        <HolidayRow key={h.id} h={h} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-100 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2 rounded-lg text-sm font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
