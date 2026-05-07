import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import { ensureAdaptiveRules, seedDemoTestUsers } from "../src/lib/demo/seed-demo-test-users";

const prisma = new PrismaClient();

async function main() {
  await ensureAdaptiveRules(prisma);
  await seedDemoTestUsers(prisma, new Date());
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
