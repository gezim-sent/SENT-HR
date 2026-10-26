-- ============================================================
-- HR Platform — Initial Schema Migration
-- Run: supabase db push  (or paste into Supabase SQL editor)
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ─────────────────────────────────────────────────────────────────
CREATE TYPE user_role      AS ENUM ('admin', 'hr_manager', 'employee');
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'on_leave');
CREATE TYPE leave_type     AS ENUM ('annual', 'sick', 'parental', 'unpaid', 'other');
CREATE TYPE leave_status   AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE doc_type       AS ENUM ('contract', 'id', 'certificate', 'policy', 'other');
CREATE TYPE task_category  AS ENUM ('documentation', 'training', 'setup', 'meeting', 'other');
CREATE TYPE review_status  AS ENUM ('pending', 'self_review', 'manager_review', 'completed');
CREATE TYPE cycle_status   AS ENUM ('draft', 'active', 'completed');

-- ─── Departments ───────────────────────────────────────────────────────────
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  head_id     UUID, -- FK to profiles added after profiles table
  description TEXT
);

-- ─── Profiles (extends auth.users) ─────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  role          user_role NOT NULL DEFAULT 'employee',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  manager_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  job_title     TEXT,
  phone         TEXT,
  hire_date     DATE,
  status        employee_status NOT NULL DEFAULT 'active',
  employee_id   TEXT UNIQUE -- human-readable ID e.g. EMP-0042
);

-- Add head_id FK now that profiles exists
ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head
  FOREIGN KEY (head_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ─── Leave Balances ─────────────────────────────────────────────────────────
CREATE TABLE leave_balances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year          INT NOT NULL,
  annual_total  INT NOT NULL DEFAULT 20,
  annual_used   INT NOT NULL DEFAULT 0,
  sick_total    INT NOT NULL DEFAULT 20,
  sick_used     INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

-- ─── Leave Requests ─────────────────────────────────────────────────────────
CREATE TABLE leave_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          leave_type NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  days_count    INT NOT NULL CHECK (days_count > 0),
  reason        TEXT,
  status        leave_status NOT NULL DEFAULT 'pending',
  approver_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approver_note TEXT,
  reviewed_at   TIMESTAMPTZ,
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- ─── Onboarding Tasks ───────────────────────────────────────────────────────
CREATE TABLE onboarding_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  category     task_category NOT NULL DEFAULT 'other',
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  assigned_to  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  order_index  INT NOT NULL DEFAULT 0
);

-- ─── Review Cycles ──────────────────────────────────────────────────────────
CREATE TABLE review_cycles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      cycle_status NOT NULL DEFAULT 'draft',
  description TEXT,
  CONSTRAINT valid_cycle_dates CHECK (end_date > start_date)
);

-- ─── Reviews ────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycle_id         UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           review_status NOT NULL DEFAULT 'pending',
  self_rating      SMALLINT CHECK (self_rating BETWEEN 1 AND 5),
  manager_rating   SMALLINT CHECK (manager_rating BETWEEN 1 AND 5),
  self_comments    TEXT,
  manager_comments TEXT,
  goals            JSONB,
  submitted_at     TIMESTAMPTZ,
  UNIQUE (cycle_id, employee_id)
);

-- ─── Documents ──────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         doc_type NOT NULL,
  name         TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  size_bytes   BIGINT
);

-- ─── Helper function ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM profiles WHERE id = auth.uid();
$$;

-- ─── Updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Auto-create leave balance on profile insert ────────────────────────────
CREATE OR REPLACE FUNCTION create_leave_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO leave_balances (employee_id, year)
  VALUES (NEW.id, EXTRACT(YEAR FROM NOW())::INT)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_leave_balance
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_leave_balance();

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_department    ON profiles(department_id);
CREATE INDEX idx_profiles_manager       ON profiles(manager_id);
CREATE INDEX idx_profiles_status        ON profiles(status);
CREATE INDEX idx_leave_employee         ON leave_requests(employee_id);
CREATE INDEX idx_leave_status           ON leave_requests(status);
CREATE INDEX idx_leave_approver         ON leave_requests(approver_id);
CREATE INDEX idx_onboarding_employee    ON onboarding_tasks(employee_id);
CREATE INDEX idx_reviews_cycle          ON reviews(cycle_id);
CREATE INDEX idx_reviews_employee       ON reviews(employee_id);
CREATE INDEX idx_reviews_reviewer       ON reviews(reviewer_id);
CREATE INDEX idx_documents_employee     ON documents(employee_id);