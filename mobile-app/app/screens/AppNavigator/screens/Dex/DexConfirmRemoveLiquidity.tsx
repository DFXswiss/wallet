import { CTransactionSegWit } from '@defichain/jellyfish-transaction';
import { PoolPairData } from '@defichain/whale-api-client/dist/api/poolpairs';
import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import BigNumber from 'bignumber.js';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { NumberRow } from '@components/NumberRow';
import { SubmitButtonGroup } from '@components/SubmitButtonGroup';
import { SummaryTitle } from '@components/SummaryTitle';
import { ThemedScrollView, ThemedSectionTitle, ThemedView } from '@components/themed';
import { RootState } from '@store';
import { hasTxQueued as hasBroadcastQueued } from '@store/ocean';
import { hasTxQueued, transactionQueue } from '@store/transaction_queue';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { DexParamList } from './DexNavigator';
import { InfoRow, InfoType } from '@components/InfoRow';
import { TextRow } from '@components/TextRow';
import { TransactionResultsRow } from '@components/TransactionResultsRow';
import { onTransactionBroadcast } from '@api/transaction/transaction_commands';
import { WalletAddressRow } from '@components/WalletAddressRow';
import { PricesSection } from '@components/PricesSection';
import { useAppDispatch } from '@hooks/useAppDispatch';

type Props = StackScreenProps<DexParamList, 'ConfirmRemoveLiquidity'>;

export function RemoveLiquidityConfirmScreen({ route }: Props): JSX.Element {
  const { pair, amount, fee, tokenAAmount, tokenBAmount, tokenA, tokenB } = route.params;
  const aToBRate = new BigNumber(pair.tokenB.reserve).div(pair.tokenA.reserve);
  const bToARate = new BigNumber(pair.tokenA.reserve).div(pair.tokenB.reserve);
  const symbol =
    pair?.tokenA != null && pair?.tokenB != null
      ? `${pair.tokenA.displaySymbol}-${pair.tokenB.displaySymbol}`
      : pair.symbol;
  const dispatch = useAppDispatch();
  const hasPendingJob = useSelector((state: RootState) => hasTxQueued(state.transactionQueue));
  const hasPendingBroadcastJob = useSelector((state: RootState) => hasBroadcastQueued(state.ocean));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation<NavigationProp<DexParamList>>();
  const [isOnPage, setIsOnPage] = useState<boolean>(true);

  useEffect(() => {
    setIsOnPage(true);
    return () => {
      setIsOnPage(false);
    };
  }, []);

  async function onSubmit(): Promise<void> {
    if (hasPendingJob || hasPendingBroadcastJob) {
      return;
    }
    setIsSubmitting(true);
    await constructSignedRemoveLiqAndSend(pair, amount, dispatch, () => {
      onTransactionBroadcast(isOnPage, navigation.dispatch);
    });
    setIsSubmitting(false);
  }

  function onCancel(): void {
    if (!isSubmitting) {
      navigation.navigate({
        name: 'RemoveLiquidity',
        params: { pair },
        merge: true,
      });
    }
  }

  return (
    <ThemedScrollView style={tailwind('pb-4')}>
      <ThemedView
        dark={tailwind('bg-dfxblue-800 border-b border-dfxblue-900')}
        light={tailwind('bg-white border-b border-dfxgray-300')}
        style={tailwind('flex-col px-4 py-8 mb-4')}
      >
        <SummaryTitle
          amount={amount}
          suffix={` ${symbol}`}
          suffixType="text"
          testID="text_remove_amount"
          title={translate('screens/ConfirmRemoveLiquidity', 'You are removing')}
        />
      </ThemedView>

      <ThemedSectionTitle
        testID="title_tx_detail"
        text={translate('screens/ConfirmRemoveLiquidity', 'TRANSACTION DETAILS')}
      />

      <TextRow
        lhs={translate('screens/ConfirmRemoveLiquidity', 'Transaction type')}
        rhs={{
          value: translate('screens/ConfirmRemoveLiquidity', 'Remove liquidity'),
          testID: 'text_transaction_type',
        }}
        textStyle={tailwind('text-sm font-normal')}
      />
      <WalletAddressRow />
      <InfoRow type={InfoType.EstimatedFee} value={fee.toFixed(8)} testID="text_fee" suffix="DFI" />

      <ThemedSectionTitle
        testID="title_remove_detail"
        text={translate('screens/ConfirmRemoveLiquidity', 'ESTIMATED AMOUNT TO RECEIVE')}
      />

      <NumberRow
        lhs={pair?.tokenA?.displaySymbol}
        rhs={{
          testID: 'a_amount',
          value: BigNumber.max(tokenAAmount, 0).toFixed(8),
          suffixType: 'text',
          suffix: pair?.tokenA?.displaySymbol,
        }}
      />
      <NumberRow
        lhs={pair?.tokenB?.displaySymbol}
        rhs={{
          testID: 'b_amount',
          value: BigNumber.max(tokenBAmount, 0).toFixed(8),
          suffixType: 'text',
          suffix: pair?.tokenB?.displaySymbol,
        }}
      />

      <PricesSection
        testID="confirm_pricerate_value"
        priceRates={[
          {
            label: translate('components/PricesSection', '1 {{token}}', {
              token: pair.tokenA.displaySymbol,
            }),
            value: aToBRate.toFixed(8),
            aSymbol: pair.tokenA.displaySymbol,
            bSymbol: pair.tokenB.displaySymbol,
          },
          {
            label: translate('components/PricesSection', '1 {{token}}', {
              token: pair.tokenB.displaySymbol,
            }),
            value: bToARate.toFixed(8),
            aSymbol: pair.tokenB.displaySymbol,
            bSymbol: pair.tokenA.displaySymbol,
          },
        ]}
        sectionTitle="PRICES"
      />

      <TransactionResultsRow
        tokens={[
          {
            symbol: pair.tokenA.displaySymbol,
            value: new BigNumber(tokenA?.amount ?? 0).plus(tokenAAmount).toFixed(8),
            suffix: pair.tokenA.displaySymbol,
          },
          {
            symbol: pair.tokenB.displaySymbol,
            value: BigNumber.max(
              new BigNumber(tokenB?.amount ?? 0).plus(tokenBAmount).minus(pair.tokenB.symbol === 'DFI' ? fee : 0),
              0,
            ).toFixed(8),
            suffix: pair.tokenB.displaySymbol,
          },
        ]}
      />

      <SubmitButtonGroup
        isDisabled={isSubmitting || hasPendingJob || hasPendingBroadcastJob}
        label={translate('screens/ConfirmRemoveLiquidity', 'REMOVE')}
        isProcessing={isSubmitting || hasPendingJob || hasPendingBroadcastJob}
        processingLabel={translate('screens/ConfirmRemoveLiquidity', 'REMOVING')}
        onCancel={onCancel}
        onSubmit={onSubmit}
        displayCancelBtn
        title="remove"
      />
    </ThemedScrollView>
  );
}

async function constructSignedRemoveLiqAndSend(
  pair: PoolPairData,
  amount: BigNumber,
  dispatch: Dispatch<any>,
  onBroadcast: () => void,
): Promise<void> {
  const tokenId = Number(pair.id);
  const symbol =
    pair?.tokenA != null && pair?.tokenB != null
      ? `${pair.tokenA.displaySymbol}-${pair.tokenB.displaySymbol}`
      : pair.symbol;

  const signer = async (account: WhaleWalletAccount): Promise<CTransactionSegWit> => {
    const builder = account.withTransactionBuilder();
    const script = await account.getScript();

    const removeLiq = {
      script,
      tokenId,
      amount,
    };
    const dfTx = await builder.liqPool.removeLiquidity(removeLiq, script);
    return new CTransactionSegWit(dfTx);
  };

  dispatch(
    transactionQueue.actions.push({
      sign: signer,
      title: translate('screens/RemoveLiquidity', 'Removing Liquidity'),
      description: translate('screens/RemoveLiquidity', 'Removing {{amount}} {{symbol}}', {
        symbol: symbol,
        amount: amount.toFixed(8),
      }),
      onBroadcast,
    }),
  );
}
