SHELL := /bin/sh
SCRIPTS := scripts

.PHONY: help dump import rollback refresh-pack shell host rcon logs

help:
	@echo "Culture Craft — available commands:"
	@echo "  make dump            Dump remote world into dumps/world-<ts>.zip"
	@echo "  make import FILE=... Restore a dump onto the remote server"
	@echo "  make rollback        Restore the most recent pre-import snapshot"
	@echo "  make refresh-pack    Regenerate Polymer resource pack and push (after mod changes)"
	@echo "  make shell           Interactive shell inside the Minecraft container"
	@echo "  make host            Interactive SSH shell on the remote host"
	@echo "  make rcon CMD=...    Run an RCON command (e.g. make rcon CMD='say hi')"
	@echo "  make logs            Tail the container logs on the remote host"

dump:
	@$(SCRIPTS)/dump-world.sh

import:
	@test -n "$(FILE)" || { echo "Usage: make import FILE=dumps/world-<ts>.zip" >&2; exit 1; }
	@$(SCRIPTS)/import-world.sh "$(FILE)"

rollback:
	@$(SCRIPTS)/rollback.sh

refresh-pack:
	@$(SCRIPTS)/refresh-pack.sh

shell:
	@$(SCRIPTS)/remote-shell.sh

host:
	@$(SCRIPTS)/remote-shell.sh --host

rcon:
	@$(SCRIPTS)/remote-shell.sh rcon-cli $(CMD)

logs:
	@$(SCRIPTS)/remote-shell.sh --host 'sudo docker logs -f --tail 100 $$(sudo docker ps --format "{{.Names}}" | grep "^mc-" | head -1)'
