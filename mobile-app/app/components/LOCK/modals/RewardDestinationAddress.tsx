import { BottomSheetToken } from '@components/BottomSheetTokenList';
import { BottomSheetWithNavRouteParam } from '@components/BottomSheetWithNav';
import { PoolPairIcon } from '@components/icons/PoolPairIcon';
import { SymbolIcon } from '@components/SymbolIcon';
import { ThemedIcon, ThemedText, ThemedTouchableOpacity, ThemedView } from '@components/themed';
import { RewardRouteDestination } from '@constants/LOCK/RewardRouteDestination';
import { StackScreenProps } from '@react-navigation/stack';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { memo } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

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
      const { token, onCloseButtonPress, onSelection } = route.params;
      const symbolA = token.token.displaySymbol.includes('-') ? token.token.displaySymbol.split('-')[0] : undefined;
      const symbolB = token.token.displaySymbol.includes('-') ? token.token.displaySymbol.split('-')[1] : undefined;

      return (
        <ThemedView light={tailwind('bg-white')} dark={tailwind('bg-white')}>
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
          <ThemedText>TODO :D</ThemedText>
        </ThemedView>
      );
    }
  },
);

function ListItem({
  item,
  onPress,
}: {
  item: RewardRouteDestination;
  onPress: (token: RewardRouteDestination) => void;
}): JSX.Element {
  return (
    <ThemedTouchableOpacity
      onPress={() => onPress(item)}
      style={tailwind('px-4 py-3 flex flex-row items-center justify-between')}
      testID={`select_${item}`}
      lock
    >
      <View style={tailwind('flex flex-row items-center')}>
        <ThemedText
          style={tailwind('ml-2 text-base font-medium')}
          light={tailwind('text-black')}
          dark={tailwind('text-black')}
          testID={`text_${item}`}
        >
          {translate('LOCK/LockDashboardScreen', item)}
        </ThemedText>
      </View>
      <View style={tailwind('flex flex-row items-center')}>
        <ThemedIcon iconType="MaterialIcons" name="chevron-right" size={20} lock primary />
      </View>
    </ThemedTouchableOpacity>
  );
}
