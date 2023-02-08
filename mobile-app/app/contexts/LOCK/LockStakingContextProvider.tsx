import { WalletAlertErrorApi } from '@components/WalletAlert';
import { LockStakingTab } from '@constants/LOCK/LockStakingTab';
import { RewardStrategyType } from '@constants/LOCK/RewardStrategyType';
import { TransactionCache } from '@constants/LOCK/TransactionCache';
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { useTokenPrice } from '@screens/AppNavigator/screens/Portfolio/hooks/TokenPrice';
import {
  LOCKdeposit,
  LOCKgetAllAnalytics,
  LOCKgetAllStaking,
  LOCKrewardRoutes,
  RewardRouteDto,
  StakingAnalyticsOutputDto,
  StakingOutputDto,
  StakingStrategy,
} from '@shared-api/dfx/ApiService';
import { RootState } from '@store';
import { firstTransactionSelector } from '@store/ocean';
import { allTokens } from '@store/wallet';
import BigNumber from 'bignumber.js';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

interface LockStakingInterface {
  isLoading: boolean;
  fetch: () => Promise<void>;

  activeTab: LockStakingTab;
  setActiveTab: (tab: LockStakingTab) => void;

  info?: StakingOutputDto;
  setInfo: (info: StakingOutputDto) => void;
  analytics?: StakingAnalyticsOutputDto[];
  rewardRoutes?: RewardRouteDto[];

  setTransactionCache: (cache: TransactionCache) => void;

  calculateBalance: () => number;

  activeStrategyType: RewardStrategyType;
  setActiveStrategyType: (type: RewardStrategyType) => void;

  isSubmitting: boolean;
  editRewardRoutes: boolean;
  setEditRewardRoutes: (edit: boolean) => void;
  saveRewardRoutes: (rewardRoutes: RewardRouteDto[], reinvestPercent: number) => Promise<void>;
}

const LockStakingContext = createContext<LockStakingInterface>(undefined as any);

export function useLockStakingContext(): LockStakingInterface {
  return useContext(LockStakingContext);
}

export function LockStakingContextProvider(props: PropsWithChildren<any>): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);

  const transaction = useSelector((state: RootState) => firstTransactionSelector(state.ocean));
  const [transactionCache, setTransactionCache] = useState<TransactionCache>();

  const [activeTab, setActiveTab] = useState<LockStakingTab>(LockStakingTab.Staking);

  const [stakingInfo, setStakingInfo] = useState<StakingOutputDto>();
  const [stakingAnalytics, setStakingAnalytics] = useState<StakingAnalyticsOutputDto[]>();
  const [yieldMachineInfo, setYieldMachineInfo] = useState<StakingOutputDto>();
  const [yieldMachineAnalytics, setYieldMachineAnalytics] = useState<StakingAnalyticsOutputDto[]>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editRewardRoutes, setEditRewardRoutes] = useState(false);

  const tokens = useSelector((state: RootState) => allTokens(state.wallet));
  const { getTokenPrice } = useTokenPrice('USDT');

  const info = activeTab === LockStakingTab.Staking ? stakingInfo : yieldMachineInfo;
  const analytics = activeTab === LockStakingTab.Staking ? stakingAnalytics : yieldMachineAnalytics;
  const rewardRoutes = info?.rewardRoutes.map((r) => ({
    ...r,
    displayLabel: retrieveTokenWithSymbol(r.targetAsset)?.displaySymbol ?? '',
  }));

  function retrieveTokenWithSymbol(symbol: string): TokenData | undefined {
    return Object.values(tokens).find((t) => t.symbol === symbol);
  }

  function setInfo(info: StakingOutputDto) {
    activeTab === LockStakingTab.Staking ? setStakingInfo(info) : setYieldMachineInfo(info);
  }

  const [activeStrategyType, setActiveStrategyType] = useState<RewardStrategyType>(RewardStrategyType.DFI);

  useEffect(() => {
    fetch();
  }, []);

  async function fetch(): Promise<void> {
    await Promise.all([fetchStakingInfo(), fetchAnalytics()]);
  }

  async function fetchStakingInfo(): Promise<void> {
    setIsLoading(true);

    await LOCKgetAllStaking()
      .then(([stkInfo, ymInfo]) => {
        setStakingInfo(stkInfo);
        setYieldMachineInfo(ymInfo);
      })
      .catch(WalletAlertErrorApi)
      .finally(() => setIsLoading(false));
  }

  async function fetchAnalytics(): Promise<void> {
    await LOCKgetAllAnalytics()
      .then((analytics) => {
        setStakingAnalytics(analytics.filter((a) => a.strategy === StakingStrategy.MASTERNODE));
        setYieldMachineAnalytics(analytics.filter((a) => a.strategy === StakingStrategy.LIQUIDITY_MINING));
      })
      .catch(WalletAlertErrorApi);
  }

  // listen for broadcasted staking-transaction and notify LOCK Api with txId (+ amount)
  // TODO: check for possible refactor to dispatch / component lifecycle-independence
  useEffect(() => {
    if (transaction?.tx?.txId != null && transactionCache != null) {
      LOCKdeposit(info?.id ?? 0, {
        asset: transactionCache.token.symbol,
        amount: transactionCache.amount,
        txId: transaction.tx.txId,
      })
        .then(setInfo)
        .then(() => setTransactionCache(undefined))
        .catch(WalletAlertErrorApi);
    }
  }, [transaction, transactionCache]);

  function calculateBalance(): number {
    switch (activeTab) {
      case LockStakingTab.Staking:
        return stakingAnalytics?.map((a) => a.tvl).reduce((prev, curr) => prev + curr) ?? 0;
      case LockStakingTab.YieldMachine:
        return BigNumber.sum(
          ...(yieldMachineAnalytics?.map((a) => getTokenPrice(a.asset, new BigNumber(a.tvl))) ?? [new BigNumber(0)]),
        ).toNumber();
    }
  }

  async function saveRewardRoutes(rewardRoutes: RewardRouteDto[], reinvestPercent: number): Promise<void> {
    if (!info) return;
    setIsSubmitting(true);
    const reinvestRoute = rewardRoutes.find((r) => r.isReinvest);
    if (reinvestRoute) {
      reinvestRoute.rewardPercent = reinvestPercent;
    } else {
      rewardRoutes.concat({
        isReinvest: true,
        label: 'Reinvest',
        rewardPercent: reinvestPercent,
        targetAddress: info.depositAddress,
        targetAsset: info.asset,
        targetBlockchain: 'DeFiChain',
        displayLabel: '',
      });
    }
    return LOCKrewardRoutes(
      info.id,
      rewardRoutes.filter((r) => !r.isReinvest || (r.isReinvest && reinvestPercent > 0)),
    )
      .then(setInfo)
      .catch(WalletAlertErrorApi)
      .finally(() => {
        setEditRewardRoutes(false);
        setIsSubmitting(false);
      });
  }

  const context: LockStakingInterface = {
    isLoading,
    fetch,
    activeTab,
    setActiveTab,
    info,
    setInfo,
    analytics,
    setTransactionCache,
    calculateBalance,
    editRewardRoutes,
    setEditRewardRoutes,
    saveRewardRoutes,
    activeStrategyType,
    setActiveStrategyType,
    rewardRoutes,
    isSubmitting,
  };

  return <LockStakingContext.Provider value={context}>{props.children}</LockStakingContext.Provider>;
}
