'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { UserRole } from '@/types/database.types'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles?: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Employees',
    href: '/dashboard/employees',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    roles: ['admin', 'hr_manager'],
  },
  {
    label: 'Departments',
    href: '/dashboard/departments',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    roles: ['admin', 'hr_manager'],
  },
  {
    label: 'Leave',
    href: '/dashboard/leave',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Audit Trail',
    href: '/dashboard/audit',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    roles: ['admin', 'hr_manager'],
  },
  {
    label: 'Documents',
    href: '/dashboard/documents',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Onboarding',
    href: '/dashboard/onboarding',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Reviews',
    href: '/dashboard/reviews',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    label: 'Calendar',
    href: '/dashboard/calendar',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    roles: ['admin', 'hr_manager'],
  },
  {
    label: 'My Profile',
    href: '/dashboard/profile',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    label: 'Leave Policy',
    href: '/dashboard/policy',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    label: 'Holidays',
    href: '/dashboard/settings/holidays',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    roles: ['admin', 'hr_manager'],
  },
]

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  )

  function NavLinks() {
    return (
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-zinc-400'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex w-56 flex-col flex-shrink-0 bg-white border-r border-zinc-200 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-zinc-100 flex-shrink-0">
          <img src="/sent-logo.png" alt="Sent" className="w-6 h-6 object-contain" />
          <span className="text-sm font-bold text-zinc-900 tracking-tight">Sent People</span>
        </div>
        <NavLinks />
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/sent-logo.png" alt="Sent" className="w-6 h-6 object-contain" />
          <span className="text-sm font-bold text-zinc-900">Sent People</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard/leave"
            className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
            aria-label="Leave"
          >
            <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Link>
          <Link
            href="/dashboard/profile"
            className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
            aria-label="Profile"
          >
            <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ───────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-zinc-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-zinc-900 rounded-md flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-bold text-zinc-900">Sent People</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <NavLinks />
          </aside>
        </>
      )}
      {/* ── Mobile bottom nav ───────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 flex items-center justify-around px-2 py-2 safe-area-pb">
        {[
          { href: '/dashboard', icon: '🏠', label: 'Home' },
          { href: '/dashboard/leave', icon: '📅', label: 'Leave' },
          { href: '/dashboard/documents', icon: '📄', label: 'Docs' },
          { href: '/dashboard/onboarding', icon: '✅', label: 'Tasks' },
          { href: '/dashboard/profile', icon: '👤', label: 'Me' },
        ].map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? 'bg-zinc-900' : 'hover:bg-zinc-50'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
