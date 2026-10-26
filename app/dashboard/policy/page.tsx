import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeavePolicyView from '@/components/policy/LeavePolicyView'

export default async function LeavePolicyPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const isHR = profile.role === 'admin' || profile.role === 'hr_manager'

  const { data: policy } = await supabase
    .from('leave_policy' as any)
    .select('*, updater:profiles!leave_policy_updated_by_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <LeavePolicyView
      policy={policy as any}
      isHR={isHR}
      currentUserId={user.id}
    />
  )
}
