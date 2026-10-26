-- ============================================================
-- HR Platform — Seed Data (development only)
-- WARNING: Do NOT run in production
-- ============================================================

-- Departments
INSERT INTO departments (id, name, description) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Engineering',   'Product engineering and infrastructure'),
  ('a1000000-0000-0000-0000-000000000002', 'Design',         'Product design and brand'),
  ('a1000000-0000-0000-0000-000000000003', 'People Ops',     'HR and talent'),
  ('a1000000-0000-0000-0000-000000000004', 'Finance',        'Finance and accounting'),
  ('a1000000-0000-0000-0000-000000000005', 'Marketing',      'Growth and marketing');

-- Note: Profiles reference auth.users — in real use, users sign up first.
-- For testing, create users via Supabase dashboard, then run this with their UUIDs.

-- Review Cycles
INSERT INTO review_cycles (id, name, start_date, end_date, status, description) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'H1 2025 Performance Review',
    '2025-06-01',
    '2025-06-30',
    'active',
    'Mid-year performance reviews for all employees.'
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'Q4 2024 Performance Review',
    '2024-12-01',
    '2024-12-20',
    'completed',
    'End-of-year reviews.'
  );

-- Onboarding task templates (assign employee_id when creating for a real new hire)
-- These are illustrative; your app should have a "template" system or copy these per new hire.

COMMENT ON TABLE onboarding_tasks IS
  'Each new hire gets a copy of these tasks. Seed assigns employee_id manually when onboarding.';
