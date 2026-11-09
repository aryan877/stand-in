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

function step(title: string, ok: boolean) {
  if (ok) return;
  console.error(`Failed: ${title}`);
  process.exit(1);
}

requireCommand("psql", "Install PostgreSQL, for example: brew install postgresql@17");
requireCommand("createdb", "Install PostgreSQL, for example: brew install postgresql@17");

if (!existsSync(ENV_FILE)) copyFileSync(`${ENV_FILE}.example`, ENV_FILE);
const env = readEnv();
if (!env.BETTER_AUTH_SECRET) {
  const secret = randomBytes(32).toString("hex");
  writeFileSync(
    ENV_FILE,
    readFileSync(ENV_FILE, "utf8").replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET=${secret}`),
  );
}

const url = new URL(env.DATABASE_URL ?? "postgresql://localhost:5432/standin");
const database = url.pathname.slice(1);
const server = ["-h", url.hostname, "-p", url.port || "5432"];
step("reaching PostgreSQL. Is it running? Try: brew services start postgresql@17", run(["psql", ...server, "-d", "postgres", "-Atqc", "select 1"]));
const exists = Bun.spawnSync(["psql", ...server, "-d", "postgres", "-Atc", `select 1 from pg_database where datname='${database}'`]).stdout.toString().trim();
if (!exists) step(`creating database ${database}`, run(["createdb", ...server, database]));

step("installing packages", run(["bun", "install"]));
step("building the app and extension", run(["bun", "run", "build"]));
step("setting up database tables", run(["bun", "--bun", "run", "migrate:production"], WEB));

const missing = REQUIRED_KEYS.filter((key) => !readEnv()[key]);
console.log("\nSetup finished.");
if (missing.length) console.log(`Add these to ${ENV_FILE} before starting: ${missing.join(", ")}`);
console.log("Start the app with: bun run start");
console.log("Then load apps/extension/dist at chrome://extensions (see README).");
