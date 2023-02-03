import BigNumber from 'bignumber.js';

import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { ThemedText, ThemedTouchableOpacity } from './themed';

export enum AmountButtonTypes {
  half = '50%',
  max = 'MAX',
}

interface SetAmountButtonProps {
  type: AmountButtonTypes;
  onPress: (amount: string) => void;
  amount: BigNumber;
  customText?: string;
  lock?: boolean;
}

export function SetAmountButton(props: SetAmountButtonProps): JSX.Element {
  const decimalPlace = 8;
  const text = props.customText !== undefined ? props.customText : translate('components/max', props.type);
  return (
    <ThemedTouchableOpacity
      dark={tailwind(props.lock === true ? 'bg-lock-500' : 'border border-dfxblue-900')}
      light={tailwind('border border-dfxgray-300')}
      onPress={() => {
        props.onPress(
          props.type === AmountButtonTypes.half
            ? props.amount.div(2).toFixed(decimalPlace)
            : props.amount.toFixed(decimalPlace),
        );
      }}
      style={[tailwind('flex px-2 py-1 rounded'), props.type === AmountButtonTypes.half && tailwind('mr-1')]}
      testID={`${props.type}_amount_button`}
    >
      <ThemedText
        dark={tailwind(props.lock === true ? 'text-lock-200' : 'text-dfxred-500')}
        light={tailwind('text-primary-500')}
        style={tailwind('text-center font-medium')}
      >
        {text}
      </ThemedText>
    </ThemedTouchableOpacity>
  );
}
