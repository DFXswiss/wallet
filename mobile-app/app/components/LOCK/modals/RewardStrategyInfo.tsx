import { memo } from 'react';
import * as React from 'react';
import { tailwind } from '@tailwind';
import { Text, View } from 'react-native';
import { translate } from '@translations';

export const RewardStrategyInfo = (): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    return (
      <View style={tailwind('bg-white px-4 py-2 h-full')}>
        <Text style={tailwind('text-black text-base font-normal')}>
          {translate('LOCK/LockDashboardScreen', 'TODO explain why there are different rewards')}
        </Text>
      </View>
    );
  });
