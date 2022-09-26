import React from 'react'
import { ThemedTextBasic, ThemedView } from '@components/themed'
import { tailwind } from '@tailwind'
import { translate } from '@translations'
import SepaInstantIcon from '@assets/images/dfx_buttons/misc/SEPAinstant.svg'
import SepaInstantIconWhite from '@assets/images/dfx_buttons/misc/SEPAinstant_white.svg'

export interface SepaInstantComponentProps {
  widget?: boolean
  invertedColor?: boolean
  red?: boolean
}

export function SepaInstantComponent ({ widget, invertedColor, red }: SepaInstantComponentProps): JSX.Element {
  return (
    <ThemedView
      style={tailwind('flex-row py-0.5', (widget ?? false) ? 'px-3' : '')}
      dark={tailwind({
        'bg-dfxgray-300 ml-4 rounded border-b border-dfxgray-300': widget,
        // 'bg-white': invertedColor,
        // '': !invertedColor
        'bg-dfxred-500 px-2 rounded': red
      })}
    >
      {(invertedColor ?? false)
      ? (
        <SepaInstantIconWhite fill={[44, 44, 44, 0]} style={tailwind('self-center mr-1')} />
      )
      : (
        <SepaInstantIcon fill={[44, 44, 44, 0]} style={tailwind('self-center mr-1')} />
      )}
      <ThemedTextBasic style={tailwind('text-xs')} dark={tailwind((invertedColor ?? false) ? 'text-white' : 'text-dfxblue-900')}>
        {translate('components/SepaInstant', 'SEPA instant available')}
      </ThemedTextBasic>
    </ThemedView>
  )
}
