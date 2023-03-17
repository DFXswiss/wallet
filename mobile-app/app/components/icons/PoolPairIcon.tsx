import { tailwind } from '@tailwind';
import { View } from 'react-native';
import { getNativeIcon } from './assets';

export function PoolPairIcon(props: { symbolA: string; symbolB: string; big?: boolean }): JSX.Element {
  const IconA = getNativeIcon(adaptSymbol(props.symbolA));
  const IconB = getNativeIcon(adaptSymbol(props.symbolB));

  function adaptSymbol(symbol: string): string {
    if (symbol === 'DFI') return '_UTXO';
    if (!symbol.startsWith('d')) return `d${symbol}`;
    return symbol;
  }

  function getSize(): number {
    return props.big ? 22 : 16;
  }

  return (
    <View style={tailwind('flex-row')}>
      <IconA height={getSize()} width={getSize()} style={tailwind('z-10')} />
      <IconB height={getSize()} width={getSize()} style={tailwind('-ml-2.5 mt-1.5', { '-ml-3 mt-3': props.big })} />
    </View>
  );
}
