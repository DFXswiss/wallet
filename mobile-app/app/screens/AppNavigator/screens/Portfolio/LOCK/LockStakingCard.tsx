import { tailwind } from '@tailwind';
import BigNumber from 'bignumber.js';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ThemedActivityIndicator, ThemedIcon, ThemedText, ThemedTextBasic } from '@components/themed';
import LOCKunlockedIcon from '@assets/LOCK/Lock_unlocked.svg';
import { translate } from '@translations';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { PortfolioParamList } from '../PortfolioNavigator';
import {
  LOCKgetAllAnalytics,
  LOCKgetAllStaking,
  LOCKgetUser,
  StakingAnalyticsOutputDto,
  StakingOutputDto,
} from '@shared-api/dfx/ApiService';
import { WalletAlertErrorApi } from '@components/WalletAlert';
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider';
import { useLock } from './LockContextProvider';
import { useTokenPrice } from '../hooks/TokenPrice';
import { BalanceText } from '../components/BalanceText';
import NumberFormat from 'react-number-format';
import { getPrecisedTokenValue } from '../../Auctions/helpers/precision-token-value';
import { PortfolioButtonGroupTabKey } from '../components/TotalPortfolio';

interface LockStakingCardProps {
  denominationCurrency: string;
  refreshTrigger: boolean;
}

export function LockStakingCard({ refreshTrigger, denominationCurrency }: LockStakingCardProps): JSX.Element {
  const navigation = useNavigation<NavigationProp<PortfolioParamList>>();
  const { LOCKcreateWebToken } = useDFXAPIContext();
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  // data loading logic
  const [isLoading, setIsLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  // checks if there's a LOCK user
  const { isKycComplete, setKycComplete } = useLock();

  const [stakingInfo, setStakingInfo] = useState<StakingOutputDto>();
  const [yieldInfo, setYieldInfo] = useState<StakingOutputDto>();
  const [analytics, setAnalytics] = useState<StakingAnalyticsOutputDto>();

  const { getTokenPrice } = useTokenPrice(denominationCurrency);
  const usdAmount =
    stakingInfo != null && yieldInfo != null
      ? stakingInfo.balances
          .concat(yieldInfo.balances)
          .map((b) => getTokenPrice(b.asset, new BigNumber(b.balance)))
          .reduce((prev, curr) => prev.plus(curr))
      : null;

  const enterLOCK = (): void => {
    LOCKcreateWebToken()
      .then(() => {
        setLoggedIn(true);
        fetchLockData(true);
      })
      .catch(WalletAlertErrorApi);
  };

  const fetchLockData = (loggedIn: boolean): void => {
    setIsLoading(true);

    const getUser = loggedIn
      ? LOCKgetUser()
          .then((user) => setKycComplete(user))
          .catch(WalletAlertErrorApi)
      : Promise.resolve();

    const getStakingInfo = loggedIn
      ? LOCKgetAllStaking()
          .then(([stkInfo, ymInfo]) => {
            setStakingInfo(stkInfo);
            setYieldInfo(ymInfo);
          })
          .catch(WalletAlertErrorApi)
      : Promise.resolve();

    const getAnalytics = LOCKgetAllAnalytics()
      .then((analytics) => {
        setAnalytics(analytics.sort((a, b) => b.apr - a.apr)?.[0]);
      })
      .catch(console.error);

    Promise.all([getUser, getStakingInfo, getAnalytics]).finally(() => setIsLoading(false));
  };

  useEffect(() => fetchLockData(loggedIn), [refreshTrigger]);

  const navigateToLock = (): void => {
    isKycComplete ? navigation.navigate('LockDashboardScreen') : navigation.navigate('LockKycScreen');
  };

  return (
    <>
      <View style={tailwind('m-4 px-4 pt-4 pb-2 bg-lock-500 rounded-lg')}>
        <TouchableOpacity
          onPress={loggedIn ? navigateToLock : enterLOCK}
          disabled={isLoading}
          style={tailwind('border-0')}
        >
          <View style={tailwind('flex-row items-center')}>
            <LOCKunlockedIcon height={48} width={48} />
            <View style={tailwind('mx-3 flex-auto')}>
              <ThemedText
                dark={tailwind('text-gray-200')}
                light={tailwind('text-black')}
                style={tailwind('font-medium')}
              >
                {translate('LOCK/LockCard', 'Interests by LOCK')}
              </ThemedText>
              {analytics != null && (
                <ThemedText
                  dark={tailwind('text-gray-200')}
                  light={tailwind('text-gray-600')}
                  numberOfLines={1}
                  style={tailwind('text-xs')}
                >
                  {translate('LOCK/LockCard', 'up to {{apy}}% APY / {{apr}}% APR', {
                    apr: analytics.apr,
                    apy: analytics.apy,
                  })}
                </ThemedText>
              )}
            </View>
            {usdAmount != null && (
              <NumberFormat
                displayType="text"
                decimalScale={2}
                prefix={
                  denominationCurrency === undefined || denominationCurrency === PortfolioButtonGroupTabKey.USDT
                    ? '≈ $'
                    : undefined
                }
                suffix={
                  denominationCurrency !== undefined && denominationCurrency !== PortfolioButtonGroupTabKey.USDT
                    ? ` ${denominationCurrency}`
                    : undefined
                }
                renderText={(value) => (
                  <>
                    <View style={tailwind('flex leading-6 items-end')}>
                      <BalanceText
                        dark={tailwind('text-gray-200')}
                        light={tailwind('text-black')}
                        style={tailwind('flex-wrap')}
                        value={value}
                      />
                    </View>
                  </>
                )}
                thousandSeparator
                value={getPrecisedTokenValue(usdAmount)}
              />
            )}
          </View>
        </TouchableOpacity>
        {isLoading && stakingInfo == null && yieldInfo == null && (
          <ThemedActivityIndicator
            size="large"
            color="#fff"
            style={tailwind('absolute inset-0 items-center justify-center')}
          />
        )}
        {isBreakdownExpanded && (
          <View style={tailwind('mx-2 pt-4 pb-3')}>
            <ThemedTextBasic style={tailwind('text-sm')}>
              {translate(
                'LOCK/LockCard',
                "The custodial service powered by LOCK invests customers' assets into the DeFiChain, a decentralized protocol, to earn interests via Staking.",
              )}
            </ThemedTextBasic>
          </View>
        )}
        <View style={tailwind('flex-row justify-center items-center')}>
          <TouchableOpacity onPress={() => setIsBreakdownExpanded(!isBreakdownExpanded)} testID="details_dfi">
            <ThemedIcon
              light={tailwind('text-gray-600')}
              dark={tailwind('text-dfxgray-300')}
              iconType="MaterialIcons"
              name={!isBreakdownExpanded ? 'expand-more' : 'expand-less'}
              size={24}
            />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
