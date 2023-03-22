import { Text, View } from '@components';
import { Loading } from '@components/Loading';
import { ThemedFlatList, ThemedIcon } from '@components/themed';
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
import { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';

export function LockTransactions(): JSX.Element {
  const { address } = useWalletContext();
  const [transactions, setTransactions] = useState<TransactionDto[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<TransactionType>();
  const [page, setPage] = useState(0);
  const pageSize = 50;

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

  return (
    <View style={tailwind('flex-1 bg-white', { 'justify-center': isLoading })}>
      {isLoading ? (
        <Loading message={translate('LOCK/LockTransactions', 'Loading all transactions. Please wait...')} lock />
      ) : (
        <>
          <TransactionTypeSelector current={selectedType} onChanged={setSelectedType} />
          <ThemedFlatList
            data={transactions
              ?.filter((t) =>
                selectedType ? t.type === selectedType : t.status !== TransactionStatus.WAITING_FOR_BALANCE,
              )
              .filter((_, i) => i < (page + 1) * pageSize)}
            renderItem={({ item }: { item: TransactionDto }): JSX.Element => <TransactionRow transaction={item} />}
            keyExtractor={(item, i) => `${item.type}-${i}`}
            style={tailwind('bg-white pt-2')}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.2}
            lock
          />
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

function TransactionRow({ transaction }: { transaction: TransactionDto }): JSX.Element {
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

  return (
    <View style={tailwind('flex flex-row p-2 justify-between')}>
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
    </View>
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
