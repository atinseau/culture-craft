import { COLORS, CHANNELS } from "./utils/constants.js";
import { formatDuration } from "./utils/duration.js";
import { DEATH_REGEX } from "./utils/death-patterns.js";
import { sessionKey } from "./utils/state.js";

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
