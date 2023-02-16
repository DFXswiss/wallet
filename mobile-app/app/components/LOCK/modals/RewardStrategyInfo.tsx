import { memo } from 'react';
import * as React from 'react';
import { tailwind } from '@tailwind';
import { ScrollView, Text, View } from 'react-native';
import { translate } from '@translations';

export const RewardStrategyInfo = (): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    const depositToRewards = ['DFI', 'dUSD', 'dBTC', 'dETH', 'dSPY'];

    return (
      <ScrollView style={tailwind(' bg-white')}>
        <View style={tailwind('bg-white px-4 py-2 h-full')}>
          <Text style={tailwind('text-black text-base font-normal')}>
            {translate('LOCK/LockDashboardScreen', 'You will always receive rewards in the deposited asset.')}
          </Text>
          <View style={tailwind('pt-4')}>
            {depositToRewards.map((token, index) => (
              <Text key={index} style={[tailwind('text-black text-base font-normal')]}>
                {`${token} > ${token} rewards`}
              </Text>
            ))}
            <Text style={[tailwind('text-black text-base font-normal')]}>...</Text>
          </View>
          <Text style={tailwind('text-black text-base font-normal pt-4')}>
            {translate(
              'LOCK/LockDashboardScreen',
              'By default all these rewards are 100% reinvested. You have the possibility to diversify your rewards via the Rewards Strategy and to diversify them into other assets instead of reinvesting.',
            )}
          </Text>
        </View>
      </ScrollView>
    );
  });
