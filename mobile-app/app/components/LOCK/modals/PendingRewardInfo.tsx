import { memo } from 'react';
import * as React from 'react';
import { tailwind } from '@tailwind';
import { ScrollView, Text, View } from 'react-native';
import { translate } from '@translations';

export const PendingRewardInfo = (): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    return (
      <ScrollView style={tailwind(' bg-white')}>
        <View style={tailwind('bg-white px-4 py-2 h-full')}>
          <Text style={tailwind('text-black text-base font-normal')}>
            {translate(
              'LOCK/LockDashboardScreen',
              'Please note that the blockchain-side transaction will be performed once the rewards in the selected asset are at least $1.',
            )}
          </Text>
        </View>
      </ScrollView>
    );
  });
