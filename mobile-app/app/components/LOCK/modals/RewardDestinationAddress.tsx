import { BottomSheetToken } from '@components/BottomSheetTokenList';
import { BottomSheetWithNavRouteParam } from '@components/BottomSheetWithNav';
import { Button } from '@components/Button';
import { PoolPairIcon } from '@components/icons/PoolPairIcon';
import { SymbolIcon } from '@components/SymbolIcon';
import { ThemedIcon, ThemedText, ThemedView } from '@components/themed';
import { StackScreenProps } from '@react-navigation/stack';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { memo } from 'react';
import { useForm } from 'react-hook-form';
import { Platform, TouchableOpacity, View } from 'react-native';
import { AddressInput } from '../AddressInput';

export interface RewardDestinationAddressProps {
  token: BottomSheetToken;
  onCloseButtonPress: () => void;
  onSelection: (item: BottomSheetToken, address?: string) => void;
}

export const RewardDestinationAddress = memo(
  ({
    route,
    navigation,
  }: StackScreenProps<BottomSheetWithNavRouteParam, 'RewardDestinationAddressProps'>): JSX.Element => {
    {
      const { control, setValue, getValues, formState } = useForm({ mode: 'onChange' });
      const { token, onCloseButtonPress, onSelection } = route.params;
      const symbolA = token.token.displaySymbol.includes('-') ? token.token.displaySymbol.split('-')[0] : undefined;
      const symbolB = token.token.displaySymbol.includes('-') ? token.token.displaySymbol.split('-')[1] : undefined;

      function submit(): void {
        onSelection(token, getValues().address);
      }

      return (
        <ThemedView light={tailwind('bg-white')} dark={tailwind('bg-white')} style={tailwind('flex flex-col h-full')}>
          <ThemedView
            light={tailwind('bg-lockGray-100 border-lockGray-200')}
            dark={tailwind('bg-lockGray-100 border-lockGray-200')}
            style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b', {
              'py-3.5 border-t -mb-px': Platform.OS === 'android',
            })} // border top on android to handle 1px of horizontal transparent line when scroll past header
          >
            <TouchableOpacity onPress={navigation.goBack}>
              <ThemedIcon iconType="MaterialIcons" name="arrow-back-ios" size={20} lock />
            </TouchableOpacity>
            <ThemedText style={tailwind('text-lg font-medium')} lock>
              {translate('LOCK/LockDashboardScreen', `Select your payout asset`)}
            </ThemedText>
            <TouchableOpacity onPress={onCloseButtonPress}>
              <ThemedIcon iconType="MaterialIcons" name="close" size={20} lock />
            </TouchableOpacity>
          </ThemedView>
          <View style={tailwind('flex flex-row items-center h-12 px-4 py-3 border-b border-lockGray-200')}>
            {symbolA && symbolB ? (
              <PoolPairIcon symbolA={symbolA} symbolB={symbolB} />
            ) : (
              <SymbolIcon symbol={token.token.displaySymbol} styleProps={tailwind('w-6 h-6')} />
            )}

            <ThemedText
              style={tailwind('ml-2')}
              light={tailwind('text-black')}
              dark={tailwind('text-black')}
              testID={`token_symbol_${token.token.displaySymbol}`}
            >
              {token.token.displaySymbol}
            </ThemedText>
          </View>
          <ThemedView
            light={tailwind('bg-white')}
            dark={tailwind('bg-white')}
            style={tailwind('flex flex-col flex-grow p-4')}
          >
            <ThemedText
              light={tailwind('text-black')}
              dark={tailwind('text-black')}
              style={tailwind('text-base font-medium pb-2')}
            >
              {translate('LOCK/LockDashboardScreen', `Alternative DeFiChain address`)}
            </ThemedText>
            <AddressInput control={control} onAddressChanged={(address) => setValue('address', address)} />
            <ThemedView light={tailwind('bg-white')} dark={tailwind('bg-white')} style={tailwind('flex flex-row pt-2')}>
              <ThemedIcon iconType="MaterialIcons" name="info-outline" size={20} lock />
              <ThemedText
                light={tailwind('text-black')}
                dark={tailwind('text-black')}
                style={tailwind('text-sm font-normal pl-2')}
              >
                {translate('LOCK/LockDashboardScreen', `Please enter your desired DeFiChain address`)}
              </ThemedText>
            </ThemedView>
            <ThemedView
              light={tailwind('bg-white')}
              dark={tailwind('bg-white')}
              style={[tailwind('pb-10'), { marginTop: 'auto' }]}
            >
              <Button
                label={translate('LOCK/LockDashboardScreen', 'SAVE')}
                onPress={submit}
                margin="m-0"
                padding="p-1.5"
                lock
                grow
                disabled={!formState.isValid}
              />
            </ThemedView>
          </ThemedView>
        </ThemedView>
      );
    }
  },
);
