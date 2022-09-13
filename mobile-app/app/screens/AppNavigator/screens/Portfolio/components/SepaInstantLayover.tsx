import React, { useEffect, useState } from 'react'
import { Platform, StatusBar, View } from 'react-native'
import { ThemedProps, ThemedTextBasic, ThemedView } from '@components/themed'
import { tailwind } from '@tailwind'
import { translate } from '@translations'
import Popover, { PopoverPlacement } from 'react-native-popover-view'
import { Button } from '@components/Button'
import { InfoText } from '@components/InfoText'
import { SepaInstantComponent } from './SepaInstantComponent'

export interface LayoverProps extends ThemedProps {
  onDismiss?: () => void
}

export interface LayoverInternalProps extends LayoverProps {
  type: LayoverType
}

enum LayoverType {
  SepaInstantOverlay,
  BuySuccessOverlay
}

export function SepaInstantOverlay (props: LayoverProps): JSX.Element {
  return Overlay({ ...props, type: LayoverType.SepaInstantOverlay })
}

export function BuySuccessOverlay (props: LayoverProps): JSX.Element {
  return Overlay({ ...props, type: LayoverType.BuySuccessOverlay })
}

export function Overlay (props: LayoverInternalProps): JSX.Element {
  const offsetAndroidHeight = StatusBar.currentHeight !== undefined ? (StatusBar.currentHeight * -1) : 0
  const [showPopover, setShowPopover] = useState(true)

  // to fix memory leak error
  useEffect(() => {
    // May work on Web, but not officially supported, as per documentation, add condition to hide popover/tooltip
    if (Platform.OS === 'web') {
      setTimeout(() => setShowPopover(false), 2000)
    }
  }, [showPopover])

  const onDismissInternal = (): void => {
    setShowPopover(false)
    props.onDismiss?.()
  }

  return (
    <Popover
      verticalOffset={Platform.OS === 'android' ? offsetAndroidHeight : 0} // to correct tooltip position on android
      placement={PopoverPlacement.AUTO}
      popoverStyle={tailwind('bg-dfxblue-900 rounded-3xl')}
      isVisible={showPopover}
      onRequestClose={() => onDismissInternal()}
    >
      <ThemedView style={tailwind('mx-4')} dark={tailwind('bg-dfxblue-900')}>
        {props.type === LayoverType.SepaInstantOverlay &&
          <View style={tailwind('mt-8 mb-2 flex-shrink self-center')}>
            <SepaInstantComponent widget />
          </View>}
        <ThemedTextBasic
          style={tailwind('py-2 px-4 text-lg text-center')}
          light={tailwind('text-white')}
          dark={tailwind('text-white')}
          testID='icon-tooltip-text'
        >
          {props.type === LayoverType.SepaInstantOverlay &&
            translate('components/SepaInstantLayover', 'Both DFX and your bank support SEPA instant transfers. This means that we can process your deposit even faster if you use this option.')}
          {props.type === LayoverType.BuySuccessOverlay &&
            translate('components/SepaInstantLayover', 'As soon as the bank transfer arrives on our bank account we will book your desired asset. Thank you for using DFX.swiss.')}
        </ThemedTextBasic>
        {props.type === LayoverType.SepaInstantOverlay &&
          <InfoText
            testID='dfx_sepa_info'
            text={translate('components/SepaInstantLayover', 'Please note that your bank may charge fees for real-time payments.')}
            style={tailwind('mx-4 mt-2')}
            noBorder
          />}
        <View style={tailwind('mb-2')}>
          <Button
            label={translate('components/SepaInstantLayover', 'Thanks for the note.')}
            onPress={() => onDismissInternal()}
            margin='m-4 '
          />
        </View>
      </ThemedView>
    </Popover>
  )
}
