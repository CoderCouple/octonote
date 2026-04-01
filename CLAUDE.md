# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OctoNote is a CLI-first, block-based note-taking app (Notion meets Obsidian meets terminal). CLI command: `octo`. Vault location: `~/.octonote/`. TypeScript monorepo using npm workspaces.

## Monorepo Structure

```
packages/
  core/        — block engine, vault, SQLite, search, links (shared foundation)
  cli/         — octo CLI + ink TUI editor
  ai/          — Claude-powered note creation, editing, summarization
  server/      — local Express REST + WebSocket API
  web/         — React block editor UI (Vite + Tailwind + Zustand)
  desktop/     — Electron wrapper
```

## Build Commands

```bash
npm install                          # install all workspace dependencies
npm run build -w packages/core       # build core package
npm run build -w packages/cli        # build CLI package
npm run build                        # build all packages
npm test -w packages/core            # run core tests
npm test                             # run all tests
```

## Architecture

### Dependency Flow
`core` is the shared foundation — every other package depends on it. Build order matters: core -> cli -> ai -> server -> web -> desktop.

### Data Model
- Vault stored at `~/.octonote/` with SQLite database (`octonote.db`), MiniSearch index (`search.idx`), and config (`config.json`)
- Two storage formats: JSON (`.note`, default) and Markdown (`.md` with YAML frontmatter, Obsidian-compatible)
- DB tables: `folders`, `notes`, `blocks`, `tags`, `note_tags`, `links`, `daily_notes`

### @octonote/core
DI-bootstrapped via `Container` class in `index.ts`. Key services:
- **NoteRepository** — all SQLite CRUD (notes, blocks, folders, tags, links, daily notes)
- **BlockEngine** — parse/serialize markdown <-> blocks, terminal rendering, slash commands
- **SearchEngine** — MiniSearch wrapper, fuzzy search, autocomplete
- **LinkGraph** — wikilink sync, backlinks, orphan detection, graph data
- **VaultManager** — file I/O, export/import, Obsidian compat
- **DailyNoteService** — daily notes, streak counter, calendar

### @octonote/cli
Uses `commander` for CLI parsing. TUI editor built with `ink` (React for terminal). Editor has a mode state machine: `normal -> insert -> slash -> wikilink -> tag`. The `--output json` flag on `view`, `list`, `search`, `today` provides machine-readable output.

### @octonote/ai
Uses `@anthropic-ai/sdk`. Claude calls structured tools (`create_note`, `append_blocks`, `replace_blocks`, `tag_note`) to manipulate the vault. Vault context (recent notes, tags, folders, link graph summary) is sent with each request. API key resolved from: env `ANTHROPIC_API_KEY` -> `config.json` -> error.

### Block Types
paragraph, heading (1-3), bullet, numbered, todo, code, quote, callout, divider, image, embed (wikilink), table. Each maps to standard markdown syntax.

## Tech Stack

| Layer | Choice |
|-------|--------|
| CLI | commander |
| TUI | ink + ink-text-input + ink-select-input |
| Terminal colors | chalk |
| Database | better-sqlite3 |
| Search | MiniSearch |
| File watching | chokidar |
| Markdown | marked + gray-matter |
| AI | @anthropic-ai/sdk |
| Server | Express + ws |
| Web UI | React + Vite + Tailwind CSS + Zustand |
| Graph | D3 |
| Desktop | Electron |

## Claude Code Integration

No MCP server. Claude Code uses `octo` as a plain CLI tool with `--output json` for machine-readable output.

Key patterns:
- Before architectural changes: `octo search "<topic>" --output json`
- Before starting a task: `octo view "Project Plan" --output json`
- After major decisions: `octo new "Decision: <X>" --tags decision`
- Current sprint context: `octo today --output json`
