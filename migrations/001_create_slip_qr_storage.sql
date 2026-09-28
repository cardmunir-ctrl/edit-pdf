-- =============================================================================
-- 001_create_slip_qr_storage.sql
--
-- Tahap 1 QR Code slip individual: penyimpanan durable slip Buku Produksi.
--
-- Tabel ini menyimpan hasil render slip (PNG) hasil html2canvas, dengan kunci
-- buku_gaji.id. Tujuannya agar tahap berikutnya (QR -> /s/<id> -> PDF individual)
-- bisa membuka slip yang sama persis dengan yang dicetak, tanpa bergantung pada
-- memory server atau localStorage browser.
--
-- Verified against the live Neon database (read-only) before writing this file:
--   - PostgreSQL 18.6, database "neondb", user "neondb_owner"
--   - Existing public tables: app_users, buku_gaji, data_tarif, karyawan, produksi
--     -> "slip_qr_storage" is a new name, no collision.
--   - buku_gaji.id is "uuid" with PRIMARY KEY (id)  -> FK target is valid.
--   - No user-defined functions in schema "public" -> trigger function name is free.
--   - gen_random_uuid() is built in since PostgreSQL 13, so no pgcrypto extension
--     is required here.
--
-- This file is NOT executed automatically. Review it, then run it once:
--   psql "$NEON_DATABASE_URL" -f migrations/001_create_slip_qr_storage.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
-- id            surrogate primary key, generated on insert.
-- buku_gaji_id  the source slip. UNIQUE so re-rendering a slip replaces the stored
--               image instead of accumulating rows (one slip = one current image).
-- image_data    raw PNG bytes as received (NOT re-encoded, NOT base64).
-- mime_type     stored alongside the bytes so a later PDF route can set the
--               correct Content-Type without sniffing the payload again.
--
-- updated_at is kept in sync by the trigger below so a later retention job can
-- find stale images; created_at is left untouched on conflict to preserve the
-- age of the first render.
CREATE TABLE IF NOT EXISTS slip_qr_storage (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  buku_gaji_id  uuid        NOT NULL UNIQUE,
  image_data    bytea       NOT NULL,
  mime_type     text        NOT NULL DEFAULT 'image/png',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT slip_qr_storage_mime_type_check
    CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp'))
);

-- -----------------------------------------------------------------------------
-- 2. Foreign key to buku_gaji
-- -----------------------------------------------------------------------------
-- ON DELETE CASCADE is deliberate: when a slip row is removed from buku_gaji its
-- stored image must go too, otherwise the table accumulates orphaned payslip
-- images that no QR can ever address.
--
-- If you would rather keep the image for audit after the source row is deleted,
-- replace ON DELETE CASCADE with ON DELETE SET NULL -- but that requires
-- buku_gaji_id to become nullable.
--
-- This is the one design decision in this file that is worth an explicit review.
ALTER TABLE slip_qr_storage
  DROP CONSTRAINT IF EXISTS slip_qr_storage_buku_gaji_id_fkey;

ALTER TABLE slip_qr_storage
  ADD CONSTRAINT slip_qr_storage_buku_gaji_id_fkey
  FOREIGN KEY (buku_gaji_id) REFERENCES buku_gaji (id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------------------------------
-- The UNIQUE constraint on buku_gaji_id already creates an index that serves
-- every lookup by slip id, so no extra index is added for that.
--
-- This one exists only for future retention/cleanup work ("drop images older
-- than N days"). It is not used by the read path.
CREATE INDEX IF NOT EXISTS slip_qr_storage_created_at_idx
  ON slip_qr_storage (created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION slip_qr_storage_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS slip_qr_storage_touch_updated_at ON slip_qr_storage;

CREATE TRIGGER slip_qr_storage_touch_updated_at
  BEFORE UPDATE ON slip_qr_storage
  FOR EACH ROW
  EXECUTE FUNCTION slip_qr_storage_touch_updated_at();

COMMIT;

-- =============================================================================
-- 5. Verification (read-only, safe to run any time after the migration)
-- =============================================================================
--
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'slip_qr_storage'
--  ORDER BY ordinal_position;
--
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conrelid = 'public.slip_qr_storage'::regclass
--  ORDER BY conname;
--
-- SELECT count(*) AS total_slips, pg_size_pretty(pg_total_relation_size('public.slip_qr_storage')) AS table_size
--   FROM slip_qr_storage;
--
-- =============================================================================
-- ROLLBACK (do not run unless you mean to delete every stored slip image)
-- =============================================================================
--
-- DROP TRIGGER IF EXISTS slip_qr_storage_touch_updated_at ON slip_qr_storage;
-- DROP FUNCTION IF EXISTS slip_qr_storage_touch_updated_at();
-- DROP TABLE IF EXISTS slip_qr_storage;
