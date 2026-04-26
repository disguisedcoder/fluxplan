import { getStudyCookies } from "@/lib/auth/study-session";
import { HttpError } from "@/lib/http/errors";

export async function requireUserId() {
  const { userId } = await getStudyCookies();
  if (!userId) {
    throw new HttpError(401, "unauthorized");
  }
  return userId;
}

