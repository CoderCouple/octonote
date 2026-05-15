-- Up Migration
-- First-class Project entity + note type/project association.

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  repo TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
  updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_repo ON projects(repo);

ALTER TABLE notes ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN type TEXT NOT NULL DEFAULT 'note';

CREATE INDEX idx_notes_project_id ON notes(project_id);
CREATE INDEX idx_notes_type ON notes(type);

-- Down Migration
DROP INDEX IF EXISTS idx_notes_type;
DROP INDEX IF EXISTS idx_notes_project_id;
ALTER TABLE notes DROP COLUMN IF EXISTS type;
ALTER TABLE notes DROP COLUMN IF EXISTS project_id;
DROP TABLE IF EXISTS projects;
