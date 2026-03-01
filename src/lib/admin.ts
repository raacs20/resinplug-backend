import { auth } from "./auth";
import { forbidden, unauthorized } from "./api-response";

/**
 * Check if the current session belongs to an admin user.
 * Returns the session if admin, or an error Response if not.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: unauthorized(), session: null };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return { error: forbidden("Admin access required"), session: null };
  }
  return { error: null, session };
}
