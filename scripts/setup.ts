import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const WEB = "apps/web";
const ENV_FILE = `${WEB}/.env`;
const REQUIRED_KEYS = ["OPENAI_API_KEY", "OPENROUTER_VOICE_API_KEY"];

function run(command: string[], cwd = ".") {
  const { exitCode } = Bun.spawnSync(command, { cwd, stdout: "inherit", stderr: "inherit" });
  return exitCode === 0;
}

function requireCommand(name: string, hint: string) {
  if (Bun.which(name)) return;
  console.error(`Missing ${name}. ${hint}`);
  process.exit(1);
}

function readEnv() {
  return Object.fromEntries(
    readFileSync(ENV_FILE, "utf8")
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at), line.slice(at + 1)];
      }),
  );
}

