import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHealthState, createHealthServer } from "../src/health.js";

/**
 * Helper: spin up a health server on an ephemeral port and return
 * `{ url, close }` bound to it.
 *
 * @param {import('../src/health.js').HealthState} state
 */
async function boot(state) {
  const server = await createHealthServer(state, 0);
  const { port } = /** @type {{ port: number }} */ (server.address());
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

describe("createHealthState", () => {
  it("returns the initial 'starting' state", () => {
    const s = createHealthState();
    assert.equal(s.status, "starting");
    assert.equal(s.containerId, null);
    assert.equal(s.lastLineAt, 0);
  });
});

describe("health server — /health responses", () => {
  it("returns 200 when attached", async () => {
    const state = createHealthState();
    state.status = "attached";
    state.containerId = "abc123";
    state.lastLineAt = Date.now();
    const { url, close } = await boot(state);
    try {
      const res = await fetch(`${url}/health`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, "attached");
      assert.equal(body.containerId, "abc123");
      assert.ok(typeof body.lastLineAgoMs === "number");
    } finally {
      await close();
    }
  });

  it("returns 503 when starting", async () => {
    const state = createHealthState();
    const { url, close } = await boot(state);
    try {
      const res = await fetch(`${url}/health`);
      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.status, "starting");
      assert.equal(body.containerId, null);
      assert.equal(body.lastLineAgoMs, null);
    } finally {
      await close();
    }
  });

  it("returns 503 when disconnected", async () => {
    const state = createHealthState();
    state.status = "disconnected";
    const { url, close } = await boot(state);
    try {
      const res = await fetch(`${url}/health`);
      assert.equal(res.status, 503);
    } finally {
      await close();
    }
  });

  it("returns 404 for unknown paths", async () => {
    const state = createHealthState();
    const { url, close } = await boot(state);
    try {
      const res = await fetch(`${url}/nope`);
      assert.equal(res.status, 404);
    } finally {
      await close();
    }
  });

  it("reads state mutations live (same object reference)", async () => {
    const state = createHealthState();
    const { url, close } = await boot(state);
    try {
      let res = await fetch(`${url}/health`);
      assert.equal(res.status, 503);

      state.status = "attached";
      res = await fetch(`${url}/health`);
      assert.equal(res.status, 200);
    } finally {
      await close();
    }
  });
});
