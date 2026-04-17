import type { WalletAggregateRoot } from "../../../domain/wallet.aggregate-root";

export interface IDepositOutput {
  wallet: WalletAggregateRoot;
}
