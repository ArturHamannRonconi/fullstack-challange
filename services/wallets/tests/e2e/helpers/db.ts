import { PrismaClient } from "@prisma/client";

import { DATABASE_URL } from "./constants";

let client: PrismaClient | null = null;

export function prisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
    });
  }
  return client;
}

export async function resetWalletForUser(userId: string): Promise<void> {
  // ON DELETE CASCADE on operations / reserves clears child rows.
  await prisma().wallet.deleteMany({ where: { userId } });
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
}
