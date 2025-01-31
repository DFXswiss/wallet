import { useThemeContext } from '@shared-contexts/ThemeProvider';
import { MaterialCommunityIcons, MaterialIcons, Feather, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { IconProps } from '@expo/vector-icons/build/createIconSet';
import { tailwind } from '@tailwind';

import { ThemedProps } from './index';

export type IconType =
  | 'MaterialCommunityIcons'
  | 'MaterialIcons'
  | 'Feather'
  | 'DfxIcon'
  | 'FontAwesome'
  | 'FontAwesome5';
export type IconName =
  | React.ComponentProps<typeof MaterialIcons>['name']
  | React.ComponentProps<typeof MaterialCommunityIcons>['name']
  | React.ComponentProps<typeof Feather>['name']
  | React.ComponentProps<typeof FontAwesome>['name']
  | React.ComponentProps<typeof FontAwesome5>['name'];

interface IThemedIcon {
  iconType: IconType;
  lock?: boolean;
  primary?: boolean;
}

export class CustomIcon extends MaterialIcons {
  icon: string | undefined;
} // TODO: rework for custom Icon set

type ThemedIconProps = ThemedProps & IThemedIcon & IconProps<any>;

export function ThemedIcon(props: ThemedIconProps): JSX.Element {
  const { isLight } = useThemeContext();
  const {
    style,
    iconType,
    light = tailwind('text-black', { 'text-black': props.lock, 'text-lock-200': props.lock && props.primary }),
    dark = tailwind('text-white text-opacity-90', {
      'text-black': props.lock,
      'text-lock-200': props.lock && props.primary,
    }),
    ...otherProps
  } = props;
  if (iconType === 'MaterialIcons') {
    return <MaterialIcons style={[style, isLight ? light : dark]} {...otherProps} />;
  } else if (iconType === 'MaterialCommunityIcons') {
    return <MaterialCommunityIcons style={[style, isLight ? light : dark]} {...otherProps} />;
  } else if (iconType === 'DfxIcon') {
    return <CustomIcon style={[style, isLight ? light : dark]} {...otherProps} />;
  } else if (iconType === 'FontAwesome') {
    return <FontAwesome style={[style, isLight ? light : dark]} {...otherProps} />;
  } else if (iconType === 'FontAwesome5') {
    return <FontAwesome5 style={[style, isLight ? light : dark]} {...otherProps} />;
  } else if (iconType === 'Feather') {
    return <Feather style={[style, isLight ? light : dark]} {...otherProps} />;
  } else {
    return <></>;
  }
}
