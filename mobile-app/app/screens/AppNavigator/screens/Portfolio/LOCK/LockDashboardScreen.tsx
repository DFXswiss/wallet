/* eslint-disable @typescript-eslint/no-unused-vars */
import { View, TouchableOpacity, Text, Linking, Platform, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LOCKStaking from '@assets/LOCK/Lock-Staking.svg';
import LOCKYieldMachine from '@assets/LOCK/Lock-YM.svg';
import { allTokens, AssociatedToken, tokensSelector, WalletToken } from '@store/wallet';
import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ThemedActivityIndicator } from '@components/themed';
import { RootState } from '@store';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetNavScreen, BottomSheetWebWithNav, BottomSheetWithNav } from '@components/BottomSheetWithNav';
import { Button } from '@components/Button';
import { StakingOutputDto, StakingStrategy } from '@shared-api/dfx/ApiService';
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider';
import { useLock } from '../../../../../contexts/LOCK/LockContextProvider';
import { openURL } from 'expo-linking';
import { getEnvironment } from '@environment';
import { getReleaseChannel } from '@api/releaseChannel';
import { ButtonGroup } from '../../Dex/components/ButtonGroup';
import { useWalletContext } from '@shared-contexts/WalletContext';
import { ANNOUNCEMENTCHANNELDELAY, AnnouncementChannel } from '@shared-types/website';
import { Announcements } from '../components/Announcements';
import { NumericFormat as NumberFormat } from 'react-number-format';
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { BottomSheetToken, BottomSheetTokenList, TokenType } from '@components/BottomSheetTokenList';
import { BottomSheetStaking } from '@components/LOCK/BottomSheetStaking';
import { StakingCard } from '@components/LOCK/StakingCard';
import { StakingAction } from '@constants/LOCK/StakingAction';
import { useLockStakingContext } from '@contexts/LOCK/LockStakingContextProvider';
import { LockStakingTab } from '@constants/LOCK/LockStakingTab';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RewardStrategy } from '@components/LOCK/RewardStrategy';

export function LockDashboardScreen(): JSX.Element {
  const { openCfpVoting } = useLock();
  const { address } = useWalletContext();
  const {
    isLoading,
    fetch,
    activeTab,
    setActiveTab,
    info,
    setInfo,
    analytics,
    setTransactionCache,
    calculateBalance,
    setEditRewardRoutes,
    isStakingActive,
    isYieldMachineActive,
  } = useLockStakingContext();

  const email = 'support@lock.space';

  // tabbing
  const buttonGroup = [
    {
      id: LockStakingTab.Staking,
      label: translate('LOCK/LockDashboardScreen', 'STAKING'),
      handleOnPress: () => setActiveTab(LockStakingTab.Staking),
    },
    {
      id: LockStakingTab.YieldMachine,
      label: translate('LOCK/LockDashboardScreen', 'YIELD MACHINE'),
      handleOnPress: () => setActiveTab(LockStakingTab.YieldMachine),
    },
  ];

  const title =
    activeTab === LockStakingTab.Staking ? 'Total staked {{balance}} DFI' : 'Total deposited {{balance}} USDT';

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

  const { signMessage } = useDFXAPIContext();
  const tokens = useSelector((state: RootState) => allTokens(state.wallet));
  const walletTokens = useSelector((state: RootState) => tokensSelector(state.wallet));

  const openModal = (action: StakingAction, info: StakingOutputDto, token: WalletToken | TokenData): void => {
    if (info.strategy === StakingStrategy.LIQUIDITY_MINING) {
      setTokenSelectionBottomSheet(action, info);
    } else {
      setStakingBottomSheet(action, info, token);
    }
    expandModal();
  };

  function openModalWithScreens(screens: BottomSheetNavScreen[]): void {
    setBottomSheetScreen(screens);
    expandModal();
  }

  const setTokenSelectionBottomSheet = useCallback(
    (action: StakingAction, info: StakingOutputDto) => {
      setBottomSheetScreen([
        {
          stackScreenName: 'TokenList',
          component: BottomSheetTokenList({
            lock: true,
            simple: true,
            tokens: getBottomSheetToken(tokens, walletTokens, info),
            tokenType: TokenType.BottomSheetToken,
            headerLabel: translate('LOCK/LockDashboardScreen', `Select token to ${action.toLowerCase()}`),
            onCloseButtonPress: dismissModal,
            onTokenPress: (item) => setStakingBottomSheet(action, info, item.walletToken ?? item.tokenData),
          }),
          option: {
            header: () => null,
            headerBackTitleVisible: false,
          },
        },
      ]);
    },
    [activeTab],
  );

  const setStakingBottomSheet = useCallback(
    (action: StakingAction, info: StakingOutputDto, token: WalletToken | TokenData | undefined) => {
      setBottomSheetScreen([
        {
          stackScreenName: 'BottomSheetStaking',
          component: BottomSheetStaking({
            token: token,
            headerLabel: translate('LOCK/LockDashboardScreen', 'How much {{token}} do you want to {{action}}?', {
              token: token?.displaySymbol,
              action: action.toLocaleLowerCase(),
            }),
            onCloseButtonPress: () => dismissModal(),
            onStaked: async (stakingTransaction): Promise<void> => {
              setTransactionCache(stakingTransaction);
              dismissModal();
            },
            onUnstaked: async (newStakingInfo): Promise<void> => {
              setInfo(newStakingInfo);
              // wait for pass code modal to close
              setTimeout(() => dismissModal(), 1000);
              setTimeout(() => dismissModal(), 2000);
            },
            stakingInfo: info,
            action,
            signMessage,
          }),
          option: {
            header: () => null,
          },
        },
      ]);
    },
    [activeTab],
  );

  useEffect(() => {
    fetch();
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, []);

  const onCsvExport = useCallback(async () => {
    const baseUrl = getEnvironment(getReleaseChannel()).lock.apiUrl;
    await openURL(`${baseUrl}/analytics/history/ChainReport?userAddress=${address ?? ''}&type=csv`);
  }, [address]);

  // announcements
  const [announcementDelayFinished, setAnnouncementDelayFinished] = useState(false);
  useEffect(() => {
    setEditRewardRoutes(false);
    setTimeout(() => {
      setAnnouncementDelayFinished(true);
    }, ANNOUNCEMENTCHANNELDELAY);
  }, []);

  return (
    <View style={tailwind('h-full bg-lockGray-100')}>
      <KeyboardAwareScrollView
        contentContainerStyle={tailwind('flex-grow flex-col')}
        refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} />}
      >
        {announcementDelayFinished && <Announcements channel={AnnouncementChannel.LOCK} />}

        <View style={tailwind('bg-lock-200')}>
          <View style={tailwind('self-center mt-4')}>
            <View style={tailwind('flex-row self-center')}>
              {activeTab === LockStakingTab.Staking ? <LOCKStaking /> : <LOCKYieldMachine />}
            </View>
            <NumberFormat
              value={calculateBalance()}
              thousandSeparator
              decimalScale={2}
              displayType="text"
              renderText={(value) => (
                <Text style={tailwind('text-sm font-normal pt-2 pb-4 text-white self-center')}>
                  {translate('LOCK/LockDashboardScreen', title, { balance: value })}
                </Text>
              )}
            />
          </View>
        </View>

        <View style={tailwind('flex-grow m-4')}>
          <ButtonGroup buttons={buttonGroup} activeButtonGroupItem={activeTab} testID="dex_button_group" lock />
          {info == null ? (
            <View style={tailwind('flex-grow  justify-center')}>
              <ThemedActivityIndicator size="large" lock />
            </View>
          ) : (
            <>
              <View style={tailwind('bg-white rounded-md my-4')}>
                <StakingCard info={info} analytics={analytics} isLoading={isLoading} openModal={openModal} />
              </View>

              <View style={tailwind('bg-white rounded-md my-2')}>
                <RewardStrategy
                  disabled={!isStakingActive() && !isYieldMachineActive()}
                  openModal={openModalWithScreens}
                  dismissModal={dismissModal}
                />
              </View>

              <View style={tailwind('h-8')} />
              <Button
                label={translate('LOCK/LockDashboardScreen', 'CSV EXPORT')}
                onPress={onCsvExport}
                margin={''}
                lock
                fill="outline"
                color="secondary"
              />
              <View style={tailwind('h-4')} />
              <Button
                label={translate('LOCK/LockDashboardScreen', 'CFP VOTING')}
                onPress={openCfpVoting}
                margin={''}
                lock
                fill="outline"
                color="secondary"
              />
              <View style={tailwind('h-8')} />
            </>
          )}
        </View>

        <View style={tailwind('flex-row self-center mb-5')}>
          <TouchableOpacity
            style={tailwind('flex-row mx-2')}
            onPress={async () => await Linking.openURL('mailto:' + email)}
          >
            <MaterialCommunityIcons
              style={tailwind('mr-2 text-lock-200 self-center')}
              iconType="MaterialIcons"
              name="email-outline"
              size={12}
            />
            <Text style={tailwind('text-xs font-medium self-center')}>
              {translate('LOCK/LockDashboardScreen', email)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tailwind('flex-row mx-2')}
            onPress={async () => await Linking.openURL('https://lock.space/terms')}
          >
            <MaterialCommunityIcons
              style={tailwind('mr-2 text-lock-200 self-center')}
              iconType="MaterialCommunityIcons"
              name="open-in-new"
              size={12}
            />
            <Text style={tailwind('text-xs font-medium self-center')}>
              {translate('LOCK/LockDashboardScreen', 'Terms & Conditions')}
            </Text>
          </TouchableOpacity>
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
      </KeyboardAwareScrollView>
    </View>
  );
}

function getWalletToken(walletTokens: WalletToken[], tokenId: string): WalletToken | undefined {
  return walletTokens.find((walletToken) => {
    let wantedId = tokenId;
    if (tokenId === '0') {
      wantedId = '0_utxo';
    }
    return walletToken.id === wantedId;
  });
}

function getBottomSheetToken(
  tokens: AssociatedToken,
  walletTokens: WalletToken[],
  info: StakingOutputDto,
): BottomSheetToken[] {
  const tokenData = info.balances.map(
    (b) => Object.values(tokens).find((t) => t.symbolKey === b.asset) ?? tokens[b.asset],
  );
  return tokenData.map((t) => {
    const displaySymbol = t.displaySymbol.replace(' (UTXO)', '');
    const walletToken = getWalletToken(walletTokens, t.id);
    const token: BottomSheetToken = {
      tokenId: t.id,
      available: new BigNumber(walletToken?.amount ?? 0),
      token: {
        name: t.name,
        displaySymbol,
        symbol: t.symbol,
        isLPS: t.isLPS,
      },
      walletToken: walletToken !== undefined ? { ...walletToken, displaySymbol } : undefined,
      tokenData: t,
    };
    return token;
  });
}
