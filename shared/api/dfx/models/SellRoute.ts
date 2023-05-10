import { Asset } from './Asset';
import { Blockchain } from './CryptoRoute';
import { Deposit } from './Deposit';
import { Fiat } from './Fiat';

export interface SellRouteDto {
  id: string;
  fiat: Fiat;
  deposit: Deposit;
  iban: string;
  volume: number;
  annualVolume: number;
  active: boolean;
  fee: number;
}

export interface SellRoute {
  id: string;
  fiat: Fiat;
  deposit: Deposit;
  iban: string;
  volume: number;
  annualVolume: number;
  active: boolean;
  fee: number;
}

export interface SellData {
  fiat: Fiat;
  iban: string;
}

export interface GetSellPaymentInfoDto {
  iban: string;
  asset: Asset;
  blockchain: Blockchain;
  currency: Fiat;
}

export interface SellPaymentInfoDto {
  fee: number;
  depositAddress: string;
  minFee: number;
  minVolume: number;
}

export const fromSellRouteDto = (route: SellRouteDto): SellRoute => ({
  id: route.id,
  fiat: route.fiat,
  deposit: route.deposit,
  iban: route.iban.replace(/(.{4})/g, '$1 '),
  active: route.active,
  volume: route.volume,
  annualVolume: route.annualVolume,
  fee: route.fee,
});

export const toSellRouteDto = (route: SellData): SellData => ({
  fiat: route.fiat,
  iban: route.iban.split(' ').join(''),
});
