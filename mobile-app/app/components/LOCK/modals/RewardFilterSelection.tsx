import { BottomSheetToken } from '@components/BottomSheetTokenList';
import { BottomSheetWithNavRouteParam } from '@components/BottomSheetWithNav';
import { PoolPairIcon } from '@components/icons/PoolPairIcon';
import { SymbolIcon } from '@components/SymbolIcon';
import { ThemedFlatList, ThemedIcon, ThemedText, ThemedTouchableOpacity, ThemedView } from '@components/themed';
import { useLockStakingContext } from '@contexts/LOCK/LockStakingContextProvider';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { ButtonGroup } from '@screens/AppNavigator/screens/Dex/components/ButtonGroup';
import { CollateralItem } from '@screens/AppNavigator/screens/Loans/screens/EditCollateralScreen';
import { AssetCategory } from '@shared-api/dfx/models/Asset';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { memo, useMemo, useState } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

enum Filter {
  POOL = 'LP tokens',
  CRYPTO = 'Crypto',
  TOKEN = 'dTokens',
}

interface RewardFilterSelectionProps {
  tokens: Array<CollateralItem | BottomSheetToken>;
  onCloseButtonPress: () => void;
  onSelection: (item: BottomSheetToken, address?: string) => void;
}

export const RewardFilterSelection = ({
  onSelection,
  onCloseButtonPress,
  tokens,
}: RewardFilterSelectionProps): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    const navigation = useNavigation<NavigationProp<BottomSheetWithNavRouteParam>>();
    const flatListComponents = {
      mobile: BottomSheetFlatList,
      web: ThemedFlatList,
    };
    const FlatList = Platform.OS === 'web' ? flatListComponents.web : flatListComponents.mobile;
    const { assets } = useLockStakingContext();
    const [activeFilter, setActiveFilter] = useState<Filter>(Filter.CRYPTO);

    const filteredTokens = useMemo(() => {
      const cryptos = assets?.filter((a) => a.category === AssetCategory.CRYPTO).map((a) => a.displayName);
      switch (activeFilter) {
        case Filter.POOL:
          return tokens.filter((t) => t.token.isLPS);
        case Filter.CRYPTO:
          return tokens.filter((t) => !t.token.isLPS && cryptos?.includes(t.token.displaySymbol));
        case Filter.TOKEN:
          return tokens.filter((t) => !t.token.isLPS && !cryptos?.includes(t.token.displaySymbol));
      }
    }, [activeFilter, assets]);

    return (
      <FlatList
        testID="reward_filter_selection"
        data={filteredTokens}
        renderItem={({ item }: { item: CollateralItem | BottomSheetToken }): JSX.Element => (
          <ListItem
            item={item}
            onTokenPress={(token) =>
              navigation.navigate({
                name: 'RewardDestinationSelection',
                params: { token, onCloseButtonPress, onSelection },
              })
            }
          />
        )}
        ListHeaderComponent={
          <ThemedView light={tailwind('bg-white')} dark={tailwind('bg-white')}>
            <ThemedView
              light={tailwind('bg-lockGray-100 border-lockGray-200')}
              dark={tailwind('bg-lockGray-100 border-lockGray-200')}
            >
              <ThemedView
                light={tailwind('bg-lockGray-100 border-lockGray-200')}
                dark={tailwind('bg-lockGray-100 border-lockGray-200')}
                style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b', {
                  'py-3.5 border-t -mb-px': Platform.OS === 'android',
                })} // border top on android to handle 1px of horizontal transparent line when scroll past header
              >
                <ThemedText style={tailwind('text-lg font-medium')} lock>
                  {translate('LOCK/LockDashboardScreen', `Select your payout asset`)}
                </ThemedText>
                <TouchableOpacity onPress={onCloseButtonPress}>
                  <ThemedIcon iconType="MaterialIcons" name="close" size={20} lock />
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
            <FilterGroup onChange={setActiveFilter} />
          </ThemedView>
        }
        stickyHeaderIndices={[0]}
        style={tailwind('bg-white')}
      />
    );
  });

function FilterGroup({ onChange }: { onChange: (filter: Filter) => void }): JSX.Element {
  const [activeFilter, setActiveFilter] = useState<Filter>(Filter.CRYPTO);
  const buttonGroup = [
    {
      id: Filter.CRYPTO,
      label: translate('LOCK/LockDashboardScreen', 'Crypto'),
      handleOnPress: () => update(Filter.CRYPTO),
    },
    {
      id: Filter.TOKEN,
      label: translate('LOCK/LockDashboardScreen', 'dTokens'),
      handleOnPress: () => update(Filter.TOKEN),
    },
    {
      id: Filter.POOL,
      label: translate('LOCK/LockDashboardScreen', 'LP tokens'),
      handleOnPress: () => update(Filter.POOL),
    },
  ];

  function update(filter: Filter): void {
    setActiveFilter(filter);
    onChange(filter);
  }

  return (
    <ThemedView light={tailwind('bg-white')} dark={tailwind('bg-white')} style={tailwind('p-4')}>
      <ButtonGroup
        buttons={buttonGroup}
        activeButtonGroupItem={activeFilter}
        testID="reward_filter_button_group"
        lock
        inline
      />
    </ThemedView>
  );
}

function ListItem({
  item,
  onTokenPress,
}: {
  item: BottomSheetToken | CollateralItem;
  onTokenPress: (token: BottomSheetToken) => void;
}): JSX.Element {
  const symbolA = item.token.displaySymbol.includes('-') ? item.token.displaySymbol.split('-')[0] : undefined;
  const symbolB = item.token.displaySymbol.includes('-') ? item.token.displaySymbol.split('-')[1] : undefined;

  return (
    <ThemedTouchableOpacity
      onPress={() => onTokenPress(item)}
      style={tailwind('px-4 py-3 flex flex-row items-center justify-between')}
      testID={`select_${item.token.displaySymbol}`}
      lock
    >
      <View style={tailwind('flex flex-row items-center')}>
        {symbolA && symbolB ? (
          <PoolPairIcon symbolA={symbolA} symbolB={symbolB} />
        ) : (
          <SymbolIcon symbol={item.token.displaySymbol} styleProps={tailwind('w-6 h-6')} />
        )}

        <ThemedText
          style={tailwind('ml-2')}
          light={tailwind('text-black')}
          dark={tailwind('text-black')}
          testID={`token_symbol_${item.token.displaySymbol}`}
        >
          {item.token.displaySymbol}
        </ThemedText>
      </View>
      <View style={tailwind('flex flex-row items-center')}>
        <ThemedIcon iconType="MaterialIcons" name="chevron-right" size={20} lock primary />
      </View>
    </ThemedTouchableOpacity>
  );
}
