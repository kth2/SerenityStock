#!/usr/bin/env node
// Runs the MarketMind logic tests (scripts/tests/marketmind.test.ts).
//
// The project has no test runner, so this bundles the TypeScript test with
// esbuild (already present via Vite) and runs it on Node. The suite stubs
// global fetch, so it exercises the real engine — call budget, early stopping,
// JSON validation, and graceful degradation — without any network or API key.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const outDir = await mkdtemp(path.join(tmpdir(), "mm-test-"));
const outfile = path.join(outDir, "test.mjs");

// The skill markdown is imported with Vite's `?raw` suffix; stub it for Node.
const rawStub = {
  name: "raw-stub",
  setup(b) {
    b.onResolve({ filter: /\?raw$/ }, (a) => ({ path: a.path, namespace: "raw" }));
    b.onLoad({ filter: /.*/, namespace: "raw" }, () => ({
      contents: "export default '[skill markdown stub]'",
      loader: "js",
    }));
  },
};

try {
  await esbuild.build({
    entryPoints: [path.join(root, "scripts", "tests", "marketmind.test.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    alias: { "@": path.join(root, "src") },
    plugins: [rawStub],
    logLevel: "warning",
  });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
