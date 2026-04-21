SHELL := /bin/sh
SCRIPTS := scripts

.PHONY: help dump shell host rcon logs

help:
	@echo "Culture Craft — available commands:"
	@echo "  make dump         Dump remote world data into ./minecraft-data/"
	@echo "  make shell        Interactive shell inside the Minecraft container"
	@echo "  make host         Interactive SSH shell on the remote host"
	@echo "  make rcon CMD=... Run an RCON command (e.g. make rcon CMD='say hi')"
	@echo "  make logs         Tail the container logs on the remote host"

dump:
	@$(SCRIPTS)/dump-world.sh

shell:
	@$(SCRIPTS)/remote-shell.sh

host:
	@$(SCRIPTS)/remote-shell.sh --host

rcon:
	@$(SCRIPTS)/remote-shell.sh rcon-cli $(CMD)

logs:
	@$(SCRIPTS)/remote-shell.sh --host 'sudo docker logs -f --tail 100 $$(sudo docker ps --format "{{.Names}}" | grep "^mc-" | head -1)'
