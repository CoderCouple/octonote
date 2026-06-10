-- Up Migration
-- tldraw snapshot for diagram-type notes. Kept on the notes table (rather than
-- in a side table) so a single GET /notes/:id returns the full diagram in one
-- round-trip — matches how `transcript` is stored for meetings.

ALTER TABLE notes ADD COLUMN drawing JSONB;

-- Down Migration
ALTER TABLE notes DROP COLUMN IF EXISTS drawing;
