import { parseWebhooksFromEnv, createSender } from "./discord.js";
import { findContainer, tailLogs } from "./docker.js";
import {
  matchEvent,
  createState,
  buildCrashEvent,
  buildAttachEvent,
} from "./events.js";
import { createHealthState, createHealthServer } from "./health.js";
import { DEFAULT_CONTAINER_PATTERN } from "./utils/constants.js";

const CONTAINER_PATTERN =
  process.env.MC_CONTAINER_PATTERN || DEFAULT_CONTAINER_PATTERN;
const HEALTH_PORT = Number(process.env.HEALTH_PORT || 8080);

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
const health = createHealthState();

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run every log line through the event catalog and dispatch matches.
 * Also bumps the health-state heartbeat.
 * @param {string} line
 */
function processLine(line) {
  health.lastLineAt = Date.now();
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
  await createHealthServer(health, HEALTH_PORT);
  console.log(`Health endpoint listening on :${HEALTH_PORT}/health`);

  while (true) {
    try {
      const container = await findContainer(CONTAINER_PATTERN);
      if (!container) {
        health.status = "starting";
        health.containerId = null;
        console.log("No matching container found, retrying in 10s...");
        await sleep(10000);
        continue;
      }
      health.status = "attached";
      health.containerId = container.id;
      console.log(`Attached to container ${container.id.slice(0, 12)}`);

      // Cold-start case: the bridge just attached to an already-healthy MC
      // container and will never see the historical "Done (...)!" log.
      // Surface the current status so the Discord channel isn't silent.
      try {
        const inspectData = await container.inspect();
        const attachEvent = buildAttachEvent(inspectData);
        if (attachEvent) {
          await send(attachEvent.channel, attachEvent.payload);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Attach status check failed:", message);
      }

      await tailLogs(container, processLine);
      health.status = "disconnected";

      // Stream ended — distinguish a graceful stop (server-stopping already
      // posted "🟥 hors ligne") from a crash (nothing posted, channel goes
      // silent) and notify in the crash case.
      const crashEvent = buildCrashEvent(state);
      if (crashEvent) {
        send(crashEvent.channel, crashEvent.payload).catch((err) =>
          console.error("Crash notification failed:", err.message),
        );
      }

      console.log("Log stream ended, reconnecting in 5s...");
      await sleep(5000);
    } catch (err) {
      health.status = "disconnected";
      const message = err instanceof Error ? err.message : String(err);
      console.error("Loop error:", message);
      await sleep(5000);
    }
  }
}

main();
