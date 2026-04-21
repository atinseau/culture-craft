import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseWebhooksFromEnv, createSender } from "../src/discord.js";

const silentLogger = { warn: () => {}, error: () => {}, log: () => {} };

describe("parseWebhooksFromEnv", () => {
  it("collects DISCORD_WEBHOOK_* vars and lowercases the suffix", () => {
    const result = parseWebhooksFromEnv({
      DISCORD_WEBHOOK_URL: "https://default",
      DISCORD_WEBHOOK_PLAYERS: "https://players",
      DISCORD_WEBHOOK_ADMIN: "https://admin",
      OTHER_VAR: "ignored",
    });

    assert.deepEqual(result, {
      url: "https://default",
      players: "https://players",
      admin: "https://admin",
    });
  });

  it("skips empty or undefined values", () => {
    const result = parseWebhooksFromEnv({
      DISCORD_WEBHOOK_URL: "https://default",
      DISCORD_WEBHOOK_EMPTY: "",
      DISCORD_WEBHOOK_UNDEF: undefined,
    });

    assert.deepEqual(result, { url: "https://default" });
  });

  it("returns an empty map when no webhook vars are set", () => {
    assert.deepEqual(parseWebhooksFromEnv({}), {});
  });
});

describe("createSender — routing", () => {
  function makeFetchMock() {
    const calls = [];
    const fn = async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return { ok: true, status: 200, text: async () => "" };
    };
    return { calls, fn };
  }

  it("posts to the named channel's URL", async () => {
    const { calls, fn } = makeFetchMock();
    const send = createSender({
      webhooks: { url: "https://default", players: "https://players" },
      fetchImpl: fn,
      logger: silentLogger,
    });

    await send("players", { content: "hi" });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://players");
  });

  it("falls back to the default webhook for unconfigured channels", async () => {
    const { calls, fn } = makeFetchMock();
    const send = createSender({
      webhooks: { url: "https://default" },
      fetchImpl: fn,
      logger: silentLogger,
    });

    await send("unconfigured", { content: "hi" });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://default");
  });

  it("uses the default when no channel is passed (null)", async () => {
    const { calls, fn } = makeFetchMock();
    const send = createSender({
      webhooks: { url: "https://default" },
      fetchImpl: fn,
      logger: silentLogger,
    });

    await send(null, { content: "hi" });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://default");
  });

  it("fan-outs to multiple webhooks when channel is an array", async () => {
    const { calls, fn } = makeFetchMock();
    const send = createSender({
      webhooks: {
        url: "https://default",
        players: "https://players",
        admin: "https://admin",
      },
      fetchImpl: fn,
      logger: silentLogger,
    });

    await send(["players", "admin"], { content: "crash" });

    assert.equal(calls.length, 2);
    assert.deepEqual(
      calls.map((c) => c.url),
      ["https://players", "https://admin"],
    );
  });

  it("warns and skips when a channel has no URL and there is no default", async () => {
    const warnings = [];
    let fetchCalled = false;
    const send = createSender({
      webhooks: {},
      fetchImpl: () => {
        fetchCalled = true;
        throw new Error("should not be called");
      },
      logger: {
        warn: (msg) => warnings.push(msg),
        error: () => {},
        log: () => {},
      },
    });

    await send("ghost", { content: "x" });

    assert.equal(fetchCalled, false);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /No webhook URL for channel "ghost"/);
  });

  it("includes bot identity (username + avatar) in the payload", async () => {
    const { calls, fn } = makeFetchMock();
    const send = createSender({
      webhooks: { url: "https://default" },
      botName: "TestBot",
      botAvatar: "https://avatar.png",
      fetchImpl: fn,
      logger: silentLogger,
    });

    await send(null, { content: "hello", embeds: [{ color: 0x123 }] });

    const body = calls[0].body;
    assert.equal(body.username, "TestBot");
    assert.equal(body.avatar_url, "https://avatar.png");
    assert.equal(body.content, "hello");
    assert.deepEqual(body.embeds, [{ color: 0x123 }]);
  });

  it("logs an error when fetch rejects, but does not throw", async () => {
    const errors = [];
    const send = createSender({
      webhooks: { url: "https://default" },
      fetchImpl: async () => {
        throw new Error("network down");
      },
      logger: {
        warn: () => {},
        error: (msg) => errors.push(msg),
        log: () => {},
      },
    });

    await assert.doesNotReject(() => send(null, { content: "x" }));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /network down/);
  });

  it("logs an error when Discord returns non-2xx, but does not throw", async () => {
    const errors = [];
    const send = createSender({
      webhooks: { url: "https://default" },
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        text: async () => "rate limited",
      }),
      logger: {
        warn: () => {},
        error: (msg) => errors.push(msg),
        log: () => {},
      },
    });

    await send(null, { content: "x" });

    assert.equal(errors.length, 1);
    assert.match(errors[0], /429.*rate limited/);
  });
});
