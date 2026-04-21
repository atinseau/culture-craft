#!/bin/sh
# Roll back to the most recent .pre-import-<ts> snapshot created by an earlier
# import. Stops the container, swaps the current data dir with the snapshot,
# restarts. The snapshot is consumed (moved, not copied). To preserve the
# current state before rollback, run `make dump` first.
#
# Usage: ./scripts/rollback.sh
#        FORCE=1 ./scripts/rollback.sh
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
ENV_FILE="$PROJECT_DIR/.env"

REMOTE=$(grep -E '^REMOTE=' "$ENV_FILE" | head -1 | cut -d= -f2-)
[ -z "$REMOTE" ] && { echo "Error: REMOTE not set in $ENV_FILE" >&2; exit 1; }

CONTAINER=$(ssh "$REMOTE" "sudo docker ps -a --format '{{.Names}}' | grep '^mc-' | head -1")
[ -z "$CONTAINER" ] && { echo "Error: no mc-* container on remote" >&2; exit 1; }

DATA_DIR=$(ssh "$REMOTE" "sudo docker inspect '$CONTAINER' --format '{{range .Mounts}}{{if eq .Destination \"/data\"}}{{.Source}}{{end}}{{end}}'")
[ -z "$DATA_DIR" ] && { echo "Error: no /data bind mount on $CONTAINER" >&2; exit 1; }

PARENT_DIR=$(dirname "$DATA_DIR")
BASENAME=$(basename "$DATA_DIR")
SNAPSHOT=$(ssh "$REMOTE" "sudo ls -1 '$PARENT_DIR'" | grep "^$BASENAME\.pre-import-" | sort | tail -1)

if [ -z "$SNAPSHOT" ]; then
  echo "Error: no .pre-import-* snapshot found next to $DATA_DIR" >&2
  exit 1
fi

SNAPSHOT_PATH="$PARENT_DIR/$SNAPSHOT"
TIMESTAMP_FROM_SNAPSHOT=$(echo "$SNAPSHOT" | sed 's/^.*\.pre-import-//')

echo ""
echo "  Container: $CONTAINER"
echo "  Current:   $DATA_DIR (will be REMOVED)"
echo "  Snapshot:  $SNAPSHOT_PATH"
echo "             (from $TIMESTAMP_FROM_SNAPSHOT UTC, will become the active world)"
echo ""
echo "  To preserve the current state first, abort and run 'make dump'."
echo ""

if [ "${FORCE:-}" != "1" ]; then
  printf "  Continue? [y/N] "
  read -r answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

ROLLBACK_START=$(date +%s)

echo "-> Stopping container..."
ssh "$REMOTE" "sudo docker stop '$CONTAINER'" >/dev/null

echo "-> Swapping data dir with snapshot..."
ssh "$REMOTE" "sudo rm -rf '$DATA_DIR' && sudo mv '$SNAPSHOT_PATH' '$DATA_DIR'"

INITIAL_RESTART=$(ssh "$REMOTE" "sudo docker inspect '$CONTAINER' --format '{{.RestartCount}}'")

echo "-> Starting container..."
ssh "$REMOTE" "sudo docker start '$CONTAINER'" >/dev/null

echo "-> Waiting for server to be ready (max 5 min, heartbeat every 5s)..."
START_TS=$(date +%s)
while true; do
  STATE=$(ssh "$REMOTE" "sudo docker inspect '$CONTAINER' --format '{{.State.Status}} {{.RestartCount}}'" 2>/dev/null || echo "unknown 0")
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
TOTAL_ELAPSED=$(( $(date +%s) - ROLLBACK_START ))
echo "-> Rollback complete in ${TOTAL_ELAPSED}s."
