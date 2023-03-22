import { Text, View } from '@components';
import { InfoText } from '@components/InfoText';
import { Loading } from '@components/Loading';
import { ThemedFlatList, ThemedIcon, ThemedView } from '@components/themed';
import { WalletAlertErrorApi } from '@components/WalletAlert';
import {
  LOCKgetTransactions,
  TransactionDto,
  TransactionStatus,
  TransactionTarget,
  TransactionType,
} from '@shared-api/dfx/ApiService';
import { useWalletContext } from '@shared-contexts/WalletContext';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { ButtonGroup } from '../../Dex/components/ButtonGroup';
import { useDeFiScanContext } from '@shared-contexts/DeFiScanContext';
import { BottomSheetNavScreen, BottomSheetWebWithNav, BottomSheetWithNav } from '@components/BottomSheetWithNav';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { RewardStrategyInfo } from '@components/LOCK/modals/RewardStrategyInfo';
import { PendingRewardInfo } from '@components/LOCK/modals/PendingRewardInfo';

enum RewardType {
  PAID_OUT = 'Paid out',
  PENDING = 'Pending',
}

export function LockTransactions(): JSX.Element {
  const { address } = useWalletContext();
  const [transactions, setTransactions] = useState<TransactionDto[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<TransactionType>();
  const [activeTab, setActiveTab] = useState<RewardType>(RewardType.PAID_OUT);
  const [page, setPage] = useState(0);
  const pageSize = 50;

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

  useEffect(() => {
    setIsLoading(true);
    LOCKgetTransactions(address)
      .then(setTransactions)
      .catch(WalletAlertErrorApi)
      .finally(() => setIsLoading(false));
  }, []);

  function onLoadMore() {
    setPage(page + 1);
  }

  const buttonGroup = [
    {
      id: RewardType.PAID_OUT,
      label: translate('LOCK/LockDashboardScreen', RewardType.PAID_OUT),
      handleOnPress: () => setActiveTab(RewardType.PAID_OUT),
    },
    {
      id: RewardType.PENDING,
      label: translate('LOCK/LockDashboardScreen', RewardType.PENDING),
      handleOnPress: () => setActiveTab(RewardType.PENDING),
    },
  ];

  function openInfo() {
    setBottomSheetScreen([
      {
        stackScreenName: 'PendingRewardInfo',
        component: PendingRewardInfo(),
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
                  {translate('LOCK/LockDashboardScreen', 'Note to the transaction')}
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
    expandModal();
  }

  return (
    <View style={tailwind('flex-1 bg-white', { 'justify-center': isLoading })}>
      {isLoading ? (
        <Loading message={translate('LOCK/LockTransactions', 'Loading all transactions. Please wait...')} lock />
      ) : (
        <>
          <TransactionTypeSelector current={selectedType} onChanged={setSelectedType} />
          <ThemedFlatList
            data={transactions
              ?.filter((t) => (selectedType ? t.type === selectedType : true))
              .filter((t) =>
                selectedType === TransactionType.REWARD
                  ? activeTab === RewardType.PAID_OUT
                    ? t.status !== TransactionStatus.WAITING_FOR_BALANCE
                    : t.status === TransactionStatus.WAITING_FOR_BALANCE
                  : true,
              )
              .filter((_, i) => i < (page + 1) * pageSize)}
            renderItem={({ item }: { item: TransactionDto }): JSX.Element => (
              <TransactionRow transaction={item} openInfo={openInfo} />
            )}
            keyExtractor={(item, i) => `${item.type}-${i}`}
            ListHeaderComponent={
              selectedType === TransactionType.REWARD ? (
                <View style={tailwind('px-4 py-2 bg-white')}>
                  <ButtonGroup buttons={buttonGroup} activeButtonGroupItem={activeTab} testID="dex_button_group" lock />
                  <InfoText
                    text={translate(
                      'LOCK/LockDashboardScreen',
                      'Please note that we will collect and pay out all amounts below 0.0001 for tokens in the corresponding token assets for you as soon as the value is >= 0.0001. For Liquidity Pool tokens this value equals 1$',
                    )}
                    noBorder
                    lock
                  />
                </View>
              ) : (
                <></>
              )
            }
            stickyHeaderIndices={[0]}
            style={tailwind('bg-white')}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.2}
            lock
          />
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
        </>
      )}
    </View>
  );
}

function TransactionTypeSelector({
  current,
  onChanged,
}: {
  current?: TransactionType;
  onChanged: (type?: TransactionType) => void;
}): JSX.Element {
  const types = [
    { label: 'All', value: undefined },
    ...Object.values(TransactionType).map((t) => ({ label: '' + t, value: t })),
  ];

  function isCurrent(value?: TransactionType): boolean {
    return value === current;
  }

  return (
    <ScrollView
      style={tailwind('border-b border-lockGray-100')}
      contentContainerStyle={tailwind('flex flex-row w-full justify-between px-8 h-10 items-end')}
      horizontal
    >
      {types.map((t) => (
        <TouchableOpacity key={t.label} onPress={() => onChanged(t.value)}>
          <View style={tailwind('flex flex-col')}>
            <Text
              style={tailwind('text-black font-medium text-base pb-0.5 px-2', {
                'text-lock-200 font-bold': isCurrent(t.value),
              })}
            >
              {t.label}
            </Text>
            <View style={tailwind('h-1', { 'bg-lock-200': isCurrent(t.value) })} />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function TransactionRow({ transaction, openInfo }: { transaction: TransactionDto; openInfo: () => void }): JSX.Element {
  const { getTransactionUrl } = useDeFiScanContext();
  const date = new Date(transaction.date);

  function sourceOrTarget(): string {
    switch (transaction.type) {
      case TransactionType.REWARD:
      case TransactionType.DEPOSIT:
        return getReadableTarget(transaction.target);
      case TransactionType.WITHDRAWAL:
        return getReadableTarget(transaction.source);
    }
  }

  function getReadableTarget(target: TransactionTarget): string {
    switch (target) {
      case TransactionTarget.WALLET:
        return 'Wallet';
      case TransactionTarget.MASTERNODE:
        return 'Staking';
      case TransactionTarget.LIQUIDITY_MINING:
        return 'Yield Machine';
      case TransactionTarget.EXTERNAL:
        return `Alt. Wallet ...${transaction.targetAddress.slice(-5)}`;
    }
  }

  async function handleOnPress() {
    if (transaction.txId) {
      await Linking.openURL(getTransactionUrl(transaction.txId));
    } else {
      openInfo();
    }
  }

  return (
    <TouchableOpacity style={tailwind('flex flex-row p-2 justify-between')} onPress={handleOnPress}>
      <View style={tailwind('flex flex-row')}>
        <TransactionIcon transaction={transaction} />
        <View style={tailwind('flex flex-col ml-2 justify-start')}>
          <Text style={tailwind('text-black font-medium text-sm')}>{sourceOrTarget()}</Text>
          <Text
            style={tailwind('text-lockGray-400 font-normal text-xs')}
          >{`${date.toLocaleDateString()} ${date.toLocaleTimeString()}`}</Text>
        </View>
      </View>
      <TransactionAmount transaction={transaction} />
    </TouchableOpacity>
  );
}

function TransactionIcon({ transaction }: { transaction: TransactionDto }): JSX.Element {
  switch (transaction.type) {
    case TransactionType.REWARD:
      return <ThemedIcon style={tailwind('pl-1 pt-2')} iconType="FontAwesome5" name="coins" size={20} lock primary />;
    case TransactionType.DEPOSIT:
      return <ThemedIcon style={tailwind('pt-0.5')} iconType="MaterialIcons" name="add" size={24} lock primary />;
    case TransactionType.WITHDRAWAL:
      return <ThemedIcon style={tailwind('pt-0.5')} iconType="MaterialIcons" name="remove" size={24} lock primary />;
  }
}

function TransactionAmount({ transaction }: { transaction: TransactionDto }): JSX.Element {
  function amount(): string {
    switch (transaction.type) {
      case TransactionType.REWARD:
      case TransactionType.DEPOSIT:
        if (!transaction.inputAmount) return '';
        return new BigNumber(transaction.inputAmount).dp(8).toString();
      case TransactionType.WITHDRAWAL:
        if (!transaction.outputAmount) return '';
        return new BigNumber(transaction.outputAmount).dp(8).toString();
    }
  }

  function prefix(): string {
    const a = amount();
    if (a.length === 0) return '';
    switch (transaction.type) {
      case TransactionType.REWARD:
      case TransactionType.DEPOSIT:
        return '+';
      case TransactionType.WITHDRAWAL:
        return '-';
    }
  }

  function asset(): string {
    switch (transaction.type) {
      case TransactionType.REWARD:
      case TransactionType.DEPOSIT:
        return transaction.inputAsset;
      case TransactionType.WITHDRAWAL:
        return transaction.outputAsset;
    }
  }

  return (
    <View style={tailwind('flex flex-row items-center pr-2')}>
      <Text style={tailwind('text-black font-medium text-sm')}>{`${prefix()}${amount()} ${asset()}`}</Text>
    </View>
  );
}
