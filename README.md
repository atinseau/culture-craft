# Culture Craft

Self-hosted Minecraft Fabric server, tuned for a small VPS, with auto-installed
performance and quality-of-life mods.

## Stack

| Component | Version / Choice |
|---|---|
| Minecraft | `1.21.11` (pinned) |
| Mod loader | Fabric |
| Runtime | [`itzg/minecraft-server`](https://github.com/itzg/docker-minecraft-server) on Java 21 |
| Mod source | Modrinth (auto) + local `./mods/` (manual) |
| Idle behavior | Native `pause-when-empty-seconds` (JVM suspends after 10 min empty) |
| JVM flags | MeowIce's Aikar-derived flags (modern G1GC tuning) |

## Project layout

```
culture-craft/
├── Makefile            # task runner
├── docker-compose.yml  # single-service stack
├── .env                # secrets + overrides (gitignored)
├── .env.example        # template with all keys
├── minecraft-data/     # world + player state (gitignored)
├── mods/               # drop .jar files here for manual mods
└── scripts/
    ├── dump-world.sh   # snapshot remote world into ./minecraft-data/
    └── remote-shell.sh # shell into container or host
```

## Deployment

### First-time setup

```sh
cp .env.example .env
# fill in at minimum: REMOTE, RCON_PASSWORD, OPS
```

Sync the project to the target host and start the stack:

```sh
rsync -avz ./ <user>@<host>:/home/<user>/culture-craft/
ssh <user>@<host> "cd culture-craft && docker compose up -d"
```

The first boot downloads Fabric, fabric-api, and all mods listed in
`MODRINTH_PROJECTS` (~2–5 min). Watch the progress with `make logs`.

### Migrating an existing world

```sh
make dump                     # snapshot the currently-running server
rsync -avz minecraft-data/ <user>@<host>:/home/<user>/culture-craft/minecraft-data/
# stop the old deployment, then:
ssh <user>@<host> "cd culture-craft && docker compose up -d"
```

`make dump` is safe with players online — it flushes and freezes writes via
RCON during the copy, then resumes autosave.

## Commands

| Command | Description |
|---|---|
| `make dump` | Snapshot remote world → `./minecraft-data/` |
| `make shell` | Interactive shell inside the Minecraft container |
| `make host` | SSH shell on the remote host |
| `make rcon CMD=...` | Run an RCON command, e.g. `make rcon CMD='list'` |
| `make logs` | Tail the container logs |
| `make help` | List targets |

## Mods

Three complementary pipelines land in `/data/mods`:

1. **`MODRINTH_PROJECTS`** — comma-separated Modrinth slugs. Versions are
   resolved against the running Minecraft version, and required dependencies
   (like `fabric-api`) are pulled automatically.
2. **`./mods/`** — bind-mounted read-only into `/mods`, synced to
   `/data/mods` on every boot. Use this for mods not on Modrinth.
3. **`REMOVE_OLD_MODS=true`** — stale jars from previous deploys are cleaned
   up automatically.

### Shipped mods

**Performance (server-side)**
- [`lithium`](https://modrinth.com/mod/lithium) — game-logic optimizations
- [`ferrite-core`](https://modrinth.com/mod/ferrite-core) — memory footprint
- [`krypton`](https://modrinth.com/mod/krypton) — network stack
- [`alternate-current`](https://modrinth.com/mod/alternate-current) — redstone rewrite
- [`spark`](https://modrinth.com/mod/spark) — profiling (`/spark` in-game)

**Quality of life**
- [`chunky`](https://modrinth.com/mod/chunky) — async chunk pre-generation
- [`ping-wheel`](https://modrinth.com/mod/ping-wheel) — in-game marker pings
- [`fallingtree`](https://modrinth.com/mod/fallingtree) — one-hit trees
- [`waystones`](https://modrinth.com/mod/waystones) — teleport stones
- [`ledger`](https://modrinth.com/mod/ledger) — block modification log + rollback
- [`better-serversleep`](https://modrinth.com/mod/better-serversleep) — one-player sleep skips night
- [`universal-graves`](https://modrinth.com/mod/universal-graves) — graves protect inventory on death
- [`fastback`](https://modrinth.com/mod/fastback) — git-backed incremental world backups

## Performance tuning

Small-VPS-friendly defaults baked into `docker-compose.yml`:

| Setting | Value | Notes |
|---|---|---|
| `INIT_MEMORY` / `MAX_MEMORY` | `1G` / `2G` | Reserve ~25% container headroom for non-heap JVM memory |
| `USE_MEOWICE_FLAGS` | `true` | Modern G1GC flags for Java 17+ |
| `VIEW_DISTANCE` | `8` | Lower = less chunk streaming |
| `SIMULATION_DISTANCE` | `6` | Lower = fewer ticking entities |
| `NETWORK_COMPRESSION_THRESHOLD` | `512` | Higher = less CPU on small packets |
| `SYNC_CHUNK_WRITES` | `false` | Async chunk I/O |
| `USE_NATIVE_TRANSPORT` | `true` | epoll on Linux |
| `PAUSE_WHEN_EMPTY_SECONDS` | `600` | JVM idles after 10 min with no players |

After the first boot, run chunk pre-generation to avoid exploration lag spikes:

```sh
make rcon CMD='chunky radius 3000'
make rcon CMD='chunky start'
```

## Data & safety

- `minecraft-data/` and `.env` are gitignored — never committed.
- `make dump` is the source of truth for capturing remote state before a
  migration.
- `fastback` produces in-container git-backed backups as a second layer.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Boot hangs on "Downloading Modrinth project X" | Slug missing or incompatible with `VERSION`. Suffix with `?` in `MODRINTH_PROJECTS` to make optional. |
| Container restarts after a few minutes | Check `MAX_MEMORY` — heap OOM. Increase or drop view/sim distance. |
| `make rcon` hangs | Container not running, or `RCON_PASSWORD` mismatch between `.env` and the running server. |
| Port 25565 already in use | Another Minecraft container (Coolify?) is bound. Stop it first. |
