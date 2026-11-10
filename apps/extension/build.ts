import { cpSync, mkdirSync, readFileSync, watch, writeFileSync } from "node:fs";

const appOrigins = (
  process.env.STAND_IN_APP_ORIGINS ??
  "http://localhost:3210,https://standin.aryankumar.dev"
)
  .split(",")
  .map((origin) => new URL(origin.trim()).origin);

const entrypoints = ["background", "hook", "meet", "app"].map(
  (name) => `src/${name}.ts`,
);

function writeManifest() {
  const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
  const appMatches = appOrigins.map((origin) => `${origin}/*`);
  manifest.host_permissions = ["https://meet.google.com/*", ...appMatches];
  manifest.content_scripts.find((script: { js: string[] }) =>
    script.js.includes("app.js"),
  ).matches = appMatches;
  writeFileSync("dist/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
}

async function build() {
  mkdirSync("dist", { recursive: true });
  cpSync("public", "dist", { recursive: true });
  writeManifest();
  await Bun.build({ entrypoints, outdir: "dist", target: "browser" });
  console.log(`Built extension to dist/ for ${appOrigins.join(", ")}`);
}

await build();
if (process.argv.includes("--watch")) {
  watch("src", { recursive: true }, () => void build());
}
