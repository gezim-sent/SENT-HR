import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HolidayManager from '@/components/holidays/HolidayManager'
import CarryOverManager from '@/components/holidays/CarryOverManager'

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'hr_manager')) {
    redirect('/dashboard')
  }

  const year = parseInt(params.year ?? new Date().getFullYear().toString())

  const { data: holidays } = await supabase
    .from('holidays')
    .select('*')
    .eq('year', year)
    .order('date')

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Kosovo Public Holidays</h1>
        <p className="text-sm mt-0.5 text-zinc-400">
          Official holidays per Law No. 03/L-064. These days are excluded from leave day calculations.
        </p>
      </div>
      <HolidayManager
        holidays={holidays ?? []}
        year={year}
        isAdmin={profile.role === 'admin'}
      />

      {/* Only admins can run year-end carry over */}
      {profile.role === 'admin' && (
        <CarryOverManager currentYear={new Date().getFullYear()} />
      )}
    </div>
  )
}
