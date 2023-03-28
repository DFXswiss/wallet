import { InputHelperText } from '@components/InputHelperText';
import { AmountButtonTypes, SetAmountButton } from '@components/SetAmountButton';
import { ThemedView } from '@components/themed';
import { WalletTextInput } from '@components/WalletTextInput';
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { isStake, StakingAction } from '@constants/LOCK/StakingAction';
import { StakingBalance, StakingOutputDto, StakingStrategy } from '@shared-api/dfx/ApiService';
import { RootState } from '@store';
import { DFIUtxoSelector, WalletToken } from '@store/wallet';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import BigNumber from 'bignumber.js';
import { Control, Controller } from 'react-hook-form';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

interface AmountForm {
  control: Control;
  token?: WalletToken | TokenData;
  onAmountChange: (amount: string) => void;
  onClearButtonPress: () => void;
  conversionAmount?: BigNumber;
  action: StakingAction;
  staking: StakingOutputDto;
  balance?: StakingBalance;
  showMinDeposit?: boolean;
  smallTopMargin?: boolean;
}

export function AmountRow({
  token,
  control,
  onAmountChange,
  onClearButtonPress,
  action,
  staking,
  balance,
  showMinDeposit,
  smallTopMargin,
}: AmountForm): JSX.Element {
  const reservedDFI = 0.1;
  const DFIUtxo = useSelector((state: RootState) => DFIUtxoSelector(state.wallet));
  const minDeposit = staking.minimalDeposits.find((d) => d.asset === token?.symbol)?.amount ?? 1;

  let maxAmount =
    token?.symbol === 'DFI'
      ? new BigNumber(DFIUtxo.amount).minus(reservedDFI).toFixed(8)
      : (token as WalletToken)?.amount;

  maxAmount = isStake(action)
    ? BigNumber.max(maxAmount, 0).toFixed(8)
    : balance !== undefined
    ? (balance.balance - balance.pendingWithdrawals).toString()
    : '0';

  if (maxAmount === 'NaN' || maxAmount === undefined) {
    maxAmount = '0';
  }
  const onAmountChangeCAPPED = (amount: string): void => {
    const base = new BigNumber(amount);
    return onAmountChange(base.isNaN() ? '' : amount);
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
            style={tailwind('flex-row w-full mt-8', {
              'mt-2': smallTopMargin,
            })}
          >
            <WalletTextInput
              autoCapitalize="none"
              onChange={onChange}
              onChangeText={onAmountChangeCAPPED}
              placeholder={translate('screens/SendScreen', 'Enter an amount')}
              style={tailwind('flex-grow w-2/5 text-black')}
              value={value}
              displayClearButton={value !== defaultValue}
              onClearButtonPress={onClearButtonPress}
              inputType="numeric"
              hasBottomSheet
              lock
            >
              <View style={tailwind('flex-row items-center')}>
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
          min: minDeposit,
          validate: {
            greaterThanZero: (value: string) =>
              new BigNumber(value !== undefined && value !== '' ? value : 0).isGreaterThan(0),
          },
        }}
      />

      <InputHelperText
        testID="max_value"
        label={`${translate('LOCK/LockDashboardScreen', 'Available to {{action}}', { action })}: `}
        content={maxAmount}
        suffix={` ${token?.displaySymbol}`}
        withoutBottomMargins={showMinDeposit}
        lock
      />
      {showMinDeposit && (
        <InputHelperText
          testID="min_value"
          label={translate('LOCK/LockDashboardScreen', 'Min. {{action}}: ', { action })}
          content={'' + minDeposit}
          suffix={` ${token?.displaySymbol}`}
          withoutTopMargins
          withoutBottomMargins
          lock
        />
      )}
    </>
  );
}
