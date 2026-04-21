import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchContainerName } from "../src/docker.js";

describe("matchContainerName", () => {
  it("matches a container name via string pattern", () => {
    const containers = [
      { Id: "a", Names: ["/coolify-proxy"] },
      { Id: "b", Names: ["/mc-abc123-xyz"] },
      { Id: "c", Names: ["/other"] },
    ];
    const m = matchContainerName(containers, "^mc-");
    assert.ok(m);
    assert.equal(m.Id, "b");
  });

  it("accepts a RegExp pattern", () => {
    const containers = [{ Id: "a", Names: ["/mc-xyz"] }];
    const m = matchContainerName(containers, /^mc-/);
    assert.ok(m);
    assert.equal(m.Id, "a");
  });

  it("strips the leading slash from Docker names before matching", () => {
    // "mc-xyz" with regex ^mc- should match even though the Docker-reported
    // name is "/mc-xyz".
    const containers = [{ Id: "a", Names: ["/mc-xyz"] }];
    const m = matchContainerName(containers, "^mc-");
    assert.ok(m);
  });

  it("returns null when no container matches", () => {
    const containers = [
      { Id: "a", Names: ["/coolify"] },
      { Id: "b", Names: ["/n8n"] },
    ];
    const m = matchContainerName(containers, "^mc-");
    assert.equal(m, null);
  });

  it("returns null on an empty container list", () => {
    assert.equal(matchContainerName([], "^mc-"), null);
  });

  it("returns the first match when multiple containers match", () => {
    const containers = [
      { Id: "first", Names: ["/mc-one"] },
      { Id: "second", Names: ["/mc-two"] },
    ];
    const m = matchContainerName(containers, "^mc-");
    assert.ok(m);
    assert.equal(m.Id, "first");
  });

  it("matches when a container has multiple names and any one matches", () => {
    const containers = [
      { Id: "x", Names: ["/alias", "/mc-real"] },
    ];
    const m = matchContainerName(containers, "^mc-");
    assert.ok(m);
    assert.equal(m.Id, "x");
  });
});
