import { parseWebhooksFromEnv, createSender } from "./discord.js";
import { findContainer, tailLogs } from "./docker.js";
import { matchEvent } from "./events.js";

const CONTAINER_PATTERN = process.env.MC_CONTAINER_PATTERN || "^mc-";

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function processLine(line) {
  const result = matchEvent(line);
  if (!result) return;
  console.log(`→ ${result.event.name}: ${line.trim()}`);
  send(result.event.channel, result.event.build(result.match)).catch((err) =>
    console.error(`Send failed for ${result.event.name}:`, err.message),
  );
}

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
      console.error("Loop error:", err.message);
      await sleep(5000);
    }
  }
}

main();
