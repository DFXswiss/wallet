/* eslint-disable @typescript-eslint/no-unused-vars */
import { useDisplayBalancesContext } from '@contexts/DisplayBalancesContext'
import { tailwind } from '@tailwind'
import BigNumber from 'bignumber.js'
import React, { useEffect, useMemo, useState } from 'react'
import { TouchableOpacity, View, Text } from 'react-native'
import { TokenNameText } from '../components/TokenNameText'
import { TokenAmountText } from '../components/TokenAmountText'
import { PortfolioButtonGroupTabKey } from '../components/TotalPortfolio'
import { ThemedIcon, ThemedText, ThemedTextBasic } from '@components/themed'
import LOCKunlockedIcon from '@assets/LOCK/Lock_unlocked.svg'
import { translate } from '@translations'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import { PortfolioParamList } from '../PortfolioNavigator'
import { getUserDetail, LOCKgetStaking, LOCKgetUser, LockUserDto, StakingOutputDto } from '@shared-api/dfx/ApiService'
import { WalletAlertErrorApi } from '@components/WalletAlert'
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider'
import { useLockKycComplete } from './LockKycComplete'

export function LockStakingCard (): JSX.Element {
  const navigation = useNavigation<NavigationProp<PortfolioParamList>>()
  const { LOCKcreateWebToken } = useDFXAPIContext()
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false)
  const [isLoading, setIsloading] = useState(true)

  const [loggedIn, setLoggedIn] = useState(false)

  const [lockUser, setLockUser] = useState<LockUserDto>()
  const { isKycComplete } = useLockKycComplete(lockUser)

  const [stakingInfo, setStakingInfo] = useState<StakingOutputDto>()
  const stakingAmount = ((stakingInfo?.balance) != null) ? stakingInfo.balance : !isKycComplete ? 0 : 1000
  const { apr, apy } = { apr: 37, apy: 30 }

  useEffect(() => {
    // console.log('------------------------------------')
    // console.log('-----isKycComplete useEffect------')
    // console.log('isKycComplete: ', isKycComplete)
    // console.log('------------------------------------')
  }, [isKycComplete])

  const enterLOCK = (): void => {
    LOCKcreateWebToken()
      .then(() => {
        setLoggedIn(true)

        if (!isKycComplete) {
          LOCKgetUser()
            .then((user) => {
              setLockUser(user)
              // setisKycComplete(user.kycStatus === 'Full')
            })
            .catch(WalletAlertErrorApi)
            .finally(() => setIsloading(false))

          LOCKgetStaking({ assetName: 'DFI', blockchain: 'DeFiChain' })
            .then(setStakingInfo)
            // .catch(WalletAlertErrorApi)
            // .finally(() => setIsloading(false))
        }
      })
      .catch(WalletAlertErrorApi)
  }

  const navigateToLock = (): void => {
    isKycComplete ? navigation.navigate('LockDashboardScreen') : navigation.navigate('LockScreen')
  }

  if (!loggedIn) {
    return (
      <View
        style={tailwind('m-4 px-4 py-4 bg-lock-500 rounded-lg')}
      >
        <TouchableOpacity onPress={() => enterLOCK()}>
          <Text
            style={tailwind('text-lg text-white self-center font-medium')}
          >
            enter LOCK
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View
      style={tailwind('m-4 px-4 pt-4 pb-2 bg-lock-500 rounded-lg')}
    >
      <TouchableOpacity
        onPress={navigateToLock}
        disabled={isLoading}
        style={tailwind('border-0')}
      >
        <View style={tailwind('flex-row items-center')}>
          <LOCKunlockedIcon height={48} width={48} />
          <TokenNameText displaySymbol='DFI Staking by LOCK' name={`${apr}% APY / ${apy}% APR`} testID='' />
          <TokenAmountText
            tokenAmount={stakingAmount.toString()}
            usdAmount={new BigNumber((stakingAmount === 0) ? 0 : stakingAmount * 2 - 0.7654)}
            testID=''
            isBalancesDisplayed
            denominationCurrency={PortfolioButtonGroupTabKey.USDT}
            decimalScale={2}
          />
        </View>
      </TouchableOpacity>
      {isBreakdownExpanded && (
        <View
          style={tailwind('mx-2 pt-4 pb-3')}
        >
          <ThemedTextBasic style={tailwind('text-sm')}>
            {translate('LOCK/LockCard', 'The custodial staking service powered by LOCK uses customers\' staked DFI, operates masternodes with it, and thus generates revenue (rewards) for customers.')}
          </ThemedTextBasic>
        </View>
      )}
      <View style={tailwind('flex-row justify-center items-center')}>
        <TouchableOpacity
          onPress={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
          testID='details_dfi'
        >
          <ThemedIcon
            light={tailwind('text-gray-600')}
            dark={tailwind('text-dfxgray-300')}
            iconType='MaterialIcons'
            name={!isBreakdownExpanded ? 'expand-more' : 'expand-less'}
            size={24}
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}
