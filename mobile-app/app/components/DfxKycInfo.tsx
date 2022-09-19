import { Fiat } from '@shared-api/dfx/models/Fiat'
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider'
import { translate } from '@translations'
import BigNumber from 'bignumber.js'

import { StyleProp, ViewStyle } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { InfoText } from './InfoText'

interface DfxKycInfoProps {
  style?: StyleProp<ViewStyle>
  calcKyc?: {
    amount: string
    currency: Fiat
  }
}

const KYC_MAX_AMOUNT = 1000

export function DfxKycInfo (props: DfxKycInfoProps): JSX.Element {
const { openDfxServices } = useDFXAPIContext()
  const amount = new BigNumber(props.calcKyc?.amount ?? 0)
  const showKycInfo = !(props.calcKyc?.currency.name === 'EUR' && amount.isLessThan(KYC_MAX_AMOUNT))
  return (
    <>
      {showKycInfo && (
        <TouchableOpacity
          onPress={async () => await openDfxServices()}
        >
          <InfoText
            testID='dfx_kyc_info'
            text={translate('components/DfxKycInfo', 'Your account needs to get verified once your daily transaction volume exceeds 1000 € per day.  If you want to increase daily trading limit, please complete our KYC (Know-Your-Customer) process.')}
            style={props.style}
          />
        </TouchableOpacity>
      )}
    </>
  )
}
