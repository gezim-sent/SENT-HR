-- ============================================================
-- HR Platform — Row Level Security Policies
-- ============================================================

-- Enable RLS on every table
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;

-- ─── Shared helper ──────────────────────────────────────────────────────────
-- Inline role check (avoids an extra query per policy evaluation)
CREATE OR REPLACE FUNCTION is_hr_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('admin', 'hr_manager') FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid();
$$;

-- ─── profiles ───────────────────────────────────────────────────────────────
-- Anyone can read all profiles (directory is public within the org)
CREATE POLICY "profiles: read all authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own non-role fields
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- employees cannot escalate their own role
    AND (role = (SELECT role FROM profiles WHERE id = auth.uid()) OR is_admin())
  );

-- Admins can insert new profiles (invite flow)
CREATE POLICY "profiles: insert admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can delete profiles
CREATE POLICY "profiles: delete admin"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- ─── departments ────────────────────────────────────────────────────────────
CREATE POLICY "departments: read all"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "departments: write admin"
  ON departments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── leave_balances ─────────────────────────────────────────────────────────
-- Employees see their own; HR/admin see all
CREATE POLICY "leave_balances: read"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid() OR is_hr_or_admin());

-- Only admins/HR can write balances
CREATE POLICY "leave_balances: write hr_admin"
  ON leave_balances FOR ALL
  TO authenticated
  USING (is_hr_or_admin())
  WITH CHECK (is_hr_or_admin());

-- ─── leave_requests ─────────────────────────────────────────────────────────
-- Employees see their own; HR/admin see all
CREATE POLICY "leave_requests: read own or hr"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid() OR is_hr_or_admin());

-- Employees can create requests for themselves
CREATE POLICY "leave_requests: insert own"
  ON leave_requests FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

-- Employees can cancel their own pending requests; HR can update status
CREATE POLICY "leave_requests: update"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    -- employee cancelling own pending request
    (employee_id = auth.uid() AND status = 'pending')
    -- HR/admin reviewing any request
    OR is_hr_or_admin()
  );

-- Only admins can hard-delete
CREATE POLICY "leave_requests: delete admin"
  ON leave_requests FOR DELETE
  TO authenticated
  USING (is_admin());

-- ─── onboarding_tasks ───────────────────────────────────────────────────────
-- Employees see their own tasks; HR/admin see all
CREATE POLICY "onboarding_tasks: read"
  ON onboarding_tasks FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid() OR is_hr_or_admin());

-- HR/admin manage tasks; employees can mark their own complete
CREATE POLICY "onboarding_tasks: update"
  ON onboarding_tasks FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid() OR is_hr_or_admin());

CREATE POLICY "onboarding_tasks: insert hr_admin"
  ON onboarding_tasks FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_or_admin());

CREATE POLICY "onboarding_tasks: delete hr_admin"
  ON onboarding_tasks FOR DELETE
  TO authenticated
  USING (is_hr_or_admin());

-- ─── review_cycles ──────────────────────────────────────────────────────────
CREATE POLICY "review_cycles: read all"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "review_cycles: write hr_admin"
  ON review_cycles FOR ALL
  TO authenticated
  USING (is_hr_or_admin())
  WITH CHECK (is_hr_or_admin());

-- ─── reviews ────────────────────────────────────────────────────────────────
-- Employees see their own reviews; reviewers see reviews they're conducting; HR/admin see all
CREATE POLICY "reviews: read"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR is_hr_or_admin()
  );

-- Employees update their own self-review fields only
CREATE POLICY "reviews: update self"
  ON reviews FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid() AND status = 'self_review')
  WITH CHECK (employee_id = auth.uid());

-- Reviewers (managers) update manager review fields
CREATE POLICY "reviews: update manager"
  ON reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid() AND status = 'manager_review')
  WITH CHECK (reviewer_id = auth.uid());

-- HR/admin full write access
CREATE POLICY "reviews: all hr_admin"
  ON reviews FOR ALL
  TO authenticated
  USING (is_hr_or_admin())
  WITH CHECK (is_hr_or_admin());

-- ─── documents ──────────────────────────────────────────────────────────────
-- Employees see their own documents; HR/admin see all
CREATE POLICY "documents: read"
  ON documents FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid() OR is_hr_or_admin());

-- HR/admin manage documents
CREATE POLICY "documents: write hr_admin"
  ON documents FOR ALL
  TO authenticated
  USING (is_hr_or_admin())
  WITH CHECK (is_hr_or_admin());
