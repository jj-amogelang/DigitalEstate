-- Ensure pgcrypto is available and set a default UUID for areas.id if type is UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'areas'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    BEGIN
      ALTER TABLE public.areas ALTER COLUMN id SET DEFAULT gen_random_uuid();
    EXCEPTION WHEN others THEN
      -- ignore if default already set or insufficient privileges
      NULL;
    END;
  END IF;
END $$;
