import type { WalletAggregateRoot } from "../../../domain/wallet.aggregate-root";

export interface ICreateWalletOutput {
  wallet: WalletAggregateRoot;
  wasCreated: boolean;
}
