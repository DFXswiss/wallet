import { Deposit } from './Deposit'
import { Fiat } from './Fiat'

export interface SellRouteDto {
  id: string
  fiat: Fiat
  deposit: Deposit
  iban: string
  volume: number
  annualVolume: number
  active: boolean
  fee: number
  isInUse: boolean
}

export interface SellRoute {
  id: string
  fiat: Fiat
  deposit: Deposit
  iban: string
  volume: number
  annualVolume: number
  active: boolean
  fee: number
  isInUse: boolean
}

export interface SellData {
  fiat: Fiat
  iban: string
}

export interface GetSellPaymentInfoDto {
  iban: string
  currency: Fiat
}

export interface SellPaymentInfoDto {
  fee: number
  depositAddress: string
  minDeposits: [
    {
      amount: number
      asset: string
    }
  ]
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
  isInUse: route.isInUse
})

export const toSellRouteDto = (route: SellData): SellData => ({
  fiat: route.fiat,
  iban: route.iban.split(' ').join('')
})
