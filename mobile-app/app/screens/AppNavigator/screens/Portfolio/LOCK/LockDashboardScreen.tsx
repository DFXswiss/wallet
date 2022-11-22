/* eslint-disable @typescript-eslint/no-unused-vars */
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { View, TouchableOpacity, Text, Linking, Platform, ScrollView, AlertButton, RefreshControl } from 'react-native'
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import LOCKunlockedIcon from '@assets/LOCK/Lock_unlocked.svg'

import { InputHelperText } from '@components/InputHelperText'
import { WalletTextInput } from '@components/WalletTextInput'
import { StackScreenProps } from '@react-navigation/stack'
import { DFIUtxoSelector, tokensSelector, WalletToken } from '@store/wallet'
import BigNumber from 'bignumber.js'
import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Control, Controller, useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { AmountButtonTypes, SetAmountButton } from '@components/SetAmountButton'
import {
  ThemedActivityIndicator,
  ThemedScrollView,
  ThemedView
} from '@components/themed'
import { onTransactionBroadcast } from '@api/transaction/transaction_commands'
import { RootState } from '@store'
import { firstTransactionSelector, hasTxQueued as hasBroadcastQueued, OceanTransaction } from '@store/ocean'
import { hasTxQueued } from '@store/transaction_queue'
import { tailwind } from '@tailwind'
import { translate } from '@translations'
import { PortfolioParamList } from '../PortfolioNavigator'
import { useLogger } from '@shared-contexts/NativeLoggingProvider'
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { BottomSheetNavScreen, BottomSheetWebWithNav, BottomSheetWithNav } from '@components/BottomSheetWithNav'
import { SubmitButtonGroup } from '@components/SubmitButtonGroup'
import { useNetworkContext } from '@shared-contexts/NetworkContext'
import { useAppDispatch } from '@hooks/useAppDispatch'
import { send } from '@screens/AppNavigator/screens/Portfolio/screens/SendConfirmationScreen'
import { Button } from '@components/Button'
import { LOCKdeposit, LOCKgetAnalytics, LOCKgetStaking, LOCKwithdrawal, LOCKwithdrawalDrafts, LOCKwithdrawalSign, StakingAnalyticsOutputDto, StakingOutputDto, WithdrawalDraftOutputDto } from '@shared-api/dfx/ApiService'
import { CustomAlertOption, WalletAlert, WalletAlertErrorApi } from '@components/WalletAlert'
import { NetworkName } from '@defichain/jellyfish-network'
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider'
import { useLock } from './LockContextProvider'
import { openURL } from 'expo-linking'
import { getEnvironment } from '@environment'
import { getReleaseChannel } from '@api/releaseChannel'

type Props = StackScreenProps<PortfolioParamList, 'LockDashboardScreen'>
type StakingAction = 'STAKE' | 'UNSTAKE'

export interface TransactionCache {
  amount: number
  depositAddress: string
  token: WalletToken
  network: NetworkName
  transaction?: OceanTransaction
}

export function LockDashboardScreen ({ route }: Props): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigation = useNavigation<NavigationProp<PortfolioParamList>>()
  const transaction = useSelector((state: RootState) => firstTransactionSelector(state.ocean))
  const logger = useLogger()
  const { setProviderStakingInfo, openCfpVoting } = useLock()

  const [stakingInfo, setStakingInfo] = useState<StakingOutputDto>()
  const [isLoading, setIsloading] = useState(true)

  const [analytics, setAnalytics] = useState<StakingAnalyticsOutputDto>()
  const { apr, apy } = analytics ?? { apr: 0, apy: 0 }

  const tokens = useSelector((state: RootState) => tokensSelector(state.wallet))
  const dfi = tokens.find((t) => t.displaySymbol === 'DFI')

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

  const { signMessage } = useDFXAPIContext()

  const [transactionCache, setTransactionCache] = useState<TransactionCache>()

  const setStakingBottomSheet = useCallback((dfi, action: StakingAction) => {
    setBottomSheetScreen([
      {
        stackScreenName: 'BottomSheetStaking',
        component: BottomSheetStaking({
          dfi: dfi,
          headerLabel: translate('LOCK/LockDashboardScreen', 'How much DFI do you want to {{action}}?', { action: action.toLocaleLowerCase() }),
          onCloseButtonPress: () => dismissModal(),
          onStaked: async (stakingTransaction): Promise<void> => {
            setTransactionCache(stakingTransaction)
            // wait for pass code modal to open
            setTimeout(() => dismissModal(), 1000)
          },
          onUnstaked: async (newStakingInfo): Promise<void> => {
            setStakingInfo(newStakingInfo)
            // wait for pass code modal to close
            setTimeout(() => dismissModal(), 1000)
          },
          stakingInfo: stakingInfo as StakingOutputDto,
          action,
          signMessage
        }),
        option: {
          header: () => null
        }
      }])
  }, [stakingInfo])

  const fetchStakingInfo = async (): Promise<void> => {
    setIsloading(true)
    const getStakingInfo = LOCKgetStaking({ asset: 'DFI', blockchain: 'DeFiChain' })
      .then(staking => {
        setStakingInfo(staking)
        setProviderStakingInfo(staking)
      })
      .catch(WalletAlertErrorApi)

    const getAnalytics = LOCKgetAnalytics()
      .then(setAnalytics)

    Promise.all([getStakingInfo, getAnalytics]).finally(() => setIsloading(false))
  }

  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    fetchStakingInfo()
    setRefreshing(false)
  }, [])

  const onCsvExport = useCallback(async () => {
    const baseUrl = getEnvironment(getReleaseChannel()).lock.apiUrl
    await openURL(`${baseUrl}/analytics/history/compact?depositAddress=${stakingInfo?.depositAddress ?? ''}&type=csv`)
  }, [stakingInfo])

  useEffect(() => {
    fetchStakingInfo()
  }, [])

  // listen for broadcasted staking-transaction and notify LOCK Api with txId (+ amount)
  // TODO: check for possible refactor to dispatch / component lifecycle-independence
  useEffect(() => {
    if (transaction?.tx?.txId != null && transactionCache != null) {
      LOCKdeposit(stakingInfo?.id ?? 2, { amount: transactionCache.amount, txId: transaction.tx.txId })
        .then(setStakingInfo)
        .then(() => setTransactionCache(undefined))
        .catch(WalletAlertErrorApi)
  }
  }, [transaction, transactionCache])

  return (
    <View style={tailwind('h-full bg-gray-200 border-t border-dfxgray-500')}>
      <ScrollView
        contentContainerStyle={tailwind('flex-col')}
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        }
      >

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
              {translate('LOCK/LockDashboardScreen', `APY ${apy}%  APR ${apr}%`)}
            </Text>
          </View>
        </View>

        {/* staking card */}
        <View style={tailwind('bg-white rounded-md m-8')}>

          {/* card header */}
          <View style={tailwind('flex-row p-4 justify-between')}>
            <Text style={tailwind('text-xl font-bold ')}>
              {translate('LOCK/LockDashboardScreen', 'DFI Staking')}
            </Text>
            <Text style={tailwind('text-xl font-medium ')}>
              {translate('LOCK/LockDashboardScreen', `${stakingInfo?.balance ?? 0} DFI`)}
            </Text>
          </View>

          {stakingInfo != null && stakingInfo.pendingDeposits > 0 && (
            <ListItem
              pair={{ asset: translate('LOCK/LockDashboardScreen', 'Pending Deposits '), share: `+${new BigNumber(stakingInfo?.pendingDeposits).decimalPlaces(2).toString()} DFI` }}
              style='px-4 pb-2'
              fieldStyle='text-xl font-normal'
              isDisabled
            />
          )}
          {stakingInfo != null && stakingInfo.pendingWithdrawals > 0 && (
            <ListItem
              pair={{ asset: translate('LOCK/LockDashboardScreen', 'Pending Withdrawals '), share: `-${new BigNumber(stakingInfo?.pendingWithdrawals).decimalPlaces(2).toString()} DFI` }}
              style='px-4 pb-2'
              fieldStyle='text-xl font-normal'
              isDisabled
            />
          )}
          <View style={tailwind('border-b border-gray-200')} />

          {/* card content / staking details */}
          <View style={tailwind('p-4')}>
            <Text style={tailwind('text-xl font-bold mb-2')}>
              {translate('LOCK/LockDashboardScreen', 'Reward strategy')}
            </Text>

            <ListItem pair={{ asset: 'Reinvest', share: 100 }} fieldStyle='text-xl font-medium' />
            <ListItem pair={{ asset: 'Pay out to the wallet', share: 'tbd.' }} fieldStyle='text-xl font-normal' isDisabled />

            {assetList.map((pair, i) => {
              return (
                <ListItem key={`al-${i}`} pair={pair} isDisabled />
              )
            })}

            <ListItem pair={{ asset: 'Pay out to bank account', share: 'tbd.' }} fieldStyle='text-xl font-normal' isDisabled />

          </View>
          <View style={tailwind('flex-row bg-lock-200 rounded-b-md justify-between')}>
            <Button
              fill='fill'
              label={translate('LOCK/LockDashboardScreen', 'STAKE')}
              margin='m-3 '
              padding='p-1'
              extraStyle='flex-grow'
              onPress={() => {
                setStakingBottomSheet(dfi, 'STAKE')
                expandModal()
              }}
              lock
              disabled={isLoading || dfi === undefined || new BigNumber(dfi.amount).isLessThanOrEqualTo(0)}
              isSubmitting={isLoading}
              style={tailwind('h-8')}
            />
            <Button
              fill='fill'
              label={translate('LOCK/LockDashboardScreen', 'UNSTAKE')}
              margin='my-3 mr-3'
              padding='p-1'
              extraStyle='flex-grow'
              onPress={() => {
                setStakingBottomSheet(dfi, 'UNSTAKE')
                expandModal()
              }}
              lock
              disabled={isLoading || (stakingInfo != null && stakingInfo.balance <= 0)}
              isSubmitting={isLoading}
              style={tailwind('h-4')}
            />
          </View>
        </View>

        <Button
          fill='fill'
          label={translate('LOCK/LockDashboardScreen', 'CSV EXPORT')}
          margin='mx-8 mb-4'
          padding='p-1'
          extraStyle='flex-grow'
          onPress={onCsvExport}
          lock
          style={tailwind('h-4')}
        />

        <Button
          fill='fill'
          label={translate('LOCK/LockDashboardScreen', 'CFP VOTING')}
          margin='mx-8 mb-4'
          padding='p-1'
          extraStyle='flex-grow'
          onPress={openCfpVoting}
          lock
          style={tailwind('h-4')}
        />

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
    </View>
  )
}

interface ListItemProp {
  pair: {
    asset: string
    share: number | string
  }
  isDisabled?: boolean
  fieldStyle?: string
  style?: string
}

function ListItem ({ pair, isDisabled, fieldStyle, style }: ListItemProp): JSX.Element {
  return (
    <View style={tailwind('flex-row justify-between', style ?? 'py-2')}>
      <Text style={tailwind(fieldStyle ?? 'text-lg', 'font-extralight', (isDisabled === true) ? 'text-gray-400' : '')}>
        {translate('LOCK/LockDashboardScreen', pair.asset)}
      </Text>
      <Text style={tailwind(fieldStyle ?? 'text-lg', 'font-extralight', (isDisabled === true) ? 'text-gray-400' : '')}>
        {translate('LOCK/LockDashboardScreen', (typeof pair.share === 'number') ? `${pair.share} %` : pair.share)}
      </Text>
    </View>
  )
}

// --------------------------------------------------------------
// --------------export const BottomSheetStaking-----------------
// --------------------------------------------------------------

interface BottomSheetStakingProps {
  headerLabel: string
  onCloseButtonPress: () => void
  onStaked: (stakingTransaction: TransactionCache) => void
  onUnstaked: (newStakingInfo: StakingOutputDto) => void
  dfi: WalletToken
  stakingInfo: StakingOutputDto
  action: StakingAction
  signMessage: (message: string) => Promise<string>
}

export const BottomSheetStaking = ({
  headerLabel,
  onCloseButtonPress,
  onStaked,
  onUnstaked,
  dfi,
  stakingInfo,
  action,
  signMessage
}: BottomSheetStakingProps): React.MemoExoticComponent<() => JSX.Element> => memo(() => {
  const network = useNetworkContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    control,
    setValue,
    formState,
    getValues,
    trigger,
    watch
  } = useForm({ mode: 'onChange' })
  const dispatch = useAppDispatch()
  const { address } = watch()
  const hasPendingJob = useSelector((state: RootState) => hasTxQueued(state.transactionQueue))
  const hasPendingBroadcastJob = useSelector((state: RootState) => hasBroadcastQueued(state.ocean))
  const logger = useLogger()

  const navigation = useNavigation<NavigationProp<PortfolioParamList>>()

  const [hasBalance, setHasBalance] = useState(false)
  const [isOnPage, setIsOnPage] = useState<boolean>(true)

  // modal scrollView setup
  const bottomSheetComponents = {
    mobile: BottomSheetScrollView,
    web: ThemedScrollView
  }
  const ScrollView = Platform.OS === 'web' ? bottomSheetComponents.web : bottomSheetComponents.mobile

  useEffect(() => {
    setIsOnPage(true)
    return () => {
      setIsOnPage(false)
    }
  }, [])

  async function onSubmit (): Promise<void> {
    if (hasPendingJob || hasPendingBroadcastJob || dfi === undefined) {
      return
    }

    setIsSubmitting(true)

    const amount = new BigNumber(getValues('amount'))

    if (action === 'STAKE') {
      stake(amount)
    } else {
      unstake(amount)
    }
  }

  async function stake (amount: BigNumber): Promise<void> {
    const depositAddress = stakingInfo?.depositAddress ?? ''

    if (formState.isValid && (depositAddress.length > 0)) {
      setIsSubmitting(true)
      await send({
        address: depositAddress,
        token: dfi,
        amount: amount,
        networkName: network.networkName
      }, dispatch, () => {
        onTransactionBroadcast(isOnPage, navigation.dispatch, 0)
      }, logger)
      setIsSubmitting(false)
      onStaked({ depositAddress, token: dfi, amount: amount.toNumber(), network: network.networkName })
    }
  }

  async function unstake (amount: BigNumber): Promise<void> {
    LOCKwithdrawal(stakingInfo.id, amount.toNumber())
      .then(async (withdrawal) => {
        setIsSubmitting(true)
        signWithdrawal(withdrawal)
      })
      .catch((error) => {
        if (error.message === 'Existing withdrawal have to be finished first') {
          const alertButtons: AlertButton[] = [
            {
              text: 'Cancel',
              onPress: () => setIsSubmitting(false),
              style: 'destructive'
            },
            {
              text: 'Confirm',
              onPress: signPreviousWithdrawal,
              style: 'default'
            }
          ]
          const alert: CustomAlertOption = {
            title: 'You have unfinished withdrawals. Please confirm previous withdrawal draft',
            message: 'Confirm previous?',
            buttons: alertButtons
          }
          WalletAlert(alert)
        } else {
          WalletAlertErrorApi(error)
        }
      })
      .finally(() => setIsSubmitting(false))
  }

  async function signPreviousWithdrawal (): Promise<void> {
    setIsSubmitting(true)
    LOCKwithdrawalDrafts(stakingInfo?.id ?? 2)
      .then(async (withdrawals) => {
        setIsSubmitting(true)
        const firstWithdawal = withdrawals?.[0]
        return await signWithdrawal(firstWithdawal)
      })
      .catch(WalletAlertErrorApi)
      .finally(() => setIsSubmitting(false))
  }

  async function signWithdrawal (withdrawal: WithdrawalDraftOutputDto): Promise<void> {
    const signed = await signMessage(withdrawal.signMessage)

    return await LOCKwithdrawalSign(stakingInfo?.id ?? 2, { id: withdrawal.id, signMessage: signed })
      .then((newStakingInfo) => onUnstaked(newStakingInfo)) // TODO: (thabrad) should we give user some info?
      .catch(WalletAlertErrorApi)
      .finally(() => setIsSubmitting(false))
  }

  return (
    <ScrollView
      style={tailwind('flex-1 bg-gray-200')}
    >
      <View
        style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b border-gray-300', { 'py-3.5 border-t -mb-px': Platform.OS === 'android' })} // border top on android to handle 1px of horizontal transparent line when scroll past header
      >
        <Text
          style={tailwind('text-lg font-medium')}
        >
          {headerLabel}
        </Text>
        <TouchableOpacity onPress={onCloseButtonPress}>
          <MaterialIcons name='close' size={20} style={tailwind('text-black')} />
        </TouchableOpacity>
      </View>

      <View style={tailwind('px-4')}>

        <AmountRow
          control={control}
          onAmountChange={async (amount) => {
            setValue('amount', amount, { shouldDirty: true })
            await trigger('amount')
          }}
          onClearButtonPress={async () => {
            setValue('amount', '')
            await trigger('amount')
          }}
          token={dfi}
          action={action}
          staking={stakingInfo}
        />

        <View style={tailwind('my-6')}>
          <SubmitButtonGroup
            isDisabled={!formState.isValid}
            label={translate('LOCK/LockDashboardScreen', 'CONTINUE')}
            // processingLabel={translate('components/Button', 'CONTINUE')}
            onSubmit={onSubmit}
            title='sell_continue'
            isProcessing={isSubmitting}
            displayCancelBtn={false}
            lock
          />
        </View>
      </View>
    </ScrollView>
  )
})

interface AmountForm {
  control: Control
  token: WalletToken
  onAmountChange: (amount: string) => void
  onClearButtonPress: () => void
  conversionAmount?: BigNumber
  action: StakingAction
  staking: StakingOutputDto
}

function AmountRow ({
  token,
  control,
  onAmountChange,
  onClearButtonPress,
  action,
  staking
}: AmountForm): JSX.Element {
  const reservedDFI = 0.1
  const DFIUtxo = useSelector((state: RootState) => DFIUtxoSelector(state.wallet))

  let maxAmount = token.symbol === 'DFI' ? new BigNumber(DFIUtxo.amount).minus(reservedDFI).toFixed(8) : token.amount

  maxAmount = action === 'UNSTAKE' ? (staking.balance - staking.pendingWithdrawals).toString() : BigNumber.max(maxAmount, 0).toFixed(8)

  // cap amount with maxAmount before setting the setValue('amount', amount) field
  const onAmountChangeCAPPED = (amount: string): void => {
    const base = new BigNumber(amount)
    const max = new BigNumber(maxAmount)
    base.isGreaterThan(max) && (amount = maxAmount)
    const min = new BigNumber(staking.minimalStake)
    base.isLessThan(min) && (amount = min.toString())

    return onAmountChange(base.isNaN() ? '' : amount)
  }

  const defaultValue = ''
  return (
    <>
      <Controller
        control={control}
        defaultValue={defaultValue}
        name='amount'
        render={({
          field: {
            onChange,
            value
          }
        }) => (
          <ThemedView
            dark={tailwind('bg-transparent')}
            light={tailwind('bg-transparent')}
            style={tailwind('flex-row w-full mt-8')}
          >
            <WalletTextInput
              autoCapitalize='none'
              onChange={onChange}
              onChangeText={onAmountChangeCAPPED}
              placeholder={translate('screens/SendScreen', 'Enter an amount')}
              style={tailwind('flex-grow w-2/5 text-black')}
              value={value}
              displayClearButton={value !== defaultValue}
              onClearButtonPress={onClearButtonPress}
              inputType='numeric'
              hasBottomSheet
              lock
            >
              <View
                style={tailwind('flex-row items-center')}
              >
                {/* <SetAmountButton
                  amount={new BigNumber(maxAmount)}
                  onPress={onAmountChangeCAPPED}
                  type={AmountButtonTypes.half}
                /> */}

                <SetAmountButton
                  amount={new BigNumber(maxAmount)}
                  onPress={onAmountChangeCAPPED}
                  type={AmountButtonTypes.max}
                  lock
                />
              </View>
            </WalletTextInput>

          </ThemedView>
        )}
        rules={{
          required: true,
          pattern: /^\d*\.?\d*$/,
          max: maxAmount,
          validate: {
            greaterThanZero: (value: string) => new BigNumber(value !== undefined && value !== '' ? value : 0).isGreaterThan(0)
          }
        }}
      />

      <InputHelperText
        testID='max_value'
        label={`${translate('LOCK/LockDashboardScreen', 'Available to {{action}}', { action })}: `}
        content={action === 'STAKE' ? maxAmount : staking?.balance.toString() ?? ''}
        suffix={` ${token.displaySymbol}`}
        lock
      />
    </>
  )
}
