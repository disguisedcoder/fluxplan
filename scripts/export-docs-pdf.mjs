/**
 * Alle docs/*.md → docs/pdf-export/dist/ (Windows + PowerShell + Pandoc).
 *
 * - Fehlende npm-Pakete für Mermaid (mmdc) werden automatisch nachinstalliert.
 * - build-pdfs.ps1 lädt PATH aus der Registry (Pandoc nach winget ohne Terminal-Neustart).
 *
 * SKIP_DOCS_PDF=1  → überspringen
 * Nicht-Windows    → überspringen (Docker/Linux-Build)
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const ps1 = join(root, "docs", "pdf-export", "build-pdfs.ps1");

function runNpm(args) {
  const r = spawnSync("npm", args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (r.status !== 0 && r.status !== null) {
    process.exit(r.status);
  }
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
}

if (process.env.SKIP_DOCS_PDF === "1") {
  console.log("SKIP_DOCS_PDF=1: PDF-Export übersprungen.");
  process.exit(0);
}

if (process.platform !== "win32") {
  console.log(
    "docs:pdf: auf diesem System übersprungen (nur Windows). PDFs lokal: fluxplan → npm run pdf"
  );
  process.exit(0);
}

const mmdc =
  process.platform === "win32"
    ? join(root, "node_modules", ".bin", "mmdc.cmd")
    : join(root, "node_modules", ".bin", "mmdc");

if (!existsSync(mmdc)) {
  console.log("npm-Pakete für Mermaid fehlen → npm install …");
  runNpm(["install", "--no-fund", "--no-audit"]);
}

const r = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1],
  { stdio: "inherit", cwd: root, shell: false }
);

process.exit(r.status === null ? 1 : r.status);
