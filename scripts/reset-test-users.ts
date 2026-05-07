/**
 * Löscht alle Demo-/Studien-Testuser (F01–F05, T01–T05, E01–E05) inkl. zugehöriger Daten (Cascade).
 *
 * Danach neu anlegen:
 *   npm run prisma:seed
 *
 * Nutzung (im Projektroot fluxplan/):
 *   npm run reset:test-users
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import { DEMO_TEST_PSEUDONYMS } from "../src/lib/demo/test-pseudonyms";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.deleteMany({
    where: { pseudonym: { in: [...DEMO_TEST_PSEUDONYMS] } },
  });
  console.log(`reset-test-users: deleted ${result.count} user(s) (${DEMO_TEST_PSEUDONYMS.join(", ")}).`);
  console.log("Run: npm run prisma:seed  — to recreate tasks and sessions.");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
