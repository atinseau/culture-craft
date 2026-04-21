// Webhook client — written as pure functions + a factory so tests can inject
// their own `fetch` and `logger`.
//
// Naming convention: any env var starting with `DISCORD_WEBHOOK_` becomes a
// named channel keyed by the lowercase suffix. `DISCORD_WEBHOOK_URL` is the
// `url` channel AND the fallback for any event referencing a channel that
// isn't configured.

export function parseWebhooksFromEnv(env) {
  return Object.entries(env)
    .filter(([k]) => k.startsWith("DISCORD_WEBHOOK_"))
    .reduce((acc, [k, v]) => {
      if (v) acc[k.replace("DISCORD_WEBHOOK_", "").toLowerCase()] = v;
      return acc;
    }, {});
}

export function createSender({
  webhooks,
  botName = "Culture Craft",
  botAvatar = "https://raw.githubusercontent.com/atinseau/culture-craft/master/logo.png",
  fetchImpl = fetch,
  logger = console,
} = {}) {
  const defaultUrl = webhooks?.url;

  return async function send(channel, payload) {
    const targets =
      channel == null
        ? ["url"]
        : Array.isArray(channel)
          ? channel
          : [channel];

    for (const name of targets) {
      const url = webhooks[name] ?? defaultUrl;
      if (!url) {
        logger.warn(`No webhook URL for channel "${name}" (no default either)`);
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
        logger.error(`Webhook "${name}" error: ${err.message}`);
      }
    }
  };
}
