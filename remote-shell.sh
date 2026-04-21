#!/bin/sh
# Connect to the running Minecraft container,
# or to the remote host itself with --host.
# Usage: ./scripts/remote-shell.sh [--host] [command...]
#
# Examples:
#   ./scripts/remote-shell.sh                        # interactive shell in container
#   ./scripts/remote-shell.sh ls /data               # run a single command in container
#   ./scripts/remote-shell.sh --host                 # interactive shell on remote host
#   ./scripts/remote-shell.sh --host uptime          # run a single command on remote host

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  . "$ENV_FILE"
fi

if [ -z "$REMOTE" ]; then
  echo "Error: REMOTE is not set in .env file." >&2
  exit 1
fi

HOST_MODE=0
if [ "$1" = "--host" ]; then
  HOST_MODE=1
  shift
fi

if [ "$HOST_MODE" -eq 1 ]; then
  if [ $# -eq 0 ]; then
    exec ssh -t "$REMOTE"
  else
    exec ssh "$REMOTE" "$*"
  fi
fi

CONTAINER=$(ssh "$REMOTE" "sudo docker ps --format '{{.Names}}' | grep '^mc-'" 2>/dev/null | head -1)

if [ -z "$CONTAINER" ]; then
  echo "Error: no remote container found on remote host." >&2
  exit 1
fi

if [ $# -eq 0 ]; then
  exec ssh -t "$REMOTE" "sudo docker exec -it '$CONTAINER' /bin/bash"
else
  exec ssh "$REMOTE" "sudo docker exec '$CONTAINER' $*"
fi
