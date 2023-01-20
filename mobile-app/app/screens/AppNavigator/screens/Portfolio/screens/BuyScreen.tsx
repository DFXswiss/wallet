/* eslint-disable react-native/no-raw-text */
import { WalletTextInput } from '@components/WalletTextInput'
import { StackScreenProps } from '@react-navigation/stack'
import { WalletToken } from '@store/wallet'
import BigNumber from 'bignumber.js'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Control, Controller, useForm } from 'react-hook-form'
import { Platform, View } from 'react-native'
import { useSelector } from 'react-redux'
import {
  ThemedIcon,
  ThemedScrollView,
  ThemedText,
  ThemedTouchableOpacity,
  ThemedView
} from '@components/themed'
import { RootState } from '@store'
import { hasTxQueued as hasBroadcastQueued } from '@store/ocean'
import { hasTxQueued } from '@store/transaction_queue'
import { tailwind } from '@tailwind'
import { translate } from '@translations'
import { PortfolioParamList } from '../PortfolioNavigator'
import { useLogger } from '@shared-contexts/NativeLoggingProvider'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { BottomSheetNavScreen, BottomSheetWebWithNav, BottomSheetWithNav } from '@components/BottomSheetWithNav'
import { BottomSheetToken, BottomSheetTokenList, TokenType } from '@components/BottomSheetTokenList'
import { SubmitButtonGroup } from '@components/SubmitButtonGroup'
import { LocalAddress } from '@store/userPreferences'
import { debounce } from 'lodash'
import { useWalletAddress } from '@hooks/useWalletAddress'
import { BottomSheetFiatAccountList } from '@components/SellComponents/BottomSheetFiatAccountList'
import { DfxKycInfo } from '@components/DfxKycInfo'
import { ActionButton } from '../../Dex/components/PoolPairCards/ActionSection'
import { BottomSheetFiatAccountCreate, FiatPickerRow } from '@components/SellComponents/BottomSheetFiatAccountCreate'
import { buyWithPaymentInfos, getAssets, getBankAccounts } from '@shared-api/dfx/ApiService'
import { BankAccount } from '@shared-api/dfx/models/BankAccount'
import { DefaultFiat, Fiat } from '@shared-api/dfx/models/Fiat'
import { BottomSheetFiatPicker } from '@components/SellComponents/BottomSheetFiatPicker'
import { GetBuyPaymentInfoDto } from '@shared-api/dfx/models/BuyRoute'
import { Asset } from '@shared-api/dfx/models/Asset'
import { WalletAlertErrorApi } from '@components/WalletAlert'
import { SepaInstantComponent } from '../components/SepaInstantComponent'
import { TokenInput } from './SellScreen'
import { Announcements } from '../components/Announcements'
import { AnnouncementChannel, ANNOUNCEMENTCHANNELDELAY } from '@shared-types/website'

type Props = StackScreenProps<PortfolioParamList, 'BuyScreen'>

export function BuyScreen ({
  route,
  navigation
}: Props): JSX.Element {
  const logger = useLogger()
  const [assets, setAssets] = useState<Asset[]>([])
  const [token, setToken] = useState(route.params?.token)
  const [selectedBankAccount, setSelectedbankAccount] = useState<BankAccount>()
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedFiat, setSelectedFiat] = useState<Fiat>(DefaultFiat)
  const {
    control,
    setValue,
    formState,
    getValues,
    trigger,
    watch
  } = useForm({ mode: 'onChange' })
  const { address } = watch()
  const addressBook = useSelector((state: RootState) => state.userPreferences.addressBook)
  const walletAddress = useSelector((state: RootState) => state.userPreferences.addresses)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [matchedAddress, setMatchedAddress] = useState<LocalAddress>()
  const hasPendingJob = useSelector((state: RootState) => hasTxQueued(state.transactionQueue))
  const hasPendingBroadcastJob = useSelector((state: RootState) => hasBroadcastQueued(state.ocean))

  const { fetchWalletAddresses } = useWalletAddress()
  const [jellyfishWalletAddress, setJellyfishWalletAddresses] = useState<string[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

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

  const debounceMatchAddress = debounce(() => {
    if (address !== undefined && addressBook !== undefined && addressBook[address] !== undefined) {
      setMatchedAddress(addressBook[address])
    } else if (address !== undefined && walletAddress !== undefined && walletAddress[address] !== undefined) {
      setMatchedAddress(walletAddress[address])
    } else if (address !== undefined && jellyfishWalletAddress.includes(address)) {
      // wallet address that does not have a label
      setMatchedAddress({
        address,
        label: 'Saved address',
        isMine: true
      })
    } else {
      setMatchedAddress(undefined)
    }
  }, 200)

  useEffect(() => {
    void fetchWalletAddresses().then((walletAddresses) => setJellyfishWalletAddresses(walletAddresses))
  }, [fetchWalletAddresses])

  useEffect(() => {
    setIsLoadingData(true)

    const prom1 = getAssets()
      .then((assets) => {
        assets = assets.filter(asset => asset.buyable)
        setAssets(assets)
      })
      .catch(logger.error)

    const prom2 = getBankAccounts()
      .then((bankAccounts) => {
        if (bankAccounts === undefined || bankAccounts.length < 1) {
          // checkUserProfile()
        }
        setBankAccounts(bankAccounts)
        if (bankAccounts.length === 1) {
          setAccount(bankAccounts[0])
        }
      })
      .catch(logger.error)

    Promise.all([prom1, prom2]).finally(() => setIsLoadingData(false))
  }, [])

  useEffect(() => {
    debounceMatchAddress()
  }, [address, addressBook])

  const setAccount = (item: BankAccount): void => {
    setSelectedbankAccount(item)
    if (item.fiat != null) {
      setSelectedFiat(item.fiat)
    }
  }

  const setTokenListBottomSheet = useCallback(() => {
    setBottomSheetScreen([
      {
        stackScreenName: 'TokenList',
        component: BottomSheetTokenList({
          simple: true,
          tokens: getBottomSheetToken(assets),
          tokenType: TokenType.BottomSheetToken,
          headerLabel: translate('screens/BuyScreen', 'Choose token to buy'),
          onCloseButtonPress: () => dismissModal(),
          onTokenPress: async (item): Promise<void> => {
            const _token = assets.find(t => t.id.toString() === item.tokenId)
            if (_token !== undefined) {
              const walletToken: WalletToken = {
                avatarSymbol: _token.name,
                id: _token.id.toString(),
                amount: '1',
                symbol: _token.name,
                displaySymbol: _token.name,
                symbolKey: '',
                name: _token.name,
                isDAT: _token.type === 'DAT',
                isLPS: false,
                isLoanToken: false
              }

              setToken(walletToken)
              setValue('amount', '')
              await trigger('amount')
            }
            dismissModal()
          }
        }),
        option: {
          header: () => null
        }
      }])
  }, [assets])

  const setFiatAccountListBottomSheet = useCallback((accounts: BankAccount[]) => {
    setBottomSheetScreen([
      {
        stackScreenName: 'FiatAccountList',
        component: BottomSheetFiatAccountList({
          bankAccounts: accounts,
          headerLabel: translate('screens/BuyScreen', 'Select your account for purchase'),
          onCloseButtonPress: () => dismissModal(),
          onFiatAccountPress: async (item): Promise<void> => {
            if (item.iban !== undefined && 'sepaInstant' in item) {
              setAccount(item)
            }
            dismissModal()
          }
        }),
        option: {
          header: () => null
        }
      }])
  }, [bankAccounts])

  const setFiatAccountCreateBottomSheet = useCallback((accounts: BankAccount[]) => { // TODO: remove accounts?
    setBottomSheetScreen([
      {
        stackScreenName: 'FiatAccountCreate',
        component: BottomSheetFiatAccountCreate({
          bankAccounts: accounts,
          headerLabel: translate('screens/SellScreen', 'Add account'),
          onCloseButtonPress: () => dismissModal(),
          onElementCreatePress: async (item, newAccountsList): Promise<void> => {
            if (item.iban !== undefined && 'sepaInstant' in item) {
              // add elem or update/replace AccountsList
              if (newAccountsList != null) {
                setBankAccounts(newAccountsList)
              } else {
                bankAccounts.push(item)
              }
              // set account (+ fiat)
              setAccount(item)
            }
            dismissModal()
          }
        }),
        option: {
          header: () => null
        }
      }])
  }, [bankAccounts])

  // fiat picker modal => open / return
  const setFiatPickerBottomSheet = useCallback((fiats: Fiat[]) => {
    setBottomSheetScreen([
      {
        stackScreenName: 'FiatAccountList',
        component: BottomSheetFiatPicker({
          onFiatPress: async (selectedFiat): Promise<void> => {
            if (selectedFiat !== undefined) {
              setSelectedFiat(selectedFiat)
              // TODO: (thabrad) maybe automatically update preferredCurrency for Account
            }
            dismissModal()
          },
          onCloseModal: () => dismissModal(),
          fiats: fiats
        }),
        option: {
          header: () => null
        }
      }])
  }, [])

  const dataInvalid = hasPendingJob || hasPendingBroadcastJob || token === undefined || selectedBankAccount?.iban === undefined || selectedFiat === undefined || !selectedFiat.sellable

  async function onSubmit (): Promise<void> {
    if (dataInvalid) {
      return
    }

    if (formState.isValid) {
      setIsSubmitting(true)

      const matchedAsset = assets.find((asset) => asset.name === token.displaySymbol)

      const paymentInfos: GetBuyPaymentInfoDto = {
        iban: selectedBankAccount.iban,
        asset: matchedAsset as Asset,
        amount: new BigNumber(getValues('amount')).toNumber(),
        currency: selectedFiat
      }

      buyWithPaymentInfos(paymentInfos)
        .then((buyPaymentInfo) => {
          const transactionDetails = { token: token.displaySymbol, iban: paymentInfos.iban }
          navigation.navigate('BuyConfirmationScreen', { buyPaymentInfo, transactionDetails })
        })
        .catch(WalletAlertErrorApi)
        .finally(() => setIsSubmitting(false))
    }
  }

  const [announcementDelayFinished, setAnnouncementDelayFinished] = useState(false)
  useEffect(() => {
    setTimeout(() => {
      setAnnouncementDelayFinished(true)
    }, ANNOUNCEMENTCHANNELDELAY)
  }, [])

  return (
    <View style={tailwind('h-full')} ref={containerRef}>
      <ThemedScrollView contentContainerStyle={tailwind('pt-6 pb-8')} testID='sell_screen'>

        {announcementDelayFinished && <Announcements channel={AnnouncementChannel.BUY} />}

        <TokenInput
          title={translate('screens/BuyScreen', 'Buy Asset')}
          token={token}
          onPress={() => {
            setTokenListBottomSheet()
            expandModal()
          }}
          isDisabled={isLoadingData}
        />

        {token === undefined
          ? (
            <ThemedText style={tailwind('px-4')}>
              {translate('screens/BuyScreen', 'Select a token you want to buy to get started')}
            </ThemedText>
          )
          : (
            <>
              {!(bankAccounts.length > 0)
              ? <ActionButton
                  name='add'
                  onPress={() => {
                    setFiatAccountCreateBottomSheet(bankAccounts)
                    expandModal()
                  }}
                  pair={' '}
                  label={translate('screens/SellScreen', 'IBAN')}
                  style={tailwind('p-2 mb-2 h-10 mx-10 justify-center')}
                  testID='pool_pair_add_{symbol}'
                  standalone
                />
              : (
                <>
                  <View style={tailwind('px-4')}>
                    <FiatAccountInput
                      onPress={() => {
                        setFiatAccountListBottomSheet(bankAccounts)
                        expandModal()
                      }}
                      fiatAccount={selectedBankAccount}
                    />

                    <FiatPickerRow
                      fiat={selectedFiat}
                      openFiatBottomSheet={(fiats) => {
                        setFiatPickerBottomSheet(fiats.filter((f) => f.sellable))
                        expandModal()
                      }}
                    />

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
                    />
                    <DfxKycInfo calcKyc={{ amount: getValues('amount'), currency: selectedFiat }} />

                  </View>
                </>)}
            </>
          )}

        <View style={tailwind('mt-6')}>
          <SubmitButtonGroup
            isDisabled={!formState.isValid || dataInvalid}
            label={translate('screens/BuyScreen', 'Buy Asset')}
            processingLabel={translate('screens/BuyScreen', 'Buy Asset')}
            onSubmit={onSubmit}
            title='sell_sell'
            isProcessing={hasPendingJob || hasPendingBroadcastJob || isSubmitting || isLoadingData}
            displayCancelBtn={false}
          />
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
      </ThemedScrollView>
    </View>
  )
}

function FiatAccountInput (props: { fiatAccount?: BankAccount, onPress: () => void}): JSX.Element {
  return (
    <>
      <ThemedText
        testID='transaction_details_info_text'
        light={tailwind('text-gray-600')}
        dark={tailwind('text-dfxgray-300')}
        style={tailwind('flex-grow my-2')}
      >
        {translate('screens/BuyScreen', 'Payment account')}
      </ThemedText>

      <ThemedView dark={tailwind('mb-4')}>
        <ThemedTouchableOpacity
          onPress={props.onPress}
          dark={tailwind('bg-dfxblue-800 border-dfxblue-900')}
          light={tailwind('border-gray-300 bg-white')}
          style={tailwind('border rounded w-full flex flex-row justify-between h-12 items-center px-2')}
          testID='select_fiatAccount_input'
        >
          {props.fiatAccount === undefined
            ? (
              <ThemedText
                dark={tailwind('text-dfxgray-500')}
                style={tailwind('text-sm')}
                testID='select_fiatAccount_placeholder'
              >
                {translate('screens/SellScreen', 'Please select')}
              </ThemedText>
            )
            : (
              <View style={tailwind('flex flex-row')}>
                <ThemedText
                  style={tailwind('ml-2 font-medium')}
                  testID='selected_fiatAccount'
                >
                  {`${props.fiatAccount?.label ?? props.fiatAccount?.fiat?.name ?? '-'} / ${props.fiatAccount.iban}`}
                </ThemedText>
              </View>
            )}
          <ThemedIcon
            iconType='MaterialIcons'
            name='unfold-more'
            size={24}
            dark={tailwind('text-dfxred-500')}
            light={tailwind('text-primary-500')}
            style={tailwind('-mr-1.5 flex-shrink-0')}
          />
        </ThemedTouchableOpacity>
        {props.fiatAccount?.sepaInstant === true && (
          <ThemedView dark={tailwind('bg-dfxred-500 rounded-b')}>
            <SepaInstantComponent red invertedColor />
          </ThemedView>
        )}
      </ThemedView>
    </>
  )
}

interface AmountForm {
  control: Control
  token: WalletToken
  onAmountChange: (amount: string) => void
  onClearButtonPress: () => void
}

function AmountRow ({
  control,
  onAmountChange,
  onClearButtonPress
}: AmountForm): JSX.Element {
  // check format and round input
  const onAmountChangeCAPPED = (amount: string): void => {
    amount = (new BigNumber(amount).isLessThan(1)) ? new BigNumber(1).toString() : amount
    const amountBN = new BigNumber(amount)
    const roundedAmount = amountBN.decimalPlaces(2).toString()

    // !number => clear amount
    // decimal places > 2 => rounding
    // minValue 1
    return onAmountChange(roundedAmount.toString() === 'NaN' ? '' : amountBN.decimalPlaces() > 2 ? roundedAmount : amount)
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
            style={tailwind('flex-row w-full my-4')}
          >
            <WalletTextInput
              autoCapitalize='none'
              onChange={onChange}
              onChangeText={onAmountChangeCAPPED}
              placeholder={translate('screens/SendScreen', 'Enter an amount')}
              style={tailwind('flex-grow w-2/5 h-8')}
              testID='amount_input'
              value={value}
              displayClearButton={value !== defaultValue}
              onClearButtonPress={onClearButtonPress}
              title={translate('screens/BuyScreen', 'Purchase Amount')}
              titleTestID='title_sell'
              inputType='numeric'
            />

          </ThemedView>
        )}
        rules={{
          required: true,
          pattern: /^\d*\.?\d*$/,
          // max: maxAmount,
          validate: {
            greaterThanZero: (value: string) => new BigNumber(value !== undefined && value !== '' ? value : 0).isGreaterThan(0)
          }
        }}
      />
    </>
  )
}

function getBottomSheetToken (assets: Asset[]): BottomSheetToken[] {
  const bottomSheetTokens: BottomSheetToken[] = assets.map(asset => {
    return {
      tokenId: asset.id.toString(),
      available: new BigNumber(1),
      token: {
        name: asset.name,
        displaySymbol: asset.name,
        symbol: asset.name,
        isLPS: undefined
      }
    }
  })
  return bottomSheetTokens
}
