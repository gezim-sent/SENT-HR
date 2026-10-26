'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type LeaveRequest = {
  id: string
  type: string
  start_date: string
  end_date: string
  days_count: number
  status: string
  reason: string | null
  employee_id: string
  profiles: {
    id: string
    full_name: string
    avatar_url: string | null
    department_id: string | null
    departments: { id: string; name: string } | null
  }
}

type Holiday = {
  id: string
  name: string
  date: string
  year: number
  is_recurring: boolean
}

type Department = { id: string; name: string }
type Employee = { id: string; full_name: string; avatar_url: string | null; department_id: string | null; hire_date: string | null }

type Props = {
  leaveRequests: LeaveRequest[]
  holidays: Holiday[]
  departments: Department[]
  employees: Employee[]
  currentUserId: string
  isHR: boolean
  initialView: 'month' | 'week' | 'day'
  initialDate: string
  activeDept: string
  activeEmployee: string
}

// Leave type color system
const LEAVE_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  annual:         { bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500',    border: 'border-blue-200' },
  sick:           { bg: 'bg-red-100',     text: 'text-red-800',     dot: 'bg-red-500',     border: 'border-red-200' },
  maternity:      { bg: 'bg-pink-100',    text: 'text-pink-800',    dot: 'bg-pink-500',    border: 'border-pink-200' },
  paternity:      { bg: 'bg-cyan-100',    text: 'text-cyan-800',    dot: 'bg-cyan-500',    border: 'border-cyan-200' },
  unpaid:         { bg: 'bg-zinc-100',    text: 'text-zinc-700',    dot: 'bg-zinc-500',    border: 'border-zinc-200' },
  marriage:       { bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-500',  border: 'border-purple-200' },
  bereavement:    { bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-500',   border: 'border-slate-200' },
  blood_donation: { bg: 'bg-rose-100',    text: 'text-rose-800',    dot: 'bg-rose-500',    border: 'border-rose-200' },
  child_care:     { bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-500',  border: 'border-orange-200' },
  compassionate:  { bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-500',   border: 'border-amber-200' },
  work_from_home: { bg: 'bg-teal-100',    text: 'text-teal-800',    dot: 'bg-teal-500',    border: 'border-teal-200' },
  business_travel:{ bg: 'bg-indigo-100',  text: 'text-indigo-800',  dot: 'bg-indigo-500',  border: 'border-indigo-200' },
  training:       { bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-500',   border: 'border-green-200' },
  other:          { bg: 'bg-zinc-100',    text: 'text-zinc-700',    dot: 'bg-zinc-400',    border: 'border-zinc-200' },
}

const LEAVE_LABELS: Record<string, string> = {
  annual: 'Annual', sick: 'Sick', maternity: 'Maternity',
  paternity: 'Paternity', unpaid: 'Unpaid', marriage: 'Marriage',
  bereavement: 'Bereavement', blood_donation: 'Blood Donation',
  child_care: 'Child Care', compassionate: 'Compassionate',
  work_from_home: 'WFH', business_travel: 'Business Travel',
  training: 'Training', other: 'Other',
}

function colorFor(type: string) {
  return LEAVE_COLORS[type] ?? LEAVE_COLORS.other
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start)
  const endDate = new Date(end)
  while (cur <= endDate) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function isSameDay(a: string, b: string) { return a === b }

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split('T')[0]
}

function isWeekend(dateStr: string) {
  const day = new Date(dateStr).getDay()
  return day === 0 || day === 6
}

export default function TeamCalendar({
  leaveRequests,
  holidays,
  departments,
  employees,
  currentUserId,
  isHR,
  initialView,
  initialDate,
  activeDept,
  activeEmployee,
}: Props) {
  const router = useRouter()
  const [view, setView] = useState<'month' | 'week' | 'day'>(initialView)
  const [currentDate, setCurrentDate] = useState(new Date(initialDate))
  const [selectedEvent, setSelectedEvent] = useState<LeaveRequest | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState(activeDept)
  const [employeeFilter, setEmployeeFilter] = useState(activeEmployee)
  const [showBirthdays, setShowBirthdays] = useState(false)
  const [showHolidays, setShowHolidays] = useState(true)

  // Build holiday date map
  const holidayMap = useMemo(() => {
    const map: Record<string, Holiday> = {}
    holidays.forEach((h) => { map[h.date] = h })
    return map
  }, [holidays])

  // Build birthday map
  const birthdayMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    if (showBirthdays) {
      employees.forEach((emp) => {
        if (emp.hire_date) {
          const d = new Date(emp.hire_date)
          const key = `${currentDate.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (!map[key]) map[key] = []
          map[key].push(emp.full_name)
        }
      })
    }
    return map
  }, [employees, showBirthdays, currentDate])

  // Filter requests
  const filteredRequests = useMemo(() => {
    let reqs = leaveRequests
    if (deptFilter) reqs = reqs.filter((r) => r.profiles?.department_id === deptFilter)
    if (employeeFilter) reqs = reqs.filter((r) => r.profiles?.id === employeeFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      reqs = reqs.filter((r) => r.profiles?.full_name.toLowerCase().includes(q))
    }
    return reqs
  }, [leaveRequests, deptFilter, employeeFilter, searchQuery])

  // Map date -> events
  const eventsByDate = useMemo(() => {
    const map: Record<string, LeaveRequest[]> = {}
    filteredRequests.forEach((req) => {
      const dates = dateRange(req.start_date, req.end_date)
      dates.forEach((d) => {
        if (!map[d]) map[d] = []
        map[d].push(req)
      })
    })
    return map
  }, [filteredRequests])

  // Upcoming leave (next 30 days)
  const todayStr = new Date().toISOString().split('T')[0]
  const in30Str = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const upcomingLeave = filteredRequests
    .filter((r) => r.start_date >= todayStr && r.start_date <= in30Str)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 8)

  // Navigation
  function prev() {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() - 1)
    else if (view === 'week') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }

  function next() {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + 1)
    else if (view === 'week') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }

  function goToday() { setCurrentDate(new Date()) }

  // Month view grid
  function getMonthDays() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (string | null)[] = []

    // Pad start
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return days
  }

  // Week view days
  function getWeekDays() {
    const days: string[] = []
    const d = new Date(currentDate)
    d.setDate(d.getDate() - d.getDay()) // go to Sunday
    for (let i = 0; i < 7; i++) {
      days.push(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
    return days
  }

  const headerTitle = view === 'month'
    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : view === 'week'
    ? (() => {
        const days = getWeekDays()
        const s = new Date(days[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const e = new Date(days[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        return `${s} – ${e}`
      })()
    : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const inputClass = 'px-3 py-2 rounded-lg text-sm text-zinc-700 border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900'

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Team Calendar</h1>
          <p className="text-sm mt-0.5 text-zinc-400">Company-wide leave overview</p>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                view === v
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main calendar */}
        <div className="xl:col-span-3 space-y-4">
          {/* Filters & navigation */}
          <div className="rounded-xl bg-white border border-zinc-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <button onClick={prev} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                  <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-700">
                  Today
                </button>
                <button onClick={next} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                  <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <h2 className="text-sm font-semibold text-zinc-900 ml-1">{headerTitle}</h2>
              </div>

              <div className="flex-1" />

              {/* Search employee */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee…"
                className={inputClass + ' w-44'}
              />

              {/* Department filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Employee filter */}
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>

              {/* Toggles */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHolidays}
                    onChange={(e) => setShowHolidays(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-xs text-zinc-600">Holidays</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBirthdays}
                    onChange={(e) => setShowBirthdays(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  <span className="text-xs text-zinc-600">Work anniversaries</span>
                </label>
              </div>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
            {/* Month view */}
            {view === 'month' && (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-zinc-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-2.5 text-center text-xs font-medium text-zinc-400">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7">
                  {getMonthDays().map((dateStr, i) => {
                    if (!dateStr) {
                      return <div key={`empty-${i}`} className="min-h-24 border-b border-r border-zinc-100 bg-zinc-50/50" />
                    }

                    const events = eventsByDate[dateStr] ?? []
                    const holiday = showHolidays ? holidayMap[dateStr] : null
                    const birthdays = birthdayMap[dateStr] ?? []
                    const today = isToday(dateStr)
                    const weekend = isWeekend(dateStr)
                    const isLastInRow = (i + 1) % 7 === 0

                    return (
                      <div
                        key={dateStr}
                        className={`min-h-24 border-b border-r border-zinc-100 p-1.5 ${
                          weekend ? 'bg-zinc-50/60' : ''
                        } ${holiday ? 'bg-amber-50/40' : ''} ${isLastInRow ? 'border-r-0' : ''}`}
                      >
                        {/* Date number */}
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                            today
                              ? 'bg-zinc-900 text-white'
                              : weekend
                              ? 'text-zinc-400'
                              : 'text-zinc-700'
                          }`}>
                            {new Date(dateStr).getDate()}
                          </span>
                          {holiday && (
                            <span className="text-xs text-amber-600 truncate ml-1 hidden sm:block" title={holiday.name}>
                              🎌 {holiday.name}
                            </span>
                          )}
                        </div>

                        {/* Work anniversaries */}
                        {birthdays.slice(0, 1).map((name) => (
                          <div key={name} className="text-xs text-purple-600 truncate mb-0.5">
                            🎂 {name.split(' ')[0]}
                          </div>
                        ))}

                        {/* Leave events */}
                        {events.slice(0, 3).map((ev) => {
                          const c = colorFor(ev.type)
                          const initials = ev.profiles.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                          return (
                            <button
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev)}
                              className={`w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium mb-0.5 truncate ${c.bg} ${c.text} hover:opacity-80 transition-opacity`}
                            >
                              <span className="flex-shrink-0">{initials}</span>
                              <span className="truncate hidden sm:block">
                                {ev.profiles.full_name.split(' ')[0]}
                              </span>
                            </button>
                          )
                        })}
                        {events.length > 3 && (
                          <div className="text-xs text-zinc-400 px-1">+{events.length - 3} more</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Week view */}
            {view === 'week' && (
              <>
                <div className="grid grid-cols-7 border-b border-zinc-100">
                  {getWeekDays().map((dateStr) => {
                    const today = isToday(dateStr)
                    const holiday = showHolidays ? holidayMap[dateStr] : null
                    return (
                      <div
                        key={dateStr}
                        className={`py-3 text-center border-r border-zinc-100 last:border-r-0 ${holiday ? 'bg-amber-50' : ''}`}
                      >
                        <div className="text-xs text-zinc-400">
                          {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-lg font-semibold mt-0.5 mx-auto w-9 h-9 flex items-center justify-center rounded-full ${
                          today ? 'bg-zinc-900 text-white' : 'text-zinc-900'
                        }`}>
                          {new Date(dateStr).getDate()}
                        </div>
                        {holiday && (
                          <div className="text-xs text-amber-600 mt-1 px-1 truncate">{holiday.name}</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="grid grid-cols-7 divide-x divide-zinc-100 min-h-48">
                  {getWeekDays().map((dateStr) => {
                    const events = eventsByDate[dateStr] ?? []
                    const birthdays = birthdayMap[dateStr] ?? []
                    const weekend = isWeekend(dateStr)
                    return (
                      <div key={dateStr} className={`p-2 space-y-1 ${weekend ? 'bg-zinc-50/60' : ''}`}>
                        {birthdays.map((name) => (
                          <div key={name} className="text-xs text-purple-600 px-1">🎂 {name.split(' ')[0]}</div>
                        ))}
                        {events.map((ev) => {
                          const c = colorFor(ev.type)
                          return (
                            <button
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev)}
                              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium ${c.bg} ${c.text} border ${c.border} hover:opacity-80 transition-opacity`}
                            >
                              <div className="font-semibold truncate">{ev.profiles.full_name.split(' ')[0]}</div>
                              <div className="opacity-70">{LEAVE_LABELS[ev.type] ?? ev.type}</div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Day view */}
            {view === 'day' && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                    isToday(currentDate.toISOString().split('T')[0]) ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-900'
                  }`}>
                    {currentDate.getDate()}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', year: 'numeric' })}
                    </p>
                    {showHolidays && holidayMap[currentDate.toISOString().split('T')[0]] && (
                      <p className="text-sm text-amber-600">
                        🎌 {holidayMap[currentDate.toISOString().split('T')[0]].name}
                      </p>
                    )}
                  </div>
                </div>

                {(() => {
                  const dayStr = currentDate.toISOString().split('T')[0]
                  const events = eventsByDate[dayStr] ?? []
                  return events.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-zinc-400 text-sm">No leave scheduled for this day.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {events.map((ev) => {
                        const c = colorFor(ev.type)
                        const initials = ev.profiles.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                        return (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border ${c.border} ${c.bg} hover:opacity-80 transition-opacity`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${c.bg} ${c.text} border-2 ${c.border}`}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm ${c.text}`}>{ev.profiles.full_name}</p>
                              <p className={`text-xs opacity-80 ${c.text}`}>
                                {LEAVE_LABELS[ev.type] ?? ev.type} · {ev.days_count} day{ev.days_count !== 1 ? 's' : ''}
                              </p>
                              <p className={`text-xs opacity-70 ${c.text}`}>
                                {new Date(ev.start_date).toLocaleDateString()} – {new Date(ev.end_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
                              {LEAVE_LABELS[ev.type] ?? ev.type}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="rounded-xl bg-white border border-zinc-200 p-4">
            <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide">Legend</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(LEAVE_LABELS).map(([type, label]) => {
                const c = colorFor(type)
                return (
                  <span key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {label}
                  </span>
                )
              })}
              {showHolidays && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                  🎌 Holiday
                </span>
              )}
              {showBirthdays && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                  🎂 Work Anniversary
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming leave */}
          <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-100">
              <h3 className="text-sm font-medium text-zinc-900">Upcoming Leave</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Next 30 days</p>
            </div>
            {upcomingLeave.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-zinc-400">None scheduled.</div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {upcomingLeave.map((leave) => {
                  const c = colorFor(leave.type)
                  const initials = leave.profiles.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                  return (
                    <button
                      key={leave.id}
                      onClick={() => setSelectedEvent(leave)}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${c.bg} ${c.text}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-900 truncate">{leave.profiles.full_name}</p>
                          <p className="text-xs text-zinc-400">
                            {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' '}· {leave.days_count}d
                          </p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text} flex-shrink-0`}>
                          {LEAVE_LABELS[leave.type] ?? leave.type}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Today's absences */}
          {(() => {
            const todayEvents = eventsByDate[todayStr] ?? []
            return todayEvents.length > 0 ? (
              <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3.5 border-b border-zinc-100">
                  <h3 className="text-sm font-medium text-zinc-900">Out Today</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{todayEvents.length} employee{todayEvents.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y divide-zinc-50">
                  {todayEvents.map((ev) => {
                    const c = colorFor(ev.type)
                    return (
                      <div key={ev.id} className="px-4 py-3 flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-900 truncate">{ev.profiles.full_name}</p>
                          <p className="text-xs text-zinc-400">{LEAVE_LABELS[ev.type] ?? ev.type}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null
          })()}
        </div>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvent(null) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            {(() => {
              const c = colorFor(selectedEvent.type)
              const initials = selectedEvent.profiles.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)
              return (
                <>
                  <div className={`px-6 py-5 ${c.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${c.bg} ${c.text} border-2 ${c.border}`}>
                          {initials}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${c.text}`}>{selectedEvent.profiles.full_name}</p>
                          <p className={`text-xs opacity-80 ${c.text}`}>{selectedEvent.profiles.departments?.name}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedEvent(null)} className={`${c.text} opacity-60 hover:opacity-100`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Leave type</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
                        {LEAVE_LABELS[selectedEvent.type] ?? selectedEvent.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Start date</span>
                      <span className="text-xs font-medium text-zinc-900">
                        {new Date(selectedEvent.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">End date</span>
                      <span className="text-xs font-medium text-zinc-900">
                        {new Date(selectedEvent.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Duration</span>
                      <span className="text-xs font-medium text-zinc-900">{selectedEvent.days_count} business day{selectedEvent.days_count !== 1 ? 's' : ''}</span>
                    </div>
                    {/* Only show reason to HR */}
                    {isHR && selectedEvent.reason && (
                      <div className="pt-2 border-t border-zinc-100">
                        <span className="text-xs text-zinc-400 block mb-1">Reason</span>
                        <p className="text-xs text-zinc-700 italic">"{selectedEvent.reason}"</p>
                      </div>
                    )}
                    {!isHR && (
                      <div className="pt-2 border-t border-zinc-100">
                        <p className="text-xs text-zinc-400">Reason and documents are confidential.</p>
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
