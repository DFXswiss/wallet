import { memo } from 'react';
import * as React from 'react';
import { tailwind } from '@tailwind';
import { Text, View } from 'react-native';
import { translate } from '@translations';

export const RewardStrategyInfo = (): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    const depositToRewards = [
      translate('LOCK/LockDashboardScreen', 'Deposit = Rewards'),
      translate('LOCK/LockDashboardScreen', 'DFI = DFI+dUSD'),
      translate('LOCK/LockDashboardScreen', 'dUSD = DFI+dUSD'),
      translate('LOCK/LockDashboardScreen', 'dBTC/dETH/dUSDT/dUSDC* = DFI+dUSD'),
      translate('LOCK/LockDashboardScreen', 'dToken (dSPY, dQQQ, d...)* = DFI'),
    ];

    return (
      <View style={tailwind('bg-white px-4 py-2 h-full')}>
        <Text style={tailwind('text-black text-base font-normal')}>
          {translate(
            'LOCK/LockDashboardScreen',
            'Depending on the asset you deposited into the Yield Machine, you will receive DFI or DFI and dUSD as rewards.',
          )}
        </Text>
        <View style={tailwind('pt-2')}>
          {depositToRewards.map((text, index) => (
            <Text
              key={index}
              style={[tailwind('text-black text-sm font-normal', { 'font-bold': index === 0 }), { lineHeight: 24 }]}
            >
              {text}
            </Text>
          ))}
        </View>
        <Text style={tailwind('text-black text-xs font-normal pt-2')}>
          {translate('LOCK/LockDashboardScreen', '*coming soon')}
        </Text>
      </View>
    );
  });
