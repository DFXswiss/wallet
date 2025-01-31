import { View } from 'react-native';
import { NumericFormat as NumberFormat } from 'react-number-format';
import { tailwind } from '@tailwind';
import { getNativeIcon } from './icons/assets';
import { ThemedText, ThemedView } from './themed';

export function TokenBalanceRow(props: { lhs: string; rhs: { value: string | number; testID: string } }): JSX.Element {
  const TokenIcon = getNativeIcon(props.lhs);
  return (
    <ThemedView
      dark={tailwind('bg-dfxblue-800 border-b border-dfxblue-900')}
      light={tailwind('bg-white border-b border-gray-200')}
      style={tailwind('p-4 flex-row items-center w-full')}
    >
      <View style={tailwind('flex-1 flex-row items-center')}>
        <ThemedText style={tailwind('font-medium')} testID={`${props.rhs.testID}_unit`}>
          {props.lhs}
        </ThemedText>
      </View>

      <View style={tailwind('flex-row items-center')}>
        <NumberFormat
          decimalScale={8}
          displayType="text"
          renderText={(val: string) => (
            <ThemedText
              dark={tailwind('text-dfxgray-400')}
              light={tailwind('text-dfxgray-500')}
              style={tailwind('flex-wrap font-medium text-right mr-1')}
              testID={props.rhs.testID}
            >
              {val}
            </ThemedText>
          )}
          thousandSeparator
          value={props.rhs.value}
        />
        <TokenIcon style={tailwind('mt-0.5')} height={17} width={17} />
      </View>
    </ThemedView>
  );
}
