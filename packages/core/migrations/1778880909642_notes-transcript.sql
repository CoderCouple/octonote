-- Up Migration
-- Raw transcript text for meeting-type notes (kept separate from blocks so
-- the AI summary and the source transcript are independently editable).

ALTER TABLE notes ADD COLUMN transcript TEXT;

-- Down Migration
ALTER TABLE notes DROP COLUMN IF EXISTS transcript;
