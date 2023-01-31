/* eslint-disable @typescript-eslint/no-unused-vars */
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { View, TouchableOpacity, Text, Linking, Platform, ScrollView, AlertButton, RefreshControl } from 'react-native'
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import LOCKunlockedIcon from '@assets/LOCK/Lock_unlocked.svg'

import { InputHelperText } from '@components/InputHelperText'
import { WalletTextInput } from '@components/WalletTextInput'
import { DFIUtxoSelector, tokenSelectorByDisplaySymbol, tokensSelector, WalletToken } from '@store/wallet'
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
import { LOCKdeposit, LOCKgetAllAnalytics, LOCKgetAllStaking, LOCKwithdrawal, LOCKwithdrawalDrafts, LOCKwithdrawalSign, StakingAnalyticsOutputDto, StakingBalance, StakingOutputDto, StakingStrategy, WithdrawalDraftOutputDto } from '@shared-api/dfx/ApiService'
import { CustomAlertOption, WalletAlert, WalletAlertErrorApi } from '@components/WalletAlert'
import { NetworkName } from '@defichain/jellyfish-network'
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider'
import { useLock } from './LockContextProvider'
import { openURL } from 'expo-linking'
import { getEnvironment } from '@environment'
import { getReleaseChannel } from '@api/releaseChannel'
import { ButtonGroup } from '../../Dex/components/ButtonGroup'
import { useWalletContext } from '@shared-contexts/WalletContext'
import { ANNOUNCEMENTCHANNELDELAY, AnnouncementChannel } from '@shared-types/website'
import { Announcements } from '../components/Announcements'
import NumberFormat from 'react-number-format'
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens'
import { BottomSheetToken, BottomSheetTokenList, TokenType } from '@components/BottomSheetTokenList'

type StakingAction = 'STAKE' | 'UNSTAKE' | 'DEPOSIT' | 'WITHDRAW'

function isStake (action: StakingAction): boolean {
  return ['STAKE', 'DEPOSIT'].includes(action)
}

export interface TransactionCache {
  amount: number
  depositAddress: string
  token: WalletToken
  network: NetworkName
  transaction?: OceanTransaction
}

enum TabKey {
  Staking = 'STAKING',
  YieldMachine = 'YIELD_MACHINE'
}

export function LockDashboardScreen (): JSX.Element {
  const transaction = useSelector((state: RootState) => firstTransactionSelector(state.ocean))
  const { openCfpVoting } = useLock()
  const { address } = useWalletContext()

  const [isLoading, setIsLoading] = useState(true)
  const [stakingInfo, setStakingInfo] = useState<StakingOutputDto>()
  const [stakingAnalytics, setStakingAnalytics] = useState<StakingAnalyticsOutputDto[]>()
  const [yieldMachineInfo, setYieldMachineInfo] = useState<StakingOutputDto>()
  const [yieldMachineAnalytics, setYieldMachineAnalytics] = useState<StakingAnalyticsOutputDto[]>()

  const email = 'support@lock.space'

  const stakingRewardDistribution = [
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

  const yieldMachineRewardDistribution = [
    {
      asset: 'DFI',
      share: 0
    }
  ]

  // tabbing
  const [activeButton, setActiveButton] = useState<string>(TabKey.Staking)
  const buttonGroup = [
    {
      id: TabKey.Staking,
      label: translate('LOCK/LockDashboardScreen', 'STAKING'),
      handleOnPress: () => setActiveButton(TabKey.Staking)
    },
    {
      id: TabKey.YieldMachine,
      label: translate('LOCK/LockDashboardScreen', 'YIELD MACHINE'),
      handleOnPress: () => setActiveButton(TabKey.YieldMachine)
    }
  ]

  const title = activeButton === TabKey.Staking ? 'DFI Staking' : 'Yield Machine'
  const info = activeButton === TabKey.Staking ? stakingInfo : yieldMachineInfo
  const setInfo = (info: StakingOutputDto): void => activeButton === TabKey.Staking ? setStakingInfo(info) : setYieldMachineInfo(info)
  const analytics = activeButton === TabKey.Staking ? stakingAnalytics : yieldMachineAnalytics
  const rewards = activeButton === TabKey.Staking ? stakingRewardDistribution : yieldMachineRewardDistribution

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
  const tokens = useSelector((state: RootState) => tokensSelector(state.wallet))
  const [transactionCache, setTransactionCache] = useState<TransactionCache>()

  const openModal = (action: StakingAction, info: StakingOutputDto, token: WalletToken | TokenData): void => {
    if (info.strategy === StakingStrategy.LIQUIDITY_MINING) {
      setTokenSelectionBottomSheet(action, info)
    } else {
      setStakingBottomSheet(action, info, token)
    }
    expandModal()
  }

  const setTokenSelectionBottomSheet = useCallback((action: StakingAction, info: StakingOutputDto) => {
    setBottomSheetScreen([{
      stackScreenName: 'TokenList',
      component: BottomSheetTokenList({
        isLOCK: true,
        simple: true,
        tokens: getBottomSheetToken(tokens.filter((token) => info.balances.map((b) => b.asset).includes(token.displaySymbol))),
        tokenType: TokenType.BottomSheetToken,
        headerLabel: translate('LOCK/LockDashboardScreen', 'Select token to deposit'), // TODO: withdraw
        onCloseButtonPress: dismissModal,
        onTokenPress: (item) => setStakingBottomSheet(action, info, item.walletToken)
      }),
      option: {
        header: () => null,
        headerBackTitleVisible: false
      }
    }])
  }, [])

  const setStakingBottomSheet = useCallback((action: StakingAction, info: StakingOutputDto, token: WalletToken | TokenData | undefined) => {
    if (token === undefined) {
      return
    }
    setBottomSheetScreen([
      {
        stackScreenName: 'BottomSheetStaking',
        component: BottomSheetStaking({
          token: token,
          headerLabel: translate('LOCK/LockDashboardScreen', 'How much {{token}} do you want to {{action}}?', { token: token.displaySymbol, action: action.toLocaleLowerCase() }),
          onCloseButtonPress: () => dismissModal(),
          onStaked: async (stakingTransaction): Promise<void> => {
            setTransactionCache(stakingTransaction)
            dismissModal()
          },
          onUnstaked: async (newStakingInfo): Promise<void> => {
            setInfo(newStakingInfo)
            // wait for pass code modal to close
            setTimeout(() => dismissModal(), 1000)
            setTimeout(() => dismissModal(), 2000)
          },
          stakingInfo: info,
          action,
          signMessage
        }),
        option: {
          header: () => null
        }
      }])
  }, [activeButton])

  useEffect(() => fetch(), [])

  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    fetch()
    setRefreshing(false)
  }, [])

  const fetch = (): void => {
    fetchStakingInfo()
    fetchAnalytics()
  }

  const fetchStakingInfo = async (): Promise<void> => {
    setIsLoading(true)

    await LOCKgetAllStaking()
      .then(([stkInfo, ymInfo]) => {
        setStakingInfo(stkInfo)
        setYieldMachineInfo(ymInfo)
      })
      .catch(WalletAlertErrorApi)
      .finally(() => setIsLoading(false))
  }

  const fetchAnalytics = async (): Promise<void> => {
    await LOCKgetAllAnalytics()
      .then((analytics) => {
        setStakingAnalytics(analytics.filter((a) => a.strategy === StakingStrategy.MASTERNODE))
        setYieldMachineAnalytics(analytics.filter((a) => a.strategy === StakingStrategy.LIQUIDITY_MINING))
      })
      .catch(WalletAlertErrorApi)
  }

  const onCsvExport = useCallback(async () => {
    const baseUrl = getEnvironment(getReleaseChannel()).lock.apiUrl
    await openURL(`${baseUrl}/analytics/history/ChainReport?userAddress=${address ?? ''}&type=csv`)
  }, [address])

  // listen for broadcasted staking-transaction and notify LOCK Api with txId (+ amount)
  // TODO: check for possible refactor to dispatch / component lifecycle-independence
  useEffect(() => {
    if (transaction?.tx?.txId != null && transactionCache != null) {
      LOCKdeposit(info?.id ?? 0, { asset: transactionCache.token.symbol, amount: transactionCache.amount, txId: transaction.tx.txId })
        .then(setInfo)
        .then(() => setTransactionCache(undefined))
        .catch(WalletAlertErrorApi)
  }
  }, [transaction, transactionCache])

  // announcements
  const [announcementDelayFinished, setAnnouncementDelayFinished] = useState(false)
  useEffect(() => {
    setTimeout(() => {
      setAnnouncementDelayFinished(true)
    }, ANNOUNCEMENTCHANNELDELAY)
  }, [])

  return (
    <View style={tailwind('h-full bg-gray-200 border-t border-dfxgray-500')}>
      <ScrollView
        contentContainerStyle={tailwind('flex-grow flex-col')}
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        }
      >
        {announcementDelayFinished && <Announcements channel={AnnouncementChannel.LOCK} />}

        <View style={tailwind('bg-lock-800')}>
          <View style={tailwind('self-center mt-4')}>
            <View style={tailwind('flex-row self-center')}>
              <LOCKunlockedIcon height={48} width={48} style={tailwind('mr-2')} />
              <Text style={tailwind('text-5xl text-white font-extrabold self-center')}>
                LOCK
              </Text>
            </View>
            <Text style={tailwind('mt-6 text-lg text-white self-center')}>
              {translate('LOCK/LockDashboardScreen', title)}
            </Text>
            {analytics != null &&
              <>
                {analytics.length === 1 &&
                  <Text style={tailwind('text-xl text-white font-bold self-center')}>
                    {translate('LOCK/LockDashboardScreen', 'APY {{apy}}%  APR {{apr}}%', { apy: analytics[0].apy, apr: analytics[0].apr })}
                  </Text>}
                {analytics.map((item, index) =>
                  <NumberFormat
                    key={index}
                    value={item.tvl}
                    thousandSeparator
                    displayType='text'
                    renderText={value =>
                      <Text style={tailwind('text-sm text-white self-center', { 'mb-5': index === analytics.length - 1 })}>
                        {translate('LOCK/LockDashboardScreen', item.strategy === StakingStrategy.MASTERNODE ? '{{amount}} {{asset}} staked' : '{{amount}} {{asset}} deposited', { amount: value, asset: item.asset })}
                      </Text>}
                  />)}
              </>}
          </View>
        </View>

        <View style={tailwind('flex-grow m-8')}>
          <ButtonGroup buttons={buttonGroup} activeButtonGroupItem={activeButton} testID='dex_button_group' lock />
          {info == null
          ? (
            <View style={tailwind('flex-grow  justify-center')}>
              <ThemedActivityIndicator size='large' lock />
            </View>
            )
          : (
            <>
              <View style={tailwind('bg-white rounded-md my-8')}>
                <StakingCard info={info} analytics={analytics} isLoading={isLoading} rewardDistribution={rewards} openModal={openModal} />
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
            </>
          )}
        </View>

        <View style={tailwind('flex-row self-center mb-5')}>
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
// ------------------------StakingCard---------------------------
// --------------------------------------------------------------

interface StakingCardProps {
  info: StakingOutputDto
  analytics?: StakingAnalyticsOutputDto[]
  rewardDistribution: Array<{ asset: string, share: number}>
  isLoading: boolean
  openModal: (action: StakingAction, info: StakingOutputDto, token: WalletToken | TokenData) => void
}

function StakingCard ({ info, analytics, rewardDistribution, isLoading, openModal }: StakingCardProps): JSX.Element {
  const token = useSelector((state: RootState) => tokenSelectorByDisplaySymbol(state.wallet, info.asset))
  const walletToken = useSelector((state: RootState) => tokensSelector(state.wallet)).find((t) => t.displaySymbol === info.asset)

  const addAction = info.strategy === StakingStrategy.MASTERNODE ? 'STAKE' : 'DEPOSIT'
  const removeAction = info.strategy === StakingStrategy.MASTERNODE ? 'UNSTAKE' : 'WITHDRAW'

  return (
    <>
      {/* card header */}
      <View style={tailwind('py-1')} />
      {info.balances.map((balance, index) =>
        <View key={index}>
          <View style={tailwind('flex-row px-4 py-0.5 justify-between')}>
            <View style={tailwind('flex-row')}>
              <Text style={tailwind('text-lg font-bold ')}>
                {translate('LOCK/LockDashboardScreen', info.strategy === StakingStrategy.MASTERNODE ? 'DFI Staking' : balance.asset)}
              </Text>
              {info.balances.length > 1 && analytics?.find((a) => a.asset === balance.asset) !== undefined &&
                <NumberFormat
                  value={analytics?.find((a) => a.asset === balance.asset)?.apy}
                  decimalScale={2}
                  displayType='text'
                  renderText={value =>
                    <Text style={tailwind('text-lock-800 text-xs font-bold px-1 py-0.5')}>
                      {translate('LOCK/LockDashboardScreen', '{{apy}}% APY', { apy: value })}
                    </Text>}
                />}
            </View>
            <NumberFormat
              value={balance.balance ?? 0}
              thousandSeparator
              decimalScale={2}
              displayType='text'
              renderText={value =>
                <Text style={tailwind('text-lg font-medium ')}>
                  {translate('LOCK/LockDashboardScreen', '{{amount}} {{asset}}', { amount: value, asset: balance.asset })}
                </Text>}
            />
          </View>
          {balance.pendingDeposits > 0 && (
            <NumberFormat
              value={balance.pendingDeposits}
              thousandSeparator
              decimalScale={2}
              displayType='text'
              renderText={value =>
                <ListItem
                  pair={{ asset: translate('LOCK/LockDashboardScreen', 'Pending Deposits '), share: `+${value} ${balance.asset}` }}
                  style='px-4 pb-2'
                  fieldStyle='text-lg font-normal'
                  isDisabled
                />}
            />
          )}
          {balance.pendingWithdrawals > 0 && (
            <NumberFormat
              value={balance.pendingWithdrawals}
              thousandSeparator
              decimalScale={2}
              displayType='text'
              renderText={value =>
                <ListItem
                  pair={{ asset: translate('LOCK/LockDashboardScreen', 'Pending Withdrawals '), share: `-${value} ${balance.asset}` }}
                  style='px-4 pb-2'
                  fieldStyle='text-lg font-normal'
                  isDisabled
                />}
            />
          )}
        </View>)}

      <View style={tailwind('border-b border-gray-200 py-1')} />

      {/* card content / staking details */}
      <View style={tailwind('px-4 py-2')}>
        <Text style={tailwind('text-xl font-bold')}>
          {translate('LOCK/LockDashboardScreen', 'Reward strategy')}
        </Text>
        <ListItem pair={{ asset: 'Reinvest', share: 100 }} fieldStyle='text-lg font-medium' />
        <ListItem pair={{ asset: 'Pay out to the wallet', share: 'tbd.' }} fieldStyle='text-lg font-normal' isDisabled />
        {rewardDistribution.map((pair, i) => {
          return (
            <ListItem key={`al-${i}`} pair={pair} isDisabled />
          )
        })}
        <ListItem pair={{ asset: 'Pay out to bank account', share: 'tbd.' }} fieldStyle='text-lg font-normal' isDisabled />
      </View>
      <View style={tailwind('flex-row bg-lock-200 rounded-b-md justify-between')}>
        <Button
          fill='fill'
          label={translate('LOCK/LockDashboardScreen', addAction)}
          margin='m-3 '
          padding='p-1'
          extraStyle='flex-grow'
          onPress={() => walletToken != null && openModal(addAction, info, walletToken)}
          lock
          disabled={isLoading || walletToken == null || new BigNumber(walletToken.amount).isLessThanOrEqualTo(0)}
          isSubmitting={isLoading}
          style={tailwind('h-8')}
        />
        <Button
          fill='fill'
          label={translate('LOCK/LockDashboardScreen', removeAction)}
          margin='my-3 mr-3'
          padding='p-1'
          extraStyle='flex-grow'
          onPress={() => token != null && openModal(removeAction, info, token)}
          lock
          disabled={isLoading || token == null || info?.balances.some((b) => b.balance > 0) || info.strategy === StakingStrategy.LIQUIDITY_MINING}
          isSubmitting={isLoading}
          style={tailwind('h-4')}
        />
      </View>
    </>
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
  token: WalletToken | TokenData
  stakingInfo: StakingOutputDto
  action: StakingAction
  signMessage: (message: string) => Promise<string>
}

export const BottomSheetStaking = ({
  headerLabel,
  onCloseButtonPress,
  onStaked,
  onUnstaked,
  token,
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
    trigger
  } = useForm({ mode: 'onChange' })
  const dispatch = useAppDispatch()
  const hasPendingJob = useSelector((state: RootState) => hasTxQueued(state.transactionQueue))
  const hasPendingBroadcastJob = useSelector((state: RootState) => hasBroadcastQueued(state.ocean))
  const logger = useLogger()

  const navigation = useNavigation<NavigationProp<PortfolioParamList>>()

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
    if (hasPendingJob || hasPendingBroadcastJob || token === undefined) {
      return
    }

    setIsSubmitting(true)

    const amount = new BigNumber(getValues('amount'))

    if (isStake(action)) {
      stake(amount)
    } else {
      unstake(amount, token.displaySymbol)
    }
  }

  async function stake (amount: BigNumber): Promise<void> {
    if (!('amount' in token)) {
      return
    }

    const depositAddress = stakingInfo?.depositAddress ?? ''

    if (formState.isValid && (depositAddress.length > 0)) {
      setIsSubmitting(true)
      await send({
        address: depositAddress,
        token: token,
        amount: amount,
        networkName: network.networkName
      }, dispatch, () => {
        onTransactionBroadcast(isOnPage, navigation.dispatch, 0)
      }, logger)
      setIsSubmitting(false)
      onStaked({ depositAddress, token: token, amount: amount.toNumber(), network: network.networkName })
    }
  }

  async function unstake (amount: BigNumber, asset: string): Promise<void> {
    LOCKwithdrawal(stakingInfo.id, amount.toNumber(), asset)
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
    LOCKwithdrawalDrafts(stakingInfo?.id ?? 0)
      .then(async (withdrawals) => {
        setIsSubmitting(true)
        const firstWithdrawal = withdrawals?.[0]
        return await signWithdrawal(firstWithdrawal)
      })
      .catch(WalletAlertErrorApi)
      .finally(() => setIsSubmitting(false))
  }

  async function signWithdrawal (withdrawal: WithdrawalDraftOutputDto): Promise<void> {
    const signed = await signMessage(withdrawal.signMessage)

    return await LOCKwithdrawalSign(stakingInfo?.id ?? 0, { id: withdrawal.id, signMessage: signed })
      .then((newStakingInfo) => onUnstaked(newStakingInfo))
      .catch(WalletAlertErrorApi)
      .finally(() => setIsSubmitting(false))
  }

  return (
    <ScrollView
      style={tailwind('flex-1 bg-gray-100')}
    >
      <View
        style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b border-gray-200', { 'py-3.5 border-t -mb-px': Platform.OS === 'android' })} // border top on android to handle 1px of horizontal transparent line when scroll past header
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
          token={token}
          action={action}
          staking={stakingInfo}
          balance={stakingInfo.balances.find((b) => b.asset === token.name)}
        />

        <View style={tailwind('my-6')}>
          <SubmitButtonGroup
            isDisabled={!formState.isValid || isSubmitting}
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
  balance?: StakingBalance
}

function AmountRow ({
  token,
  control,
  onAmountChange,
  onClearButtonPress,
  action,
  staking,
  balance
}: AmountForm): JSX.Element {
  const reservedDFI = 0.1
  const DFIUtxo = useSelector((state: RootState) => DFIUtxoSelector(state.wallet))

  let maxAmount = token.symbol === 'DFI' ? new BigNumber(DFIUtxo.amount).minus(reservedDFI).toFixed(8) : token.amount

  maxAmount = isStake(action) ? BigNumber.max(maxAmount, 0).toFixed(8) : balance !== undefined ? (balance.balance - balance?.pendingWithdrawals).toString() : '0'

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
        content={maxAmount}
        suffix={` ${token.displaySymbol}`}
        lock
      />
    </>
  )
}

function getBottomSheetToken (tokens: WalletToken[]): BottomSheetToken[] {
  return tokens.filter(t => {
    return new BigNumber(t.amount).isGreaterThan(0) && t.id !== '0'
  }).map(t => {
    const displaySymbol = t.displaySymbol.replace(' (UTXO)', '')
    const token: BottomSheetToken = {
      tokenId: t.id,
      available: new BigNumber(t.amount),
      token: {
        name: t.name,
        displaySymbol,
        symbol: t.symbol,
        isLPS: t.isLPS
      },
      walletToken: { ...t, displaySymbol }
    }
    return token
  })
}
