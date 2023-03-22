import { Text, View } from '@components';
import { Loading } from '@components/Loading';
import { WalletAlertErrorApi } from '@components/WalletAlert';
import { LOCKgetTransactions, TransactionDto } from '@shared-api/dfx/ApiService';
import { useWalletContext } from '@shared-contexts/WalletContext';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

export function LockTransactions(): JSX.Element {
  const { address } = useWalletContext();
  const [transactions, setTransactions] = useState<TransactionDto[]>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    LOCKgetTransactions(address)
      .then(setTransactions)
      .catch(WalletAlertErrorApi)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <View style={tailwind('flex-1 bg-white', { 'justify-center': isLoading })}>
      {isLoading ? (
        <Loading message={translate('LOCK/LockTransactions', 'Loading all transactions. Please wait...')} lock />
      ) : (
        <>
          <Text>Todo switcher</Text>
          <ScrollView contentContainerStyle={tailwind('flex-grow flex-col p-8')}>
            <Text style={tailwind('text-black')}>todo show transactions</Text>
            <Text style={tailwind('text-black')}>number of transactions {transactions?.length ?? 0}</Text>
          </ScrollView>
        </>
      )}
    </View>
  );
}
