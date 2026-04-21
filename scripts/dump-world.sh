#!/bin/sh
# Dump the running Minecraft container's world data into ./minecraft-data/.
# Freezes saves on the remote server via RCON, streams a minimal tar
# (world + player state only — excludes regenerated artifacts), then
# resumes saves. Safe to run while players are connected.
#
# Usage: ./scripts/dump-world.sh
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
SHELL_SCRIPT="$SCRIPT_DIR/remote-shell.sh"
DATA_DIR="$PROJECT_DIR/minecraft-data"

mkdir -p "$DATA_DIR"

echo "-> Freezing world writes..."
sh "$SHELL_SCRIPT" rcon-cli save-all flush
sh "$SHELL_SCRIPT" rcon-cli save-off

trap 'echo "-> Resuming world writes..."; sh "$SHELL_SCRIPT" rcon-cli save-on >/dev/null 2>&1 || true' EXIT

echo "-> Streaming tar -> $DATA_DIR ..."
sh "$SHELL_SCRIPT" tar czf - \
  --exclude=./libraries \
  --exclude=./versions \
  --exclude=./.cache \
  --exclude=./logs \
  "--exclude='./world.old-*'" \
  "--exclude='./minecraft_server*.jar'" \
  "--exclude='./.rcon-cli.*'" \
  -C /data . | tar xzf - -C "$DATA_DIR"

echo "-> Dump complete: $(du -sh "$DATA_DIR" | cut -f1)"
