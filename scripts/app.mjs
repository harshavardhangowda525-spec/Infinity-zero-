#!/usr/bin/env node
/**
 * One-command launcher: `npm start`
 *  1. checks Node.js version and that dependencies are installed
 *  2. builds the app if there is no build yet (or the code changed since the last build)
 *  3. finds a free port (3000, 3001, …) and starts the server
 * Works on Windows, macOS and Linux.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const buildId = path.join(root, ".next", "BUILD_ID");

const c = { red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, cyan: (s) => `\x1b[36m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` };
const fail = (msg) => {
  console.error("\n" + c.red("✖ " + msg) + "\n");
  process.exit(1);
};

// 1. Environment checks
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 18 || (major === 18 && minor < 18)) {
  fail(`Node.js ${process.versions.node} is too old. Install Node.js 20 or newer from https://nodejs.org, then run "npm start" again.`);
}
if (!existsSync(nextBin)) fail('Dependencies are not installed. Run "npm install" in this folder first, then "npm start".');

// 2. Build when needed
function newestMtime(dir) {
  let newest = 0;
  if (!existsSync(dir)) return 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(p) : statSync(p).mtimeMs);
  }
  return newest;
}
const sourceTime = Math.max(newestMtime(path.join(root, "src")), newestMtime(path.join(root, "public")), statSync(path.join(root, "package.json")).mtimeMs);
const needsBuild = !existsSync(buildId) || statSync(buildId).mtimeMs < sourceTime;

const run = (args) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [nextBin, ...args], { cwd: root, stdio: "inherit", env: process.env });
    child.on("exit", (code) => resolve(code ?? 1));
  });

if (needsBuild) {
  console.log(c.cyan("\n▶ Building Infinity ZERO (first run takes about a minute)…\n"));
  const code = await run(["build"]);
  if (code !== 0) fail("The build failed — scroll up to see the first error message and share it.");
}

// 3. Find a free port and start
const isFree = (port) =>
  new Promise((resolve) => {
    const srv = createServer().once("error", () => resolve(false)).once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port);
  });
const start = Number(process.env.PORT) || 3000;
let port = start;
while (!(await isFree(port))) {
  if (port - start >= 20) fail(`Ports ${start}–${port} are all in use. Close other servers or run with a different PORT.`);
  port++;
}
if (port !== start) console.log(c.cyan(`Port ${start} is busy, using ${port} instead.`));

console.log(
  "\n" +
    c.green(c.bold("✔ Infinity ZERO is running")) +
    `\n\n   Open:  ${c.bold(c.cyan(`http://localhost:${port}`))}\n` +
    "   Keep this window open — closing it stops the app.\n" +
    "   Press Ctrl+C to stop.\n",
);
process.exit(await run(["start", "-p", String(port)]));
