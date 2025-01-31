import { tailwind } from '@tailwind';
import { TextProps } from '.';
import { ThemedIcon, ThemedProps, ThemedText, ThemedView } from './themed';

interface InfoTextProp extends ThemedProps, TextProps {
  text: string;
  type?: InfoTextType;
  simple?: boolean;
  noBorder?: boolean;
  lock?: boolean;
}

export type InfoTextType = 'warning' | 'error' | 'success';

export function InfoText(props: InfoTextProp): JSX.Element {
  const {
    simple,
    noBorder,
    type = 'warning',
    style,
    light = tailwind({
      'bg-warning-50 border-warning-200': type === 'warning',
      'bg-error-50 border-error-200': type === 'error',
      'bg-success-50 border-success-200': type === 'success',
      'bg-transparent': props.lock,
    }),
    dark = tailwind(simple ?? false ? '' : noBorder ?? false ? '' : 'bg-dfxblue-900 border-dfxblue-800', {
      'bg-transparent': props.lock,
    }),
    ...otherProps
  } = props;

  return (
    <ThemedView
      style={[style].concat(
        simple ?? false ? [] : [tailwind(noBorder ?? false ? '' : 'rounded border', 'p-2 flex-row')],
      )}
      light={light}
      dark={dark}
    >
      <ThemedIcon
        iconType="MaterialIcons"
        name={
          props.lock
            ? 'info-outline'
            : type === 'success'
            ? 'check-circle-outline'
            : type === 'warning'
            ? 'info'
            : 'warning'
        }
        size={props.lock ? 18 : 14}
        light={tailwind({
          'text-warning-500': type === 'warning',
          'text-error-500': type === 'error',
          'text-success-500': type === 'success',
          'text-black': props.lock,
        })}
        dark={tailwind({
          'text-dfxyellow-500': type === 'warning',
          'text-darkerror-500': type === 'error',
          'text-dfxgreen-500': type === 'success',
          'text-black': props.lock,
        })}
      />
      <ThemedText
        style={tailwind('text-xs pl-2 font-medium', simple ?? 'flex-1', { 'text-xs font-normal': props.lock })}
        light={tailwind('text-gray-600', { 'text-black': props.lock })}
        dark={tailwind('text-dfxgray-300', { 'text-black': props.lock })}
        {...otherProps}
      >
        {props.text}
      </ThemedText>
    </ThemedView>
  );
}
