import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // First login — force password change
  if (user.user_metadata?.must_change_password === true) {
    redirect('/auth/change-password')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar role={profile.role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar — hidden on mobile (sidebar has its own mobile top bar) */}
        <div className="hidden lg:block">
          <TopBar profile={profile} />
        </div>
        {/* Mobile top bar spacer — pushes content below the fixed mobile header */}
        <div className="lg:hidden h-14 flex-shrink-0" />
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6 bg-zinc-50">
          {children}
        </main>
      </div>
    </div>
  )
}
