import { WalletAggregateRoot } from "../../../domain/wallet.aggregate-root";

export interface IWithdrawOutput {
  wallet: WalletAggregateRoot;
}
