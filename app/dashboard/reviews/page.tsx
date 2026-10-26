import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReviewsHRView from '@/components/reviews/ReviewsHRView'
import ReviewsEmployeeView from '@/components/reviews/ReviewsEmployeeView'

export default async function ReviewsPage() {
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

  // Fetch all review cycles
  const { data: cycles } = await supabase
    .from('review_cycles')
    .select('*')
    .order('created_at', { ascending: false })

  if (isHR) {
    // HR sees all reviews across all cycles
    const { data: allReviews } = await supabase
      .from('reviews')
      .select(`
        *,
        employee:profiles!leave_requests_employee_id_fkey(id, full_name, avatar_url, job_title, departments!profiles_department_id_fkey(name)),
        reviewer:profiles!reviewer_id(id, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })

    const { data: employees } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, job_title, departments!profiles_department_id_fkey(name)')
      .eq('status', 'active')
      .order('full_name')

    return (
      <ReviewsHRView
        cycles={(cycles as any[]) ?? []}
        reviews={(allReviews as any[]) ?? []}
        employees={(employees as any[]) ?? []}
        currentUserId={user.id}
      />
    )
  }

  // Employee sees only their own reviews
  const { data: myReviews } = await supabase
    .from('reviews')
    .select(`
      *,
      cycle:review_cycles!cycle_id(*),
      reviewer:profiles!reviewer_id(id, full_name, avatar_url, job_title)
    `)
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <ReviewsEmployeeView
      reviews={(myReviews as any[]) ?? []}
      cycles={(cycles as any[]) ?? []}
      employeeId={user.id}
      employeeName={profile.full_name}
    />
  )
}
