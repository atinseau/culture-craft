/**
 * Centralized constants used across the discord-bridge service.
 * Keep literals here rather than scattered in callsites — lets us change
 * a color or channel name in one spot.
 */

/**
 * Discord embed colors (24-bit RGB).
 * Values match Tailwind palette for easy cross-reference.
 * @readonly
 */
export const COLORS = Object.freeze({
  JOIN: 0x22c55e, // green-500
  LEAVE: 0x6b7280, // gray-500
  DEATH: 0xef4444, // red-500
  SERVER_UP: 0x10b981, // emerald-500
  SERVER_DOWN: 0xdc2626, // red-600
  INFO: 0x3b82f6, // blue-500
  WARN: 0xf59e0b, // amber-500
});

/**
 * Named webhook channels. Each maps to `DISCORD_WEBHOOK_<NAME>` at runtime,
 * with fallback to `DISCORD_WEBHOOK_URL` when the specific one isn't set.
 * @readonly
 */
export const CHANNELS = Object.freeze({
  PLAYERS: "players",
  ADMIN: "admin",
  CHAT: "chat",
});

/**
 * Default bot identity used in every webhook POST unless overridden.
 * @readonly
 */
export const BOT_DEFAULTS = Object.freeze({
  NAME: "Culture Craft",
  AVATAR:
    "https://raw.githubusercontent.com/atinseau/culture-craft/master/logo.png",
});

/**
 * Default container name pattern. itzg + Coolify produce `mc-<uuid>-<suffix>`.
 * @readonly
 */
export const DEFAULT_CONTAINER_PATTERN = "^mc-";

/**
 * Path to the Docker socket inside the bridge container.
 * @readonly
 */
export const DOCKER_SOCKET = "/var/run/docker.sock";

/**
 * Prefix of env vars that describe a webhook URL.
 * @readonly
 */
export const WEBHOOK_ENV_PREFIX = "DISCORD_WEBHOOK_";

/**
 * Name of the fallback channel (resolved from `DISCORD_WEBHOOK_URL`).
 * @readonly
 */
export const DEFAULT_CHANNEL_NAME = "url";
