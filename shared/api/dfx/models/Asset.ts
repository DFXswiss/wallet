export enum AssetType {
  Coin = 'Coin',
  DAT = 'DAT'
}

export interface Asset {
  id: number
  chainId: string
  type: AssetType
  name: string
  buyable: boolean
  sellable: boolean
}
