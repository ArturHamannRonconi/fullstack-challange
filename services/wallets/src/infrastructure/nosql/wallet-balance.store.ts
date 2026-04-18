import { Inject, Injectable } from "@nestjs/common";
import { type IRealTimeDb, REAL_TIME_DB } from "@crash/real-time-db";

import { WalletAggregateRoot } from "../../domain/wallet.aggregate-root";

export interface WalletState {
  balanceCents: string;
  availableCents: string;
}

const key = (userId: string) => `wallet:state:${userId}`;

@Injectable()
export class WalletBalanceStore {
  constructor(@Inject(REAL_TIME_DB) private readonly db: IRealTimeDb) {}

  async set(wallet: WalletAggregateRoot): Promise<void> {
    const state: WalletState = {
      balanceCents: wallet.balance.toCentsString(),
      availableCents: wallet.availableFunds.toCentsString(),
    };
    await this.db.set(key(wallet.userId.value), JSON.stringify(state));
  }

  async get(userId: string): Promise<WalletState | null> {
    const raw = await this.db.get(key(userId));
    if (!raw) return null;
    return JSON.parse(raw) as WalletState;
  }
}
