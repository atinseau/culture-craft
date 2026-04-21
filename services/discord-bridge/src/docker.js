import Docker from "dockerode";
import { PassThrough } from "node:stream";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

export async function findContainer(pattern) {
  const regex = new RegExp(pattern);
  const containers = await docker.listContainers();
  const match = containers.find((c) =>
    c.Names.some((n) => regex.test(n.replace(/^\//, ""))),
  );
  return match ? docker.getContainer(match.Id) : null;
}

// Tails the container's stdout + stderr, invoking `onLine(line)` for every
// full newline-terminated line. Resolves when the stream ends (container
// stopped / restarted) so the caller can reconnect.
export async function tailLogs(container, onLine) {
  const stream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    since: Math.floor(Date.now() / 1000),
    timestamps: false,
  });

  let buffer = "";
  const handle = (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop();
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
