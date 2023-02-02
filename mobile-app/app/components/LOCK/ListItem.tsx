import { getNativeIcon } from '@components/icons/assets';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { Text, View } from 'react-native';

export enum ListItemStyle {
  ACTIVE,
  ACTIVE_ICON,
  PENDING,
}

interface ListItemProp {
  title?: string;
  value?: string;
  style: ListItemStyle;
  header?: boolean;
}

export function ListItem({ title, value, style, header }: ListItemProp): JSX.Element {
  const TokenIcon = getNativeIcon(icon() ?? '');

  function fieldStyle(): string {
    switch (style) {
      case ListItemStyle.ACTIVE:
        return 'text-base font-medium';
      case ListItemStyle.ACTIVE_ICON:
        return 'text-base font-medium pl-1';
      case ListItemStyle.PENDING:
        return 'text-gray-300 text-base font-medium';
    }
  }

  function icon(): string | undefined {
    if (!title) return title;
    if (title === 'DFI') return '_UTXO';
    if (['DUSD-DFI', 'csETH-dETH'].includes(title)) return title;
    if (!title.startsWith('d')) return `d${title}`;
    return title;
  }

  function isPoolPair(): boolean {
    return icon()?.includes('-') ?? false;
  }

  return (
    <View style={tailwind('flex-row justify-between', { 'py-1': style === ListItemStyle.ACTIVE_ICON })}>
      <View style={tailwind('flex-row')}>
        {style === ListItemStyle.ACTIVE_ICON &&
          (isPoolPair() ? (
            <View style={tailwind('flex-row')}>
              <PoolPairIcon symbolA={icon()?.split('-')?.[0] ?? ''} symbolB={icon()?.split('-')?.[1] ?? ''} />
            </View>
          ) : (
            <TokenIcon width={23} height={23} />
          ))}
        <Text style={tailwind(fieldStyle(), { 'font-bold': header })}>
          {translate('LOCK/LockDashboardScreen', title ?? '')}
        </Text>
      </View>
      <Text style={tailwind(fieldStyle())}>{translate('LOCK/LockDashboardScreen', value ?? '')}</Text>
    </View>
  );
}

function PoolPairIcon(props: { symbolA: string; symbolB: string }): JSX.Element {
  const IconA = getNativeIcon(props.symbolA);
  const IconB = getNativeIcon(props.symbolB);
  return (
    <>
      <IconA height={16} width={16} style={tailwind('z-10')} />
      <IconB height={16} width={16} style={tailwind('-ml-2.5 mt-1.5')} />
    </>
  );
}
