import { Blockchain } from './User';

export enum AssetType {
  Coin = 'Coin',
  DAT = 'DAT',
}

export enum AssetCategory {
  POOL_PAIR = 'PoolPair',
  STOCK = 'Stock',
  CRYPTO = 'Crypto',
}

export interface Asset {
  id: number;
  chainId: string;
  type: AssetType;
  name: string;
  dexName: string;
  displayName: string;
  buyable: boolean;
  sellable: boolean;
  blockchain: Blockchain;
  category: AssetCategory;
}
