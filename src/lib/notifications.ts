import { prisma } from "@/lib/prisma";

export async function createNotification(
  type: string,
  title: string,
  message: string,
  link?: string
) {
  return prisma.notification.create({
    data: { type, title, message, link },
  });
}
