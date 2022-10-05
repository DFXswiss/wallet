import { LockUserDto } from '@shared-api/dfx/ApiService'
import { useCallback, useEffect, useState } from 'react'

interface LockKycHook {
  isKycComplete: boolean
  setKycComplete: () => void
}

export function useLockKycComplete (lockUserDto?: LockUserDto): LockKycHook {
  const [isKycComplete, setIsComplete] = useState(false)

  useEffect(() => {
    setIsComplete(lockUserDto?.kycStatus === 'Full')
    // console.log('HOOK useEffect --> isComplete: ', lockUserDto?.kycStatus === 'Full')
  }, [lockUserDto])

  /**
   * @param lockUserDto {LockUserDto} gets LOCK's KYC state
   * @return boolean
   */

  const setKycComplete = useCallback((): void => {
    setIsComplete(true)
    // console.log('SET LOCK KYC (TRUE)')

    setTimeout(() => {
      // console.log('Timeout ---> isKycComplete: ', isKycComplete)
    }, 5000)
  }, [])

  // const isKycComplete = useCallback((): boolean => {
  //   console.log('isComplete: ', isKycComplete)
  //   return isKycComplete
  // }, [isKycComplete])()

  return {
    isKycComplete,
    setKycComplete
  }
}
