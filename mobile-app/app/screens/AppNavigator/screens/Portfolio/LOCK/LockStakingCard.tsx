import { tailwind } from '@tailwind'
import BigNumber from 'bignumber.js'
import React, { useEffect, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { TokenNameText } from '../components/TokenNameText'
import { TokenAmountText } from '../components/TokenAmountText'
import { ThemedActivityIndicator, ThemedIcon, ThemedTextBasic } from '@components/themed'
import LOCKunlockedIcon from '@assets/LOCK/Lock_unlocked.svg'
import { translate } from '@translations'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import { PortfolioParamList } from '../PortfolioNavigator'
import { LOCKgetAnalytics, LOCKgetStaking, LOCKgetUser, StakingAnalyticsOutputDto, StakingOutputDto } from '@shared-api/dfx/ApiService'
import { WalletAlertErrorApi } from '@components/WalletAlert'
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider'
import { useLock } from './LockContextProvider'
import { useTokenPrice } from '../hooks/TokenPrice'
import { DFITokenSelector } from '@store/wallet'
import { useSelector } from 'react-redux'
import { RootState } from '@store'

interface LockStakingCardProps {
  denominationCurrency: string
  refreshTrigger: boolean
}

export function LockStakingCard ({ refreshTrigger, denominationCurrency }: LockStakingCardProps): JSX.Element {
  const navigation = useNavigation<NavigationProp<PortfolioParamList>>()
  const { LOCKcreateWebToken } = useDFXAPIContext()
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false)
  // data loading logic
  const [isLoading, setIsloading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  // checks if there's a LOCK user
  const { isKycComplete, setKycComplete, getProviderStakingInfo, setProviderStakingInfo } = useLock()

  const [stakingInfo, setStakingInfo] = useState<StakingOutputDto>()
  const stakingAmount = !loggedIn ? null : ((stakingInfo?.balance) != null) ? stakingInfo.balance : !isKycComplete ? 0 : getProviderStakingInfo?.balance ?? 0
  const [analytics, setAnalytics] = useState<StakingAnalyticsOutputDto>()
  const { apy, apr } = analytics ?? { apy: 0, apr: 0 }

  const DFIToken = useSelector((state: RootState) => DFITokenSelector(state.wallet))
  const { getTokenPrice } = useTokenPrice(denominationCurrency)
  const usdAmount = getTokenPrice(DFIToken.symbol, new BigNumber(stakingAmount))

  const enterLOCK = (): void => {
    LOCKcreateWebToken()
      .then(() => {
        setLoggedIn(true)

        fetchLockData()
      })
      .catch(WalletAlertErrorApi)
  }

  const fetchLockData = (): void => {
    setIsloading(true)
    const getUser = LOCKgetUser()
      .then((user) => {
        setKycComplete(user)
      })
      .catch(WalletAlertErrorApi)

    const getStakingInfo = LOCKgetStaking({ assetName: 'DFI', blockchain: 'DeFiChain' })
      .then(staking => {
        setStakingInfo(staking)
        setProviderStakingInfo(staking)
      })

    const getAnalytics = LOCKgetAnalytics()
      .then(setAnalytics)

    Promise.all([getUser, getStakingInfo, getAnalytics]).finally(() => setIsloading(false))
  }

  useEffect(() => {
    if (loggedIn) {
      fetchLockData()
    }
  }, [refreshTrigger])

  const navigateToLock = (): void => {
    isKycComplete ? navigation.navigate('LockDashboardScreen') : navigation.navigate('LockKycScreen')
  }

  // if (!loggedIn) {
  //   return (
  //     <View
  //       style={tailwind('m-4 px-4 py-4 bg-lock-500 rounded-lg')}
  //     >
  //       <TouchableOpacity onPress={() => enterLOCK()}>
  //         <Text
  //           style={tailwind('text-lg text-white self-center font-medium')}
  //         >
  //           enter LOCK
  //         </Text>
  //       </TouchableOpacity>
  //     </View>
  //   )
  // }

  return (
    <>
      <View
        style={tailwind('m-4 px-4 pt-4 pb-2 bg-lock-500 rounded-lg')}
      >
        <TouchableOpacity
          onPress={loggedIn ? navigateToLock : enterLOCK}
          disabled={isLoading}
          style={tailwind('border-0')}
        >
          <View style={tailwind('flex-row items-center')}>
            <LOCKunlockedIcon height={48} width={48} />
            <TokenNameText displaySymbol='DFI Staking by LOCK' name={`${apy}% APY / ${apr}% APR`} testID='' />
            {stakingAmount != null && <TokenAmountText
              tokenAmount={stakingAmount.toString()}
              usdAmount={usdAmount}
              testID=''
              isBalancesDisplayed
              denominationCurrency={denominationCurrency}
              decimalScale={2}
                                      />}
          </View>
        </TouchableOpacity>
        {(isLoading) && <ThemedActivityIndicator size='large' color='#fff' style={tailwind('absolute inset-0 items-center justify-center')} />}
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
    </>
  )
}
