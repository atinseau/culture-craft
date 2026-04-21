import Docker from "dockerode";
import { PassThrough } from "node:stream";
import { DOCKER_SOCKET } from "./utils/constants.js";

/**
 * @typedef {import('dockerode').Container} Container
 */

/**
 * Shape of items returned by `docker.listContainers()` — we only use the
 * fields listed here.
 * @typedef {{ Id: string, Names: string[] }} ContainerSummary
 */

const docker = new Docker({ socketPath: DOCKER_SOCKET });

/**
 * Pure helper: find the first container summary whose name matches `pattern`.
 * Extracted so it can be unit-tested without a live Docker socket.
 *
 * Container names from the Docker API start with `/` — this strips it before
 * matching.
 *
 * @param {ContainerSummary[]} containers
 * @param {string | RegExp} pattern
 * @returns {ContainerSummary | null}
 */
export function matchContainerName(containers, pattern) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  return (
    containers.find((c) =>
      c.Names.some((n) => regex.test(n.replace(/^\//, ""))),
    ) ?? null
  );
}

/**
 * Find the first running container whose name matches `pattern`.
 * Returns `null` if no match is found.
 *
 * @param {string | RegExp} pattern
 * @returns {Promise<Container | null>}
 */
export async function findContainer(pattern) {
  const containers = /** @type {ContainerSummary[]} */ (
    await docker.listContainers()
  );
  const match = matchContainerName(containers, pattern);
  return match ? docker.getContainer(match.Id) : null;
}

/**
 * Tail a container's stdout + stderr, invoking `onLine` for every
 * newline-terminated line. Resolves when the stream ends (container
 * stopped / restarted) so the caller can reconnect.
 *
 * Only logs produced AFTER the call are delivered — historical logs are
 * skipped via `since: <now>` to avoid replaying events on restart.
 *
 * @param {Container} container
 * @param {(line: string) => void} onLine
 * @returns {Promise<void>}
 */
export async function tailLogs(container, onLine) {
  const stream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    since: Math.floor(Date.now() / 1000),
    timestamps: false,
  });

  let buffer = "";
  /** @param {Buffer | string} chunk */
  const handle = (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) onLine(line);
  };

  const stdout = new PassThrough();
  const stderr = new PassThrough();
  stdout.on("data", handle);
  stderr.on("data", handle);
  container.modem.demuxStream(stream, stdout, stderr);

  await new Promise((resolve) => {
    stream.on("end", resolve);
    stream.on("error", resolve);
  });
}
