import { COLORS, CHANNELS } from "./utils/constants.js";
import { formatDuration } from "./utils/duration.js";
import { DEATH_REGEX } from "./utils/death-patterns.js";
import { sessionKey } from "./utils/state.js";

// State key used to track a graceful MC shutdown. Set by the server-stopping
// event, cleared by server-ready. The main loop reads it after `tailLogs`
// resolves to distinguish a clean stop from a crash.
const GRACEFUL_STOP_KEY = "lifecycle:graceful-stop-pending";

// Edge-triggered lifecycle reporting: remember the last state we announced
// to Discord ("up" | "down") so we only post on transitions. During a crash
// loop, we post "hors ligne" once on the first failure, then stay silent
// until a successful "Serveur en ligne" resets the edge.
const LAST_STATE_KEY = "lifecycle:last-reported-state";

// Re-export state helpers so callers only need to import from "./events.js".
export { createState, sessionKey } from "./utils/state.js";
// Re-export duration too — useful for tests and downstream events.
export { formatDuration } from "./utils/duration.js";

/**
 * @typedef {import('./utils/state.js').SharedState} SharedState
 */

/**
 * An event handler maps a log-line regex to a Discord payload builder.
 *
 * - `build` is called with the regex match array and the shared state.
 *   Events can both read and write to `state` (e.g. player-join writes a
 *   timestamp that player-leave reads for session duration).
 * - `channel` is looked up in the webhook map at send time; when absent
 *   the message goes to the default channel (DISCORD_WEBHOOK_URL).
 *
 * @typedef {object} Event
 * @property {string} name
 * @property {RegExp} pattern
 * @property {string | string[]} [channel]
 * @property {(match: RegExpMatchArray, state: SharedState) => import('./discord.js').WebhookPayload} build
 */

/**
 * Result of matching a log line against the event catalog.
 * @typedef {object} MatchResult
 * @property {Event} event
 * @property {RegExpMatchArray} match
 */

/**
 * Ordered event catalog. Order matters: `matchEvent` returns on the first
 * hit, so more specific events must come before broad ones (join/leave
 * before player-death, which uses a wide regex).
 *
 * @type {Event[]}
 */
export const EVENTS = [
  {
    name: "server-ready",
    pattern: /\[Server thread\/INFO\]: Done \((\d+\.\d+)s\)!/,
    channel: CHANNELS.PLAYERS,
    build: ([, bootTime], state) => {
      // New boot — clear any stale graceful-stop flag from the previous run.
      state.delete(GRACEFUL_STOP_KEY);
      if (state.get(LAST_STATE_KEY) === "up") return null;
      state.set(LAST_STATE_KEY, "up");
      return {
        embeds: [
          {
            color: COLORS.SERVER_UP,
            description: `🟩 **Serveur en ligne** (boot ${bootTime}s)`,
          },
        ],
      };
    },
  },
  {
    name: "server-stopping",
    pattern: /\[Server thread\/INFO\]: Stopping server/,
    channel: CHANNELS.PLAYERS,
    build: (_, state) => {
      // Mark the shutdown as graceful so the main loop won't post a crash
      // notification when the log stream ends moments later.
      state.set(GRACEFUL_STOP_KEY, true);
      if (state.get(LAST_STATE_KEY) === "down") return null;
      state.set(LAST_STATE_KEY, "down");
      return {
        embeds: [
          {
            color: COLORS.SERVER_DOWN,
            description: `🟥 **Serveur hors ligne**`,
          },
        ],
      };
    },
  },
  {
    name: "player-join",
    pattern: /\[Server thread\/INFO\]: (\w+) joined the game/,
    channel: CHANNELS.PLAYERS,
    build: ([, player], state) => {
      state.set(sessionKey(player), Date.now());
      return {
        embeds: [
          {
            color: COLORS.JOIN,
            description: `🟢 **${player}** s'est connecté`,
          },
        ],
      };
    },
  },
  {
    name: "player-leave",
    pattern: /\[Server thread\/INFO\]: (\w+) left the game/,
    channel: CHANNELS.PLAYERS,
    build: ([, player], state) => {
      const key = sessionKey(player);
      const joinedAt = /** @type {number | undefined} */ (state.get(key));
      state.delete(key);
      // Bridge restart case: we have no join timestamp → omit suffix.
      const suffix = joinedAt
        ? ` après ${formatDuration(Date.now() - joinedAt)}`
        : "";
      return {
        embeds: [
          {
            color: COLORS.LEAVE,
            description: `🔴 **${player}** s'est déconnecté${suffix}`,
          },
        ],
      };
    },
  },
  {
    name: "player-death",
    pattern: DEATH_REGEX,
    channel: CHANNELS.PLAYERS,
    build: ([, player, cause]) => ({
      embeds: [
        {
          color: COLORS.DEATH,
          description: `💀 **${player}** ${cause}`,
        },
      ],
    }),
  },
];

/**
 * Test a log line against the event catalog. Returns the first match, or
 * `null` if no event's pattern matched.
 *
 * @param {string} line
 * @returns {MatchResult | null}
 */
export function matchEvent(line) {
  for (const event of EVENTS) {
    const match = line.match(event.pattern);
    if (match) return { event, match };
  }
  return null;
}

/**
 * Synthetic event emitted by the main loop when the log stream ends. If the
 * last thing we saw was a graceful `server-stopping` log, this returns null
 * (the server-stopping event already notified). Otherwise the container
 * died unexpectedly (SIGKILL / OOM / crash) and we post a warning.
 *
 * Consumes the flag so a subsequent reconnect + graceful stop works cleanly.
 *
 * @param {SharedState} state
 * @returns {{ channel: string, payload: import('./discord.js').WebhookPayload } | null}
 */
export function buildCrashEvent(state) {
  const wasGraceful = state.get(GRACEFUL_STOP_KEY) === true;
  state.delete(GRACEFUL_STOP_KEY);
  if (wasGraceful) return null;
  if (state.get(LAST_STATE_KEY) === "down") return null;
  state.set(LAST_STATE_KEY, "down");
  return {
    channel: CHANNELS.PLAYERS,
    payload: {
      embeds: [
        {
          color: COLORS.SERVER_DOWN,
          description: `⚠️ **Serveur hors ligne** (arrêt non gracieux)`,
        },
      ],
    },
  };
}

/**
 * Synthetic event emitted right after the bridge attaches to a container.
 * If the MC container is already fully booted (`healthy` status), the
 * bridge missed the historical `Done (...)!` log — we post a "bridge
 * reconnected" message so users aren't left in the dark.
 *
 * If the container is still starting, we return null: the regular
 * server-ready event will fire once boot completes.
 *
 * @param {{ State?: { Health?: { Status?: string } } } | null | undefined} inspectData
 * @returns {{ channel: string, payload: import('./discord.js').WebhookPayload } | null}
 */
export function buildAttachEvent(inspectData, state) {
  const healthStatus = inspectData?.State?.Health?.Status;
  if (healthStatus !== "healthy") return null;
  if (state && state.get(LAST_STATE_KEY) === "up") return null;
  if (state) state.set(LAST_STATE_KEY, "up");
  return {
    channel: CHANNELS.PLAYERS,
    payload: {
      embeds: [
        {
          color: COLORS.SERVER_UP,
          description: `🔌 Bridge rattaché — **Serveur en ligne**`,
        },
      ],
    },
  };
}
