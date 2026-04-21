import { createServer } from "node:http";

/**
 * Runtime state of the bridge, polled by the HTTP health endpoint.
 *
 * @typedef {"starting" | "attached" | "disconnected"} BridgeStatus
 *
 * @typedef {object} HealthState
 * @property {BridgeStatus} status
 * @property {string | null} containerId
 * @property {number} lastLineAt - ms since epoch of the last log line seen (0 if none).
 */

/**
 * Build a fresh health-state record.
 * @returns {HealthState}
 */
export function createHealthState() {
  return {
    status: "starting",
    containerId: null,
    lastLineAt: 0,
  };
}

/**
 * Start an HTTP server exposing `/health`. The response is 200 when the
 * bridge is attached to a container, 503 otherwise. The body includes the
 * full state for observability.
 *
 * Listens on the given port and resolves when ready.
 *
 * @param {HealthState} state - Shared state object. Callers mutate it;
 *   the server reads its current contents on each request.
 * @param {number} [port=8080]
 * @returns {Promise<import('node:http').Server>}
 */
export function createHealthServer(state, port = 8080) {
  const server = createServer((req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404).end();
      return;
    }
    const healthy = state.status === "attached";
    res.writeHead(healthy ? 200 : 503, {
      "Content-Type": "application/json",
    });
    res.end(
      JSON.stringify({
        status: state.status,
        containerId: state.containerId,
        lastLineAgoMs: state.lastLineAt
          ? Date.now() - state.lastLineAt
          : null,
      }),
    );
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}
