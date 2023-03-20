import { Blockchain } from './User';

export enum AssetType {
  Coin = 'Coin',
  DAT = 'DAT',
}

export interface Asset {
  id: number;
  chainId: string;
  type: AssetType;
  name: string;
  dexName: string;
  buyable: boolean;
  sellable: boolean;
  blockchain: Blockchain;
}
