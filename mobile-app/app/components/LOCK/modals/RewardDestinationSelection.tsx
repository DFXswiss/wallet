import { BottomSheetToken } from '@components/BottomSheetTokenList';
import { PoolPairIcon } from '@components/icons/PoolPairIcon';
import { SymbolIcon } from '@components/SymbolIcon';
import { ThemedFlatList, ThemedIcon, ThemedText, ThemedTouchableOpacity, ThemedView } from '@components/themed';
import { RewardRouteDestination } from '@constants/LOCK/RewardRouteDestination';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { CollateralItem } from '@screens/AppNavigator/screens/Loans/screens/EditCollateralScreen';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { memo, useMemo, useState } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

interface RewardDestinationSelectionProps {
  headerLabel: string;
  onCloseButtonPress: () => void;
  token: CollateralItem | BottomSheetToken;
  onSelection: (item: BottomSheetToken, destination: RewardRouteDestination) => void;
}

export const RewardDestinationSelection = ({
  headerLabel,
  onCloseButtonPress,
  token,
  onSelection,
}: RewardDestinationSelectionProps): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    const flatListComponents = {
      mobile: BottomSheetFlatList,
      web: ThemedFlatList,
    };
    const FlatList = Platform.OS === 'web' ? flatListComponents.web : flatListComponents.mobile;
    const symbolA = token.token.displaySymbol.includes('-') ? token.token.displaySymbol.split('-')[0] : undefined;
    const symbolB = token.token.displaySymbol.includes('-') ? token.token.displaySymbol.split('-')[1] : undefined;

    const availableDestinations = (): RewardRouteDestination[] => {
      switch (token.token.displaySymbol) {
        case 'DFI':
          return Object.values(RewardRouteDestination);
        case 'DUSD':
          return [RewardRouteDestination.WALLET, RewardRouteDestination.ADDRESS, RewardRouteDestination.YIELD_MACHINE];
        default:
          return [RewardRouteDestination.WALLET, RewardRouteDestination.ADDRESS];
      }
    };

    return (
      <FlatList
        testID="reward_filter_selection"
        data={availableDestinations()}
        renderItem={({ item }: { item: RewardRouteDestination }): JSX.Element => (
          <ListItem item={item} onPress={(destination) => onSelection(token, destination)} />
        )}
        ListHeaderComponent={
          <ThemedView light={tailwind('bg-white')} dark={tailwind('bg-white')}>
            <ThemedView
              light={tailwind('bg-lockGray-100 border-lockGray-200')}
              dark={tailwind('bg-lockGray-100 border-lockGray-200')}
              style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b', {
                'py-3.5 border-t -mb-px': Platform.OS === 'android',
              })} // border top on android to handle 1px of horizontal transparent line when scroll past header
            >
              <ThemedText style={tailwind('text-lg font-medium')} lock>
                {headerLabel}
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
          </ThemedView>
        }
        stickyHeaderIndices={[0]}
        style={tailwind('bg-white')}
      />
    );
  });

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
          {item}
        </ThemedText>
      </View>
      <View style={tailwind('flex flex-row items-center')}>
        <ThemedIcon iconType="MaterialIcons" name="chevron-right" size={20} lock primary />
      </View>
    </ThemedTouchableOpacity>
  );
}
