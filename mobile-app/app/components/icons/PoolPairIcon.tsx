import { tailwind } from '@tailwind';
import { View } from 'react-native';
import { getNativeIcon } from './assets';

export function PoolPairIcon(props: { symbolA: string; symbolB: string }): JSX.Element {
  const IconA = getNativeIcon(adaptSymbol(props.symbolA));
  const IconB = getNativeIcon(adaptSymbol(props.symbolB));

  function adaptSymbol(symbol: string): string {
    if (symbol === 'DFI') return '_UTXO';
    if (!symbol.startsWith('d')) return `d${symbol}`;
    return symbol;
  }

  function getSize(): number {
    return 16;
  }

  return (
    <View style={tailwind('flex-row')}>
      <IconA height={getSize()} width={getSize()} style={tailwind('z-10')} />
      <IconB height={getSize()} width={getSize()} style={tailwind('-ml-2.5 mt-1.5')} />
    </View>
  );
}
