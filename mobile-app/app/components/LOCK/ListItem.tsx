import { getNativeIcon } from '@components/icons/assets';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { Text, TouchableOpacity, View } from 'react-native';
import TrashIcon from '@assets/LOCK/Trash.svg';

export enum ListItemStyle {
  ACTIVE,
  ACTIVE_ICON,
  ACTIVE_ICON_EDIT,
  PENDING,
}

interface ListItemProp {
  title?: string;
  value?: string;
  style: ListItemStyle;
  header?: boolean;
  onPress?: () => void;
}

export function ListItem({ title, value, style, header, onPress }: ListItemProp): JSX.Element {
  const TokenIcon = getNativeIcon(icon() ?? '');

  function fieldStyle(): string {
    switch (style) {
      case ListItemStyle.ACTIVE:
        return 'text-base';
      case ListItemStyle.ACTIVE_ICON:
        return 'text-base pl-1';
      case ListItemStyle.ACTIVE_ICON_EDIT:
        return 'text-base pl-1';
      case ListItemStyle.PENDING:
        return 'text-lockGray-300 text-sm';
    }
  }

  function icon(): string | undefined {
    if (!title) return title;
    if (title === 'DFI') return '_UTXO';
    if (['DUSD-DFI', 'csETH-dETH'].includes(title)) return title;
    if (!title.startsWith('d')) return `d${title}`;
    return title;
  }

  function shouldDisplayIcon(): boolean {
    return [ListItemStyle.ACTIVE_ICON, ListItemStyle.ACTIVE_ICON_EDIT].includes(style);
  }

  function isPoolPair(): boolean {
    return icon()?.includes('-') ?? false;
  }

  return (
    <View style={tailwind('flex-row justify-between items-center h-8', { 'py-1': shouldDisplayIcon() })}>
      <View style={tailwind('flex-row items-center')}>
        {shouldDisplayIcon() &&
          (isPoolPair() ? (
            <View style={tailwind('flex-row')}>
              <PoolPairIcon symbolA={icon()?.split('-')?.[0] ?? ''} symbolB={icon()?.split('-')?.[1] ?? ''} />
            </View>
          ) : (
            <TokenIcon width={23} height={23} />
          ))}
        <Text style={tailwind('font-medium', fieldStyle(), { 'font-bold': header })}>
          {translate('LOCK/LockDashboardScreen', title ?? '')}
        </Text>
        {style === ListItemStyle.ACTIVE_ICON_EDIT && (
          <TouchableOpacity style={tailwind('px-2')} onPress={onPress}>
            <TrashIcon height={12} width={9.33} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={tailwind('font-normal', fieldStyle(), { 'font-medium': header })}>
        {translate('LOCK/LockDashboardScreen', value ?? '')}
      </Text>
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
