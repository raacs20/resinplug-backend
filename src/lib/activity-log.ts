import { prisma } from "./prisma";

export async function logActivity(
  adminId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: { adminId, action, entity, entityId, details },
    });
  } catch (err) {
    // Activity logging should never crash a request
    console.error("Activity log error (non-fatal):", err);
  }
}
