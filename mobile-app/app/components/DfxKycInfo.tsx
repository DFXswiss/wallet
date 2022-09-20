import { Fiat } from '@shared-api/dfx/models/Fiat'
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider'
import { translate } from '@translations'
import BigNumber from 'bignumber.js'
import { useState } from 'react'

import { StyleProp, ViewStyle } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { InfoText } from './InfoText'
import { ThemedActivityIndicator } from '@components/themed'
import { tailwind } from '@tailwind'

interface DfxKycInfoProps {
  style?: StyleProp<ViewStyle>
  calcKyc?: {
    amount: string
    currency: Fiat
  }
}

const KYC_MAX_AMOUNT = 1000

export function DfxKycInfo (props: DfxKycInfoProps): JSX.Element {
  const amount = new BigNumber(props.calcKyc?.amount ?? 0)
  const showKycInfo = !(props.calcKyc?.currency.name === 'EUR' && amount.isLessThan(KYC_MAX_AMOUNT))
  const { openKycLink } = useDFXAPIContext()
  const [isLoadingKyc, setIsLoadingKyc] = useState(false)

  return (
    <>
      {showKycInfo && (
        <TouchableOpacity
          onPress={async () => {
            setIsLoadingKyc(true)
            openKycLink().finally(() => setIsLoadingKyc(false))
          }}
        >
          <InfoText
            testID='dfx_kyc_info'
            text={translate('components/DfxKycInfo', 'Your account needs to get verified once your daily transaction volume exceeds {{KYC_MAX_AMOUNT}} € per day. If you want to increase daily trading limit, please complete our KYC (Know-Your-Customer) process.', { KYC_MAX_AMOUNT })}
            style={props.style}
          />
          {(isLoadingKyc) && <ThemedActivityIndicator size='large' color='#65728a' style={tailwind('absolute inset-0 items-center justify-center')} />}
        </TouchableOpacity>
      )}
    </>
  )
}
