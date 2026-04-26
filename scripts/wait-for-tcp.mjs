import net from "node:net";

const host = process.argv[2];
const port = Number(process.argv[3]);
const timeoutSec = Number(process.argv[4] ?? 60);

if (!host || !port) {
  console.error("Usage: node scripts/wait-for-tcp.mjs <host> <port> [timeoutSec]");
  process.exit(2);
}

const deadline = Date.now() + timeoutSec * 1000;

function tryOnce() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(2000);
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("timeout"));
    });
    socket.once("error", (err) => {
      socket.destroy();
      reject(err);
    });
  });
}

while (true) {
  try {
    await tryOnce();
    console.log(`TCP ready: ${host}:${port}`);
    process.exit(0);
  } catch {
    if (Date.now() > deadline) {
      console.error(`Timed out waiting for ${host}:${port}`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

