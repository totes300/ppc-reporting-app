-- The fields_config column was defined as jsonb in 001_initial_schema.sql
-- but ended up as text in the actual database. This migration converts it
-- to jsonb so the Supabase client returns a parsed object, not a string.

ALTER TABLE platforms
  ALTER COLUMN fields_config
  TYPE jsonb
  USING fields_config::jsonb;
