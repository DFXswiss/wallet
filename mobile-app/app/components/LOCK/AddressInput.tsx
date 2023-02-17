import { getReleaseChannel } from '@api/releaseChannel';
import { ThemedView } from '@components/themed';
import { WalletTextInput } from '@components/WalletTextInput';
import { getEnvironment } from '@environment';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { useState } from 'react';
import { Control, Controller } from 'react-hook-form';
import { theme } from '../../tailwind.config';

interface AddressForm {
  control: Control;
  initialValue?: string;
  onAddressChanged: (address: string) => void;
  onClearButtonPress: () => void;
}

export function AddressInput({
  control,
  initialValue,
  onAddressChanged,
  onClearButtonPress,
}: AddressForm): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const defaultValue = initialValue ?? '';

  return (
    <>
      <Controller
        control={control}
        defaultValue={defaultValue}
        name={'address'}
        render={({ field: { onChange, value } }) => (
          <ThemedView
            dark={tailwind('bg-transparent border-lockGray-100', {
              'border-lock-400': isFocused,
            })}
            light={tailwind('bg-transparent border-lockGray-100', {
              'border-lock-400': isFocused,
            })}
            style={tailwind('rounded border-2 flex justify-center')}
          >
            <WalletTextInput
              autoCapitalize="none"
              onChange={onChange}
              onChangeText={onAddressChanged}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              selectionColor={theme.extend.colors.lock[200]}
              placeholderTextColor={theme.extend.colors.lockGray[200]}
              placeholder={translate('LOCK/LockDashboardScreen', 'Address: e.g.: df1qx5hraps...')}
              style={[tailwind(' text-black text-base font-normal'), { lineHeight: 21 }]}
              value={value}
              onClearButtonPress={onClearButtonPress}
              displayClearButton={false}
              inputType="default"
              hasBottomSheet
              multiline
              lock
            />
          </ThemedView>
        )}
        rules={{
          required: true,
          pattern: getEnvironment(getReleaseChannel()).addressFormat,
        }}
      />
    </>
  );
}
