import { NetworkName } from '@defichain/jellyfish-network';
import { OceanTransaction } from '@store/ocean';
import { WalletToken } from '@store/wallet';

export interface TransactionCache {
  amount: number;
  depositAddress: string;
  token: WalletToken;
  network: NetworkName;
  stakingId: number;
  transaction?: OceanTransaction;
}
