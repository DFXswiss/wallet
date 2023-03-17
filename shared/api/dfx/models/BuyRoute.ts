import { Asset } from './Asset';
import { Fiat } from './Fiat';

export interface BuyRouteDto {
  id: string;
  asset: Asset;
  bankUsage: string;
  iban: string;
  volume: number;
  annualVolume: number;
  active: boolean;
  fee: number;
  refBonus: number;
}

export interface BuyRoute {
  id: string;
  asset: Asset;
  bankUsage: string;
  iban: string;
  volume: number;
  annualVolume: number;
  active: boolean;
  fee: number;
  refBonus: number;
}

export interface GetBuyPaymentInfoDto {
  iban: string;
  asset: Asset;
  amount: number;
  currency: Fiat;
}

export interface BuyPaymentInfoDto {
  name: string;
  street: string;
  number: string;
  zip: string;
  city: string;
  country: string;
  iban: string;
  bic: string;
  fee: number;
  refBonus: number;
  remittanceInfo: string;
  sepaInstant: boolean;
  minDeposits: [
    {
      amount: number;
      asset: string;
    },
  ];
}

export const fromBuyRouteDto = (route: BuyRouteDto): BuyRoute => ({
  id: route.id,
  asset: route.asset,
  bankUsage: route.bankUsage,
  iban: route.iban.replace(/(.{4})/g, '$1 '),
  active: route.active,
  volume: route.volume,
  annualVolume: route.annualVolume,
  fee: route.fee,
  refBonus: route.refBonus,
});

export const toBuyRouteDto = (route: BuyRoute): BuyRouteDto => ({
  id: route.id,
  asset: route.asset,
  bankUsage: route.bankUsage,
  iban: route.iban.split(' ').join(''),
  active: route.active,
  volume: route.volume,
  annualVolume: route.annualVolume,
  fee: route.fee,
  refBonus: route.refBonus,
});
