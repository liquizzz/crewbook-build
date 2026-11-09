// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Tests for the helpers run.mjs uses to tag images and start staging. Run:  node scripts/run.test.mjs
import assert from "node:assert/strict";
import { backendOf, containerUrl, lanAddress, serviceImage } from "./project-level.mjs";

// What `docker compose config --format json` prints, cut down to what matters: web depends on api.
const config = JSON.stringify({
  services: {
    api: { image: "ghcr.io/acme/shop-api:dev" },
    web: { image: "ghcr.io/acme/shop-web:dev", depends_on: { api: { condition: "service_started" } } },
  },
});
// A service's image is its own, never one of its dependencies' (a trial tagged the web image as api's).
assert.equal(serviceImage(config, "web", "dev"), "ghcr.io/acme/shop-web:dev");
assert.equal(serviceImage(config, "api", "dev"), "ghcr.io/acme/shop-api:dev");
assert.equal(serviceImage(config, "web", "v0.1.0"), undefined, "an image with another tag is not this tag's");
assert.equal(serviceImage(config, "nope", "dev"), undefined);
assert.equal(serviceImage("not json", "web", "dev"), undefined, "a broken config gives nothing, never a guess");
assert.equal(serviceImage(null, "web", "dev"), undefined);

// A connection string for use inside a container: the machine's own addresses become host.docker.internal.
assert.equal(containerUrl("postgresql://u:p%40ss@localhost:5432/db?schema=public"), "postgresql://u:p%40ss@host.docker.internal:5432/db?schema=public");
assert.equal(containerUrl("postgresql://u:p@127.0.0.1:5432/db"), "postgresql://u:p@host.docker.internal:5432/db");
assert.equal(containerUrl("postgresql://u:p@[::1]:5432/db"), "postgresql://u:p@host.docker.internal:5432/db");
assert.equal(containerUrl("postgresql://u:p@db.example.com:5432/db"), "postgresql://u:p@db.example.com:5432/db", "another host stays");
assert.equal(containerUrl("not a url"), null);

// The LAN address people reach this machine on: a 192.168 or 10 address before Docker's and WSL's 172.x ones.
const nic = (address, internal = false, family = "IPv4") => ({ address, internal, family });
assert.equal(lanAddress({ lo: [nic("127.0.0.1", true)], wsl: [nic("172.24.176.1")], eth: [nic("fe80::1", false, "IPv6"), nic("192.168.1.20")] }), "192.168.1.20");
assert.equal(lanAddress({ a: [nic("172.21.80.1")], b: [nic("10.0.0.5")] }), "10.0.0.5");
assert.equal(lanAddress({ lo: [nic("127.0.0.1", true)] }), null);

// The backend image: "backend" in project.json, else api, else app, else the first image.
assert.equal(backendOf({ backend: "server", images: [{ name: "server" }, { name: "web" }] }), "server");
assert.equal(backendOf({ images: [{ name: "web" }, { name: "api" }] }), "api");
assert.equal(backendOf({}), "app");
assert.equal(backendOf({ images: [{ name: "core" }, { name: "web" }] }), "core");

console.log("run.test: ok");
