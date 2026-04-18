import { Prisma } from "../generated";

export const roundInclude = {
  bets: {
    orderBy: { createdAt: "asc" as const },
  },
  statusHistory: {
    orderBy: { statusDate: "asc" as const },
  },
} satisfies Prisma.RoundInclude;

export type IRoundSchema = Prisma.RoundGetPayload<{ include: typeof roundInclude }>;
export type { Bet as IBetSchema, RoundStatus as IRoundStatusSchema } from "../generated";
