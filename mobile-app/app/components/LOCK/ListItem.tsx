import { getNativeIcon } from '@components/icons/assets';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { Text, TouchableOpacity, View } from 'react-native';
import TrashIcon from '@assets/LOCK/Trash.svg';
import { RewardPercent } from './RewardPercent';
import { Control } from 'react-hook-form';
import { PoolPairIcon } from '@components/icons/PoolPairIcon';

export enum ListItemStyle {
  ACTIVE,
  ACTIVE_ICON,
  ACTIVE_ICON_EDIT,
  PENDING,
}

interface ListItemProp {
  title: string;
  value?: string;
  style: ListItemStyle;
  header?: boolean;
  showsPercent?: boolean;
  onPress?: () => void;
  control?: Control;
  onPercentChange?: (name: string, token: string, percentage: string) => void;
}

export function ListItem({
  title,
  value,
  style,
  header,
  showsPercent,
  onPress,
  control,
  onPercentChange,
}: ListItemProp): JSX.Element {
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

  return (
    <View style={tailwind('flex-row justify-between items-center h-9', { 'py-0.5': shouldDisplayIcon() })}>
      <View style={tailwind('flex-row items-center')}>
        {shouldDisplayIcon() &&
          (title.includes('-') ? (
            <PoolPairIcon symbolA={title.split('-')?.[0] ?? ''} symbolB={title.split('-')?.[1] ?? ''} />
          ) : (
            <TokenIcon width={23} height={23} />
          ))}
        <Text style={tailwind('font-medium', fieldStyle(), { 'font-bold': header })}>
          {translate('LOCK/LockDashboardScreen', title)}
        </Text>
        {style === ListItemStyle.ACTIVE_ICON_EDIT && (
          <TouchableOpacity style={tailwind('px-2')} onPress={onPress}>
            <TrashIcon height={14.4} width={11.2} />
          </TouchableOpacity>
        )}
      </View>
      {style === ListItemStyle.ACTIVE_ICON_EDIT && control && onPercentChange ? (
        <RewardPercent control={control} token={title} initialValue={value} onPercentChange={onPercentChange} />
      ) : (
        <Text style={tailwind('font-normal', fieldStyle(), { 'font-medium': header })}>
          {translate('LOCK/LockDashboardScreen', `${value ?? ''}${showsPercent ? '%' : ''}`)}
        </Text>
      )}
    </View>
  );
}
