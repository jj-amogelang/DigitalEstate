-- Ensure UUID default for areas.id (so inserts auto-generate values)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE areas ALTER COLUMN id SET DEFAULT gen_random_uuid();
