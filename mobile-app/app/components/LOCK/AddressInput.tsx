import { getReleaseChannel } from '@api/releaseChannel';
import { getEnvironment } from '@environment';
import { tailwind } from '@tailwind';
import { useState } from 'react';
import { Control, Controller } from 'react-hook-form';
import { Text, TextInput, View } from 'react-native';
import { theme } from '../../tailwind.config';

interface AddressForm {
  control: Control;
  initialValue?: string;
  onAddressChanged: (address: string) => void;
}

export function AddressInput({ control, initialValue, onAddressChanged }: AddressForm): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const defaultValue = initialValue ?? '';

  return (
    <>
      <Controller
        control={control}
        defaultValue={defaultValue}
        name={'address'}
        render={({ field: { onChange, value } }) => (
          <View
            style={tailwind('rounded border-2 border-lockGray-100 h-12 flex justify-center', {
              'border-lock-400': isFocused,
            })}
          >
            <View style={tailwind('flex-row justify-start items-center')}>
              <TextInput
                style={[tailwind('px-2 text-black text-base font-normal'), { lineHeight: 21 }]}
                autoCapitalize="none"
                keyboardType="default"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={onChange}
                onChangeText={onAddressChanged}
                selectionColor={theme.extend.colors.lock[200]}
                placeholderTextColor={theme.extend.colors.lockGray[200]}
                placeholder={'Address: e.g.: df1qx5hraps...'}
                value={value}
                autoFocus={initialValue === undefined}
              />
            </View>
          </View>
        )}
        rules={{
          required: true,
          pattern: getEnvironment(getReleaseChannel()).addressFormat,
        }}
      />
    </>
  );
}
