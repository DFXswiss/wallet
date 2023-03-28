import { forwardRef } from 'react';
import { useThemeContext } from '@shared-contexts/ThemeProvider';
import { tailwind } from '@tailwind';

import { FlatList } from 'react-native';
import { ThemedProps } from './index';

type ThemedFlatListProps = FlatList['props'] & ThemedProps & { lock?: boolean };

export const ThemedFlatList = forwardRef(function (props: ThemedFlatListProps, ref: React.Ref<any>): JSX.Element {
  const { isLight } = useThemeContext();
  const {
    style,
    light = tailwind('bg-gray-100', { 'bg-white': props.lock }),
    dark = tailwind('bg-dfxblue-900', { 'bg-white': props.lock }),
    ...otherProps
  } = props;

  return <FlatList style={[style, isLight ? light : dark]} ref={ref} {...otherProps} />;
});
