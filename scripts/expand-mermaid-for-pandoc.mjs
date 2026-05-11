/**
 * Ersetzt ```mermaid-Blöcke durch PNGs (Mermaid-Standardtheme, heller Hintergrund),
 * damit Pandoc/LaTeX die Diagramme wie in der hellen Vorschau zeigen kann.
 *
 * Usage: node scripts/expand-mermaid-for-pandoc.mjs <input.md> <output.md>
 */
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

/** Bei Theme-/Hintergrund-Wechsel erhöhen, damit `.mermaid-cache` neu gerendert wird. */
const MERMAID_CACHE_SALT = "default-light-bg-ffffff-v1";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node scripts/expand-mermaid-for-pandoc.mjs <input.md> <output.md>");
  process.exit(1);
}

const absIn = path.resolve(inPath);
const absOut = path.resolve(outPath);

const textIn = fs.readFileSync(absIn, "utf8");
if (!textIn.includes("```mermaid")) {
  fs.copyFileSync(absIn, absOut);
  process.exit(0);
}

const mmdc =
  process.platform === "win32"
    ? path.join(repoRoot, "node_modules", ".bin", "mmdc.cmd")
    : path.join(repoRoot, "node_modules", ".bin", "mmdc");
if (!fs.existsSync(mmdc)) {
  console.error(
    "mmdc nicht gefunden. Bitte im Projektroot ausführen: npm install (Paket @mermaid-js/mermaid-cli)"
  );
  process.exit(1);
}

const cacheDir = path.join(repoRoot, "docs", "assets", "diagrams", ".mermaid-cache");
fs.mkdirSync(cacheDir, { recursive: true });

const configPath = path.join(repoRoot, "docs", "pdf-export", "mermaid-pdf-theme.json");

const re = /```mermaid\r?\n([\s\S]*?)```/g;
const matches = [];
let m;
while ((m = re.exec(textIn)) !== null) {
  matches.push({
    start: m.index,
    end: m.index + m[0].length,
    body: m[1].replace(/\r\n/g, "\n").trimEnd(),
  });
}

if (matches.length === 0) {
  fs.copyFileSync(absIn, absOut);
  process.exit(0);
}

matches.forEach((x, i) => {
  x.num = i + 1;
});

let text = textIn;
for (let i = matches.length - 1; i >= 0; i--) {
  const { start, end, body, num } = matches[i];
  const hash = crypto
    .createHash("sha256")
    .update(`${MERMAID_CACHE_SALT}\n${body}`)
    .digest("hex")
    .slice(0, 16);
  const pngName = `mermaid-${hash}.png`;
  const pngAbs = path.join(cacheDir, pngName);
  const mmdTmp = path.join(os.tmpdir(), `fluxplan-mermaid-${hash}.mmd`);

  if (!fs.existsSync(pngAbs)) {
    fs.writeFileSync(mmdTmp, `${body}\n`, "utf8");
    const r = spawnSync(
      mmdc,
      [
        "-i",
        mmdTmp,
        "-o",
        pngAbs,
        "-b",
        "#ffffff",
        "-c",
        configPath,
        "-s",
        "2",
        "-w",
        "2400",
      ],
      { cwd: repoRoot, encoding: "utf8", shell: process.platform === "win32" }
    );
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout || "mmdc fehlgeschlagen");
      process.exit(r.status ?? 1);
    }
  }

  // Absolut (Forward-Slashes): Pandoc löst sonst manchmal nicht zuverlässig auf,
  // wenn resource-path in den Defaults gesetzt ist.
  const uri = pngAbs.replace(/\\/g, "/");
  const replacement = `\n\n![Diagramm ${num} (Mermaid)](${uri})\n\n`;
  text = text.slice(0, start) + replacement + text.slice(end);
}

fs.writeFileSync(absOut, text, "utf8");
