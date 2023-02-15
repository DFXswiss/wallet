import { useThemeContext } from '@shared-contexts/ThemeProvider';
import { tailwind } from '@tailwind';

import { TouchableOpacity } from 'react-native';
import { ThemedProps } from './index';

type ThemedTouchableOpacityProps = TouchableOpacity['props'] & ThemedProps & { lock?: boolean; lockDark?: boolean };

export function ThemedTouchableOpacity(props: ThemedTouchableOpacityProps): JSX.Element {
  const { isLight } = useThemeContext();
  const {
    style,
    light = tailwind('bg-white', {
      'border-b border-gray-200': !props.lock,
      'text-black bg-white': props.lock,
      'text-black bg-lockGray-100 border-b border-lockGray-200': props.lockDark,
    }),
    dark = tailwind('bg-dfxblue-800', {
      'border-b border-dfxblue-900': !props.lock,
      'text-black bg-white': props.lock,
      'text-black bg-lockGray-100 border-b border-lockGray-200': props.lockDark,
    }),
    ...otherProps
  } = props;
  return <TouchableOpacity style={[style, isLight ? light : dark]} {...otherProps} />;
}
