/**
 * Network supported in this environment
 */
export enum EnvironmentNetwork {
  LocalPlayground = 'Local',
  RemotePlayground = 'Playground',
  MainNet = 'MainNet',
  TestNet = 'TestNet'
}

export enum EnvironmentName {
  Production = 'Production',
  Preview = 'Preview',
  Staging = 'Staging',
  Development = 'Development',
}

interface Environment {
  name: EnvironmentName
  debug: boolean
  networks: EnvironmentNetwork[]
  dfx: {
    apiUrl: string
    paymentUrl: string
  }
  lock: {
    paymentUrl: string
    walletName: string
    apiUrl: string
  }
  addressFormat: RegExp
}

export const environments: Record<EnvironmentName, Environment> = {
  Production: {
    name: EnvironmentName.Production,
    debug: false,
    networks: [
      EnvironmentNetwork.MainNet,
      EnvironmentNetwork.TestNet,
      EnvironmentNetwork.RemotePlayground
    ],
    dfx: {
      apiUrl: 'https://api.dfx.swiss/v1',
      paymentUrl: 'https://payment.dfx.swiss'
    },
    lock: {
      apiUrl: 'https://api.lock.space/v1',
      paymentUrl: 'https://kyc.lock.space',
      walletName: 'LOCK.space'
    },
    addressFormat: /^(8\w{33}|d\w{33}|d\w{41})$/
  },
  Preview: {
    name: EnvironmentName.Preview,
    debug: true,
    networks: [
      EnvironmentNetwork.MainNet,
      EnvironmentNetwork.TestNet,
      EnvironmentNetwork.RemotePlayground
    ],
    dfx: {
      apiUrl: 'https://api.dfx.swiss/v1',
      paymentUrl: 'https://payment.dfx.swiss'
    },
    lock: {
      apiUrl: 'https://api.lock.space/v1',
      paymentUrl: 'https://kyc.lock.space',
      walletName: 'LOCK.space'
    },
    addressFormat: /^(8\w{33}|d\w{33}|d\w{41})$/
  },
  Staging: {
    name: EnvironmentName.Staging,
    debug: true,
    networks: [
      EnvironmentNetwork.MainNet,
      EnvironmentNetwork.TestNet,
      EnvironmentNetwork.RemotePlayground
    ],
    dfx: {
      apiUrl: 'https://api.dfx.swiss/v1',
      paymentUrl: 'https://payment.dfx.swiss'
    },
    lock: {
      apiUrl: 'https://stg.api.lock.space/v1',
      paymentUrl: 'https://kyc.lock.space',
      walletName: 'LOCK.space STG'
    },
    addressFormat: /^(8\w{33}|d\w{33}|d\w{41})$/
  },
  Development: {
    name: EnvironmentName.Development,
    debug: true,
    networks: [
      EnvironmentNetwork.TestNet,
      EnvironmentNetwork.MainNet,
      EnvironmentNetwork.LocalPlayground,
      EnvironmentNetwork.RemotePlayground
    ],
    dfx: {
      apiUrl: 'https://dev.api.dfx.swiss/v1',
      paymentUrl: 'https://dev.payment.dfx.swiss'
    },
    lock: {
      apiUrl: 'https://dev.api.lock.space/v1',
      paymentUrl: 'https://dev.kyc.lock.space',
      walletName: 'LOCK.space'
    },
    addressFormat: /^((7|8)\w{33}|(t|d)\w{33}|(t|d)\w{41})$/
  }
}

/**
 * @return Environment of current Wallet, checked via expo release channels
 */
export function getEnvironment (channel: string): Environment {
  if (channel === 'production') {
    return environments[EnvironmentName.Production]
  }

  if (channel.startsWith('pr-preview-') || channel === 'preview') {
    return environments[EnvironmentName.Preview]
  }

  if (channel.startsWith('pr-preview-') || channel === 'staging') {
    return environments[EnvironmentName.Staging]
  }

  return environments[EnvironmentName.Development]
}

/**
 * @param {EnvironmentNetwork} network to check if it is a playground network
 */
export function isPlayground (network: EnvironmentNetwork): boolean {
  return [
    EnvironmentNetwork.LocalPlayground,
    EnvironmentNetwork.RemotePlayground
  ].includes(network)
}
