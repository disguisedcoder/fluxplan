import { getStudyCookies } from "@/lib/auth/study-session";
import { clearStudyCookies } from "@/lib/auth/study-session";
import { prisma } from "@/lib/db/prisma";
import { HttpError } from "@/lib/http/errors";

export async function requireUserId() {
  const { userId } = await getStudyCookies();
  if (!userId) {
    throw new HttpError(401, "unauthorized");
  }

  // Guard against stale cookies (e.g. after DB reset / demo reset).
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) {
    await clearStudyCookies();
    throw new HttpError(401, "unauthorized");
  }

  return userId;
}

