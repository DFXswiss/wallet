/* eslint-disable @typescript-eslint/no-unused-vars */
import { useDisplayBalancesContext } from '@contexts/DisplayBalancesContext'
import { tailwind } from '@tailwind'
import BigNumber from 'bignumber.js'
import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { TouchableOpacity, View, Text } from 'react-native'
import { RootState } from '@store'
import { LockedBalance, useTokenLockedBalance } from '../hooks/TokenLockedBalance'
import { PortfolioRowToken } from '../PortfolioScreen'
import { getNativeIcon } from '@components/icons/assets'
import { TokenNameText } from '../components/TokenNameText'
import { TokenAmountText } from '../components/TokenAmountText'
import { PortfolioButtonGroupTabKey } from '../components/TotalPortfolio'
import { ThemedIcon, ThemedTextBasic } from '@components/themed'
import LOCKunlockedIcon from '@assets/LOCK/Lock_unlocked.svg'
import { translate } from '@translations'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import { PortfolioParamList } from '../PortfolioNavigator'

export function LockStakingCard (): JSX.Element {
  const navigation = useNavigation<NavigationProp<PortfolioParamList>>()
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false)

  const stakingAmount = 1000
  const { apr, apy } = { apr: 37, apy: 30 }

  return (
    <View
      style={tailwind('m-4 px-4 pt-4 pb-2 bg-lock-500 rounded-lg')}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate('LockScreen')}
        style={tailwind('border-0')}
      >
        <View style={tailwind('flex-row items-center flex-grow')}>
          <LOCKunlockedIcon height={48} width={48} />
          <TokenNameText displaySymbol='DFI Staking by LOCK' name={`${apr}% APY / ${apy}% APR`} testID='' />
          <TokenAmountText
            tokenAmount={stakingAmount.toString()}
            usdAmount={new BigNumber('1999.08')}
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
      <View style={tailwind('flex-row justify-center flex-1 items-center')}>
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
