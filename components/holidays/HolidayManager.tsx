'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Holiday = {
  id: string
  name: string
  date: string
  day_off: string
  year: number
  is_recurring: boolean
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getHolidayStyle(name: string): { icon: string; color: string } {
  const styles: Record<string, { icon: string; color: string }> = {
    'New Year':       { icon: '🎆', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    'Independence':   { icon: '🇽🇰', color: 'bg-red-50 text-red-700 border-red-200' },
    'Constitution':   { icon: '📜', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    'Easter':         { icon: '✝️', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    'Labour':         { icon: '⚒️', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    'Europe':         { icon: '🇪🇺', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    'Eid':            { icon: '🌙', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    'Christmas':      { icon: '🎄', color: 'bg-green-50 text-green-700 border-green-200' },
    'Orthodox':       { icon: '☦️', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  }
  for (const [key, val] of Object.entries(styles)) {
    if (name.includes(key)) return val
  }
  return { icon: '📅', color: 'bg-zinc-50 text-zinc-700 border-zinc-200' }
}

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

export default function HolidayManager({
  holidays,
  year,
  isAdmin,
}: {
  holidays: Holiday[]
  year: number
  isAdmin: boolean
}) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    date: `${year}-01-01`,
    day_off: `${year}-01-01`,
    is_recurring: false,
  })

  const supabase = createClient()

  // Group by month
  const byMonth: Record<number, Holiday[]> = {}
  holidays.forEach((h) => {
    const month = new Date(h.date).getMonth()
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(h)
  })

  // Auto-set day_off when date changes
  function handleDateChange(dateStr: string) {
    const d = new Date(dateStr)
    const day = d.getDay()
    let dayOff = dateStr
    if (day === 0) { const m = new Date(d); m.setDate(d.getDate() + 1); dayOff = m.toISOString().split('T')[0] }
    if (day === 6) { const m = new Date(d); m.setDate(d.getDate() + 2); dayOff = m.toISOString().split('T')[0] }
    setForm((p) => ({ ...p, date: dateStr, day_off: dayOff }))
  }

  async function handleAdd() {
    if (!form.name || !form.date) return
    setLoading(true)
    const { error } = await supabase.from('holidays').insert({
      name: form.name,
      date: form.date,
      day_off: form.day_off,
      year: new Date(form.date).getFullYear(),
      is_recurring: form.is_recurring,
    })
    setLoading(false)
    if (!error) {
      setShowAddForm(false)
      setForm({ name: '', date: `${year}-01-01`, day_off: `${year}-01-01`, is_recurring: false })
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this holiday?')) return
    setDeleting(id)
    await supabase.from('holidays').delete().eq('id', id)
    setDeleting(null)
    router.refresh()
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg text-sm text-zinc-900 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'

  return (
    <div className="space-y-4">
      {/* Year switcher + add */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {[year - 1, year, year + 1].map((y) => (
            <a
              key={y}
              href={`/dashboard/settings/holidays?year=${y}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                y === year ? 'bg-zinc-900 text-white' : 'text-zinc-500 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {y}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{holidays.length} holidays in {year}</span>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-xl bg-white border border-zinc-200 p-5 space-y-4">
          <h3 className="text-sm font-medium text-zinc-900">Add Holiday</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-600 mb-1">Holiday Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Mother Teresa Day"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Holiday Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleDateChange(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-zinc-400 mt-1">
                {new Date(form.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Official Day Off *</label>
              <input
                type="date"
                value={form.day_off}
                onChange={(e) => setForm((p) => ({ ...p, day_off: e.target.value }))}
                className={inputClass}
              />
              <p className="text-xs text-zinc-400 mt-1">
                {new Date(form.day_off).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={(e) => setForm((p) => ({ ...p, is_recurring: e.target.checked }))}
              className="rounded border-zinc-300"
            />
            <span className="text-sm text-zinc-700">Fixed date each year (e.g. New Year's Day)</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add Holiday'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-zinc-500 border border-zinc-200 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
        <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-medium">These holidays are automatically excluded from leave day calculations.</span>
          {' '}Per Law No. 03/L-064. Islamic and Easter holidays change each year based on the lunar calendar.
        </p>
      </div>

      {/* Table view */}
      {holidays.length === 0 ? (
        <div className="rounded-xl bg-white border border-zinc-200 p-10 text-center">
          <p className="text-zinc-400 text-sm">No holidays configured for {year}.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 px-5 py-3 border-b border-zinc-100 bg-zinc-50">
            <div className="col-span-1 text-xs font-medium text-zinc-400">#</div>
            <div className="col-span-4 text-xs font-medium text-zinc-400">Holiday</div>
            <div className="col-span-3 text-xs font-medium text-zinc-400">Holiday Date</div>
            <div className="col-span-3 text-xs font-medium text-zinc-400">Official Day Off</div>
            <div className="col-span-1" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-zinc-50">
            {holidays.map((holiday, idx) => {
              const style = getHolidayStyle(holiday.name)
              const isShifted = holiday.day_off !== holiday.date

              return (
                <div key={holiday.id} className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-zinc-50/60 transition-colors">
                  {/* # */}
                  <div className="col-span-1">
                    <span className="text-xs text-zinc-300 tabular-nums">{idx + 1}</span>
                  </div>

                  {/* Name */}
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border truncate ${style.color}`}>
                      {style.icon} {holiday.name}
                    </span>
                    {holiday.is_recurring && (
                      <span className="text-xs text-zinc-300 flex-shrink-0">↺</span>
                    )}
                  </div>

                  {/* Holiday date */}
                  <div className="col-span-3">
                    <p className="text-xs font-medium text-zinc-700">
                      {new Date(holiday.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                  </div>

                  {/* Day off */}
                  <div className="col-span-3">
                    <p className={`text-xs font-medium ${isShifted ? 'text-amber-700' : 'text-zinc-700'}`}>
                      {new Date(holiday.day_off).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className={`text-xs ${isShifted ? 'text-amber-500' : 'text-zinc-400'}`}>
                      {new Date(holiday.day_off).toLocaleDateString('en-US', { weekday: 'long' })}
                      {isShifted && ' ·  observed'}
                    </p>
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex justify-end">
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(holiday.id)}
                        disabled={deleting === holiday.id}
                        className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
