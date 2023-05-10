import { InputHelperText } from '@components/InputHelperText';
import { WalletTextInput } from '@components/WalletTextInput';
import { StackScreenProps } from '@react-navigation/stack';
import { DFIUtxoSelector, tokensSelector, WalletToken } from '@store/wallet';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Control, Controller, useForm } from 'react-hook-form';
import { Platform, View } from 'react-native';
import { useSelector } from 'react-redux';
import { AmountButtonTypes, SetAmountButton } from '@components/SetAmountButton';
import { ThemedIcon, ThemedScrollView, ThemedText, ThemedTouchableOpacity, ThemedView } from '@components/themed';
import { onTransactionBroadcast } from '@api/transaction/transaction_commands';
import { RootState } from '@store';
import { hasTxQueued as hasBroadcastQueued } from '@store/ocean';
import { hasTxQueued } from '@store/transaction_queue';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { PortfolioParamList } from '../PortfolioNavigator';
import { InfoRow, InfoType } from '@components/InfoRow';
import { useLogger } from '@shared-contexts/NativeLoggingProvider';
import { SymbolIcon } from '@components/SymbolIcon';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetNavScreen, BottomSheetWebWithNav, BottomSheetWithNav } from '@components/BottomSheetWithNav';
import { BottomSheetToken, BottomSheetTokenList, TokenType } from '@components/BottomSheetTokenList';
import { SubmitButtonGroup } from '@components/SubmitButtonGroup';
import { useNetworkContext } from '@shared-contexts/NetworkContext';
import { LocalAddress } from '@store/userPreferences';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { debounce } from 'lodash';
import { useWalletAddress } from '@hooks/useWalletAddress';
import { BottomSheetFiatAccountList } from '@components/SellComponents/BottomSheetFiatAccountList';
import { GetSellPaymentInfoDto } from '@shared-api/dfx/models/SellRoute';
import { DfxKycInfo } from '@components/DfxKycInfo';
import { ActionButton } from '../../Dex/components/PoolPairCards/ActionSection';
import { BottomSheetFiatAccountCreate, FiatPickerRow } from '@components/SellComponents/BottomSheetFiatAccountCreate';
import { send } from './SendConfirmationScreen';
import { useConversion } from '@hooks/wallet/Conversion';
import { DFXPersistence } from '@api/persistence/dfx_storage';
import {
  getAssets,
  getBankAccounts,
  getUserDetail,
  putBankAccount,
  sellWithPaymentInfos,
} from '@shared-api/dfx/ApiService';
import { DfxConversionInfo } from '@components/DfxConversionInfo';
import { useWalletContext } from '@shared-contexts/WalletContext';
import { DfxDexFeeInfo } from '@components/DfxDexFeeInfo';
import { WalletAccordion } from '@components/WalletAccordion';
import { BankAccount } from '@shared-api/dfx/models/BankAccount';
import { DefaultFiat, Fiat } from '@shared-api/dfx/models/Fiat';
import { WalletAlertErrorApi } from '@components/WalletAlert';
import { SepaInstantComponent } from '../components/SepaInstantComponent';
import { BottomSheetFiatPicker } from '@components/SellComponents/BottomSheetFiatPicker';
import { AnnouncementChannel, ANNOUNCEMENTCHANNELDELAY } from '@shared-types/website';
import { Announcements } from '../components/Announcements';
import { Blockchain } from '@shared-api/dfx/models/CryptoRoute';
import { Asset } from '@shared-api/dfx/models/Asset';

type Props = StackScreenProps<PortfolioParamList, 'SellScreen'>;

export function SellScreen({ route, navigation }: Props): JSX.Element {
  const network = useNetworkContext();
  const logger = useLogger();
  const tokens = useSelector((state: RootState) => tokensSelector(state.wallet));
  const [selectedToken, setSelectedToken] = useState(route.params?.token);
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount>();
  const [selectedFiat, setSelectedFiat] = useState<Fiat | undefined>(DefaultFiat);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { control, setValue, formState, getValues, trigger, watch } = useForm({ mode: 'onChange' });
  const walletContext = useWalletContext();
  const { address } = watch();
  const addressBook = useSelector((state: RootState) => state.userPreferences.addressBook);
  const walletAddress = useSelector((state: RootState) => state.userPreferences.addresses);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [matchedAddress, setMatchedAddress] = useState<LocalAddress>();
  const dispatch = useAppDispatch();
  const [fee, setFee] = useState<number>();
  const [minFee, setMinFee] = useState<number>();
  const [depositAddress, setDepositAddress] = useState<string>();
  const [dexFee, setDexFee] = useState<string>('0');
  const hasPendingJob = useSelector((state: RootState) => hasTxQueued(state.transactionQueue));
  const hasPendingBroadcastJob = useSelector((state: RootState) => hasBroadcastQueued(state.ocean));
  const { conversionAmount } = useConversion({
    inputToken: {
      type: selectedToken?.id === '0_unified' ? 'utxo' : 'others',
      amount: new BigNumber(getValues('amount')),
    },
    deps: [getValues('amount'), JSON.stringify(selectedToken)],
  });
  const [hasBalance, setHasBalance] = useState(false);
  const { fetchWalletAddresses } = useWalletAddress();
  const [jellyfishWalletAddress, setJellyfishWalletAddresses] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingKyc, setIsLoadingKyc] = useState(true);
  const [isOnPage, setIsOnPage] = useState<boolean>(true);

  // Bottom sheet
  const [isModalDisplayed, setIsModalDisplayed] = useState(false);
  const [bottomSheetScreen, setBottomSheetScreen] = useState<BottomSheetNavScreen[]>([]);
  const containerRef = useRef(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const expandModal = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsModalDisplayed(true);
    } else {
      bottomSheetRef.current?.present();
    }
  }, []);
  const dismissModal = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsModalDisplayed(false);
    } else {
      bottomSheetRef.current?.close();
    }
  }, []);

  const debounceMatchAddress = debounce(() => {
    if (address !== undefined && addressBook !== undefined && addressBook[address] !== undefined) {
      setMatchedAddress(addressBook[address]);
    } else if (address !== undefined && walletAddress !== undefined && walletAddress[address] !== undefined) {
      setMatchedAddress(walletAddress[address]);
    } else if (address !== undefined && jellyfishWalletAddress.includes(address)) {
      // wallet address that does not have a label
      setMatchedAddress({
        address,
        label: 'Saved address',
        isMine: true,
      });
    } else {
      setMatchedAddress(undefined);
    }
  }, 200);

  useEffect(() => {
    void fetchWalletAddresses().then((walletAddresses) => setJellyfishWalletAddresses(walletAddresses));
  }, [fetchWalletAddresses]);

  function checkUserProfile(): void {
    void (async () => {
      // (1) from STORE
      const isUserDetailStored = await DFXPersistence.getUserInfoComplete(walletContext.address);

      if (isUserDetailStored === null || !isUserDetailStored) {
        // if not, retrieve from API
        void (async () => {
          // (2) from API
          const userDetail = await getUserDetail();
          // persist result to STORE
          await DFXPersistence.setUserInfoComplete(walletContext.address, userDetail.kycDataComplete);
          // navigate based on BackendData result
          if (!userDetail.kycDataComplete) {
            navigation.popToTop();
            navigation.navigate('UserDetails');
          }

          // finished loading kycInfo
          setIsLoadingKyc(false);
        })();
      } else {
        // finished loading kycInfo on Success
        setIsLoadingKyc(false);
      }
    })();
  }

  // check kycInfo & load sell routes
  useEffect(() => {
    checkUserProfile();

    setIsLoadingData(true);
    Promise.all([getBankAccounts(), getAssets()])
      .then(([bankAccounts, assets]) => {
        if (bankAccounts === undefined || bankAccounts.length < 1) {
          // checkUserProfile()
        }
        setBankAccounts(bankAccounts);
        setAssets(assets);
        if (bankAccounts.length === 1) {
          setAccount(bankAccounts[0]);
        }
      })
      .catch(logger.error)
      .finally(() => setIsLoadingData(false));

    setIsOnPage(true);
    return () => {
      setIsOnPage(false);
    };
  }, []);

  useEffect(() => {
    const t = tokens.find((t) => t.id === selectedToken?.id);
    if (t !== undefined) {
      setToken({ ...t });
    }

    const totalBalance = tokens.reduce((total, token) => {
      return total.plus(new BigNumber(token.amount));
    }, new BigNumber(0));

    setHasBalance(totalBalance.isGreaterThan(0));
  }, [JSON.stringify(tokens)]);

  useEffect(() => {
    debounceMatchAddress();
  }, [address, addressBook]);

  useEffect(() => {
    !isLoadingKyc && getPaymentInfo();
  }, [isLoadingKyc, selectedBankAccount, selectedFiat, selectedToken]);

  const setToken = (token: WalletToken): void => {
    setSelectedToken(token);
  };

  const setAccount = (bankAccount: BankAccount): void => {
    setSelectedBankAccount(bankAccount);
    setSelectedFiat(bankAccount.fiat ?? undefined);
  };

  const setFiat = (fiat: Fiat): void => {
    setSelectedFiat(fiat);
    updatePreferredCurrencyIfNull(fiat, selectedBankAccount);
  };

  const getPaymentInfo = (): void => {
    const asset = assets.find((a) => a.name === selectedToken?.displaySymbol);

    if (selectedBankAccount == null || selectedFiat == null || selectedToken == null || asset == null) {
      return;
    }

    // load sell infos
    const paymentInfos: GetSellPaymentInfoDto = {
      iban: selectedBankAccount.iban,
      asset: asset,
      blockchain: Blockchain.DEFICHAIN,
      currency: selectedFiat,
    };

    setIsLoadingData(true);
    sellWithPaymentInfos(paymentInfos)
      .then((sellPaymentInfo) => {
        setFee(sellPaymentInfo.fee);
        setMinFee(sellPaymentInfo.minFee);
        setDepositAddress(sellPaymentInfo.depositAddress);
      })
      .catch(WalletAlertErrorApi)
      .finally(() => setIsLoadingData(false));
  };

  const updatePreferredCurrencyIfNull = async (fiat: Fiat, bankAccount?: BankAccount): Promise<void> => {
    if (bankAccount == null || bankAccount.fiat != null) {
      return;
    }

    return await putBankAccount(
      { iban: bankAccount.iban, label: bankAccount.label, preferredCurrency: fiat },
      bankAccount.id,
    ).then(() => {
      bankAccount.fiat = fiat;
    });
  };

  const setFiatAccountListBottomSheet = useCallback(
    (accounts: BankAccount[]) => {
      setBottomSheetScreen([
        {
          stackScreenName: 'FiatAccountList',
          component: BottomSheetFiatAccountList({
            bankAccounts: accounts,
            headerLabel: translate('screens/SellScreen', 'Select account to cash out'),
            onCloseButtonPress: () => dismissModal(),
            onFiatAccountPress: async (item): Promise<void> => {
              if (item.iban !== undefined) {
                setAccount(item);
              }
              dismissModal();
            },
          }),
          option: {
            header: () => null,
          },
        },
      ]);
    },
    [bankAccounts, assets, selectedToken, selectedFiat],
  );

  const setFiatAccountCreateBottomSheet = useCallback(
    (accounts: BankAccount[]) => {
      // TODO: remove accounts?
      setBottomSheetScreen([
        {
          stackScreenName: 'FiatAccountCreate',
          component: BottomSheetFiatAccountCreate({
            bankAccounts: accounts,
            headerLabel: translate('screens/SellScreen', 'Add account'),
            onCloseButtonPress: () => dismissModal(),
            onElementCreatePress: async (item): Promise<void> => {
              if (item.iban !== undefined && 'deposit' in item) {
                bankAccounts.push(item);
                setAccount(item);
              }
              dismissModal();
            },
          }),
          option: {
            header: () => null,
          },
        },
      ]);
    },
    [bankAccounts, assets, selectedToken, selectedFiat],
  );

  const setTokenListBottomSheet = useCallback(() => {
    setBottomSheetScreen([
      {
        stackScreenName: 'TokenList',
        component: BottomSheetTokenList({
          tokens: getBottomSheetToken(tokens, assets),
          tokenType: TokenType.BottomSheetToken,
          headerLabel: translate('screens/SendScreen', 'Choose token to send'),
          onCloseButtonPress: () => dismissModal(),
          onTokenPress: async (item): Promise<void> => {
            const _token = tokens.find((t) => t.id === item.tokenId);
            if (_token !== undefined) {
              setToken(_token);
              setValue('amount', '');
              await trigger('amount');
            }
            dismissModal();
          },
        }),
        option: {
          header: () => null,
        },
      },
    ]);
  }, [bankAccounts, assets, selectedBankAccount, selectedFiat]);

  // fiat picker modal => open / return
  const setFiatPickerBottomSheet = useCallback(
    (fiats: Fiat[]) => {
      setBottomSheetScreen([
        {
          stackScreenName: 'FiatAccountList',
          component: BottomSheetFiatPicker({
            onFiatPress: async (selectedFiat): Promise<void> => {
              if (selectedFiat !== undefined) {
                // update preferredCurrency und recheck deposit address (if bank already selected
                setFiat(selectedFiat);
              }
              dismissModal();
            },
            onCloseModal: () => dismissModal(),
            fiats: fiats,
          }),
          option: {
            header: () => null,
          },
        },
      ]);
    },
    [bankAccounts, assets, selectedBankAccount, selectedToken],
  );

  const dataInvalid =
    hasPendingJob ||
    hasPendingBroadcastJob ||
    selectedToken === undefined ||
    selectedBankAccount?.iban === undefined ||
    selectedFiat === undefined ||
    !selectedFiat.buyable ||
    depositAddress === undefined;

  async function onSubmit(): Promise<void> {
    if (dataInvalid) {
      return;
    }

    if (formState.isValid && (depositAddress?.length ?? 0) > 0) {
      setIsSubmitting(true);
      await send(
        {
          address: depositAddress,
          token: selectedToken,
          amount: new BigNumber(getValues('amount')),
          networkName: network.networkName,
        },
        dispatch,
        () => {
          onTransactionBroadcast(isOnPage, navigation.dispatch, 0, 'SellConfirmationScreen');
        },
        logger,
      );
      setIsSubmitting(false);
    }
  }

  const [announcementDelayFinished, setAnnouncementDelayFinished] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      setAnnouncementDelayFinished(true);
    }, ANNOUNCEMENTCHANNELDELAY);
  }, []);

  return (
    <View style={tailwind('h-full')} ref={containerRef}>
      <ThemedScrollView contentContainerStyle={tailwind('pt-6 pb-8')} testID="sell_screen">
        {announcementDelayFinished && <Announcements channel={AnnouncementChannel.SELL} />}

        <TokenInput
          title={translate('screens/SellScreen', 'Cash out to my bank account')}
          token={selectedToken}
          onPress={() => {
            setTokenListBottomSheet();
            expandModal();
          }}
          isDisabled={!hasBalance}
        />

        {selectedToken === undefined ? (
          <ThemedText style={tailwind('px-4')}>
            {translate('screens/SellScreen', 'Select a token you want to sell to get started')}
          </ThemedText>
        ) : (
          <>
            <ThemedView style={tailwind('px-4 mb-4')}>
              <DfxDexFeeInfo token={selectedToken} getDexFee={(df) => setDexFee(df)} />
            </ThemedView>

            {!(bankAccounts.length > 0) ? (
              <ActionButton
                name="add"
                onPress={() => {
                  setFiatAccountCreateBottomSheet(bankAccounts);
                  expandModal();
                }}
                pair={' '}
                label={translate('screens/SellScreen', 'IBAN')}
                style={tailwind('p-2 mb-2 h-10 mx-10 justify-center')}
                testID="pool_pair_add_{symbol}"
                standalone
              />
            ) : (
              <>
                <View style={tailwind('px-4')}>
                  <FiatAccountInput
                    onPress={() => {
                      setFiatAccountListBottomSheet(bankAccounts);
                      expandModal();
                    }}
                    fiatAccount={selectedBankAccount}
                  />
                  {/* {isConversionRequired &&
                      <NumberRow
                        lhs={translate('screens/SendScreen', 'UTXO to be converted')}
                        rhs={{
                          value: conversionAmount.toFixed(8),
                          testID: 'text_amount_to_convert',
                          suffixType: 'text',
                          suffix: token.displaySymbol
                        }}
                      />} */}

                  <DfxKycInfo />

                  <FiatPickerRow
                    fiat={selectedFiat}
                    openFiatBottomSheet={(fiats) => {
                      setFiatPickerBottomSheet(fiats.filter((f) => f.buyable));
                      expandModal();
                    }}
                  />

                  <AmountRow
                    control={control}
                    onAmountChange={async (amount) => {
                      setValue('amount', amount, { shouldDirty: true });
                      await trigger('amount');
                    }}
                    onClearButtonPress={async () => {
                      setValue('amount', '');
                      await trigger('amount');
                    }}
                    token={selectedToken}
                    conversionAmount={conversionAmount}
                  />

                  <DfxConversionInfo token={selectedToken} />
                </View>

                <ThemedView style={tailwind('px-4')}>
                  <WalletAccordion
                    title={translate('screens/SendScreen', 'TRANSACTION DETAILS')}
                    content={[
                      {
                        title: translate('components/BottomSheetInfo', 'Fees'),
                        childComponent: () => {
                          return (
                            <>
                              <InfoRow
                                type={InfoType.DfxFee}
                                value={fee ?? '-'}
                                testID="fiat_fee"
                                suffix={
                                  fee != null
                                    ? minFee && minFee > 0
                                      ? `%  (min. ${minFee} ${selectedToken?.displaySymbol})`
                                      : '%'
                                    : undefined
                                }
                                containerStyle={{
                                  style: tailwind('py-2 flex-row items-start w-full'),
                                  dark: tailwind(''),
                                }}
                              />
                              {dexFee !== '0' && (
                                <InfoRow
                                  type={InfoType.DexFee}
                                  value={dexFee}
                                  testID="fiat_fee"
                                  suffix="%"
                                  containerStyle={{
                                    style: tailwind('pt-2 flex-row items-start w-full'),
                                    dark: tailwind(''),
                                  }}
                                />
                              )}
                            </>
                          );
                        },
                      },
                    ]}
                  />
                </ThemedView>
              </>
            )}
          </>
        )}

        <View style={tailwind('mt-6')}>
          <SubmitButtonGroup
            isDisabled={!formState.isValid || dataInvalid}
            label={translate('screens/SellScreen', 'Transfer to your bank account')}
            processingLabel={translate('screens/SellScreen', 'Transfer to your bank account')}
            onSubmit={onSubmit}
            title="sell_sell"
            isProcessing={hasPendingJob || hasPendingBroadcastJob || isSubmitting || isLoadingKyc || isLoadingData}
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
              bottom: '0',
            }}
          />
        )}

        {Platform.OS !== 'web' && <BottomSheetWithNav modalRef={bottomSheetRef} screenList={bottomSheetScreen} />}
      </ThemedScrollView>
    </View>
  );
}

export function TokenInput(props: {
  title: string;
  token?: WalletToken;
  onPress: () => void;
  isDisabled?: boolean;
}): JSX.Element {
  const hasNoBalanceForSelectedToken =
    props.token?.amount === undefined ? true : new BigNumber(props.token?.amount).lte(0);
  return (
    <View style={tailwind('px-4')}>
      <ThemedText
        testID="transaction_details_info_text"
        light={tailwind('text-gray-600')}
        dark={tailwind('text-dfxgray-300')}
        style={tailwind('text-xl font-semibold')}
      >
        {props.title}
      </ThemedText>
      {/* TODO */}
      <ThemedTouchableOpacity
        onPress={props.onPress}
        dark={tailwind('bg-dfxblue-800 border-dfxblue-900')}
        light={tailwind({
          'bg-gray-200 border-0': props.isDisabled,
          'border-gray-300 bg-white': !(props.isDisabled ?? false),
        })}
        style={tailwind('border rounded w-full flex flex-row justify-between h-12 items-center px-2 mb-6')}
        testID="select_token_input"
        disabled={props.isDisabled}
      >
        {props.token === undefined || (props.isDisabled ?? false) || hasNoBalanceForSelectedToken ? (
          <ThemedText
            dark={tailwind({
              'text-dfxgray-500': !(props.isDisabled ?? false),
              'text-dfxblue-900': props.isDisabled,
            })}
            style={tailwind('text-sm')}
            testID="select_token_placeholder"
          >
            {translate('screens/SendScreen', 'Select token')}
          </ThemedText>
        ) : (
          <View style={tailwind('flex flex-row')}>
            <SymbolIcon symbol={props.token.displaySymbol} styleProps={tailwind('w-6 h-6')} />
            <ThemedText style={tailwind('ml-2 font-medium')} testID="selected_token">
              {props.token.displaySymbol}
            </ThemedText>
          </View>
        )}
        <ThemedIcon
          iconType="MaterialIcons"
          name="unfold-more"
          size={24}
          dark={tailwind({
            'text-dfxred-500': !(props.isDisabled ?? false),
            'text-transparent': props.isDisabled,
          })}
          light={tailwind({
            'text-primary-500': !(props.isDisabled ?? false),
            'text-gray-500': props.isDisabled,
          })}
          style={tailwind('-mr-1.5 flex-shrink-0')}
        />
      </ThemedTouchableOpacity>
    </View>
  );
}

function FiatAccountInput(props: { fiatAccount?: BankAccount; onPress: () => void }): JSX.Element {
  return (
    <>
      <ThemedText
        testID="transaction_details_info_text"
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
          testID="select_fiatAccount_input"
        >
          {props.fiatAccount === undefined ? (
            <ThemedText
              dark={tailwind('text-dfxgray-500')}
              style={tailwind('text-sm')}
              testID="select_fiatAccount_placeholder"
            >
              {translate('screens/SellScreen', 'Please select')}
            </ThemedText>
          ) : (
            <View style={tailwind('flex flex-row')}>
              <ThemedText style={tailwind('ml-2 font-medium')} testID="selected_fiatAccount">
                {`${props.fiatAccount?.label ?? props.fiatAccount?.fiat?.name ?? '-'} / ${props.fiatAccount.iban}`}
              </ThemedText>
            </View>
          )}
          <ThemedIcon
            iconType="MaterialIcons"
            name="unfold-more"
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
  );
}

interface AmountForm {
  control: Control;
  token: WalletToken;
  onAmountChange: (amount: string) => void;
  onClearButtonPress: () => void;
  conversionAmount: BigNumber;
}

function AmountRow({ token, control, onAmountChange, onClearButtonPress, conversionAmount }: AmountForm): JSX.Element {
  const reservedDFI = 0.1;
  // TODO (thabrad) use only max UTXO amount
  const DFIUtxo = useSelector((state: RootState) => DFIUtxoSelector(state.wallet));

  // TODO (thabrad) maybe add in-place conversion element for token type conversion
  let maxAmount =
    token.symbol === 'DFI'
      ? new BigNumber(DFIUtxo.amount)
          .minus(reservedDFI) /* .minus(conversionAmount) */
          .toFixed(8)
      : token.amount;
  maxAmount = BigNumber.max(maxAmount, 0).toFixed(8);

  // cap amount with maxAmount before setting the setValue('amount', amount) field
  const onAmountChangeCAPPED = (amount: string): void => {
    const base = new BigNumber(amount);
    const max = new BigNumber(maxAmount);
    const capped = base.isGreaterThan(max);

    return onAmountChange(base.isNaN() ? '' : capped ? maxAmount : amount);
  };

  const defaultValue = '';
  return (
    <>
      <Controller
        control={control}
        defaultValue={defaultValue}
        name="amount"
        render={({ field: { onChange, value } }) => (
          <ThemedView
            dark={tailwind('bg-transparent')}
            light={tailwind('bg-transparent')}
            style={tailwind('flex-row w-full mt-8')}
          >
            <WalletTextInput
              autoCapitalize="none"
              onChange={onChange}
              onChangeText={onAmountChangeCAPPED}
              placeholder={translate('screens/SendScreen', 'Enter an amount')}
              style={tailwind('flex-grow w-2/5')}
              testID="amount_input"
              value={value}
              displayClearButton={value !== defaultValue}
              onClearButtonPress={onClearButtonPress}
              title={translate('screens/SellScreen', 'Enter your desired payout amount')}
              titleTestID="title_sell"
              inputType="numeric"
            >
              <ThemedView
                dark={tailwind('bg-dfxblue-800')}
                light={tailwind('bg-white')}
                style={tailwind('flex-row items-center')}
              >
                <SetAmountButton
                  amount={new BigNumber(maxAmount)}
                  onPress={onAmountChangeCAPPED}
                  type={AmountButtonTypes.half}
                />

                <SetAmountButton
                  amount={new BigNumber(maxAmount)}
                  onPress={onAmountChangeCAPPED}
                  type={AmountButtonTypes.max}
                />
              </ThemedView>
            </WalletTextInput>
          </ThemedView>
        )}
        rules={{
          required: true,
          pattern: /^\d*\.?\d*$/,
          max: maxAmount,
          validate: {
            greaterThanZero: (value: string) =>
              new BigNumber(value !== undefined && value !== '' ? value : 0).isGreaterThan(0),
          },
        }}
      />

      <InputHelperText
        testID="max_value"
        label={`${translate('screens/SellScreen', 'Available to sell')}: `}
        content={maxAmount}
        suffix={` ${token.displaySymbol}`}
      />
    </>
  );
}

function getBottomSheetToken(tokens: WalletToken[], assets: Asset[]): BottomSheetToken[] {
  return tokens
    .filter((t) => {
      return (
        new BigNumber(t.amount).isGreaterThan(0) &&
        t.id !== '0' &&
        t.id !== '0_utxo' &&
        assets.find((a) => a.name === t.displaySymbol && a.sellable && a.blockchain === 'DeFiChain')
      );
    })
    .map((t) => {
      const token: BottomSheetToken = {
        tokenId: t.id,
        available: new BigNumber(t.amount),
        token: {
          name: t.name,
          displaySymbol: t.displaySymbol,
          symbol: t.symbol,
          isLPS: t.isLPS,
        },
      };
      return token;
    });
}
