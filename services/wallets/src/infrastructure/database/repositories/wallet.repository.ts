import { IdValueObject } from "ddd-tool-kit";

import { UserIdValueObject } from "../../../domain/value-objects/user-id/user-id.value-object";
import { WalletAggregateRoot } from "../../../domain/wallet.aggregate-root";

export interface WalletRepository {
  save(wallet: WalletAggregateRoot): Promise<void>;
  findById(id: IdValueObject): Promise<WalletAggregateRoot | null>;
  findByUserId(userId: UserIdValueObject): Promise<WalletAggregateRoot | null>;
  findAllWithReservesForRound(roundId: string): Promise<WalletAggregateRoot[]>;
}

export const WALLET_REPOSITORY = Symbol("WalletRepository");
