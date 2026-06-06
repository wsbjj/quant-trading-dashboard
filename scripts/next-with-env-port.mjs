import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const [, , command = "dev", ...args] = process.argv;
const allowedCommands = new Set(["dev", "start"]);

if (!allowedCommands.has(command)) {
  console.error(`Unsupported Next.js command: ${command}`);
  process.exit(1);
}

loadEnvConfig(process.cwd(), command === "dev");

const explicitPort = args.some((arg) => arg === "-p" || arg === "--port" || arg.startsWith("--port="));
const port = process.env.PORT?.trim();

if (port && !/^\d+$/.test(port)) {
  console.error(`PORT must be a number, received: ${port}`);
  process.exit(1);
}

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const nextArgs = [nextBin, command, ...args];

if (port && !explicitPort) {
  nextArgs.push("-p", port);
}

const child = spawn(process.execPath, nextArgs, {
  stdio: "inherit",
  env: process.env,
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
