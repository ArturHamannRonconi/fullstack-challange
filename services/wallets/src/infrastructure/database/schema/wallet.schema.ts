import { Prisma } from "@prisma/client";

export const walletInclude = {
  operations: {
    orderBy: { createdAt: "desc" as const },
  },
  reserves: true,
} satisfies Prisma.WalletInclude;

export type IWalletSchema = Prisma.WalletGetPayload<{ include: typeof walletInclude }>;
export type { Operation as IOperationSchema, Reserve as IReserveSchema } from "@prisma/client";
