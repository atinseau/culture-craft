import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  matchEvent,
  EVENTS,
  createState,
  formatDuration,
  buildCrashEvent,
  buildAttachEvent,
} from "../src/events.js";

describe("matchEvent — server lifecycle", () => {
  it("matches server ready (Done) line and captures boot time", () => {
    const line =
      "[15:52:33] [Server thread/INFO]: Done (0.628s)! For help, type \"help\"";
    const result = matchEvent(line);
    assert.ok(result);
    assert.equal(result.event.name, "server-ready");
    assert.equal(result.match[1], "0.628");
  });

  it("matches server stopping line", () => {
    const line = "[15:52:33] [Server thread/INFO]: Stopping server";
    const result = matchEvent(line);
    assert.ok(result);
    assert.equal(result.event.name, "server-stopping");
  });

  it("server-ready builder contains the boot time and emerald color", () => {
    const event = EVENTS.find((e) => e.name === "server-ready");
    const payload = event.build(["full", "1.234"], createState());
    assert.equal(payload.embeds[0].color, 0x10b981);
    assert.match(payload.embeds[0].description, /Serveur en ligne/);
    assert.match(payload.embeds[0].description, /1\.234s/);
  });

  it("server-stopping builder returns the offline embed with red color", () => {
    const event = EVENTS.find((e) => e.name === "server-stopping");
    const payload = event.build([], createState());
    assert.equal(payload.embeds[0].color, 0xdc2626);
    assert.match(payload.embeds[0].description, /hors ligne/);
  });

  it("server-stopping sets the graceful-stop flag in state", () => {
    const state = createState();
    const event = EVENTS.find((e) => e.name === "server-stopping");
    event.build([], state);
    // buildCrashEvent should now observe the flag
    assert.equal(buildCrashEvent(state), null);
  });

  it("server-ready clears any stale graceful-stop flag", () => {
    const state = createState();
    state.set("lifecycle:graceful-stop-pending", true);
    const event = EVENTS.find((e) => e.name === "server-ready");
    event.build(["full", "1.000"], state);
    // Flag was cleared → the next stream-end should be treated as a crash
    assert.notEqual(buildCrashEvent(state), null);
  });
});

describe("buildCrashEvent", () => {
  it("returns null when the last stop was graceful", () => {
    const state = createState();
    state.set("lifecycle:graceful-stop-pending", true);
    assert.equal(buildCrashEvent(state), null);
  });

  it("returns a crash payload when no graceful stop was seen", () => {
    const state = createState();
    const event = buildCrashEvent(state);
    assert.ok(event);
    assert.equal(event.channel, "players");
    assert.match(event.payload.embeds[0].description, /non gracieux/);
    assert.equal(event.payload.embeds[0].color, 0xdc2626);
  });

  it("consumes the flag (next call returns a crash payload)", () => {
    const state = createState();
    state.set("lifecycle:graceful-stop-pending", true);
    assert.equal(buildCrashEvent(state), null); // first: graceful
    assert.notEqual(buildCrashEvent(state), null); // second: flag consumed → crash
  });
});

describe("buildAttachEvent", () => {
  it("returns an attach payload when container is healthy", () => {
    const event = buildAttachEvent({
      State: { Health: { Status: "healthy" } },
    });
    assert.ok(event);
    assert.equal(event.channel, "players");
    assert.match(event.payload.embeds[0].description, /Bridge rattaché/);
    assert.match(event.payload.embeds[0].description, /Serveur en ligne/);
  });

  it("returns null when container is still starting", () => {
    const event = buildAttachEvent({
      State: { Health: { Status: "starting" } },
    });
    assert.equal(event, null);
  });

  it("returns null when health data is missing", () => {
    assert.equal(buildAttachEvent({}), null);
    assert.equal(buildAttachEvent({ State: {} }), null);
    assert.equal(buildAttachEvent({ State: { Health: {} } }), null);
    assert.equal(buildAttachEvent(null), null);
    assert.equal(buildAttachEvent(undefined), null);
  });

  it("returns null when container is unhealthy", () => {
    const event = buildAttachEvent({
      State: { Health: { Status: "unhealthy" } },
    });
    assert.equal(event, null);
  });
});

describe("matchEvent — pattern matching", () => {
  it("matches a player join line", () => {
    const line = "[15:00:00] [Server thread/INFO]: 1AlphaOmega0 joined the game";
    const result = matchEvent(line);

    assert.ok(result, "expected a match");
    assert.equal(result.event.name, "player-join");
    assert.equal(result.match[1], "1AlphaOmega0");
  });

  it("matches a player leave line", () => {
    const line = "[15:00:00] [Server thread/INFO]: SomePlayer left the game";
    const result = matchEvent(line);

    assert.ok(result);
    assert.equal(result.event.name, "player-leave");
    assert.equal(result.match[1], "SomePlayer");
  });

  it("returns null on unrelated lines", () => {
    assert.equal(matchEvent(""), null);
    assert.equal(
      matchEvent("[15:00:00] [Server thread/INFO]: Saving chunks..."),
      null,
    );
    assert.equal(matchEvent("joined the game"), null); // missing Server thread prefix
    assert.equal(matchEvent("random noise"), null);
  });

  it("only matches within Server thread/INFO log lines", () => {
    const line = "[Worker-Main-1/INFO]: PlayerX joined the game";
    assert.equal(matchEvent(line), null);
  });
});

describe("matchEvent — player death", () => {
  const deathCases = [
    ["PlayerX was slain by Zombie", "was slain by Zombie"],
    ["PlayerX was shot by Skeleton", "was shot by Skeleton"],
    ["PlayerX was blown up by Creeper", "was blown up by Creeper"],
    ["PlayerX was killed by Warden using [Claws]", "was killed by Warden using [Claws]"],
    ["PlayerX drowned", "drowned"],
    ["PlayerX died", "died"],
    ["PlayerX died from Warden sonic boom", "died from Warden sonic boom"],
    ["PlayerX fell from a high place", "fell from a high place"],
    ["PlayerX fell out of the world", "fell out of the world"],
    ["PlayerX hit the ground too hard whilst trying to escape Zombie", "hit the ground too hard whilst trying to escape Zombie"],
    ["PlayerX tried to swim in lava", "tried to swim in lava"],
    ["PlayerX burned to death", "burned to death"],
    ["PlayerX went up in flames", "went up in flames"],
    ["PlayerX starved to death", "starved to death"],
    ["PlayerX withered away", "withered away"],
    ["PlayerX froze to death", "froze to death"],
    ["PlayerX suffocated in a wall", "suffocated in a wall"],
    ["PlayerX walked into a cactus whilst trying to escape Skeleton", "walked into a cactus whilst trying to escape Skeleton"],
    ["PlayerX didn't want to live in the same world as PlayerY", "didn't want to live in the same world as PlayerY"],
    ["PlayerX got finished off by Zombie using [Iron Sword]", "got finished off by Zombie using [Iron Sword]"],
  ];

  for (const [msg, expectedCause] of deathCases) {
    it(`matches: ${msg}`, () => {
      const line = `[15:00:00] [Server thread/INFO]: ${msg}`;
      const result = matchEvent(line);
      assert.ok(result, "expected match");
      assert.equal(result.event.name, "player-death");
      assert.equal(result.match[2], expectedCause);
    });
  }

  it("does not trigger on join/leave lines (those match first)", () => {
    const join = matchEvent(
      "[15:00:00] [Server thread/INFO]: PlayerX joined the game",
    );
    const leave = matchEvent(
      "[15:00:00] [Server thread/INFO]: PlayerX left the game",
    );
    assert.equal(join.event.name, "player-join");
    assert.equal(leave.event.name, "player-leave");
  });

  it("does not trigger on chat messages", () => {
    // Chat uses <PlayerX> format, not bare PlayerX
    const chat = matchEvent(
      "[15:00:00] [Server thread/INFO]: <PlayerX> was wondering about the cave",
    );
    assert.equal(chat, null);
  });
});

describe("player-death builder", () => {
  it("builds a red embed with the death cause", () => {
    const event = EVENTS.find((e) => e.name === "player-death");
    const payload = event.build(["full", "PlayerX", "was slain by Zombie"]);
    assert.equal(payload.embeds[0].color, 0xef4444);
    assert.match(payload.embeds[0].description, /PlayerX/);
    assert.match(payload.embeds[0].description, /was slain by Zombie/);
  });
});

describe("event definitions", () => {
  it("every event has the required shape", () => {
    for (const event of EVENTS) {
      assert.ok(event.name, "missing name");
      assert.ok(
        event.pattern instanceof RegExp,
        `${event.name}: pattern must be a RegExp`,
      );
      assert.equal(
        typeof event.build,
        "function",
        `${event.name}: build must be a function`,
      );
    }
  });

  it("event names are unique", () => {
    const names = EVENTS.map((e) => e.name);
    assert.equal(new Set(names).size, names.length, "duplicate event name");
  });
});

describe("event builders", () => {
  it("player-join builds a green embed with the player name", () => {
    const event = EVENTS.find((e) => e.name === "player-join");
    const payload = event.build(["full", "TestPlayer"], createState());

    assert.equal(payload.embeds[0].color, 0x22c55e);
    assert.match(payload.embeds[0].description, /TestPlayer/);
    assert.match(payload.embeds[0].description, /connecté/);
  });

  it("player-leave builds a gray embed with the player name", () => {
    const event = EVENTS.find((e) => e.name === "player-leave");
    const payload = event.build(["full", "TestPlayer"], createState());

    assert.equal(payload.embeds[0].color, 0x6b7280);
    assert.match(payload.embeds[0].description, /TestPlayer/);
    assert.match(payload.embeds[0].description, /déconnecté/);
  });
});

describe("session duration tracking", () => {
  it("player-join records a join timestamp in state", () => {
    const state = createState();
    const join = EVENTS.find((e) => e.name === "player-join");
    const before = Date.now();

    join.build(["full", "TestPlayer"], state);

    const recorded = state.get("join:TestPlayer");
    assert.ok(typeof recorded === "number", "should record a timestamp");
    assert.ok(recorded >= before && recorded <= Date.now() + 1);
  });

  it("player-leave clears the join timestamp from state", () => {
    const state = createState();
    state.set("join:TestPlayer", Date.now());
    const leave = EVENTS.find((e) => e.name === "player-leave");

    leave.build(["full", "TestPlayer"], state);

    assert.equal(state.has("join:TestPlayer"), false);
  });

  it("player-leave includes session duration when join was recorded", () => {
    const state = createState();
    // 5 minutes ago
    state.set("join:TestPlayer", Date.now() - 5 * 60 * 1000);
    const leave = EVENTS.find((e) => e.name === "player-leave");

    const payload = leave.build(["full", "TestPlayer"], state);

    assert.match(payload.embeds[0].description, /après 5m/);
  });

  it("player-leave omits duration when no join was recorded", () => {
    const state = createState();
    const leave = EVENTS.find((e) => e.name === "player-leave");

    const payload = leave.build(["full", "TestPlayer"], state);

    assert.doesNotMatch(payload.embeds[0].description, /après/);
    assert.match(payload.embeds[0].description, /s'est déconnecté$/);
  });

  it("join state is isolated per player", () => {
    const state = createState();
    const join = EVENTS.find((e) => e.name === "player-join");
    const leave = EVENTS.find((e) => e.name === "player-leave");

    state.set("join:Alice", Date.now() - 10 * 60 * 1000); // Alice joined 10min ago
    join.build(["full", "Bob"], state); // Bob joins now

    const aliceLeave = leave.build(["full", "Alice"], state);
    const bobLeave = leave.build(["full", "Bob"], state);

    assert.match(aliceLeave.embeds[0].description, /après 10m/);
    assert.match(bobLeave.embeds[0].description, /après 0s/);
  });
});

describe("formatDuration", () => {
  it("formats seconds under a minute", () => {
    assert.equal(formatDuration(0), "0s");
    assert.equal(formatDuration(5_000), "5s");
    assert.equal(formatDuration(59_999), "59s");
  });

  it("formats minutes without leading zero seconds", () => {
    assert.equal(formatDuration(60_000), "1m");
    assert.equal(formatDuration(2 * 60_000), "2m");
  });

  it("formats minutes + seconds", () => {
    assert.equal(formatDuration(60_000 + 30_000), "1m 30s");
    assert.equal(formatDuration(59 * 60_000 + 59_000), "59m 59s");
  });

  it("formats hours", () => {
    assert.equal(formatDuration(60 * 60_000), "1h");
    assert.equal(formatDuration(2 * 60 * 60_000), "2h");
  });

  it("formats hours + minutes", () => {
    assert.equal(formatDuration(60 * 60_000 + 30 * 60_000), "1h 30m");
    assert.equal(formatDuration(10 * 60 * 60_000 + 5 * 60_000), "10h 5m");
  });
});
