-- ============================================================
-- Kosovo Official Public Holidays
-- Source: Law No. 03/L-064 on Official Holidays in Kosovo
-- officeholidays.com/countries/kosovo
-- ============================================================

-- Remove previous placeholder US holidays
DELETE FROM holidays;

-- ── 2025 ─────────────────────────────────────────────────────────────────────
INSERT INTO holidays (name, date, year, is_recurring) VALUES
  ('New Year''s Day',         '2025-01-01', 2025, true),
  ('Day after New Year''s',   '2025-01-02', 2025, true),
  ('Orthodox Christmas',      '2025-01-07', 2025, true),
  ('Independence Day',        '2025-02-17', 2025, true),
  ('Eid ul-Fitr',             '2025-03-31', 2025, false),
  ('Constitution Day',        '2025-04-09', 2025, true),
  ('Catholic Easter Monday',  '2025-04-21', 2025, false),
  ('Orthodox Easter Day',     '2025-04-20', 2025, false),
  ('Orthodox Easter Monday',  '2025-04-21', 2025, false),
  ('Labour Day',              '2025-05-01', 2025, true),
  ('Europe Day',              '2025-05-09', 2025, true),
  ('Eid ul-Adha',             '2025-06-07', 2025, false),
  ('Catholic Christmas',      '2025-12-25', 2025, true)
ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name;

-- ── 2026 ─────────────────────────────────────────────────────────────────────
INSERT INTO holidays (name, date, year, is_recurring) VALUES
  ('New Year''s Day',         '2026-01-01', 2026, true),
  ('Day after New Year''s',   '2026-01-02', 2026, true),
  ('Orthodox Christmas',      '2026-01-07', 2026, true),
  ('Independence Day',        '2026-02-17', 2026, true),
  ('Eid ul-Fitr',             '2026-03-20', 2026, false),
  ('Catholic Easter Monday',  '2026-04-06', 2026, false),
  ('Constitution Day',        '2026-04-09', 2026, true),
  ('Orthodox Easter Day',     '2026-04-12', 2026, false),
  ('Orthodox Easter Monday',  '2026-04-13', 2026, false),
  ('Labour Day',              '2026-05-01', 2026, true),
  ('Europe Day',              '2026-05-09', 2026, true),
  ('Eid ul-Adha',             '2026-05-27', 2026, false),
  ('Catholic Christmas',      '2026-12-25', 2026, true)
ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name;

-- ── 2027 recurring holidays (fixed-date ones) ─────────────────────────────
INSERT INTO holidays (name, date, year, is_recurring) VALUES
  ('New Year''s Day',         '2027-01-01', 2027, true),
  ('Day after New Year''s',   '2027-01-02', 2027, true),
  ('Orthodox Christmas',      '2027-01-07', 2027, true),
  ('Independence Day',        '2027-02-17', 2027, true),
  ('Constitution Day',        '2027-04-09', 2027, true),
  ('Labour Day',              '2027-05-01', 2027, true),
  ('Europe Day',              '2027-05-09', 2027, true),
  ('Catholic Christmas',      '2027-12-25', 2027, true)
ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name;
