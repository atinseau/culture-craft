import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchEvent, EVENTS } from "../src/events.js";

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
    const payload = event.build(["full", "TestPlayer"]);

    assert.equal(payload.embeds[0].color, 0x22c55e);
    assert.match(payload.embeds[0].description, /TestPlayer/);
    assert.match(payload.embeds[0].description, /connecté/);
  });

  it("player-leave builds a gray embed with the player name", () => {
    const event = EVENTS.find((e) => e.name === "player-leave");
    const payload = event.build(["full", "TestPlayer"]);

    assert.equal(payload.embeds[0].color, 0x6b7280);
    assert.match(payload.embeds[0].description, /TestPlayer/);
    assert.match(payload.embeds[0].description, /déconnecté/);
  });
});
