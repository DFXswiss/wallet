import { tailwind } from '@tailwind';
import { ThemedView, ThemedText } from '@components/themed';
import { NumericFormat as NumberFormat } from 'react-number-format';
import { StyleProp, ViewProps } from 'react-native';
import { TextProps } from '@components';
import { SuffixType } from './NumberRow';

interface InputHelperTextProps extends React.PropsWithChildren<ViewProps> {
  testID?: string;
  label: string;
  content: string;
  suffix?: string;
  suffixType?: SuffixType;
  styleProps?: StyleProp<TextProps>;
  labelStyleProps?: StyleProp<TextProps>;
  lock?: boolean;
  withoutBottomMargins?: boolean;
  withoutTopMargins?: boolean;
}
export function InputHelperText(props: InputHelperTextProps): JSX.Element {
  return (
    <ThemedView
      light={tailwind('bg-transparent')}
      dark={tailwind('bg-transparent')}
      style={tailwind('flex-1 flex-row flex-wrap mt-1 mb-4 text-sm', {
        'mb-0': props.withoutBottomMargins,
        'mt-0': props.withoutTopMargins,
      })}
    >
      <ThemedText
        light={tailwind('text-dfxgray-400')}
        dark={tailwind(props.lock === true ? 'text-black' : 'text-dfxgray-500')}
        style={[tailwind('text-sm', { 'text-xs': props.lock }), props.labelStyleProps]}
      >
        {`${props.label}`}
      </ThemedText>

      <NumberFormat
        decimalScale={8}
        displayType="text"
        renderText={(value) => (
          <ThemedText
            light={tailwind('text-gray-700')}
            dark={tailwind(props.lock === true ? 'text-black' : 'text-gray-200')}
            style={[tailwind('text-sm', { 'text-xs': props.lock }), props.styleProps]}
            testID={props.testID}
          >
            {value}
          </ThemedText>
        )}
        suffix={props.suffixType !== 'component' ? props.suffix : ''}
        thousandSeparator
        value={props.content}
      />
      {props.suffixType === 'component' && props.children}
    </ThemedView>
  );
}
