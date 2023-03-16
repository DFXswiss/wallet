import { tailwind } from '@tailwind';
import React, { useEffect, useState } from 'react';
import { CheckBox } from 'react-native-elements';

interface ThemedCheckboxProps {
  initialValue?: boolean;
  text: string;
  onChanged: (isClicked: boolean) => void;
}

export function ThemedCheckbox({ text, onChanged, initialValue = false }: ThemedCheckboxProps): JSX.Element {
  const [isClicked, setIsClicked] = useState(initialValue);

  useEffect(() => {
    onChanged(isClicked);
  }, [isClicked, onChanged]);

  return (
    <CheckBox
      title={text}
      checkedColor="#F5516C"
      checkedIcon="checkbox-outline"
      uncheckedColor="#F5516C"
      uncheckedIcon="checkbox-blank-outline"
      iconType="material-community"
      textStyle={tailwind('text-white text-sm font-light')}
      containerStyle={tailwind('border-0 bg-transparent')}
      checked={isClicked}
      onPress={() => setIsClicked(!isClicked)}
    />
  );
}
