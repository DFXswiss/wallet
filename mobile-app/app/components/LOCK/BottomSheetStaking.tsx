import { onTransactionBroadcast } from '@api/transaction/transaction_commands';
import { SubmitButtonGroup } from '@components/SubmitButtonGroup';
import { ThemedScrollView } from '@components/themed';
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
import { memo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertButton, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { AmountRow } from './AmountRow';

interface BottomSheetStakingProps {
  headerLabel: string;
  onCloseButtonPress: () => void;
  onStaked: (stakingTransaction: TransactionCache) => void;
  onUnstaked: (newStakingInfo: StakingOutputDto) => void;
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

    async function onSubmit(): Promise<void> {
      if (hasPendingJob || hasPendingBroadcastJob || token === undefined) {
        return;
      }

      setIsSubmitting(true);

      const amount = new BigNumber(getValues('amount'));

      if (isStake(action)) {
        stake(amount);
      } else {
        unstake(amount, token.displaySymbol);
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
        onStaked({ depositAddress, token: token, amount: amount.toNumber(), network: network.networkName });
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
      <ScrollView style={tailwind('flex-1 bg-lockGray-100')}>
        <View
          style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b border-lockGray-200', {
            'py-3.5 border-t -mb-px': Platform.OS === 'android',
          })} // border top on android to handle 1px of horizontal transparent line when scroll past header
        >
          <Text style={tailwind('text-lg font-medium')}>{headerLabel}</Text>
          <TouchableOpacity onPress={onCloseButtonPress}>
            <MaterialIcons name="close" size={20} style={tailwind('text-black')} />
          </TouchableOpacity>
        </View>

        <View style={tailwind('px-4')}>
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
            balance={stakingInfo.balances.find((b) => b.asset === token?.displaySymbol)}
          />

          <View style={tailwind('my-6')}>
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
