/**
 * Shared state passed to every event `build` function. Lets events communicate
 * between each other (e.g. `player-join` stores a timestamp the `player-leave`
 * event later reads to compute session duration).
 *
 * Conventionally keyed as `<eventType>:<subject>`, see helpers below.
 *
 * @typedef {Map<string, unknown>} SharedState
 */

/**
 * Build a fresh (empty) shared state map.
 * @returns {SharedState}
 */
export function createState() {
  return new Map();
}

/**
 * Compose a state key for a session's join timestamp.
 *
 * @example
 * sessionKey("Arthur"); // "join:Arthur"
 *
 * @param {string} player
 * @returns {string}
 */
export function sessionKey(player) {
  return `join:${player}`;
}
