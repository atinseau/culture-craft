import { parseWebhooksFromEnv, createSender } from "./discord.js";
import { findContainer, tailLogs } from "./docker.js";
import { matchEvent, createState } from "./events.js";
import { DEFAULT_CONTAINER_PATTERN } from "./utils/constants.js";

const CONTAINER_PATTERN =
  process.env.MC_CONTAINER_PATTERN || DEFAULT_CONTAINER_PATTERN;

const webhooks = parseWebhooksFromEnv(process.env);
if (Object.keys(webhooks).length === 0) {
  console.error("No webhook configured. Set at least DISCORD_WEBHOOK_URL.");
  process.exit(1);
}
console.log(
  `Discord channels configured: [${Object.keys(webhooks).sort().join(", ")}]`,
);

const send = createSender({
  webhooks,
  botName: process.env.BOT_NAME,
  botAvatar: process.env.BOT_AVATAR,
});

const state = createState();

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run every log line through the event catalog and dispatch matches.
 * @param {string} line
 */
function processLine(line) {
  const result = matchEvent(line);
  if (!result) return;
  console.log(`→ ${result.event.name}: ${line.trim()}`);
  send(
    result.event.channel,
    result.event.build(result.match, state),
  ).catch((err) =>
    console.error(`Send failed for ${result.event.name}:`, err.message),
  );
}

/**
 * Main loop: locate the Minecraft container, tail its logs, restart on
 * disconnect. Never resolves — runs until the process is killed.
 *
 * @returns {Promise<void>}
 */
async function main() {
  console.log(`Discord bridge starting — watching /${CONTAINER_PATTERN}/`);

  while (true) {
    try {
      const container = await findContainer(CONTAINER_PATTERN);
      if (!container) {
        console.log("No matching container found, retrying in 10s...");
        await sleep(10000);
        continue;
      }
      console.log(`Attached to container ${container.id.slice(0, 12)}`);
      await tailLogs(container, processLine);
      console.log("Log stream ended, reconnecting in 5s...");
      await sleep(5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Loop error:", message);
      await sleep(5000);
    }
  }
}

main();
