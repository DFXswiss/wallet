import { memo } from 'react';
import * as React from 'react';
import { tailwind } from '@tailwind';
import { Platform, TouchableOpacity, View } from 'react-native';
import NumberFormat from 'react-number-format';
import BigNumber from 'bignumber.js';
import { SymbolIcon } from './SymbolIcon';
import { ThemedFlatList, ThemedIcon, ThemedText, ThemedTouchableOpacity, ThemedView } from './themed';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { BottomSheetWithNavRouteParam } from './BottomSheetWithNav';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useThemeContext } from '@shared-contexts/ThemeProvider';
import { AddOrRemoveCollateralResponse } from '@screens/AppNavigator/screens/Loans/components/AddOrRemoveCollateralForm';
import { CollateralItem } from '@screens/AppNavigator/screens/Loans/screens/EditCollateralScreen';
import { LoanVaultActive } from '@defichain/whale-api-client/dist/api/loan';
import { ActiveUSDValue } from '@screens/AppNavigator/screens/Loans/VaultDetail/components/ActiveUSDValue';
import { useTokenPrice } from '@screens/AppNavigator/screens/Portfolio/hooks/TokenPrice';
import { getActivePrice } from '@screens/AppNavigator/screens/Auctions/helpers/ActivePrice';
import { WalletToken } from '@store/wallet';
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { PoolPairIcon } from './icons/PoolPairIcon';

interface BottomSheetTokenListProps {
  headerLabel: string;
  onCloseButtonPress: () => void;
  onTokenPress?: (token: BottomSheetToken) => void;
  navigateToScreen?: {
    screenName: string;
    onButtonPress: (item: AddOrRemoveCollateralResponse) => void;
  };
  tokens: Array<CollateralItem | BottomSheetToken>;
  vault?: LoanVaultActive;
  tokenType: TokenType;
  isOraclePrice?: boolean;
  simple?: boolean;
  lock?: boolean;
}

export interface BottomSheetToken {
  tokenId: string;
  available: BigNumber;
  token: {
    name: string;
    displaySymbol: string;
    symbol: string;
    isLPS?: boolean;
  };
  factor?: string;
  reserve?: string;
  walletToken?: WalletToken;
  tokenData?: TokenData;
}

export enum TokenType {
  BottomSheetToken = 'BottomSheetToken',
  CollateralItem = 'CollateralItem',
}

export const BottomSheetTokenList = ({
  headerLabel,
  onCloseButtonPress,
  onTokenPress,
  navigateToScreen,
  tokens,
  vault,
  tokenType,
  isOraclePrice,
  simple = false,
  lock = false,
}: BottomSheetTokenListProps): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    const { isLight } = useThemeContext();
    const flatListComponents = {
      mobile: BottomSheetFlatList,
      web: ThemedFlatList,
    };
    const FlatList = Platform.OS === 'web' ? flatListComponents.web : flatListComponents.mobile;

    return (
      <FlatList
        testID="bottom_sheet_token_list"
        data={tokens}
        renderItem={({ item }: { item: CollateralItem | BottomSheetToken }): JSX.Element => (
          <ListItem
            item={item}
            lock={lock}
            simple={simple}
            onTokenPress={onTokenPress}
            vault={vault}
            navigateToScreen={navigateToScreen}
            tokenType={tokenType}
            isOraclePrice={isOraclePrice}
          />
        )}
        ListHeaderComponent={
          <ThemedView
            light={tailwind(lock ? 'bg-lockGray-100 border-lockGray-200' : 'bg-white border-gray-200')}
            dark={tailwind(lock ? 'bg-lockGray-100 border-lockGray-200' : 'bg-dfxblue-800 border-dfxblue-900')}
            style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b', {
              'py-3.5 border-t -mb-px': Platform.OS === 'android',
            })} // border top on android to handle 1px of horizontal transparent line when scroll past header
          >
            <ThemedText style={tailwind('text-lg font-medium')} lock={lock}>
              {headerLabel}
            </ThemedText>
            <TouchableOpacity onPress={onCloseButtonPress}>
              <ThemedIcon iconType="MaterialIcons" name="close" size={20} lock={lock} />
            </TouchableOpacity>
          </ThemedView>
        }
        stickyHeaderIndices={[0]}
        keyExtractor={(item) => item.tokenId}
        style={tailwind({
          'bg-dfxblue-800': !isLight,
          'bg-white': isLight,
          'bg-lockGray-100': lock,
        })}
      />
    );
  });

function isCollateralItem(item: CollateralItem | BottomSheetToken): item is CollateralItem {
  return (item as CollateralItem).activateAfterBlock !== undefined;
}

function ListItem({
  item,
  onTokenPress,
  navigateToScreen,
  vault,
  tokenType,
  isOraclePrice,
  lock,
  simple,
}: {
  item: BottomSheetToken | CollateralItem;
  onTokenPress?: (token: BottomSheetToken) => void;
  navigateToScreen?: {
    screenName: string;
    onButtonPress: (item: AddOrRemoveCollateralResponse) => void;
  };
  vault?: LoanVaultActive;
  tokenType: TokenType;
  isOraclePrice?: boolean;
  lock: boolean;
  simple: boolean;
}): JSX.Element {
  const navigation = useNavigation<NavigationProp<BottomSheetWithNavRouteParam>>();
  const { getTokenPrice } = useTokenPrice();
  const activePrice =
    tokenType === TokenType.CollateralItem
      ? new BigNumber(
          getActivePrice(item.token.symbol, (item as CollateralItem)?.activePrice, (item as CollateralItem).factor),
        )
      : getTokenPrice(item.token.symbol, new BigNumber('1'), item.token.isLPS);
  const symbolA = item.token.displaySymbol.includes('-') ? item.token.displaySymbol.split('-')[0] : undefined;
  const symbolB = item.token.displaySymbol.includes('-') ? item.token.displaySymbol.split('-')[1] : undefined;

  return (
    <ThemedTouchableOpacity
      disabled={!simple && new BigNumber(item.available).lte(0)}
      onPress={() => {
        if (onTokenPress !== undefined) {
          onTokenPress(item);
        }
        if (navigateToScreen !== undefined) {
          navigation.navigate({
            name: navigateToScreen.screenName,
            params: {
              token: item.token,
              activePrice,
              available: item.available.toFixed(8),
              onButtonPress: navigateToScreen.onButtonPress,
              collateralFactor: new BigNumber(item.factor ?? 0).times(100),
              isAdd: true,
              vault,
              ...(isCollateralItem(item) && { collateralItem: item }),
            },
            merge: true,
          });
        }
      }}
      style={tailwind('px-4 py-3 flex flex-row items-center justify-between')}
      testID={`select_${item.token.displaySymbol}`}
      lockDark={lock}
    >
      <View style={tailwind('flex flex-row items-center')}>
        {symbolA && symbolB ? (
          <PoolPairIcon symbolA={symbolA} symbolB={symbolB} />
        ) : (
          <SymbolIcon symbol={item.token.displaySymbol} styleProps={tailwind('w-6 h-6')} />
        )}

        <View style={tailwind('flex flex-col ml-2')}>
          <ThemedText
            light={tailwind(lock ? 'text-black' : 'text-dfxgray-500')}
            dark={tailwind(lock ? 'text-black' : 'text-dfxgray-400')}
            testID={`token_symbol_${item.token.displaySymbol}`}
          >
            {item.token.displaySymbol}
          </ThemedText>
          {!lock && (
            <ThemedText
              light={tailwind(lock ? 'text-black' : 'text-dfxgray-500')}
              dark={tailwind(lock ? 'text-black' : 'text-dfxgray-400')}
              style={tailwind(['text-xs', { hidden: item.token.name === '' }])}
            >
              {item.token.name}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={tailwind('flex flex-row items-center')}>
        {!simple && activePrice && (
          <View style={tailwind('flex flex-col items-end mr-2')}>
            <NumberFormat
              value={item.available.toFixed(8)}
              thousandSeparator
              displayType="text"
              renderText={(value) => (
                <ThemedText
                  light={tailwind(lock ? 'text-black' : 'text-gray-700')}
                  dark={tailwind(lock ? 'text-black' : 'text-dfxgray-300')}
                  testID={`select_${item.token.displaySymbol}_value`}
                >
                  {value}
                </ThemedText>
              )}
            />
            <ActiveUSDValue
              price={new BigNumber(item.available).multipliedBy(activePrice)}
              containerStyle={tailwind('justify-end')}
              isOraclePrice={isOraclePrice}
            />
          </View>
        )}
        <ThemedIcon iconType="MaterialIcons" name="chevron-right" size={20} lock={lock} primary />
      </View>
    </ThemedTouchableOpacity>
  );
}
