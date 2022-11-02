import * as Localization from 'expo-localization'
import { forwardRef } from 'react'
import * as React from 'react'
import { KeyboardTypeOptions, Platform, TextInput, TextInputProps } from 'react-native'
import { useThemeContext } from '@shared-contexts/ThemeProvider'
import { tailwind } from '@tailwind'
import { theme } from '../../tailwind.config'

interface ThemedTextInputProps {
  lock?: boolean
}

export const ThemedTextInput = forwardRef(
  function (props: React.PropsWithChildren<TextInputProps> & ThemedTextInputProps, ref: React.Ref<any>): JSX.Element {
  const { isLight } = useThemeContext()
  const {
    style,
    keyboardType,
    ...otherProps
  } = props

  const getKeyboardType = (): KeyboardTypeOptions | undefined => {
    if (keyboardType === 'numeric' && Platform.OS === 'ios' && Localization.decimalSeparator !== '.') {
      return 'default'
    }
    return keyboardType
  }

  return (
    <TextInput
      placeholderTextColor={isLight ? 'rgba(0, 0, 0, 0.4)' : theme.extend.colors.dfxgray[500]}
      style={[style, tailwind((props.lock === true) ? 'text-black' : isLight ? 'text-gray-700' : 'text-white')]}
      ref={ref}
      {...otherProps}
      keyboardType={getKeyboardType()}
    />
  )
})
