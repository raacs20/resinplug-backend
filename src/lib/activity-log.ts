import { prisma } from "./prisma";

export async function logActivity(
  adminId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string
) {
  await prisma.activityLog.create({
    data: { adminId, action, entity, entityId, details },
  });
}
