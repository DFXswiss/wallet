/* eslint-disable @typescript-eslint/no-unused-vars */
import { StackScreenProps } from '@react-navigation/stack'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { TouchableOpacity, Text, Linking, Platform } from 'react-native'
import { tailwind } from '@tailwind'
import { translate } from '@translations'
import { PortfolioParamList } from '../PortfolioNavigator'
import { Button } from '@components/Button'
import { View } from '@components'
import React, { useCallback, useRef, useState } from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import LOCKunlockedIcon from '@assets/LOCK/Lock_unlocked.svg'
import { ScrollView } from 'react-native-gesture-handler'
import { BottomSheetNavScreen, BottomSheetWebWithNav, BottomSheetWithNav } from '@components/BottomSheetWithNav'
import { BottomSheetModal } from '@gorhom/bottom-sheet'

type Props = StackScreenProps<PortfolioParamList, 'LockDashboardScreen'>

export function LockDashboardScreen ({ route }: Props): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigation = useNavigation<NavigationProp<PortfolioParamList>>()

  const email = 'support@lock.space'

  const assetList = [
    {
      asset: 'dUSDT',
      share: 30
    },
    {
      asset: 'BTC',
      share: 20
    },
    {
      asset: 'dBTC',
      share: 25
    },
    {
      asset: 'dTSLA-dUSD',
      share: 25
    }
  ]

  // Bottom sheet
  const [isModalDisplayed, setIsModalDisplayed] = useState(false)
  const [bottomSheetScreen, setBottomSheetScreen] = useState<BottomSheetNavScreen[]>([])
  const containerRef = useRef(null)
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const expandModal = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsModalDisplayed(true)
    } else {
      bottomSheetRef.current?.present()
    }
  }, [])
  const dismissModal = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsModalDisplayed(false)
    } else {
      bottomSheetRef.current?.close()
    }
  }, [])

  // const setStakingBottomSheet = useCallback((accounts: SellRoute[]) => { // TODO: remove accounts?
  //   setBottomSheetScreen([
  //     {
  //       stackScreenName: 'FiatAccountCreate',
  //       component: BottomSheetFiatAccountCreate({
  //         fiatAccounts: accounts,
  //         headerLabel: translate('screens/SellScreen', 'Add account'),
  //         onCloseButtonPress: () => dismissModal(),
  //         onElementCreatePress: async (item): Promise<void> => {
  //           if (item.iban !== undefined) {
  //             fiatAccounts.push(item)
  //             setAccount(item)
  //           }
  //           dismissModal()
  //         }
  //       }),
  //       option: {
  //         header: () => null
  //       }
  //     }])
  // }, [fiatAccounts])

  return (
    <ScrollView style={tailwind('flex-col bg-gray-200 border-t border-dfxgray-500 h-full text-lg')}>

      <View style={tailwind('h-40 bg-lock-800')}>
        <View style={tailwind('self-center mt-4')}>
          <View style={tailwind('flex-row self-center')}>
            <LOCKunlockedIcon height={48} width={48} style={tailwind('mr-2')} />
            <Text style={tailwind('text-5xl text-white font-extrabold self-center')}>
              LOCK
            </Text>
          </View>
          <Text style={tailwind('mt-6 text-lg text-white self-center')}>
            {translate('LOCK/LockDashboardScreen', '$DFI Staking by Lock')}
          </Text>
          <Text style={tailwind('text-xl text-white font-bold mb-6 self-center')}>
            {translate('LOCK/LockDashboardScreen', 'APY 35%  APR 31%')}
          </Text>
        </View>
      </View>

      <View style={tailwind('bg-white rounded-md m-8')}>
        <View style={tailwind('flex-row p-4 justify-between border-b border-gray-200')}>
          <Text style={tailwind('text-xl font-bold ')}>
            {translate('LOCK/LockDashboardScreen', 'DFI Staking')}
          </Text>
          <Text style={tailwind('text-xl font-medium ')}>
            {translate('LOCK/LockDashboardScreen', '1,000 DFI')}
          </Text>
        </View>

        <View style={tailwind('p-4')}>
          <Text style={tailwind('text-xl font-bold mb-2')}>
            {translate('LOCK/LockDashboardScreen', 'Reward strategy')}
          </Text>

          <ListItem pair={{ asset: 'Reinvest', share: 100 }} style='text-xl font-medium' />
          <ListItem pair={{ asset: 'Pay out to the wallet', share: 'tbd.' }} style='text-xl font-normal' isDisabled />

          {assetList.map((pair, i) => {
            return (
              <ListItem key={`al-${i}`} pair={pair} isDisabled />
            )
          })}

          <ListItem pair={{ asset: 'Pay out to bank account', share: 'tbd.' }} style='text-xl font-normal' isDisabled />

        </View>
        <View style={tailwind('flex-row bg-lock-200 rounded-b-md justify-between')}>
          <Button
            fill='fill'
            label={translate('LOCK/LockDashboardScreen', 'STAKE')}
            margin='m-3 '
            padding='p-1'
            extraStyle='flex-grow'
            // onPress={() => navigation.dispatch(StackActions.popToTop())}
            lock
            style={tailwind('h-8')}
          />
          <Button
            fill='fill'
            label={translate('LOCK/LockDashboardScreen', 'UNSTAKE')}
            margin='my-3 mr-3'
            padding='p-1'
            extraStyle='flex-grow'
            // onPress={() => navigation.dispatch(StackActions.popToTop())}
            lock
            style={tailwind('h-4')}
          />
        </View>
      </View>

      <View style={tailwind('flex-row self-center mb-20')}>
        <TouchableOpacity style={tailwind('flex-row mx-2')} onPress={async () => await Linking.openURL('mailto:' + email)}>
          <MaterialCommunityIcons
            style={tailwind('mr-2 text-lock-800 self-center')}
            iconType='MaterialIcons'
            name='email-outline'
            size={12}
          />
          <Text style={tailwind('text-xs font-medium self-center')}>
            {translate('LOCK/LockDashboardScreen', email)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={tailwind('flex-row mx-2')} onPress={async () => await Linking.openURL('https://lock.space/terms')}>
          <MaterialCommunityIcons
            style={tailwind('mr-2 text-lock-800 self-center')}
            iconType='MaterialCommunityIcons'
            name='open-in-new'
            size={12}
          />
          <Text style={tailwind('text-xs font-medium self-center')}>
            {translate('LOCK/LockDashboardScreen', 'Terms & Conditions')}
          </Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'web' && (
        <BottomSheetWebWithNav
          modalRef={containerRef}
          screenList={bottomSheetScreen}
          isModalDisplayed={isModalDisplayed}
          modalStyle={{
            position: 'absolute',
            height: '350px',
            width: '375px',
            zIndex: 50,
            bottom: '0'
          }}
        />
      )}

      {Platform.OS !== 'web' && (
        <BottomSheetWithNav
          modalRef={bottomSheetRef}
          screenList={bottomSheetScreen}
        />
      )}

    </ScrollView>
  )
}

interface ListItemProp {
  pair: {
    asset: string
    share: number | string
  }
  isDisabled?: boolean
  style?: string
}

function ListItem ({ pair, isDisabled, style }: ListItemProp): JSX.Element {
  return (
    <View style={tailwind('flex-row py-2 justify-between')}>
      <Text style={tailwind(style ?? 'text-lg', 'font-extralight', (isDisabled === true) ? 'text-gray-400' : '')}>
        {translate('LOCK/LockDashboardScreen', pair.asset)}
      </Text>
      <Text style={tailwind(style ?? 'text-lg', 'font-extralight', (isDisabled === true) ? 'text-gray-400' : '')}>
        {translate('LOCK/LockDashboardScreen', (typeof pair.share === 'number') ? `${pair.share} %` : pair.share)}
      </Text>
    </View>
  )
}
