import { tailwind } from '@tailwind';
import { View } from 'react-native';
import { ThemedActivityIndicator, ThemedText } from './themed';

export function Loading({ message, lock }: { message?: string; lock?: boolean }): JSX.Element | null {
  if (message === undefined) {
    return null;
  }
  return (
    <View style={tailwind('flex-row justify-center p-2', { 'bg-white': lock })}>
      <ThemedActivityIndicator lock={lock} />

      <ThemedText style={tailwind('ml-2 text-sm')} lock={lock}>
        {message}
      </ThemedText>
    </View>
  );
}
