import { ThemedIcon } from '@components/themed';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { Text, TouchableOpacity } from 'react-native';

interface EditButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function EditButton({ onPress, disabled }: EditButtonProps): JSX.Element {
  return (
    <TouchableOpacity
      style={tailwind('flex-row rounded h-9 bg-lock-600 items-center justify-center', {
        'bg-lockGray-100': disabled,
      })}
      onPress={onPress}
      disabled={disabled}
    >
      <ThemedIcon
        style={tailwind('px-1')}
        light={tailwind('text-lock-100', { 'text-lockGray-200': disabled })}
        dark={tailwind('text-lock-100', { 'text-lockGray-200': disabled })}
        iconType="MaterialIcons"
        name="edit"
        size={18}
      />
      <Text
        style={tailwind('text-sm font-bold text-lock-100', {
          'text-lockGray-200': disabled,
        })}
      >
        {translate('LOCK/LockDashboardScreen', 'EDIT')}
      </Text>
      {disabled && (
        <Text style={tailwind('text-xs font-normal text-lockGray-200 pl-0.5')}>
          {translate('LOCK/LockDashboardScreen', 'coming soon')}
        </Text>
      )}
    </TouchableOpacity>
  );
}
