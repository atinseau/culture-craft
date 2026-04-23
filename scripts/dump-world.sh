#!/bin/sh
# Dump the running Minecraft container's /data into a compressed .zip archive.
# Captures all stateful runtime data: world/, config/ (Savs balances, GUI Shop
# sqlite, permissions files), server.properties, etc. Excludes artifacts that
# are redeployed from the repo or regenerated on boot: mods/, libraries/,
# versions/, .cache/, logs/, .fabric/, fastback history under world/.git.
# Safe with players online — freezes writes via RCON during the copy.
#
# Usage: ./scripts/dump-world.sh
# Output: dumps/world-<ISO timestamp>.zip
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
SHELL_SCRIPT="$SCRIPT_DIR/remote-shell.sh"
ENV_FILE="$PROJECT_DIR/.env"
DUMPS_DIR="$PROJECT_DIR/dumps"

REMOTE=$(grep -E '^REMOTE=' "$ENV_FILE" | head -1 | cut -d= -f2-)
[ -z "$REMOTE" ] && { echo "Error: REMOTE not set in $ENV_FILE" >&2; exit 1; }

mkdir -p "$DUMPS_DIR"

DUMP_START=$(date +%s)
TIMESTAMP=$(date -u +%Y-%m-%dT%H-%M-%S)
OUTPUT="$DUMPS_DIR/world-$TIMESTAMP.zip"
REMOTE_ZIP="/tmp/world-$TIMESTAMP.zip"

CONTAINER=$(ssh "$REMOTE" "sudo docker ps --format '{{.Names}}' | grep '^mc-' | head -1")
[ -z "$CONTAINER" ] && { echo "Error: no mc-* container running on remote" >&2; exit 1; }

DATA_DIR=$(ssh "$REMOTE" "sudo docker inspect '$CONTAINER' --format '{{range .Mounts}}{{if eq .Destination \"/data\"}}{{.Source}}{{end}}{{end}}'")
[ -z "$DATA_DIR" ] && { echo "Error: no /data bind mount on $CONTAINER" >&2; exit 1; }

echo "-> Container: $CONTAINER"
echo "-> Data dir:  $DATA_DIR"
echo "-> Target:    $OUTPUT"

echo "-> Freezing world writes..."
sh "$SHELL_SCRIPT" rcon-cli save-all flush >/dev/null
sh "$SHELL_SCRIPT" rcon-cli save-off >/dev/null

trap 'echo "-> Resuming world writes..."; sh "$SHELL_SCRIPT" rcon-cli save-on >/dev/null 2>&1 || true; ssh "$REMOTE" "sudo rm -f $REMOTE_ZIP" 2>/dev/null || true' EXIT

echo "-> Zipping on remote (deflate -9) ..."
ssh "$REMOTE" "sudo bash -c \"cd '$DATA_DIR' && zip -r -9 -q '$REMOTE_ZIP' . \
  -x 'libraries/*' 'libraries' \
     'versions/*' 'versions' \
     '.cache/*' '.cache' \
     'logs/*' 'logs' \
     '.fabric/*' '.fabric' \
     'mods/*' 'mods' \
     'world.old-*' 'world.old-*/*' \
     'minecraft_server*.jar' 'fabric-server*.jar' \
     '.rcon-cli.*' \
     '.fabric-manifest.json' '.modrinth-manifest.json' '.install-fabric.env' \
     'world/.git' 'world/.git/*' 'world/session.lock'\""

echo "-> Downloading..."
rsync -h --info=progress2 "$REMOTE:$REMOTE_ZIP" "$OUTPUT"

SIZE=$(du -h "$OUTPUT" | cut -f1)
TOTAL_ELAPSED=$(( $(date +%s) - DUMP_START ))
echo "-> Dump complete in ${TOTAL_ELAPSED}s: $OUTPUT ($SIZE)"
