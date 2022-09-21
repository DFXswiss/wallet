import { StackScreenProps } from '@react-navigation/stack'
import { NavigationProp, StackActions, useNavigation } from '@react-navigation/native'
import { TouchableOpacity, Text } from 'react-native'
import { tailwind } from '@tailwind'
import { translate } from '@translations'
import { PortfolioParamList } from '../PortfolioNavigator'
import { Button } from '@components/Button'
import { View } from '@components'
import React, { useState } from 'react'
import Checkbox from 'expo-checkbox'

type Props = StackScreenProps<PortfolioParamList, 'LockScreen'>

export function LockScreen ({ route }: Props): JSX.Element {
  const navigation = useNavigation<NavigationProp<PortfolioParamList>>()
  const [acknowledged, setAcknowledged] = useState(false)
  const toggleSwitch = (): void => setAcknowledged(previousState => !previousState)

  return (
    <View style={tailwind('flex-col p-8 bg-gray-200 border-t border-dfxgray-500 h-full text-lg')}>

      <View style={tailwind('bg-white rounded-md p-2')}>
        <View style={tailwind('flex-row pb-2 mb-4 border-b border-gray-200')}>
          <Checkbox
            value={acknowledged}
            onValueChange={toggleSwitch}
            style={tailwind('h-6 w-6 rounded self-center ml-2 mr-3')}
          // color={isEnabled ? getColor('brand-v2-500') : undefined}
          />
          <View style={tailwind('flex-col')}>
            <Text style={tailwind('text-lg font-bold')}>
              {translate('LOCK/LockScreen', 'KYC Handover')}
            </Text>
            <Text style={tailwind('flex self-center text-base mr-8')}>
              {translate('LOCK/LockScreen', 'Transfer your KYC (Know-your-customer) data from DFX.swiss to LOCK and start staking right away.')}
            </Text>
          </View>
        </View>

        <Text style={tailwind('self-center text-xs')}>
          {translate('LOCK/LockScreen', 'An additional KYC Process can be avoided by transferring your KYC data from DFX SA to MN IT Services LLC (Entity operating LOCK Staking) to start staking at LOCK immediately.\nFor this, I hereby agree to the transfer of my personal data that I have provided to DFX SA, incorporated in Switzerland, during the onboarding process to MN IT Services LLC on St.Vincent and the Grenadines for the purposes of carrying out know your customer (KYC) and anti-money-laundering (AML) procedures.I acknowledge that my personal data will be transferred to a country outside of the EU/Switzerland that is handling  data protection differently which means that my rights might not be enforceable in such country.You can withdraw your consent at any time.Please note however, that the withdrawal of your consent does not affect the lawfulness of processing based on your consent before its withdrawal.For further information please see our Privacy Notice or contact us: info @lock.space.')}
        </Text>
      </View>

      <TouchableOpacity disabled style={tailwind('bg-white rounded-md py-4 px-8 mt-8')}>
        <Text style={tailwind('ml-6 text-lg font-bold', !acknowledged ? 'text-gray-300' : '')}>
          {translate('LOCK/LockScreen', 'New KYC Process - tbd.')}
        </Text>
        <Text style={tailwind('ml-6 text-base', !acknowledged ? 'text-gray-300' : '')}>
          {translate('LOCK/LockScreen', 'New KYC (Know-your-customer) verification via LOCK.')}
        </Text>
      </TouchableOpacity>

      <View style={tailwind('flex-grow')} />

      <Button
        fill='fill'
        label={translate('LOCK/LockScreen', 'SUBMIT KYC DATA')}
        margin=''
        onPress={() => navigation.dispatch(StackActions.popToTop())}
        style={tailwind('flex')}
        color='secondary'
        disabled={!acknowledged}
      />
    </View>
  )
}
