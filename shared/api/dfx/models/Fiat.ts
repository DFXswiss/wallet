export interface Fiat {
  id: number
  name: string
  buyable: boolean
  sellable: boolean
}

export const DefaultFiat: Fiat = {
  id: 2,
  name: 'EUR',
  buyable: true,
  sellable: true
}
