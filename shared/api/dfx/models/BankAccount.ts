import { Fiat } from './Fiat'

export interface BankAccountDto {
  readonly name: 'BankAccount' // TODO: (thabrad) remove once dependencies migrated
  id: string
  iban: string
  preferredCurrency: Fiat | null
  label: string | null
  sepaInstant: boolean
}

export interface BankAccount {
  readonly name: 'BankAccount'
  id: string
  iban: string
  fiat: Fiat | null
  label: string | null
  sepaInstant: boolean
}

export interface BankAccountData {
  iban: string
  preferredCurrency: Fiat | null
  label: string | null
}

export const fromBankAccountDto = (route: BankAccountDto): BankAccount => ({
  name: route.name,
  id: route.id,
  iban: route.iban.replace(/(.{4})/g, '$1 '),
  fiat: route.preferredCurrency,
  label: route.label,
  sepaInstant: route.sepaInstant
})

export const toBankAccountDto = (route: BankAccountData): BankAccountData => ({
  iban: route.iban.split(' ').join(''),
  preferredCurrency: route.preferredCurrency,
  label: route.label
})
