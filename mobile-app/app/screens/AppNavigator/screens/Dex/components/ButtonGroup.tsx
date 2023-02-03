import { ThemedProps, ThemedText, ThemedTouchableOpacity, ThemedView } from '@components/themed';
import { tailwind } from '@tailwind';
import BigNumber from 'bignumber.js';
import { StyleProp, TextStyle, TouchableOpacityProps, View } from 'react-native';

interface ButtonGroupProps {
  buttons: Buttons[];
  activeButtonGroupItem: string;
  testID: string;
  labelStyle?: StyleProp<TextStyle>;
  containerThemedProps?: ThemedProps;
  modalStyle?: StyleProp<TextStyle>;
  lightThemeStyle?: { [key: string]: string };
  darkThemeStyle?: { [key: string]: string };
  customButtonGroupStyle?: StyleProp<TouchableOpacityProps>;
  customActiveStyle?: ThemedProps;
  inverted?: boolean;
  lock?: boolean;
}

interface Buttons {
  id: string;
  label: string;
  handleOnPress: () => void;
}

export function ButtonGroup(props: ButtonGroupProps): JSX.Element {
  const buttonWidth = new BigNumber(100).dividedBy(props.buttons.length);
  return (
    <ThemedView
      light={props.lightThemeStyle ?? tailwind('bg-gray-100')}
      dark={props.darkThemeStyle ?? tailwind(props.lock === true ? 'bg-white' : 'bg-dfxblue-800')}
      style={tailwind(
        'flex flex-row ' + (props.lock === true ? 'rounded-md justify-evenly' : 'rounded-2xl justify-between'),
        { 'border border-lockGray-200': props.lock },
      )}
      testID={props.testID}
      {...props.containerThemedProps}
    >
      {props.buttons.map((button) => (
        <ButtonGroupItem
          label={button.label}
          onPress={button.handleOnPress}
          isActive={props.activeButtonGroupItem === button.id}
          width={buttonWidth}
          key={button.id}
          testID={`${props.testID}_${button.id}`}
          labelStyle={props.labelStyle}
          modalStyle={props.modalStyle}
          customButtonGroupStyle={props.customButtonGroupStyle}
          customActiveStyle={props.customActiveStyle}
          inverted={props.inverted}
          lock={props.lock}
        />
      ))}
    </ThemedView>
  );
}

interface ButtonGroupItemProps {
  label: string;
  onPress: () => void;
  isActive: boolean;
  width: BigNumber;
  testID: string;
  labelStyle?: StyleProp<TextStyle>;
  modalStyle?: StyleProp<TextStyle>;
  customButtonGroupStyle?: StyleProp<TouchableOpacityProps>;
  customActiveStyle?: ThemedProps;
  inverted?: boolean;
  lock?: boolean;
}

function ButtonGroupItem(props: ButtonGroupItemProps): JSX.Element {
  const buttonDark =
    props.isActive &&
    (props.inverted === true
      ? props.lock === true
        ? 'bg-white'
        : 'bg-dfxblue-800'
      : props.lock === true
      ? 'bg-lock-200'
      : 'bg-dfxblue-900');
  const textDark = props.isActive ? 'text-white' : props.lock === true ? 'text-lock-200' : 'text-dfxgray-300';

  return (
    <View style={tailwind(props.lock === true ? 'flex-1' : 'flex-shrink')}>
      <ThemedTouchableOpacity
        onPress={props.onPress}
        light={tailwind({ 'bg-primary-50': props.isActive })}
        dark={tailwind(buttonDark)}
        {...(props.isActive && props.customActiveStyle)}
        style={
          props.customButtonGroupStyle ?? [
            tailwind('m-0.5 py-2 px-3'),
            props.lock === true ? { borderRadius: 4 } : { borderRadius: 14 },
          ]
        }
        // TODO: (thabrad) check, from LW (somehow isn't working, maybe bc of below Text style) --> style={props.customButtonGroupStyle ?? [tailwind(['rounded-2xl break-words justify-center py-2 px-3']), { width: `${props.width.toFixed(2)}%` }]}
        testID={`${props.testID}${props.isActive ? '_active' : ''}`}
      >
        <ThemedText
          light={tailwind({ 'text-primary-500': props.isActive, 'text-gray-900': !props.isActive })}
          dark={tailwind(textDark)}
          style={props.modalStyle ?? tailwind('font-medium text-sm text-center', { 'font-bold': props.lock })}
        >
          {props.label}
        </ThemedText>
      </ThemedTouchableOpacity>
    </View>
  );
}
