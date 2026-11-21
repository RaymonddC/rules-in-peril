// Builds the one static site the judges open:
//
//   dist/index.html        the front door (index.html at the repo root)
//   dist/igor/             the Igor app
//   dist/salt-circle/      the Salt Circle app
//
// Each app is built with VITE_LANDING_URL set, so its header links back to
// the front door. Run with `npm run build:site`.

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "dist");

const apps = [
  { workspace: "@rip/igor", from: "apps/igor/dist", to: "igor" },
  { workspace: "@rip/salt-circle", from: "apps/salt-circle/dist", to: "salt-circle" },
];

for (const app of apps) {
  console.log(`Building ${app.workspace}…`);
  execSync(`npm run build -w ${app.workspace}`, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, VITE_LANDING_URL: "../" },
  });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "index.html"), join(out, "index.html"));
for (const app of apps) {
  const from = join(root, app.from);
  if (!existsSync(from)) throw new Error(`${app.from} is missing after the build`);
  cpSync(from, join(out, app.to), { recursive: true });
}

console.log("Site written to dist/: index.html, igor/, salt-circle/");
