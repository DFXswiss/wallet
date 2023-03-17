import { Asset } from './Asset';
import { Deposit } from './Deposit';

export enum Blockchain {
  DEFICHAIN = 'DeFiChain',
  BITCOIN = 'Bitcoin',
}

export interface CryptoRoute {
  id: string;
  active: boolean;
  fee: number;
  blockchain: Blockchain;
  deposit?: Deposit;
  asset?: Asset;
  volume: number;
  annualVolume: number;
  refBonus: number;
}
