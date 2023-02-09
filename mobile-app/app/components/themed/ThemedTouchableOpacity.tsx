import { useThemeContext } from '@shared-contexts/ThemeProvider';
import { tailwind } from '@tailwind';

import { TouchableOpacity } from 'react-native';
import { ThemedProps } from './index';

type ThemedTouchableOpacityProps = TouchableOpacity['props'] & ThemedProps & { lock?: boolean };

export function ThemedTouchableOpacity(props: ThemedTouchableOpacityProps): JSX.Element {
  const { isLight } = useThemeContext();
  const {
    style,
    light = tailwind('bg-white border-b border-gray-200', {
      'text-black bg-lockGray-100 border-b border-lockGray-200': props.lock,
    }),
    dark = tailwind('bg-dfxblue-800 border-b border-dfxblue-900', {
      'text-black bg-lockGray-100 border-b border-lockGray-200': props.lock,
    }),
    ...otherProps
  } = props;
  return <TouchableOpacity style={[style, isLight ? light : dark]} {...otherProps} />;
}
