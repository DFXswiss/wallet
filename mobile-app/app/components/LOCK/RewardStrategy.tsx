import { BottomSheetNavScreen } from '@components/BottomSheetWithNav';
import { IconButton } from '@components/IconButton';
import { ThemedIcon, ThemedView } from '@components/themed';
import { RewardStrategyType } from '@constants/LOCK/RewardStrategyType';
import { useLockStakingContext } from '@contexts/LOCK/LockStakingContextProvider';
import { ButtonGroup } from '@screens/AppNavigator/screens/Dex/components/ButtonGroup';
import { RewardRoute, StakingStrategy } from '@shared-api/dfx/ApiService';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { ListItem, ListItemStyle } from './ListItem';
import { RewardStrategyInfo } from './modals/RewardStrategyInfo';

interface RewardStrategyProps {
  openModal: (screens: BottomSheetNavScreen[]) => void;
  dismissModal: () => void;
}

enum RewardStrategyAction {
  INFO,
}

export function RewardStrategy({ openModal, dismissModal }: RewardStrategyProps): JSX.Element {
  const {
    info,
    editRewardRoutes,
    setEditRewardRoutes,
    saveRewardRoutes,
    activeStrategyType,
    setActiveStrategyType,
    rewardRoutes,
  } = useLockStakingContext();
  const [showsRewardStrategy, setShowsRewardStrategy] = useState(false);
  const [editableRewardRoutes, setEditableRewardRoutes] = useState<RewardRoute[]>();

  const buttonGroup = [
    {
      id: RewardStrategyType.DFI,
      label: translate('LOCK/LockDashboardScreen', 'DFI rewards'),
      handleOnPress: () => setActiveStrategyType(RewardStrategyType.DFI),
    },
    {
      id: RewardStrategyType.DUSD,
      label: translate('LOCK/LockDashboardScreen', 'dUSD rewards'),
      handleOnPress: () => setActiveStrategyType(RewardStrategyType.DUSD),
    },
  ];

  function shouldShowAdditionalElements(): boolean {
    return info?.strategy === StakingStrategy.LIQUIDITY_MINING;
  }

  function isEditAvailable(): boolean {
    return info?.strategy === StakingStrategy.MASTERNODE;
  }

  const getFilteredRewardRoutes = useCallback(() => {
    return (editRewardRoutes ? editableRewardRoutes : rewardRoutes) ?? [];
  }, [editableRewardRoutes, rewardRoutes]);

  function getReinvestPercent(): number {
    return new BigNumber(1)
      .minus(BigNumber.sum(...getFilteredRewardRoutes().map((r) => new BigNumber(r.rewardPercent))))
      .multipliedBy(100)
      .toNumber();
  }

  function getReinvestAsset(): string | undefined {
    return info?.strategy === StakingStrategy.LIQUIDITY_MINING ? activeStrategyType : info?.asset;
  }

  useEffect(() => {
    setEditableRewardRoutes(editRewardRoutes ? rewardRoutes : undefined);
  }, [editRewardRoutes]);

  const listItems = useCallback(() => {
    return [
      ...getFilteredRewardRoutes().map((route) => ({
        title: route.targetAsset,
        value: `${route.rewardPercent * 100}%`,
        style: editRewardRoutes ? ListItemStyle.ACTIVE_ICON_EDIT : ListItemStyle.ACTIVE_ICON,
        onPress: () =>
          setEditableRewardRoutes(editableRewardRoutes?.filter((r) => r.targetAsset !== route.targetAsset)),
      })),
      {
        title: translate('LOCK/LockDashboardScreen', 'Reinvest, {{asset}}', { asset: getReinvestAsset() }),
        value: `${getReinvestPercent()}%`,
        style: ListItemStyle.ACTIVE,
        onPress: undefined,
      },
    ];
  }, [editRewardRoutes, rewardRoutes, editableRewardRoutes, activeStrategyType]);

  function openInfo(): void {
    openModal([
      {
        stackScreenName: 'TokenList',
        component: RewardStrategyInfo(),
        option: {
          header: () => {
            return (
              <ThemedView
                light={tailwind('bg-white border-0')}
                dark={tailwind('bg-white border-0')}
                style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b', {
                  'py-3.5 border-t -mb-px': Platform.OS === 'android',
                })} // border top on android to handle 1px of horizontal transparent line when scroll past header
              >
                <Text style={tailwind('text-base font-medium text-black')}>
                  {translate('LOCK/LockDashboardScreen', 'Why are there rewards in DFI and dUSD?')}
                </Text>
                <TouchableOpacity onPress={() => dismissModal()}>
                  <ThemedIcon
                    iconType="MaterialIcons"
                    name="close"
                    size={20}
                    light={tailwind('text-black')}
                    dark={tailwind('text-black')}
                  />
                </TouchableOpacity>
              </ThemedView>
            );
          },
          headerBackTitleVisible: false,
        },
      },
    ]);
  }

  return (
    <View style={tailwind('px-4 py-2 flex flex-col')}>
      <View style={tailwind('flex-row justify-between')}>
        <View style={tailwind('flex-row')}>
          <Text style={tailwind('text-base font-bold')}>
            {translate('LOCK/LockDashboardScreen', 'Reward strategy')}
          </Text>
          {shouldShowAdditionalElements() && (
            <View style={tailwind('p-0.5')}>
              <IconButton
                iconName="info-outline"
                iconType="MaterialIcons"
                iconSize={16}
                onPress={() => openInfo()}
                lock
                outline
              />
            </View>
          )}
        </View>
        <View style={tailwind('py-1')}>
          <IconButton
            iconName={showsRewardStrategy ? 'chevron-up' : 'chevron-down'}
            iconType="MaterialCommunityIcons"
            iconSize={20}
            onPress={() => setShowsRewardStrategy(!showsRewardStrategy)}
            disabled={editRewardRoutes}
            lock
          />
        </View>
      </View>

      {showsRewardStrategy && shouldShowAdditionalElements() && (
        <View style={tailwind('py-1')}>
          <ButtonGroup
            buttons={buttonGroup}
            activeButtonGroupItem={activeStrategyType}
            testID="reward_strategy_button_group"
            lock
            inline
          />
        </View>
      )}
      {showsRewardStrategy && (
        <>
          {listItems().map((item, index) => (
            <ListItem key={index} title={item.title} value={item.value} style={item.style} onPress={item.onPress} />
          ))}
          <View style={tailwind('py-2')}>
            <TouchableOpacity
              style={tailwind('flex-row rounded h-8 bg-lock-600 items-center justify-center', {
                'bg-lockGray-100': !isEditAvailable(),
                'bg-lock-200': editRewardRoutes,
              })}
              onPress={() =>
                editRewardRoutes ? saveRewardRoutes(editableRewardRoutes ?? []) : setEditRewardRoutes(true)
              }
              disabled={!isEditAvailable()}
            >
              {!editRewardRoutes && (
                <ThemedIcon
                  style={tailwind('px-1')}
                  light={tailwind('text-lock-100', { 'text-lockGray-200': !isEditAvailable() })}
                  dark={tailwind('text-lock-100', { 'text-lockGray-200': !isEditAvailable() })}
                  iconType="MaterialIcons"
                  name="edit"
                  size={18}
                />
              )}
              <Text
                style={tailwind('text-sm font-bold text-lock-100', {
                  'text-lockGray-200': !isEditAvailable(),
                  'text-white': editRewardRoutes,
                })}
              >
                {editRewardRoutes
                  ? translate('LOCK/LockDashboardScreen', 'SAVE')
                  : translate('LOCK/LockDashboardScreen', 'EDIT')}
              </Text>
              {!isEditAvailable() && (
                <Text style={tailwind('text-xs font-normal text-lockGray-200 pl-0.5')}>
                  {translate('LOCK/LockDashboardScreen', 'coming soon')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
