-- Store generated report file bytes in the database so downloads work on
-- Vercel (ephemeral /tmp per serverless invocation) and any environment
-- where the filesystem is not shared between the generator and downloader.
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "file_data" BYTEA;
