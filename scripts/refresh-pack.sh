#!/bin/sh
# Regenerate the Polymer resource pack on the live MC server, sync it into
# ./resources/, refresh the SHA1 lock in docker-compose.yml, and push so
# Coolify redeploys with the updated pack hash. Run after adding/removing
# any Polymer-rendered mod (serverbacksnow, universal-graves, etc.).
#
# Usage: ./scripts/refresh-pack.sh
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
SHELL_SCRIPT="$SCRIPT_DIR/remote-shell.sh"
PACK_PATH="$PROJECT_DIR/resources/polymer-resource-pack.zip"
COMPOSE="$PROJECT_DIR/docker-compose.yml"

START=$(date +%s)

echo "-> Capturing current pack mtime on remote..."
old_mtime=$(sh "$SHELL_SCRIPT" stat -c '%Y' /data/polymer/resource_pack.zip 2>/dev/null || echo 0)

echo "-> Triggering polymer generate-pack..."
sh "$SHELL_SCRIPT" rcon-cli polymer generate-pack >/dev/null

echo "-> Waiting for regeneration (max 60s)..."
ELAPSED=0
while true; do
  new_mtime=$(sh "$SHELL_SCRIPT" stat -c '%Y' /data/polymer/resource_pack.zip 2>/dev/null || echo 0)
  if [ "$new_mtime" -gt "$old_mtime" ] 2>/dev/null; then
    break
  fi
  ELAPSED=$((ELAPSED + 2))
  if [ "$ELAPSED" -ge 60 ]; then
    echo "Error: pack regeneration did not complete in 60s" >&2
    exit 1
  fi
  sleep 2
done
# Brief settle so the writer flushes before we read.
sleep 1

echo "-> Downloading new pack into $PACK_PATH ..."
mkdir -p "$(dirname "$PACK_PATH")"
sh "$SHELL_SCRIPT" cat /data/polymer/resource_pack.zip > "$PACK_PATH"

NEW_SHA1=$(sha1sum "$PACK_PATH" | awk '{print $1}')
OLD_SHA1=$(grep -E '^[[:space:]]*RESOURCE_PACK_SHA1:' "$COMPOSE" | awk '{print $2}')

if [ "$NEW_SHA1" = "$OLD_SHA1" ]; then
  echo "-> Pack content unchanged (sha1 $NEW_SHA1). Nothing to commit."
  exit 0
fi

SIZE=$(du -h "$PACK_PATH" | cut -f1)
echo "-> SHA1: $OLD_SHA1 -> $NEW_SHA1 (size: $SIZE)"

echo "-> Updating RESOURCE_PACK_SHA1 in docker-compose.yml ..."
sed -i 's|^\([[:space:]]*RESOURCE_PACK_SHA1:\).*|\1 '"$NEW_SHA1"'|' "$COMPOSE"

echo "-> Committing and pushing..."
cd "$PROJECT_DIR"
git add resources/polymer-resource-pack.zip docker-compose.yml
git commit -m "refresh polymer resource pack ($NEW_SHA1)"
git push

ELAPSED_TOTAL=$(( $(date +%s) - START ))
echo "-> Done in ${ELAPSED_TOTAL}s. Coolify will redeploy shortly; clients are"
echo "   prompted to download the new pack on their next connect."
