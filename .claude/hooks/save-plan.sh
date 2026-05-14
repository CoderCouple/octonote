#!/usr/bin/env bash
# OctoNote — capture ExitPlanMode plans into the project brain.
#
# Wired as a PostToolUse hook on ExitPlanMode (see .claude/settings.json).
# Reads the hook payload as JSON on stdin, extracts the plan markdown, and
# pipes it to `octonote brain save-plan`. Fails silently so it never blocks
# Claude Code.
set -uo pipefail

input=$(cat)
plan=$(printf '%s' "$input" | jq -r '.tool_input.plan // empty')
[ -z "$plan" ] && exit 0

printf '%s' "$plan" | octonote brain save-plan >/dev/null 2>&1 || true
exit 0
