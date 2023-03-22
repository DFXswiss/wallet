import { onTransactionBroadcast } from '@api/transaction/transaction_commands';
import { SubmitButtonGroup } from '@components/SubmitButtonGroup';
import { ThemedScrollView } from '@components/themed';
import { InfoText } from '@components/InfoText';
import { CustomAlertOption, WalletAlert, WalletAlertErrorApi } from '@components/WalletAlert';
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { isStake, StakingAction } from '@constants/LOCK/StakingAction';
import { TransactionCache } from '@constants/LOCK/TransactionCache';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { PortfolioParamList } from '@screens/AppNavigator/screens/Portfolio/PortfolioNavigator';
import { send } from '@screens/AppNavigator/screens/Portfolio/screens/SendConfirmationScreen';
import {
  LOCKwithdrawal,
  LOCKwithdrawalDrafts,
  LOCKwithdrawalSign,
  StakingOutputDto,
  StakingStatus,
  WithdrawalDraftOutputDto,
} from '@shared-api/dfx/ApiService';
import { useLogger } from '@shared-contexts/NativeLoggingProvider';
import { useNetworkContext } from '@shared-contexts/NetworkContext';
import { RootState } from '@store';
import { hasTxQueued as hasBroadcastQueued } from '@store/ocean';
import { hasTxQueued } from '@store/transaction_queue';
import { WalletToken } from '@store/wallet';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import BigNumber from 'bignumber.js';
import { memo, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertButton, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { AmountRow } from './AmountRow';
import { debounce, DebouncedFunc } from 'lodash';
import { useToast } from 'react-native-toast-notifications';
import * as Clipboard from 'expo-clipboard';

interface BottomSheetStakingProps {
  headerLabel: string;
  onCloseButtonPress: () => void;
  onStaked: (stakingTransaction: TransactionCache) => void;
  onUnstaked: (newStakingInfo: StakingOutputDto) => void;
  onConvert: () => void;
  token?: WalletToken | TokenData;
  stakingInfo: StakingOutputDto;
  action: StakingAction;
  signMessage: (message: string) => Promise<string>;
}

export const BottomSheetStaking = ({
  headerLabel,
  onCloseButtonPress,
  onStaked,
  onUnstaked,
  onConvert,
  token,
  stakingInfo,
  action,
  signMessage,
}: BottomSheetStakingProps): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    const network = useNetworkContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { control, setValue, formState, getValues, trigger } = useForm({ mode: 'onChange' });
    const dispatch = useAppDispatch();
    const hasPendingJob = useSelector((state: RootState) => hasTxQueued(state.transactionQueue));
    const hasPendingBroadcastJob = useSelector((state: RootState) => hasBroadcastQueued(state.ocean));
    const logger = useLogger();

    const navigation = useNavigation<NavigationProp<PortfolioParamList>>();

    const [isOnPage, setIsOnPage] = useState<boolean>(true);

    const isDeposit = action === 'Deposit' || action === 'Stake';
    const showsUtxoHint = isDeposit && token?.symbolKey === 'DFI';
    const showsAdditionalInformation = isDeposit && stakingInfo.status === StakingStatus.ACTIVE;

    const [showToast, setShowToast] = useState(false);
    const toast = useToast();
    const TOAST_DURATION = 2000;

    // modal scrollView setup
    const bottomSheetComponents = {
      mobile: BottomSheetScrollView,
      web: ThemedScrollView,
    };
    const ScrollView = Platform.OS === 'web' ? bottomSheetComponents.web : bottomSheetComponents.mobile;

    useEffect(() => {
      setIsOnPage(true);
      return () => {
        setIsOnPage(false);
      };
    }, []);

    const copyToClipboard = useCallback(
      debounce(() => {
        if (showToast) {
          return;
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), TOAST_DURATION);
      }, 500),
      [showToast],
    );

    useEffect(() => {
      if (showToast) {
        toast.show(translate('components/toaster', 'Copied'), {
          type: 'wallet_toast',
          placement: 'bottom',
          duration: TOAST_DURATION,
        });
      } else {
        toast.hideAll();
      }
    }, [showToast]);

    async function onSubmit(): Promise<void> {
      if (hasPendingJob || hasPendingBroadcastJob || token === undefined) {
        return;
      }

      setIsSubmitting(true);

      const amount = new BigNumber(getValues('amount'));

      if (isStake(action)) {
        stake(amount);
      } else {
        unstake(amount, token.symbolKey);
      }
    }

    async function stake(amount: BigNumber): Promise<void> {
      if (token === undefined || !('amount' in token)) {
        return;
      }

      const depositAddress = stakingInfo?.depositAddress ?? '';

      if (formState.isValid && depositAddress.length > 0) {
        setIsSubmitting(true);
        await send(
          {
            address: depositAddress,
            token: token,
            amount: amount,
            networkName: network.networkName,
          },
          dispatch,
          () => {
            onTransactionBroadcast(isOnPage, navigation.dispatch, 0);
          },
          logger,
        );
        setIsSubmitting(false);
        onStaked({
          depositAddress,
          token: token,
          amount: amount.toNumber(),
          network: network.networkName,
          stakingId: stakingInfo?.id,
        });
      }
    }

    async function unstake(amount: BigNumber, asset: string): Promise<void> {
      LOCKwithdrawal(stakingInfo.id, amount.toNumber(), asset)
        .then(async (withdrawal) => {
          setIsSubmitting(true);
          signWithdrawal(withdrawal);
        })
        .catch((error) => {
          if (error.message === 'Existing withdrawal have to be finished first') {
            const alertButtons: AlertButton[] = [
              {
                text: 'Cancel',
                onPress: () => setIsSubmitting(false),
                style: 'destructive',
              },
              {
                text: 'Confirm',
                onPress: signPreviousWithdrawal,
                style: 'default',
              },
            ];
            const alert: CustomAlertOption = {
              title: 'You have unfinished withdrawals. Please confirm previous withdrawal draft',
              message: 'Confirm previous?',
              buttons: alertButtons,
            };
            WalletAlert(alert);
          } else {
            WalletAlertErrorApi(error);
          }
        })
        .finally(() => setIsSubmitting(false));
    }

    async function signPreviousWithdrawal(): Promise<void> {
      setIsSubmitting(true);
      LOCKwithdrawalDrafts(stakingInfo?.id ?? 0)
        .then(async (withdrawals) => {
          setIsSubmitting(true);
          const firstWithdrawal = withdrawals?.[0];
          return await signWithdrawal(firstWithdrawal);
        })
        .catch(WalletAlertErrorApi)
        .finally(() => setIsSubmitting(false));
    }

    async function signWithdrawal(withdrawal: WithdrawalDraftOutputDto): Promise<void> {
      const signed = await signMessage(withdrawal.signMessage);

      return await LOCKwithdrawalSign(stakingInfo?.id ?? 0, { id: withdrawal.id, signMessage: signed })
        .then((newStakingInfo) => onUnstaked(newStakingInfo))
        .catch(WalletAlertErrorApi)
        .finally(() => setIsSubmitting(false));
    }

    return (
      <ScrollView style={tailwind('flex-1 bg-white')}>
        <View
          style={tailwind(
            'flex flex-row justify-between items-center px-4 py-2 border-b border-lockGray-200 bg-lockGray-100',
            {
              'py-3.5 border-t -mb-px': Platform.OS === 'android',
            },
          )} // border top on android to handle 1px of horizontal transparent line when scroll past header
        >
          <Text style={tailwind('text-lg font-medium')}>{headerLabel}</Text>
          <TouchableOpacity onPress={onCloseButtonPress}>
            <MaterialIcons name="close" size={20} style={tailwind('text-black')} />
          </TouchableOpacity>
        </View>

        <View style={tailwind('px-4 bg-white')}>
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
            token={token}
            action={action}
            staking={stakingInfo}
            balance={stakingInfo.balances.find((b) => b.asset === token?.symbolKey)}
            showMinDeposit
            smallTopMargin
          />

          {showsUtxoHint && <UtxoHint onPress={onConvert} />}
          {showsAdditionalInformation && (
            <AdditionalDepositInformation
              depositAddress={stakingInfo.depositAddress}
              copyToClipboard={copyToClipboard}
              hasTopMargin={!showsUtxoHint}
            />
          )}

          <View style={tailwind('my-6', { 'my-0 mb-6': showsAdditionalInformation })}>
            <SubmitButtonGroup
              isDisabled={!formState.isValid || isSubmitting}
              label={translate('LOCK/LockDashboardScreen', 'CONTINUE')}
              // processingLabel={translate('components/Button', 'CONTINUE')}
              onSubmit={onSubmit}
              title="sell_continue"
              isProcessing={isSubmitting}
              displayCancelBtn={false}
              lock
            />
          </View>
        </View>
      </ScrollView>
    );
  });

function UtxoHint({ onPress }: { onPress: () => void }): JSX.Element {
  return (
    <TouchableOpacity style={tailwind('bg-lock-600 flex flex-row items-center rounded-md my-2')} onPress={onPress}>
      <MaterialIcons style={tailwind('p-2')} color={'#21500C'} name="swap-horiz" size={15} />
      <Text style={tailwind('text-lock-100 font-medium text-xs py-2')}>
        {translate(
          'LOCK/LockDashboardScreen',
          'Please note that currently only DFI UTXO can be added to staking. You can exchange DFI tokens by pressing here.',
        )}
      </Text>
    </TouchableOpacity>
  );
}

function AdditionalDepositInformation({
  depositAddress,
  copyToClipboard,
  hasTopMargin,
}: {
  depositAddress: string;
  copyToClipboard: DebouncedFunc<() => void>;
  hasTopMargin: boolean;
}): JSX.Element {
  function handleClipboard() {
    copyToClipboard();
    Clipboard.setString(depositAddress);
  }

  return (
    <View style={tailwind({ 'mt-4': hasTopMargin })}>
      <Text style={tailwind('text-black text-base font-medium')}>
        {translate('LOCK/LockDashboardScreen', 'DFI Deposit address (optional)')}
      </Text>
      <TouchableOpacity
        style={tailwind('flex flex-row items-center bg-lock-600 rounded-md mt-1')}
        onPress={handleClipboard}
      >
        <MaterialIcons style={tailwind('p-2')} name="content-copy" size={15} color={'#21500C'} />
        <Text style={tailwind('text-lock-100 font-medium text-xs')}>{depositAddress}</Text>
      </TouchableOpacity>
      <InfoText
        text={translate(
          'LOCK/LockDashboardScreen',
          'You can also deposit DFI directly from an other Defichain address. Simply send the DFI to this staking deposit address.',
        )}
        noBorder
        lock
      />
    </View>
  );
}
