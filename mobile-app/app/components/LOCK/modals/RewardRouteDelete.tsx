import { memo } from 'react';
import * as React from 'react';
import { tailwind } from '@tailwind';
import { Text, View } from 'react-native';
import { translate } from '@translations';
import { Button } from '@components/Button';
import TrashIcon from '@assets/LOCK/Trash.svg';
import { RewardRouteDto } from '@shared-api/dfx/ApiService';

interface RewardRouteDeleteProps {
  route: RewardRouteDto;
  onCancel: () => void;
  onConfirm: () => void;
}

export const RewardRouteDelete = ({
  route,
  onConfirm,
  onCancel,
}: RewardRouteDeleteProps): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    return (
      <View style={tailwind('bg-white px-4 py-8 h-full flex-col items-center')}>
        <TrashIcon height={25.2} width={19.6} />
        <Text style={tailwind('text-base font-bold text-lock-200 py-2')}>
          {translate('LOCK/LockDashboardScreen', 'Remove {{asset}} as reward asset?', { asset: route.displayLabel })}
        </Text>
        <View style={tailwind('flex-row')}>
          <Button
            label={translate('LOCK/LockDashboardScreen', 'CANCEL')}
            margin="m-3 "
            padding="p-1"
            onPress={onCancel}
            color="secondary"
            fill="fill"
            lock
            grow
          />
          <Button
            label={translate('LOCK/LockDashboardScreen', 'REMOVE')}
            margin="my-3 mr-3"
            padding="p-1"
            onPress={onConfirm}
            fill="fill"
            lock
            grow
          />
        </View>
      </View>
    );
  });
