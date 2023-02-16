import { WalletAlertErrorApi } from '@components/WalletAlert';
import { LockStakingTab } from '@constants/LOCK/LockStakingTab';
import { RewardRouteDestination } from '@constants/LOCK/RewardRouteDestination';
import { TransactionCache } from '@constants/LOCK/TransactionCache';
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { useTokenPrice } from '@screens/AppNavigator/screens/Portfolio/hooks/TokenPrice';
import {
  LOCKgetAssets,
  LOCKdeposit,
  LOCKgetAllAnalytics,
  LOCKgetAllStaking,
  LOCKrewardRoutes,
  RewardRouteDto,
  StakingAnalyticsOutputDto,
  StakingOutputDto,
  StakingStrategy,
  StakingStatus,
} from '@shared-api/dfx/ApiService';
import { Asset } from '@shared-api/dfx/models/Asset';
import { useWalletContext } from '@shared-contexts/WalletContext';
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

  isSubmitting: boolean;
  editRewardRoutes: boolean;
  setEditRewardRoutes: (edit: boolean) => void;
  saveRewardRoutes: (rewardRoutes: RewardRouteDto[], reinvestPercent: number) => Promise<void>;

  assets?: Asset[];

  getAddressForDestination: (destination: RewardRouteDestination) => string | undefined;
  descriptionForTargetAddress: (route: RewardRouteDto) => string;
  isStakingActive(): boolean;
  isYieldMachineActive(): boolean;
}

const LockStakingContext = createContext<LockStakingInterface>(undefined as any);

export function useLockStakingContext(): LockStakingInterface {
  return useContext(LockStakingContext);
}

export function LockStakingContextProvider(props: PropsWithChildren<any>): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const { address } = useWalletContext();

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
  const [assets, setAssets] = useState<Asset[]>();

  const info = activeTab === LockStakingTab.Staking ? stakingInfo : yieldMachineInfo;
  const analytics = activeTab === LockStakingTab.Staking ? stakingAnalytics : yieldMachineAnalytics;
  const getActiveInfo = (): StakingOutputDto | undefined => {
    if (stakingInfo?.status === StakingStatus.ACTIVE) {
      return stakingInfo;
    } else if (yieldMachineInfo?.status === StakingStatus.ACTIVE) {
      return yieldMachineInfo;
    } else {
      return undefined;
    }
  };
  const rewardRoutes = getActiveInfo()?.rewardRoutes.map((r) => ({
    ...r,
    displayLabel: retrieveTokenWithSymbol(r.targetAsset)?.displaySymbol ?? '',
  }));

  function retrieveTokenWithSymbol(symbol: string): TokenData | undefined {
    return Object.values(tokens).find((t) => t.symbol === symbol);
  }

  function setInfo(info: StakingOutputDto) {
    activeTab === LockStakingTab.Staking ? setStakingInfo(info) : setYieldMachineInfo(info);
  }

  async function fetch(): Promise<void> {
    await Promise.all([fetchStakingInfo(), fetchAnalytics(), fetchAssets()]);
  }

  async function fetchStakingInfo(): Promise<void> {
    setIsLoading(true);

    await LOCKgetAllStaking()
      .then((infos) => {
        setStakingInfo(infos.filter((i) => i.strategy === StakingStrategy.MASTERNODE)[0]);
        setYieldMachineInfo(infos.filter((i) => i.strategy === StakingStrategy.LIQUIDITY_MINING)[0]);
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

  async function fetchAssets(): Promise<void> {
    await LOCKgetAssets().then(setAssets).catch(WalletAlertErrorApi);
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
    const activeInfo = getActiveInfo();
    if (!activeInfo) return;
    setIsSubmitting(true);
    // TODO (Krysh): remove this reinvest route handling
    const reinvestRoute = rewardRoutes.find((r) => r.isReinvest);
    if (reinvestRoute) {
      reinvestRoute.rewardPercent = reinvestPercent;
    } else {
      rewardRoutes = rewardRoutes.concat({
        isReinvest: true,
        label: 'Reinvest',
        rewardAsset: 'DFI',
        rewardPercent: reinvestPercent,
        targetAddress: activeInfo.depositAddress,
        targetAsset: activeInfo.asset,
        targetBlockchain: 'DeFiChain',
        displayLabel: '',
      });
    }
    return LOCKrewardRoutes(
      activeInfo.id,
      rewardRoutes.filter((r) => !r.isReinvest || (r.isReinvest && reinvestPercent > 0)),
    )
      .then((i) => {
        if (i.id === stakingInfo?.id) {
          setStakingInfo(i);
        } else if (i.id === yieldMachineInfo?.id) {
          setYieldMachineInfo(i);
        }
      })
      .catch(WalletAlertErrorApi)
      .finally(() => {
        setEditRewardRoutes(false);
        setIsSubmitting(false);
      });
  }

  function getAddressForDestination(destination: RewardRouteDestination): string | undefined {
    switch (destination) {
      case RewardRouteDestination.WALLET:
        return address;
      case RewardRouteDestination.STAKING:
        return stakingInfo?.depositAddress;
      case RewardRouteDestination.YIELD_MACHINE:
        return yieldMachineInfo?.depositAddress;
    }
  }

  function descriptionForTargetAddress(route: RewardRouteDto): string {
    switch (route.targetAddress) {
      case stakingInfo?.depositAddress:
        return 'Staking';
      case yieldMachineInfo?.depositAddress:
        return 'Yield Machine';
      case address:
        return 'Wallet';
      default:
        return `...${route.targetAddress.slice(-4)}`;
    }
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
    rewardRoutes,
    isSubmitting,
    assets,
    getAddressForDestination,
    descriptionForTargetAddress,
    isStakingActive: () => stakingInfo?.status === StakingStatus.ACTIVE,
    isYieldMachineActive: () => yieldMachineInfo?.status === StakingStatus.ACTIVE,
  };

  return <LockStakingContext.Provider value={context}>{props.children}</LockStakingContext.Provider>;
}
