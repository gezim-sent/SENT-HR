import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export const magicLinkSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

// ─── Profile ─────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  job_title: z.string().optional(),
  phone: z.string().optional(),
  department_id: z.string().uuid().optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
})

export const newEmployeeSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  job_title: z.string().min(1, 'Job title is required'),
  role: z.enum(['admin', 'hr_manager', 'employee']),
  department_id: z.string().uuid('Select a department').optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  hire_date: z.string().min(1, 'Hire date is required'),
  phone: z.string().optional(),
})

// ─── Leave ───────────────────────────────────────────────────────────────────

export const leaveRequestSchema = z
  .object({
    type: z.enum(['annual', 'sick', 'parental', 'unpaid', 'other'], {
      required_error: 'Select a leave type',
    }),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    reason: z.string().max(500).optional(),
  })
  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  })

export const leaveReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  approver_note: z.string().max(500).optional(),
})

// ─── Onboarding ──────────────────────────────────────────────────────────────

export const onboardingTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum(['documentation', 'training', 'setup', 'meeting', 'other']),
  due_date: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})

// ─── Review ──────────────────────────────────────────────────────────────────

export const selfReviewSchema = z.object({
  self_rating: z.number().min(1).max(5),
  self_comments: z.string().min(20, 'Please provide at least 20 characters of feedback'),
  goals: z
    .array(
      z.object({
        title: z.string(),
        progress: z.enum(['not_started', 'in_progress', 'completed']),
        notes: z.string().optional(),
      })
    )
    .optional(),
})

export const managerReviewSchema = z.object({
  manager_rating: z.number().min(1).max(5),
  manager_comments: z.string().min(20, 'Please provide at least 20 characters of feedback'),
})

export const reviewCycleSchema = z.object({
  name: z.string().min(1, 'Cycle name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().optional(),
})

// ─── Types ───────────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type NewEmployeeInput = z.infer<typeof newEmployeeSchema>
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>
export type LeaveReviewInput = z.infer<typeof leaveReviewSchema>
export type OnboardingTaskInput = z.infer<typeof onboardingTaskSchema>
export type SelfReviewInput = z.infer<typeof selfReviewSchema>
export type ManagerReviewInput = z.infer<typeof managerReviewSchema>
export type ReviewCycleInput = z.infer<typeof reviewCycleSchema>
