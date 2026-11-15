#!/bin/bash
# Runs the caliber gate over every render in this directory, with the same lock reasons as board.config.json.
cd "$(dirname "$0")"
node ~/.claude/shared/throughline/gate/run_gate.mjs --dir "$PWD" --out "$PWD/gate-record.json" \
  --type-locked "each brand's own locked faces (Newsreader or EB Garamond with Instrument Sans); the options differ by construction, not typeface" \
  --palette-locked "each brand's own palette tokens; the options differ by construction, not color"
