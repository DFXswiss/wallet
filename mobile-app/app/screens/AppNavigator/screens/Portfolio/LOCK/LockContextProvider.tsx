import { getEnvironment } from '@environment'
import { LockUserDto } from '@shared-api/dfx/ApiService'
import { ApiDomain, AuthService } from '@shared-api/dfx/AuthService'
import { openURL } from 'expo-linking'
import { createContext, PropsWithChildren, useCallback, useContext, useState } from 'react'
import { getReleaseChannel } from '@api/releaseChannel'

const LockKycHookContext = createContext<LockKycContextI>(undefined as any)

export function useLock (): LockKycContextI {
  return useContext(LockKycHookContext)
}

interface LockKycContextI {
  isKycComplete: boolean
  setKycComplete: (lockUserDto?: LockUserDto) => void
  openCfpVoting: () => void
}

export function LockContextProvider (props: PropsWithChildren<{}>): JSX.Element | null {
  const [isKycComplete, setIsKycComplete] = useState(false)

  /**
   * @param lockUserDto {LockUserDto} gets LOCK's KYC state
   * @return boolean
   */

  const setKycComplete = useCallback((lockUserDto?: LockUserDto): void => {
    setIsKycComplete(lockUserDto === undefined || ['Light', 'Full'].includes(lockUserDto?.kycStatus))
  }, [])

  const openCfpVoting = useCallback((): void => {
    const paymentUrl = getEnvironment(getReleaseChannel()).lock.paymentUrl
    AuthService.Session(false, ApiDomain.LOCK)
      .then(async (session) => await openURL(`${paymentUrl}/cfp?token=${session.accessToken ?? ''}`))
  }, [])

  // public context API
  const context: LockKycContextI = {
    isKycComplete,
    setKycComplete,
    openCfpVoting: openCfpVoting
  }

  return (
    <LockKycHookContext.Provider value={context}>
      {props.children}
    </LockKycHookContext.Provider>
  )
}
