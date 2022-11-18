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
    }
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
    }
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
    }
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
    }
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
