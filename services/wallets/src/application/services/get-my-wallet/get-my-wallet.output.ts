import { WalletAggregateRoot } from "../../../domain/wallet.aggregate-root";

export interface IGetMyWalletOutput {
  wallet: WalletAggregateRoot;
}
