import { WalletAggregateRoot } from "../../../domain/wallet.aggregate-root";

export interface IReserveFundsOutput {
  wallet: WalletAggregateRoot;
  reserveId: string;
}
