#!/bin/bash
# Install Codex CLI in Claude Code cloud sessions so the codex plugin can run.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! command -v codex >/dev/null 2>&1; then
  npm install -g @openai/codex >/dev/null 2>&1
fi

# Log in with the API key from the environment, if one is set.
if [ -n "${OPENAI_API_KEY:-}" ] && ! codex login status >/dev/null 2>&1; then
  printenv OPENAI_API_KEY | codex login --with-api-key >/dev/null 2>&1 || true
fi
