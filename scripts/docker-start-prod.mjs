import { spawn } from "node:child_process";

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: false,
      ...opts,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

function readDbHostPort() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname;
    const port = Number(u.port || "5432");
    if (!host || !port) return null;
    return { host, port };
  } catch {
    return null;
  }
}

async function main() {
  const db = readDbHostPort();
  if (db) {
    console.log(`Waiting for DB at ${db.host}:${db.port}...`);
    await run("node", ["scripts/wait-for-tcp.mjs", db.host, String(db.port), "60"]);
  } else {
    console.log("DATABASE_URL not set or invalid. Skipping DB wait.");
  }

  console.log("Running Prisma migrate deploy...");
  await run("node", ["node_modules/prisma/build/index.js", "migrate", "deploy"]);

  if (process.env.SEED_ON_START === "true") {
    console.log("Seeding enabled: running Prisma seed...");
    await run("node", ["node_modules/prisma/build/index.js", "db", "seed"]);
  }

  console.log("Starting Next.js server...");
  const env = {
    ...process.env,
    // Ensure we bind on all interfaces for Railway's proxy.
    HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
    HOST: process.env.HOST ?? "0.0.0.0",
    // Railway commonly provides PORT=8080; default to that in prod.
    PORT: process.env.PORT ?? "8080",
  };
  await run("node", ["server.js"], { env });
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

