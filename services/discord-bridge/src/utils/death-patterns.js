/**
 * Vanilla Minecraft death message patterns as regex alternation fragments.
 * Composed into {@link DEATH_REGEX} so adding a new cause = adding one line
 * to this list.
 *
 * Source: `death.attack.*` entries of Minecraft's en_us.json lang file.
 * Placeholders: {0} is the victim (captured as player name), {1}/{2} are
 * killer/weapon (captured as part of the free-form tail).
 *
 * @type {readonly string[]}
 */
export const DEATH_CAUSES = Object.freeze([
  // "was <verb> by ..." — covers mob/player kills, projectiles, magic, etc.
  "was\\s+\\S.+",

  // Water / suffocation / generic death
  "drowned",
  "died(?:\\s.+)?",
  "suffocated in a wall",

  // Falling
  "fell\\s+.+",
  "hit the ground too hard.*",

  // Hot surfaces / fire / lava
  "tried to swim in lava",
  "burned to death",
  "went up in flames",
  "discovered the floor was lava",

  // Starvation / withering / freezing
  "starved to death",
  "withered away",
  "froze to death",

  // Cactus / escape scenarios
  "walked into .+",

  // Firework / creeper auto-detonation / world border
  "blew up",
  "went off with a bang",
  "left the confines of this world",

  // Misc flavor
  "didn't want to live in the same world as .+",
  "got finished off by .+",
  "experienced kinetic energy",
]);

/**
 * Full regex that matches a Minecraft server log line containing a death.
 * Capture groups:
 *   - `[1]` → player name (victim)
 *   - `[2]` → death cause (the full tail of the message)
 *
 * @type {RegExp}
 */
export const DEATH_REGEX = new RegExp(
  `\\[Server thread\\/INFO\\]: (\\w+) (${DEATH_CAUSES.join("|")})$`,
);
