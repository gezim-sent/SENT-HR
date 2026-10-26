-- ============================================================
-- HR Platform — Storage Buckets & Policies
-- Run after creating buckets in Supabase dashboard:
--   1. "avatars"   (public)
--   2. "documents" (private)
-- ============================================================

-- ─── Avatars bucket (public reads, owner writes) ────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars: upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars: update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars: delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ─── Documents bucket (private, HR/admin only) ───────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "documents: hr_admin read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr_manager')
      -- employees can read their own folder
      OR (storage.foldername(name))[1] = auth.uid()::TEXT
    )
  );

CREATE POLICY "documents: hr_admin write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr_manager')
  );

CREATE POLICY "documents: hr_admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'hr_manager')
  );
