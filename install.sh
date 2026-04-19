#!/usr/bin/env bash
# Convenience wrapper for scripts/install.mjs
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
exec node "$SCRIPT_DIR/scripts/install.mjs" "$@"
