import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuditTrail from '@/components/audit/AuditTrail'

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    entity?: string
    action?: string
    user?: string
    from?: string
    to?: string
    q?: string
  }>
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

  // HR/Admin only
  if (!profile || !['admin', 'hr_manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Build query
  let query = supabase
    .from('audit_log' as any)
    .select(`
      *,
      performer:profiles!audit_log_performed_by_fkey(id, full_name, avatar_url, role)
    `)
    .order('created_at', { ascending: false })
    .limit(300)

  if (params.entity)  query = query.eq('entity', params.entity)
  if (params.action)  query = query.eq('action', params.action)
  if (params.user)    query = query.eq('performed_by', params.user)
  if (params.from)    query = query.gte('created_at', params.from)
  if (params.to)      query = query.lte('created_at', params.to + 'T23:59:59')

  const { data: logs } = await query

  // Filter by search query in JS
  let filtered = (logs as any[]) ?? []
  if (params.q) {
    const q = params.q.toLowerCase()
    filtered = filtered.filter((l: any) =>
      l.entity_name?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.performer?.full_name?.toLowerCase().includes(q)
    )
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name')

  // Stats
  const stats = {
    total: filtered.length,
    today: filtered.filter((l: any) => l.created_at.startsWith(new Date().toISOString().split('T')[0])).length,
    users: new Set(filtered.map((l: any) => l.performed_by).filter(Boolean)).size,
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Audit Trail</h1>
        <p className="text-sm mt-0.5 text-zinc-400">
          Complete log of all actions performed across the platform.
        </p>
      </div>
      <AuditTrail
        logs={filtered}
        users={(users as any[]) ?? []}
        stats={stats}
        activeFilters={params}
      />
    </div>
  )
}
