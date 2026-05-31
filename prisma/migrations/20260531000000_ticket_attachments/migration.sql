-- Ticket attachments stored as Postgres BYTEA. One row per file.
-- ON DELETE CASCADE — deleting a ticket removes its attachments.
CREATE TABLE "ticket_attachments" (
  "id"           TEXT         PRIMARY KEY,
  "ticket_id"    TEXT         NOT NULL,
  "filename"     TEXT         NOT NULL,
  "content_type" TEXT         NOT NULL,
  "size_bytes"   INTEGER      NOT NULL,
  "data"         BYTEA        NOT NULL,
  "uploaded_by"  TEXT         NOT NULL,
  "uploaded_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ticket_attachments_ticket_id_idx" ON "ticket_attachments"("ticket_id");

ALTER TABLE "ticket_attachments"
  ADD CONSTRAINT "ticket_attachments_ticket_id_fkey"
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
