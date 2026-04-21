import {
  BOT_DEFAULTS,
  WEBHOOK_ENV_PREFIX,
  DEFAULT_CHANNEL_NAME,
} from "./utils/constants.js";

/**
 * Map of channel name → webhook URL.
 * Keyed by the lowercase suffix after `DISCORD_WEBHOOK_`.
 * @typedef {Record<string, string>} WebhookMap
 */

/**
 * Minimal subset of the Discord webhook payload we use.
 * Full spec: https://discord.com/developers/docs/resources/webhook
 *
 * @typedef {object} WebhookPayload
 * @property {string} [content]
 * @property {unknown[]} [embeds]
 * @property {string} [username]
 * @property {string} [avatar_url]
 */

/**
 * Logger interface used by the sender. `console` satisfies it.
 * @typedef {object} Logger
 * @property {(...args: unknown[]) => void} warn
 * @property {(...args: unknown[]) => void} error
 * @property {(...args: unknown[]) => void} [log]
 */

/**
 * Config for {@link createSender}.
 * @typedef {object} SenderConfig
 * @property {WebhookMap} webhooks
 * @property {string} [botName]
 * @property {string} [botAvatar]
 * @property {typeof fetch} [fetchImpl]
 * @property {Logger} [logger]
 */

/**
 * Signature of the sender function returned by {@link createSender}.
 * @typedef {(channel: string | string[] | null | undefined, payload: WebhookPayload) => Promise<void>} Send
 */

/**
 * Build a webhook map from environment variables matching `DISCORD_WEBHOOK_*`.
 * Empty / undefined values are skipped; keys are lowercased.
 *
 * @example
 * parseWebhooksFromEnv({
 *   DISCORD_WEBHOOK_URL: "https://default",
 *   DISCORD_WEBHOOK_PLAYERS: "https://players",
 * });
 * // => { url: "https://default", players: "https://players" }
 *
 * @param {Record<string, string | undefined>} env
 * @returns {WebhookMap}
 */
export function parseWebhooksFromEnv(env) {
  return Object.entries(env)
    .filter(([k]) => k.startsWith(WEBHOOK_ENV_PREFIX))
    .reduce((acc, [k, v]) => {
      if (v) acc[k.replace(WEBHOOK_ENV_PREFIX, "").toLowerCase()] = v;
      return acc;
    }, /** @type {WebhookMap} */ ({}));
}

/**
 * Create a Discord webhook sender.
 *
 * Channels not found in `webhooks` fall back to the default
 * (`DISCORD_WEBHOOK_URL`). If no URL at all is available for a channel,
 * the sender logs a warning and skips.
 *
 * @param {SenderConfig} config
 * @returns {Send}
 */
export function createSender({
  webhooks,
  botName = BOT_DEFAULTS.NAME,
  botAvatar = BOT_DEFAULTS.AVATAR,
  fetchImpl = fetch,
  logger = console,
} = /** @type {SenderConfig} */ ({})) {
  const defaultUrl = webhooks?.[DEFAULT_CHANNEL_NAME];

  return async function send(channel, payload) {
    /** @type {string[]} */
    const targets =
      channel == null
        ? [DEFAULT_CHANNEL_NAME]
        : Array.isArray(channel)
          ? channel
          : [channel];

    for (const name of targets) {
      const url = webhooks[name] ?? defaultUrl;
      if (!url) {
        logger.warn(
          `No webhook URL for channel "${name}" (no default either)`,
        );
        continue;
      }
      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: botName,
            avatar_url: botAvatar,
            ...payload,
          }),
        });
        if (!res.ok) {
          logger.error(
            `Webhook "${name}" failed: ${res.status} ${await res.text()}`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Webhook "${name}" error: ${message}`);
      }
    }
  };
}
