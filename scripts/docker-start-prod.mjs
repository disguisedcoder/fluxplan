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

async function main() {
  console.log("Waiting for DB...");
  await run("node", ["scripts/wait-for-tcp.mjs", "db", "5432", "60"]);

  console.log("Running Prisma migrate deploy...");
  await run("npx", ["prisma", "migrate", "deploy"]);

  if (process.env.SEED_ON_START === "true") {
    console.log("Seeding enabled: running Prisma seed...");
    await run("npx", ["prisma", "db", "seed"]);
  }

  console.log("Starting Next.js server...");
  await run("node", ["server.js"]);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

