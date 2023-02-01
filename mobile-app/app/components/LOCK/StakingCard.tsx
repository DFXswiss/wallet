import { Button } from '@components/Button';
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens';
import { StakingAction } from '@constants/LOCK/StakingAction';
import { RewardRoute, StakingAnalyticsOutputDto, StakingOutputDto, StakingStrategy } from '@shared-api/dfx/ApiService';
import { RootState } from '@store';
import { tokenSelectorByDisplaySymbol, tokensSelector, WalletToken } from '@store/wallet';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import BigNumber from 'bignumber.js';
import { Text, View } from 'react-native';
import NumberFormat from 'react-number-format';
import { useSelector } from 'react-redux';
import { ListItem, ListItemStyle } from './ListItem';
import { SymbolIcon } from '@components/SymbolIcon';

interface StakingCardProps {
  info: StakingOutputDto;
  analytics?: StakingAnalyticsOutputDto[];
  isLoading: boolean;
  openModal: (action: StakingAction, info: StakingOutputDto, token: WalletToken | TokenData) => void;
}

export function StakingCard({ info, analytics, isLoading, openModal }: StakingCardProps): JSX.Element {
  const token = useSelector((state: RootState) => tokenSelectorByDisplaySymbol(state.wallet, info.asset));
  const walletToken = useSelector((state: RootState) => tokensSelector(state.wallet)).find((t) =>
    info.balances.map((b) => b.asset).includes(t.displaySymbol),
  );

  const addAction = info.strategy === StakingStrategy.MASTERNODE ? 'STAKE' : 'DEPOSIT';
  const removeAction = info.strategy === StakingStrategy.MASTERNODE ? 'UNSTAKE' : 'WITHDRAW';

  const getReinvestPercent = (): number => {
    return new BigNumber(1)
      .minus(BigNumber.sum(...info.rewardRoutes.map((r) => new BigNumber(r.rewardPercent))))
      .multipliedBy(100)
      .toNumber();
  };

  const listItems = [
    ...info.rewardRoutes.map((route) => ({
      title: route.targetAsset,
      value: `${route.rewardPercent * 100}%`,
      style: ListItemStyle.ACTIVE_ICON,
    })),
    {
      title: translate('LOCK/LockDashboardScreen', 'Reinvest, {{asset}}', { asset: info.asset }),
      value: `${getReinvestPercent()}%`,
      style: ListItemStyle.ACTIVE,
    },
  ];

  return (
    <>
      {/* card header */}
      <View style={tailwind('py-1')} />
      {info.balances.map((balance, index) => (
        <View key={index} style={tailwind('flex flex-col px-4')}>
          <View style={tailwind('flex-row justify-between py-1')}>
            <View style={tailwind('flex-row')}>
              {info.strategy === StakingStrategy.MASTERNODE ? (
                <>
                  <SymbolIcon symbol={'_UTXO'} styleProps={tailwind('w-6 h-6')} />
                  <Text style={tailwind('text-base font-bold pl-1')}>
                    {translate('LOCK/LockDashboardScreen', 'DFI')}
                  </Text>
                </>
              ) : (
                <Text style={tailwind('text-base font-bold')}>
                  {translate('LOCK/LockDashboardScreen', balance.asset)}
                </Text>
              )}
              {info.balances.length > 1 && analytics?.find((a) => a.asset === balance.asset) !== undefined && (
                <NumberFormat
                  value={analytics?.find((a) => a.asset === balance.asset)?.apy}
                  decimalScale={2}
                  displayType="text"
                  renderText={(value) => (
                    <Text style={tailwind('text-lock-800 text-xs font-bold px-1 py-0.5')}>
                      {translate('LOCK/LockDashboardScreen', '{{apy}}% APY', { apy: value })}
                    </Text>
                  )}
                />
              )}
            </View>
            <NumberFormat
              value={balance.balance ?? 0}
              thousandSeparator
              decimalScale={2}
              displayType="text"
              renderText={(value) => (
                <Text style={tailwind('text-base font-medium')}>
                  {translate('LOCK/LockDashboardScreen', '{{amount}} {{asset}}', {
                    amount: value,
                    asset: balance.asset,
                  })}
                </Text>
              )}
            />
          </View>
          {balance.pendingDeposits > 0 && (
            <NumberFormat
              value={balance.pendingDeposits}
              thousandSeparator
              decimalScale={2}
              displayType="text"
              renderText={(value) => (
                <ListItem
                  title={translate('LOCK/LockDashboardScreen', 'Pending Deposits')}
                  value={`+${value} ${balance.asset}`}
                  style={ListItemStyle.PENDING}
                />
              )}
            />
          )}
          {balance.pendingWithdrawals > 0 && (
            <NumberFormat
              value={balance.pendingWithdrawals}
              thousandSeparator
              decimalScale={2}
              displayType="text"
              renderText={(value) => (
                <ListItem
                  title={translate('LOCK/LockDashboardScreen', 'Pending Withdrawals')}
                  value={`-${value} ${balance.asset}`}
                  style={ListItemStyle.PENDING}
                />
              )}
            />
          )}
        </View>
      ))}

      <View style={tailwind('border-b border-gray-200 py-1')} />

      {/* card content / staking details */}
      <View style={tailwind('px-4 py-2 flex flex-col')}>
        <Text style={tailwind('text-base font-bold')}>{translate('LOCK/LockDashboardScreen', 'Reward strategy')}</Text>
        {listItems.map((item, index) => (
          <ListItem key={index} title={item.title} value={item.value} style={item.style} />
        ))}
      </View>
      <View style={tailwind('flex-row bg-lock-450 rounded-b-md justify-between')}>
        <Button
          label={translate('LOCK/LockDashboardScreen', addAction)}
          margin="m-3 "
          padding="p-1"
          onPress={() => walletToken != null && openModal(addAction, info, walletToken)}
          lock
          grow
          disabled={isLoading || walletToken == null || new BigNumber(walletToken.amount).isLessThanOrEqualTo(0)}
          isSubmitting={isLoading}
        />
        <Button
          label={translate('LOCK/LockDashboardScreen', removeAction)}
          margin="my-3 mr-3"
          padding="p-1"
          onPress={() => token != null && openModal(removeAction, info, token)}
          lock
          grow
          disabled={isLoading || token == null || !info?.balances.some((b) => b.balance > 0)}
          isSubmitting={isLoading}
        />
      </View>
    </>
  );
}
