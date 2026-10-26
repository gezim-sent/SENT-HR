import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocumentsManager from '@/components/documents/DocumentsManager'
import PersonalDocuments from '@/components/documents/PersonalDocuments'

export default async function DocumentsPage() {
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
  const today = new Date().toISOString().split('T')[0]
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const in60  = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]

  // Company documents — visible to everyone
  const { data: companyDocs } = await supabase
    .from('documents')
    .select(`
      *,
      uploader:profiles!documents_uploaded_by_fkey(id, full_name)
    `)
    .eq('scope', 'company')
    .order('created_at', { ascending: false })

  // Personal documents
  // HR sees all; employees see only their own
  const personalQuery = supabase
    .from('documents')
    .select(`
      *,
      employee:profiles!documents_employee_id_fkey(id, full_name, avatar_url, job_title,
        departments!profiles_department_id_fkey(name)
      ),
      uploader:profiles!documents_uploaded_by_fkey(id, full_name)
    `)
    .eq('scope', 'personal')
    .order('created_at', { ascending: false })

  if (!isHR) personalQuery.eq('employee_id', user.id)

  const { data: personalDocs } = await personalQuery

  // Expiring personal docs (next 60 days) — HR only
  const { data: expiring } = isHR
    ? await supabase
        .from('documents')
        .select(`*, employee:profiles!documents_employee_id_fkey(id, full_name, avatar_url)`)
        .eq('scope', 'personal')
        .not('expiry_date', 'is', null)
        .gte('expiry_date', today)
        .lte('expiry_date', in60)
        .order('expiry_date')
    : { data: [] }

  // Expired personal docs — HR only
  const { data: expired } = isHR
    ? await supabase
        .from('documents')
        .select(`*, employee:profiles!documents_employee_id_fkey(id, full_name, avatar_url)`)
        .eq('scope', 'personal')
        .not('expiry_date', 'is', null)
        .lt('expiry_date', today)
        .order('expiry_date', { ascending: false })
        .limit(20)
    : { data: [] }

  // Employee list for HR
  const { data: employees } = isHR
    ? await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('status', 'active')
        .order('full_name')
    : { data: [] }

  // Template documents — HR/Admin only
  const { data: templateDocs } = isHR
    ? await supabase
        .from('documents')
        .select(`*, uploader:profiles!documents_uploaded_by_fkey(id, full_name)`)
        .eq('scope', 'template')
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <DocumentsManager
      companyDocs={(companyDocs as any[]) ?? []}
      personalDocs={(personalDocs as any[]) ?? []}
      templateDocs={(templateDocs as any[]) ?? []}
      expiring={(expiring as any[]) ?? []}
      expired={(expired as any[]) ?? []}
      employees={(employees as any[]) ?? []}
      currentUserId={user.id}
      currentUserName={profile.full_name}
      isHR={isHR}
      today={today}
      in30={in30}
      PersonalDocumentsComponent={PersonalDocuments}
    />
  )
}
