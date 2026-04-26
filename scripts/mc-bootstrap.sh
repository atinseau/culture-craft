#!/bin/sh
# Runs before the itzg entrypoint on every container start.
# Syncs repo-managed configs and datapacks into /data so the server starts
# from a known-good state. Treat ./config and ./datapacks as source of truth;
# in-game mutations (e.g. /guishop additem) are ephemeral and lost on restart.
set -eu

echo "[culture-craft] bootstrap: staging configs and datapacks into /data"

mkdir -p /data/config /data/world/datapacks

if [ -d /bootstrap/config ]; then
  cp -rLT /bootstrap/config /data/config
fi

# Sync every datapack baked into the image. Each /bootstrap/datapacks/<name>/
# is mirrored into /data/world/datapacks/<name>/, replacing any existing copy
# so the repo stays the source of truth.
if [ -d /bootstrap/datapacks ]; then
  for dp in /bootstrap/datapacks/*/; do
    [ -d "$dp" ] || continue
    name=$(basename "$dp")
    rm -rf "/data/world/datapacks/$name"
    cp -rL "$dp" "/data/world/datapacks/"
  done
fi

# Bootstrap runs as root; itzg /start later drops privileges to uid 1000
# (minecraft user). Files we just copied are root-owned from the image layer,
# which blocks mods from writing (e.g. Savs' balances.json). Reclaim ownership.
chown -R 1000:1000 /data/config /data/world/datapacks 2>/dev/null || true

echo "[culture-craft] bootstrap: done, handing off to /start"
exec /start "$@"
