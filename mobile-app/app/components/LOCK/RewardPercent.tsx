import { tailwind } from '@tailwind';
import { useState } from 'react';
import { Control, Controller } from 'react-hook-form';
import { Text, TextInput, View } from 'react-native';
import { theme } from '../../tailwind.config';

interface PercentForm {
  control: Control;
  token: string;
  id: number;
  initialValue?: string;
  onPercentChange: (name: string, id: number, percentage: string) => void;
}

export function RewardPercent({ control, token, id, initialValue, onPercentChange }: PercentForm): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const defaultValue = initialValue ?? '';
  const name = `${id}-percentage`;
  const max = 100;

  function keepValueInRange(value: string): string {
    return '' + Math.min(+value, max);
  }

  return (
    <>
      <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        render={({ field: { onChange, value } }) => (
          <View
            style={tailwind('rounded border-2 border-lockGray-100 w-16 h-full flex justify-center', {
              'border-lock-400': isFocused,
            })}
          >
            <View style={tailwind('flex-row justify-end items-center')}>
              <TextInput
                style={[tailwind('px-0.5 text-black text-base font-normal'), { lineHeight: 21 }]}
                autoCapitalize="none"
                keyboardType="number-pad"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={onChange}
                onChangeText={(text) => onPercentChange(name, id, keepValueInRange(text))}
                selectionColor={theme.extend.colors.lock[200]}
                placeholderTextColor={theme.extend.colors.lockGray[200]}
                placeholder={'0'}
                value={value}
                selection={{ start: value.length, end: value.length }}
                autoFocus={initialValue === undefined}
              />
              <Text style={[tailwind('pr-0.5 text-black text-base font-normal'), { lineHeight: 21 }]}>%</Text>
            </View>
          </View>
        )}
        rules={{
          required: true,
          pattern: /^\d*\.?\d*$/,
          max,
          validate: {
            greaterThanZero: (value: string) => Number(value) > 0,
          },
        }}
      />
    </>
  );
}
