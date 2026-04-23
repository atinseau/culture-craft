FROM itzg/minecraft-server:java21

# Bake repo-managed configs + datapack + bootstrap into the image so they
# ship with the container regardless of how the orchestrator (Coolify) syncs
# the repo. The bootstrap script copies them into /data on every start.
COPY config /bootstrap/config
COPY datapacks /bootstrap/datapacks
COPY scripts/mc-bootstrap.sh /bootstrap/mc-bootstrap.sh

RUN chmod +x /bootstrap/mc-bootstrap.sh

ENTRYPOINT ["/bin/sh", "/bootstrap/mc-bootstrap.sh"]
