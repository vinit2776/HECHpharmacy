-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Resolve existing duplicate hospital_patient_id values BEFORE adding
--    the unique constraint. Keep the oldest row's value untouched; rename
--    newer duplicates by appending the first 4 chars of their UUID.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE patients p
SET    hospital_patient_id = hospital_patient_id || '-DUP-' || substring(id::text, 1, 4)
WHERE  hospital_patient_id IS NOT NULL
  AND  id NOT IN (
         SELECT DISTINCT ON (hospital_patient_id) id
         FROM   patients
         WHERE  hospital_patient_id IS NOT NULL
         ORDER  BY hospital_patient_id, created_at ASC, id ASC
       );

-- 2. Add the unique constraint. Postgres treats NULL as distinct, so
--    multiple walk-in patients (NULL hospital ID) remain valid.
CREATE UNIQUE INDEX "patients_hospital_patient_id_key"
  ON "patients"("hospital_patient_id");


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Support ticket enums
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE "TicketCategory" AS ENUM (
  'bug',
  'feature_request',
  'question',
  'ui_issue',
  'data_issue',
  'performance',
  'other'
);

CREATE TYPE "TicketSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE "TicketStatus" AS ENUM (
  'open',
  'in_progress',
  'awaiting_user',
  'resolved',
  'closed'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Sequence used to generate human-readable TKT-NNNNNN numbers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS "support_ticket_seq" START WITH 1 INCREMENT BY 1;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Support tickets table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE "support_tickets" (
  "id"                  TEXT             PRIMARY KEY,
  "ticket_no"           TEXT             NOT NULL,
  "title"               TEXT             NOT NULL,
  "description"         TEXT             NOT NULL,
  "steps_to_reproduce"  TEXT,
  "expected_behavior"   TEXT,
  "actual_behavior"     TEXT,
  "category"            "TicketCategory" NOT NULL DEFAULT 'bug',
  "severity"            "TicketSeverity" NOT NULL DEFAULT 'medium',
  "status"              "TicketStatus"   NOT NULL DEFAULT 'open',
  "page_url"            TEXT,
  "user_agent"          TEXT,
  "screen_size"         TEXT,
  "build_commit"        TEXT,
  "build_time"          TEXT,
  "reporter_id"         TEXT             NOT NULL,
  "reporter_name"       TEXT             NOT NULL,
  "reporter_email"      TEXT             NOT NULL,
  "reporter_role"       TEXT             NOT NULL,
  "admin_notes"         TEXT,
  "resolution"          TEXT,
  "resolved_at"         TIMESTAMP(3),
  "resolved_by"         TEXT,
  "created_at"          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)     NOT NULL
);

CREATE UNIQUE INDEX "support_tickets_ticket_no_key"   ON "support_tickets"("ticket_no");
CREATE        INDEX "support_tickets_status_idx"      ON "support_tickets"("status");
CREATE        INDEX "support_tickets_reporter_id_idx" ON "support_tickets"("reporter_id");
CREATE        INDEX "support_tickets_created_at_idx"  ON "support_tickets"("created_at");

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_reporter_id_fkey"
  FOREIGN KEY ("reporter_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
