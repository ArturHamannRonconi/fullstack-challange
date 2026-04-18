import { Injectable } from "@nestjs/common";
import { IdValueObject } from "ddd-tool-kit";

import { UserIdValueObject } from "../../../domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../domain/wallet.aggregate-root";
import { PrismaService } from "../prisma.service";
import { walletInclude } from "../schema/wallet.schema";
import { WalletMapper } from "../mappers/wallet.mapper";
import type { WalletRepository } from "./wallet.repository";

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: WalletMapper,
  ) {}

  async findById(id: IdValueObject): Promise<WalletAggregateRoot | null> {
    const schema = await this.prisma.wallet.findUnique({
      where: { id: id.value },
      include: walletInclude,
    });
    if (!schema) return null;
    return this.mapper.toRightSide(schema);
  }

  async findByUserId(userId: UserIdValueObject): Promise<WalletAggregateRoot | null> {
    const schema = await this.prisma.wallet.findUnique({
      where: { userId: userId.value },
      include: walletInclude,
    });
    if (!schema) return null;
    return this.mapper.toRightSide(schema);
  }

  async findAllWithReservesForRound(roundId: string): Promise<WalletAggregateRoot[]> {
    const reserves = await this.prisma.reserve.findMany({
      where: { roundId },
      select: { walletId: true },
      distinct: ["walletId"],
    });
    if (reserves.length === 0) return [];

    const wallets = await this.prisma.wallet.findMany({
      where: { id: { in: reserves.map((r) => r.walletId) } },
      include: walletInclude,
    });
    return wallets.map((w) => this.mapper.toRightSide(w));
  }

  async save(wallet: WalletAggregateRoot): Promise<void> {
    const { operations, reserves, ...scalars } = this.mapper.toLeftSide(wallet);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.wallet.findUnique({
        where: { id: scalars.id },
        select: { id: true },
      });

      if (!existing) {
        await tx.wallet.create({
          data: {
            id: scalars.id,
            userId: scalars.userId,
            balance: scalars.balance,
            createdAt: scalars.createdAt,
            updatedAt: scalars.updatedAt,
          },
        });
      } else {
        await tx.wallet.update({
          where: { id: scalars.id },
          data: {
            balance: scalars.balance,
            updatedAt: scalars.updatedAt,
          },
        });
        await tx.operation.deleteMany({ where: { walletId: scalars.id } });
        await tx.reserve.deleteMany({ where: { walletId: scalars.id } });
      }

      if (operations.length > 0) {
        await tx.operation.createMany({
          data: operations.map((op) => ({
            id: op.id,
            walletId: scalars.id,
            type: op.type,
            funds: op.funds,
            createdAt: op.createdAt,
          })),
        });
      }

      if (reserves.length > 0) {
        await tx.reserve.createMany({
          data: reserves.map((r) => ({
            id: r.id,
            walletId: scalars.id,
            funds: r.funds,
            betId: r.betId,
            roundId: r.roundId,
            createdAt: r.createdAt,
          })),
        });
      }
    });
  }
}
