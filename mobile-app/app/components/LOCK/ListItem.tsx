import { getNativeIcon } from '@components/icons/assets';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { Text, TouchableOpacity, View } from 'react-native';
import TrashIcon from '@assets/LOCK/Trash.svg';
import { RewardPercent } from './RewardPercent';
import { Control } from 'react-hook-form';
import { PoolPairIcon } from '@components/icons/PoolPairIcon';
import { ThemedIcon } from '@components/themed';

export enum ListItemStyle {
  ACTIVE,
  ACTIVE_INVALID,
  ACTIVE_ICON,
  ACTIVE_ICON_EDIT,
  PENDING,
}

interface ListItemProp {
  iconName?: string;
  title: string;
  subtitle?: string;
  value?: string;
  style: ListItemStyle;
  header?: boolean;
  showsPercent?: boolean;
  onPress?: () => void;
  control?: Control;
  onPercentChange?: (id: string, percentage: string) => void;
  rewardRouteId?: string;
}

export function ListItem({
  iconName,
  title,
  subtitle,
  value,
  style,
  header,
  showsPercent,
  onPress,
  control,
  onPercentChange,
  rewardRouteId,
}: ListItemProp): JSX.Element {
  const TokenIcon = getNativeIcon(icon() ?? '');

  function fieldStyle(): string {
    switch (style) {
      case ListItemStyle.ACTIVE:
      case ListItemStyle.ACTIVE_INVALID:
        return 'text-base';
      case ListItemStyle.ACTIVE_ICON:
        return 'text-base pl-2';
      case ListItemStyle.ACTIVE_ICON_EDIT:
        return 'text-base pl-2';
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
    return Boolean(iconName) || [ListItemStyle.ACTIVE_ICON, ListItemStyle.ACTIVE_ICON_EDIT].includes(style);
  }

  return (
    <View
      style={tailwind('flex-row justify-between items-start', {
        'py-0.5': shouldDisplayIcon(),
        'h-10': style !== ListItemStyle.PENDING,
        'h-9 items-center': header,
      })}
    >
      <View style={tailwind('flex-row items-start')}>
        {shouldDisplayIcon() && (
          <View style={tailwind('pt-0.5')}>
            {iconName ? (
              <ThemedIcon style={tailwind('pr-2')} iconType="MaterialIcons" name={iconName} size={23} lock primary />
            ) : title.includes('-') ? (
              <PoolPairIcon symbolA={title.split('-')?.[0] ?? ''} symbolB={title.split('-')?.[1] ?? ''} />
            ) : (
              <TokenIcon width={23} height={23} />
            )}
          </View>
        )}
        <View style={tailwind('flex-col')}>
          <View style={tailwind('flex-row')}>
            <Text
              style={[tailwind('font-medium text-base', fieldStyle(), { 'font-bold': header }), { lineHeight: 20 }]}
            >
              {title}
            </Text>
            {style === ListItemStyle.ACTIVE_ICON_EDIT && (
              <TouchableOpacity style={tailwind('px-2')} onPress={onPress}>
                <TrashIcon height={14.4} width={11.2} />
              </TouchableOpacity>
            )}
          </View>
          {subtitle && (
            <Text
              style={tailwind(fieldStyle(), 'text-xs font-normal text-lockGray-300', {
                'text-black': subtitle === 'Staking + Yield Machine',
              })}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {style === ListItemStyle.ACTIVE_ICON_EDIT && rewardRouteId && control && onPercentChange ? (
        <RewardPercent control={control} id={rewardRouteId} initialValue={value} onPercentChange={onPercentChange} />
      ) : (
        <Text
          style={tailwind('font-normal', fieldStyle(), {
            'font-medium': header,
            'text-red-500': style === ListItemStyle.ACTIVE_INVALID,
          })}
        >
          {translate('LOCK/LockDashboardScreen', `${value ?? ''}${showsPercent ? '%' : ''}`)}
        </Text>
      )}
    </View>
  );
}
