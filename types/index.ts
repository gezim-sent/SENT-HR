// Re-export everything from the generated file
export * from './database.types'

// Convenience type aliases — add new ones here, never in database.types.ts
export type Profile = import('./database.types').Database['public']['Tables']['profiles']['Row']
export type Department = import('./database.types').Database['public']['Tables']['departments']['Row']
export type LeaveRequest = import('./database.types').Database['public']['Tables']['leave_requests']['Row']
export type LeaveBalance = import('./database.types').Database['public']['Tables']['leave_balances']['Row']
export type OnboardingTask = import('./database.types').Database['public']['Tables']['onboarding_tasks']['Row']
export type ReviewCycle = import('./database.types').Database['public']['Tables']['review_cycles']['Row']
export type Review = import('./database.types').Database['public']['Tables']['reviews']['Row']
export type Document = import('./database.types').Database['public']['Tables']['documents']['Row']
export type Notification = import('./database.types').Database['public']['Tables']['notifications']['Row']
export type LeaveAuditLog = import('./database.types').Database['public']['Tables']['leave_audit_log']['Row']
export type Holiday = import('./database.types').Database['public']['Tables']['holidays']['Row']
export type Equipment = import('./database.types').Database['public']['Tables']['equipment']['Row']

export type UserRole = import('./database.types').Database['public']['Enums']['user_role']
export type LeaveType = import('./database.types').Database['public']['Enums']['leave_type']
export type LeaveStatus = import('./database.types').Database['public']['Enums']['leave_status']
export type EmployeeStatus = import('./database.types').Database['public']['Enums']['employee_status']
export type LeaveTypeConfig = import('./database.types').Database['public']['Tables']['leave_type_config']['Row']