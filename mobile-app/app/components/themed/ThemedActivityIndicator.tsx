import { useThemeContext } from '@shared-contexts/ThemeProvider';

import { ActivityIndicator, ActivityIndicatorProps } from 'react-native';
import { theme } from '../../tailwind.config';
import { ThemedProps } from './index';

type ThemedTextProps = ActivityIndicatorProps & ThemedProps & { lock?: boolean };

export function ThemedActivityIndicator(props: ThemedTextProps): JSX.Element {
  const { isLight } = useThemeContext();
  const { style, ...otherProps } = props;
  return (
    <ActivityIndicator
      color={isLight ? '#ff00af' : props.lock !== true && theme.extend.colors.dfxred[500]}
      style={style}
      {...otherProps}
    />
  );
}
