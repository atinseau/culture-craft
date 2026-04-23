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
├── Makefile              # task runner
├── docker-compose.yml    # mc + discord-bridge stack
├── .env / .env.example   # secrets + overrides (gitignored / template)
├── .dockerignore         # keeps the mc build context lean
├── minecraft-data/       # world + runtime state (gitignored)
├── mods/                 # drop .jar files here for manual mods
├── config/               # source-of-truth mod configs (baked into mc image)
│   ├── savs-common-economy/  (config.json + worth.json)
│   ├── CommandMaker/         (aliases.json → /market, /sell)
│   ├── guishop.json
│   └── guishopeconomy.json
├── datapacks/
│   └── culture-economy/      # advancement → token rewards (baked into mc image)
├── services/
│   ├── mc/Dockerfile         # extends itzg/minecraft-server, bakes configs/datapack/bootstrap
│   └── discord-bridge/       # sidecar that relays MC events to Discord
└── scripts/
    ├── mc-bootstrap.sh       # entrypoint wrapper: stages configs/datapack into /data
    ├── dump-world.sh         # snapshot remote /data (incl. balances) → ./dumps/
    ├── import-world.sh       # restore a dump onto the remote (with hardlink backup)
    ├── rollback.sh           # revert to the most recent pre-import snapshot
    └── remote-shell.sh       # shell into container or host
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

First boot builds the custom mc image (`services/mc/Dockerfile` extends
`itzg/minecraft-server` and COPYs `./config/`, `./datapacks/`, and
`scripts/mc-bootstrap.sh` into `/bootstrap/`). On every container start the
bootstrap script runs before `/start`, copies those baked files into `/data`
and chowns them to uid 1000, then hands off to itzg. Net effect: a `git push`
is the whole deploy — no manual `cp`, no `/datapack enable`, no rebuild
step. The Dockerfile path is required because Coolify only pushes the
compose file + build contexts to the target, not arbitrary bind-mount
contents.

After that, itzg downloads Fabric, fabric-api, and every slug in
`MODRINTH_PROJECTS` (~2–5 min the first time, cached afterwards). Watch with
`make logs`.

> **IaC semantics**: the repo is the source of truth for configs and
> datapacks. In-game mutations (e.g. `/guishop additem`, editing
> `savs-common-economy/config.json` live) are **lost on restart** — the
> bootstrap re-stages the repo copy. To add shop items or tweak prices,
> edit the JSON locally and redeploy.

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

**Economy**
- [`savs-common-economy`](https://modrinth.com/mod/savs-common-economy) — tokens backend (`/bal`, `/pay`, `/baltop`, physical notes, Common Economy API)
- [`rwc-gui-shop`](https://modrinth.com/mod/rwc-gui-shop) — GUI admin market, bridged to Savs via Common Economy API
- [`universal-shops`](https://modrinth.com/mod/universal-shops) — craftable shop blocks for player-to-player trade (Polymer, vanilla client)
- [`command-maker`](https://modrinth.com/mod/command-maker) — registers `/market` and `/sell` aliases onto `/guishop`

## Economy

Thin token layer on top of vanilla gameplay. Mining, farming, and breeding
stay the only way to acquire core progression materials — tokens only buy
*comfort*.

### Token sources

- **Advancements** (one-shot, tiered 50 → 2000) — the dominant source of
  income, covered by the `culture-economy` datapack.
- **Admin sell market** (`/sell`, 70 items) — floor prices for surplus,
  tiered 1 → 100 tokens:
  - 1: common crops, eggs, feathers, common logs, cactus/bamboo/kelp, raw
    meats, white wool, ink sac
  - 2: rare logs, mob drops (bone/string/powder), cooked meats, coal, flint,
    clay, cocoa, nether wart, chorus fruit
  - 3: leather, iron/gold/redstone/lapis, glowstone dust, soul sand
  - 5: blaze rod, obsidian, nether quartz, magma cream, honey bottle,
    popped chorus fruit
  - 8+: slime ball, phantom membrane, honeycomb, glowstone block,
    prismarine, end rod
  - 15-30: crying obsidian, diamond, emerald, turtle scute, nautilus shell,
    ghast tear
  - 50: shulker shell
  - 100: ancient debris / netherite scrap
  - Trash (cobble, dirt, stone variants, rotten flesh) is **not** accepted —
    minimum price of 1 token/item against infinite cobblegen would break the
    economy.
- **Player-to-player trade** — Universal Shops blocks and Savs chest shops.

### Token sinks

- **Admin buy market** (`/market`, 45 items):
  - Structure loot convenience: name tag (150), saddle (200), horse armor
    (300/500/800), lead (50), shears (30)
  - Decorative blocks: 6 terracotta (2), 4 colored wool (1)
  - Building blocks: stone-family (smooth/polished/chiseled/mossy, 2-5),
    sandstone variants (3), quartz block/smooth quartz (5), bricks (8),
    nether / end-stone / prismarine bricks (8-10), polished blackstone
    bricks (10), glass (2), glass pane (1), 4 stained glass (3), 6 concrete
    (5)
  - Notably **not** sold by admin: anything farmable (sugar cane, bamboo,
    kelp, cactus, cocoa) — players grow their own.
- **Player-to-player purchases** (emergent).

No waystone cost, no enchant taxes, no death penalty — deferred until the
first concrete need arises.

### Configuration files (`./config/`)

| File | Role |
|---|---|
| `savs-common-economy/config.json` | Starting balance 50 tokens, `enableSellCommands: false`, chest shops on, currency symbol `" tokens"` |
| `savs-common-economy/worth.json` | Empty — Savs' `/buy /sell /worth` CLI is off; pricing lives in `guishop.json` |
| `guishop.json` | Two shops — `market` (45 items, buy only) + `sell` (70 items, sell only). Bridged to Savs via `"economyProviders": { "savs_common_economy:dollar": ["default"] }`. |
| `guishopeconomy.json` | GUI Shop built-in economy **disabled** |
| `CommandMaker/aliases.json` | `/market → guishop open market @s`, `/sell → guishop open sell @s` |

**Important constraint**: `rwc-gui-shop` stores prices as `long` (integer).
Decimal values get truncated to 0. Minimum sellable unit is therefore
**1 token/item** — the catalogue is tiered around that floor.

### Datapack: `culture-economy`

Drives the advancement → token rewards. Polls every 20 ticks (1 s) via
`#minecraft:tick`, detects newly-completed advancements (tag-gated per
advancement to avoid double-rewards), credits the player's Savs wallet via
`/givemoney`, and tracks cumulative earnings in a local `ce_earned`
scoreboard (inspectable with `/scoreboard players list <player>`).

**Extending**: add lines to
`data/culture_economy/function/check_all.mcfunction` — one per tracked
advancement (`adv`, `tag`, `amount`). No other files to edit.

**Requires** `function-permission-level` ≥ 2 (default in `server.properties`)
so the datapack can invoke `/givemoney`.

### In-game commands

Player:
- `/bal`, `/baltop` — balance self / top
- `/pay <player> <amount>` — transfer
- `/withdraw <amount>` — mint a physical bank note
- `/market`, `/sell` — open admin market / sell GUI (command-maker aliases)
- `/guishop` — open default shop (same as `/market`)
- `/shop create sell <price>` / `/shop create buy <price>` — create a
  sign-based chest shop (Savs)
- `/shop remove` / `/shop info` / `/shop list` — manage your chest shops
- Craft a Trade Shop block (4 planks + 1 wool + 1 iron) to post a player
  GUI shop on any adjacent container (Universal Shops)

Admin (OP level 2+):
- `/givemoney <player> <amount>`, `/takemoney`, `/setmoney`, `/resetmoney`
- `/ecolog <player> <time> <unit>` — Savs transaction ledger
- `/guishop create|delete|additem|removeitem|reload` — mutate shops live
  (ephemeral: wiped on restart, edit `config/guishop.json` in the repo for
  persistence)

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
- `make dump` captures **all runtime state** — world data, Savs balances,
  mod configs. It's the full-restore source of truth for migrations.
- `fastback` produces in-container git-backed backups of the **world only**
  (not `config/`) as a second layer — useful for world rollbacks, not for
  economy balances.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Boot hangs on "Downloading Modrinth project X" | Slug missing or incompatible with `VERSION`. Suffix with `?` in `MODRINTH_PROJECTS` to make optional. |
| Container restarts after a few minutes | Check `MAX_MEMORY` — heap OOM. Increase or drop view/sim distance. |
| `make rcon` hangs | Container not running, or `RCON_PASSWORD` mismatch between `.env` and the running server. |
| Port 25565 already in use | Another Minecraft container (Coolify?) is bound. Stop it first. |
