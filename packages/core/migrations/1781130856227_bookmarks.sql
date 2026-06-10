-- Up Migration
-- A lightweight bookmarks feature: every bookmark belongs to exactly one
-- group; groups are flat (no nesting). Bookmarks are first-class — they
-- live outside the notes table so the URL is queryable directly.

CREATE TABLE bookmark_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE TABLE bookmarks (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES bookmark_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE INDEX idx_bookmarks_group_id ON bookmarks(group_id);

-- Down Migration
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS bookmark_groups;
