#!/bin/sh
# Restore a world dump (.zip) to the remote server using rsync.
#
# Before syncing, the current data dir is hardlink-snapshotted to
# <data-dir>.pre-import-<ts> — costs ~zero disk, gives a full rollback point.
# rsync then only transfers diffs (ideal for hot re-imports / rollbacks).
#
# Usage: ./scripts/import-world.sh <path/to/dump.zip>
#        FORCE=1 ./scripts/import-world.sh <...>
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
ENV_FILE="$PROJECT_DIR/.env"

DUMP="${1:-}"
[ -z "$DUMP" ] && { echo "Usage: $0 <dump.zip>" >&2; exit 1; }
[ ! -f "$DUMP" ] && { echo "Error: file not found: $DUMP" >&2; exit 1; }

REMOTE=$(grep -E '^REMOTE=' "$ENV_FILE" | head -1 | cut -d= -f2-)
[ -z "$REMOTE" ] && { echo "Error: REMOTE not set in $ENV_FILE" >&2; exit 1; }

echo "-> Verifying dump integrity..."
unzip -tq "$DUMP" >/dev/null || { echo "Error: dump is corrupted" >&2; exit 1; }

CONTAINER=$(ssh "$REMOTE" "sudo docker ps -a --format '{{.Names}}' | grep '^mc-' | head -1")
[ -z "$CONTAINER" ] && { echo "Error: no mc-* container on remote" >&2; exit 1; }

DATA_DIR=$(ssh "$REMOTE" "sudo docker inspect '$CONTAINER' --format '{{range .Mounts}}{{if eq .Destination \"/data\"}}{{.Source}}{{end}}{{end}}'")
[ -z "$DATA_DIR" ] && { echo "Error: no /data bind mount on $CONTAINER" >&2; exit 1; }

TIMESTAMP=$(date -u +%Y-%m-%dT%H-%M-%S)
BACKUP_DIR="${DATA_DIR}.pre-import-$TIMESTAMP"
SIZE=$(du -h "$DUMP" | cut -f1)

echo ""
echo "  Container: $CONTAINER"
echo "  Data dir:  $DATA_DIR"
echo "  Dump:      $DUMP ($SIZE)"
echo "  Snapshot:  $BACKUP_DIR (hardlink, ~0 disk)"
echo ""
echo "  Rollback if needed:"
echo "    ssh $REMOTE 'sudo rm -rf $DATA_DIR && sudo mv $BACKUP_DIR $DATA_DIR && sudo docker start $CONTAINER'"
echo ""

if [ "${FORCE:-}" != "1" ]; then
  printf "  Continue? [y/N] "
  read -r answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

TEMP_DIR=$(mktemp -d -t culture-craft-import-XXXXXX)
trap 'rm -rf "$TEMP_DIR" 2>/dev/null || true' EXIT

IMPORT_START=$(date +%s)

echo "-> Extracting dump locally..."
EXTRACT_START=$(date +%s)
unzip -q "$DUMP" -d "$TEMP_DIR"
echo "   done in $(( $(date +%s) - EXTRACT_START ))s"

echo "-> Stopping container..."
ssh "$REMOTE" "sudo docker stop '$CONTAINER'" >/dev/null

echo "-> Creating hardlink snapshot of current world..."
ssh "$REMOTE" "sudo cp -al '$DATA_DIR' '$BACKUP_DIR'"

echo "-> Syncing via rsync (transfers only diffs)..."
rsync -ah --delete --info=progress2 \
  --rsync-path="sudo rsync" \
  "$TEMP_DIR/" "$REMOTE:$DATA_DIR/"

echo "-> Fixing ownership (uid/gid 1000)..."
ssh "$REMOTE" "sudo chown -R 1000:1000 '$DATA_DIR'"

INITIAL_RESTART=$(ssh "$REMOTE" "sudo docker inspect '$CONTAINER' --format '{{.RestartCount}}'")

echo "-> Starting container..."
ssh "$REMOTE" "sudo docker start '$CONTAINER'" >/dev/null

echo "-> Waiting for server to be ready (max 5 min, heartbeat every 5s)..."
START_TS=$(date +%s)
while true; do
  STATE=$(ssh "$REMOTE" "sudo docker inspect '$CONTAINER' --format '{{.State.Status}} {{.RestartCount}}'" 2>/dev/null || echo "unknown 0")
  STATUS=$(echo "$STATE" | awk '{print $1}')
  RESTART=$(echo "$STATE" | awk '{print $2}')

  if [ "$RESTART" -gt "$INITIAL_RESTART" ]; then
    printf "\n"
    echo "-> Container crashed and restarted (count $INITIAL_RESTART → $RESTART). Dumping last 30 log lines:" >&2
    ssh "$REMOTE" "sudo docker logs --tail 30 '$CONTAINER' 2>&1" >&2
    exit 1
  fi

  LAST=$(ssh "$REMOTE" "sudo docker logs --tail 5 '$CONTAINER' 2>&1" || true)
  if echo "$LAST" | grep -qE 'Done \('; then
    printf "\r\033[K"
    echo "-> Server ready after $(( $(date +%s) - START_TS ))s."
    break
  fi
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TS))
  if [ "$ELAPSED" -gt 300 ]; then
    printf "\n"
    echo "-> Timeout after 5 min — check logs: make logs" >&2
    break
  fi
  LINE=$(echo "$LAST" | tail -1 | tr -d '\033' | sed 's/\[[0-9;][0-9;]*m//g' | cut -c1-60)
  printf "\r\033[K   booting %ds (last: %s)" "$ELAPSED" "$LINE"
  sleep 5
done

echo ""
STATUS=$(ssh "$REMOTE" "sudo docker ps --filter 'name=$CONTAINER' --format '{{.Status}}'")
echo "-> Container status: $STATUS"
echo ""
TOTAL_ELAPSED=$(( $(date +%s) - IMPORT_START ))
echo "-> Import complete in ${TOTAL_ELAPSED}s."
echo "   Hardlink snapshot at: $BACKUP_DIR"
echo "   Once you've verified the server, remove it with:"
echo "   ssh $REMOTE 'sudo rm -rf $BACKUP_DIR'"
