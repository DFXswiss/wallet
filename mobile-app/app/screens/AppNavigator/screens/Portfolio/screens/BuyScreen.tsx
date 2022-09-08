/* eslint-disable react-native/no-raw-text */
import { WalletTextInput } from '@components/WalletTextInput'
import { StackScreenProps } from '@react-navigation/stack'
import { tokensSelector, WalletToken } from '@store/wallet'
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
import { SymbolIcon } from '@components/SymbolIcon'
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
import { useConversion } from '@hooks/wallet/Conversion'
import { DFXPersistence } from '@api/persistence/dfx_storage'
import { buyWithPaymentInfos, getAssets, getBankAccounts, getUserDetail } from '@shared-api/dfx/ApiService'
import { useWalletContext } from '@shared-contexts/WalletContext'
import { BankAccount } from '@shared-api/dfx/models/BankAccount'
import { Fiat } from '@shared-api/dfx/models/Fiat'
import { BottomSheetFiatPicker } from '@components/SellComponents/BottomSheetFiatPicker'
import { GetBuyPaymentInfoDto } from '@shared-api/dfx/models/BuyRoute'
import { Asset } from '@shared-api/dfx/models/Asset'
import { WalletAlertErrorApi } from '@components/WalletAlert'

type Props = StackScreenProps<PortfolioParamList, 'BuyScreen'>

export function BuyScreen ({
  route,
  navigation
}: Props): JSX.Element {
  const logger = useLogger()
  const tokens = useSelector((state: RootState) => tokensSelector(state.wallet))
  const [token, setToken] = useState(route.params?.token)
  const [selectedBankAccount, setSelectedbankAccount] = useState<BankAccount>()
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const [selectedFiat, setSelectedFiat] = useState<Fiat>({} as Fiat)
  const {
    control,
    setValue,
    formState,
    getValues,
    trigger,
    watch
  } = useForm({ mode: 'onChange' })
  const walletContext = useWalletContext()
  const { address } = watch()
  const addressBook = useSelector((state: RootState) => state.userPreferences.addressBook)
  const walletAddress = useSelector((state: RootState) => state.userPreferences.addresses)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [matchedAddress, setMatchedAddress] = useState<LocalAddress>()
  const hasPendingJob = useSelector((state: RootState) => hasTxQueued(state.transactionQueue))
  const hasPendingBroadcastJob = useSelector((state: RootState) => hasBroadcastQueued(state.ocean))
  const {
    conversionAmount
  } = useConversion({
    inputToken: {
      type: token?.id === '0_unified' ? 'utxo' : 'others',
      amount: new BigNumber(getValues('amount'))
    },
    deps: [getValues('amount'), JSON.stringify(token)]
  })
  const [hasBalance, setHasBalance] = useState(false)
  const { fetchWalletAddresses } = useWalletAddress()
  const [jellyfishWalletAddress, setJellyfishWalletAddresses] = useState<string[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingKyc, setIsLoadingKyc] = useState(true)

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

  function checkUserProfile (): void {
    void (async () => {
      // (1) from STORE
      const isUserDetailStored = await DFXPersistence.getUserInfoComplete(walletContext.address)

      if (isUserDetailStored === null || !isUserDetailStored) {
        // if not, retrieve from API
        void (async () => {
          // (2) from API
          const userDetail = await getUserDetail()
          // persist result to STORE
          await DFXPersistence.setUserInfoComplete(walletContext.address, userDetail.kycDataComplete)
          // navigate based on BackendData result
          if (!userDetail.kycDataComplete) {
            navigation.popToTop()
            navigation.navigate('UserDetails')
          }

          // finished loading kycInfo
          setIsLoadingKyc(false)
        })()
      } else {
        // finished loading kycInfo on Success
        setIsLoadingKyc(false)
      }
    })()
  }

  // check kycInfo & load sell routes
  useEffect(() => {
    checkUserProfile()

    getBankAccounts()
      .then((bankAccounts) => {
        // if no sell routes check kycDataComplete --> navigate to UserDetailsScreen
        if (bankAccounts === undefined || bankAccounts.length < 1) {
          // checkUserProfile()
        }
        setBankAccounts(bankAccounts)
        if (bankAccounts.length === 1) {
          setAccount(bankAccounts[0])
        }
      })
      .catch(logger.error)
  }, [])

  useEffect(() => {
    const t = tokens.find((t) => t.id === token?.id)
    if (t !== undefined) {
      setToken({ ...t })
    }

    const totalBalance = tokens.reduce((total, token) => {
      return total.plus(new BigNumber(token.amount))
    }, new BigNumber(0))

    setHasBalance(totalBalance.isGreaterThan(0))
  }, [JSON.stringify(tokens)])

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
          tokens: getBottomSheetToken(tokens),
          tokenType: TokenType.BottomSheetToken,
          headerLabel: translate('screens/SendScreen', 'Choose token to send'),
          onCloseButtonPress: () => dismissModal(),
          onTokenPress: async (item): Promise<void> => {
            const _token = tokens.find(t => t.id === item.tokenId)
            if (_token !== undefined) {
              setToken(_token)
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
  }, [])

  const setFiatAccountListBottomSheet = useCallback((accounts: BankAccount[]) => {
    setBottomSheetScreen([
      {
        stackScreenName: 'FiatAccountList',
        component: BottomSheetFiatAccountList({
          fiatAccounts: [],
          bankAccounts: accounts,
          headerLabel: translate('screens/SellScreen', 'Select account to cash out'),
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
          // fiatAccounts: accounts,
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

  const canProcess = (): boolean => {
    return !(hasPendingJob || hasPendingBroadcastJob || token === undefined || selectedBankAccount === undefined || !selectedFiat.enable)
  }

  async function onSubmit (): Promise<void> {
    if (!canProcess()) {
      return
    }

    if (token === undefined || ((selectedBankAccount?.iban) == null)) {
      return
    }

    if (formState.isValid) {
      setIsSubmitting(true)

      // const asset: Asset = {
      //   id: 0,
      //   chainId: 0,
      //   type: AssetType.Coin,
      //   name: token.displaySymbol,
      //   buyable: true,
      //   sellable: true
      // }

      const assets = await getAssets()

      const matchedAsset = assets.find((asset) => asset.name === token.displaySymbol)
      // console.log('matchedAsset: ', matchedAsset)

      const paymentInfos: GetBuyPaymentInfoDto = {
        iban: selectedBankAccount.iban,
        asset: matchedAsset as Asset,
        amount: new BigNumber(getValues('amount')).toNumber(),
        currency: selectedFiat
      }

      // console.log('paymentInfos: ', paymentInfos)

      buyWithPaymentInfos(paymentInfos)
        .then((buyPaymentInfo) => {
          const transactionDetails = { token: token.displaySymbol, iban: paymentInfos.iban }
          navigation.navigate('BuyConfirmationScreen', { buyPaymentInfo, transactionDetails })
        })
        .catch(WalletAlertErrorApi)
        .finally(() => setIsSubmitting(false))
    }
  }

  return (
    <View style={tailwind('h-full')} ref={containerRef}>
      <ThemedScrollView contentContainerStyle={tailwind('pt-6 pb-8')} testID='sell_screen'>

        <TokenInput
          token={token}
          onPress={() => {
            setTokenListBottomSheet()
            expandModal()
          }}
          isDisabled={!hasBalance}
        />

        {token === undefined
          ? (
            <ThemedText style={tailwind('px-4')}>
              {translate('screens/SellScreen', 'Select a token you want to sell to get started')}
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
                        setFiatPickerBottomSheet(fiats)
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
                      conversionAmount={conversionAmount}
                    />
                    <DfxKycInfo calcKyc={{ amount: getValues('amount'), currency: selectedFiat }} />

                  </View>
                </>)}
            </>
          )}

        <View style={tailwind('mt-6')}>
          <SubmitButtonGroup
            isDisabled={!formState.isValid || !canProcess() /* TODO: (davidleomay) check if needed || isConversionRequired */ || selectedBankAccount === undefined || hasPendingJob || hasPendingBroadcastJob || token === undefined}
            label={isSubmitting ? translate('screens/BuyScreen', 'Submitting Data...') : translate('screens/BuyScreen', 'Buy Asset')}
            processingLabel={translate('screens/SellScreen', 'Transfer to your bank account')}
            onSubmit={onSubmit}
            title='sell_sell'
            isProcessing={hasPendingJob || hasPendingBroadcastJob || isSubmitting || isLoadingKyc}
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

function TokenInput (props: { token?: WalletToken, onPress: () => void, isDisabled: boolean }): JSX.Element {
  const hasNoBalanceForSelectedToken = props.token?.amount === undefined ? true : new BigNumber(props.token?.amount).lte(0)
  return (
    <View style={tailwind('px-4')}>
      <ThemedText
        testID='transaction_details_info_text'
        light={tailwind('text-gray-600')}
        dark={tailwind('text-dfxgray-300')}
        style={tailwind('text-xl font-semibold')}
      >
        {translate('screens/BuyScreen', 'Buy Asset')}
      </ThemedText>
      {/* TODO */}
      <ThemedTouchableOpacity
        onPress={props.onPress}
        dark={tailwind('bg-dfxblue-800 border-dfxblue-900')}
        light={tailwind({
          'bg-gray-200 border-0': props.isDisabled,
          'border-gray-300 bg-white': !props.isDisabled
        })}
        style={tailwind('border rounded w-full flex flex-row justify-between h-12 items-center px-2 mb-6')}
        testID='select_token_input'
        disabled={props.isDisabled}
      >
        {props.token === undefined || props.isDisabled || hasNoBalanceForSelectedToken
          ? (
            <ThemedText
              dark={tailwind({
                'text-dfxgray-500': !props.isDisabled,
                'text-dfxblue-900': props.isDisabled
              })}
              style={tailwind('text-sm')}
              testID='select_token_placeholder'
            >
              {translate('screens/SendScreen', 'Select token')}
            </ThemedText>
          )
          : (
            <View style={tailwind('flex flex-row')}>
              <SymbolIcon symbol={props.token.displaySymbol} styleProps={tailwind('w-6 h-6')} />
              <ThemedText
                style={tailwind('ml-2 font-medium')}
                testID='selected_token'
              >
                {props.token.displaySymbol}
              </ThemedText>
            </View>
          )}
        <ThemedIcon
          iconType='MaterialIcons'
          name='unfold-more'
          size={24}
          dark={tailwind({
            'text-dfxred-500': !props.isDisabled,
            'text-transparent': props.isDisabled
          })}
          light={tailwind({
            'text-primary-500': !props.isDisabled,
            'text-gray-500': props.isDisabled
          })}
          style={tailwind('-mr-1.5 flex-shrink-0')}
        />
      </ThemedTouchableOpacity>
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
        {translate('screens/SellScreen', 'Bank account')}
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
                {translate('screens/SellScreen', 'please select')}
              </ThemedText>
            )
            : (
              <View style={tailwind('flex flex-row')}>
                <ThemedText
                  style={tailwind('ml-2 font-medium')}
                  testID='selected_fiatAccount'
                >
                  {`${props.fiatAccount.label ?? props.fiatAccount.iban}`}
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
            <ThemedText style={tailwind('text-sm')}>
              {'\tSEPA instant available'}
            </ThemedText>
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
  conversionAmount: BigNumber
}

function AmountRow ({
  control,
  onAmountChange,
  onClearButtonPress
}: AmountForm): JSX.Element {
  // check format and round input
  const onAmountChangeCAPPED = (amount: string): void => {
    const amountBN = new BigNumber(amount)
    const roundedAmount = amountBN.decimalPlaces(2).toString()

    // !number => clear amount
    // decimal places > 2 => rounding
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

function getBottomSheetToken (tokens: WalletToken[]): BottomSheetToken[] {
  return tokens.filter(t => {
    return new BigNumber(t.amount).isGreaterThan(0) && t.id !== '0' && t.id !== '0_utxo'
  }).map(t => {
    const token: BottomSheetToken = {
      tokenId: t.id,
      available: new BigNumber(t.amount),
      token: {
        name: t.name,
        displaySymbol: t.displaySymbol,
        symbol: t.symbol,
        isLPS: t.isLPS
      }
    }
    return token
  })
}
