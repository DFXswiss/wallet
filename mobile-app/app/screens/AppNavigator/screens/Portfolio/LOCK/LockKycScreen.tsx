/* eslint-disable no-constant-condition */
import { StackScreenProps } from '@react-navigation/stack'
import { NavigationProp, StackActions, useNavigation } from '@react-navigation/native'
import { TouchableOpacity, Text, Linking, ScrollView } from 'react-native'
import { getColor, tailwind } from '@tailwind'
import { translate } from '@translations'
import { PortfolioParamList } from '../PortfolioNavigator'
import { Button } from '@components/Button'
import { View } from '@components'
import React, { useEffect, useState } from 'react'
import Checkbox from 'expo-checkbox'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Rabbit from '@assets/LOCK/Rabbit.svg'
import Snail from '@assets/LOCK/Snail.svg'
import { getUser, LOCKpostKyc, transferKyc } from '@shared-api/dfx/ApiService'
import { WalletAlertErrorApi } from '@components/WalletAlert'
import { useLock } from './LockContextProvider'
import { kycCompleted } from '@shared-api/dfx/models/User'
import { openURL } from '@api/linking'

type Props = StackScreenProps<PortfolioParamList, 'LockKycScreen'>

const LOCKwalletName = 'LOCK.space'

export function LockKycScreen ({ route }: Props): JSX.Element {
  const navigation = useNavigation<NavigationProp<PortfolioParamList>>()
  const [handoverKyc, setHandoverKyc] = useState(false)
  const [newKyc, setNewKyc] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasKyc, setHasKyc] = useState(false)

  const toggleHandover = (): void => {
    setHandoverKyc((value) => {
      if (!value) {
        setNewKyc(false)
      }
      return !value
    })
  }

  const toggleNew = (): void => {
    setNewKyc((value) => {
      if (!value) {
        setHandoverKyc(false)
      }
      return !value
    })
  }

  useEffect(() => {
    getUser().then((user) => {
      const kyc = kycCompleted(user.kycStatus)
      setHasKyc(kyc)
      if (!kyc) {
        setNewKyc(true)
      }
    })
  }, [])

  const buttonText = newKyc ? 'START KYC' : 'SUBMIT KYC DATA'

  const { setKycComplete } = useLock()

  const submit = (): void => {
    setIsSubmitting(true)

    LOCKpostKyc()
      .then(async (kycData) => {
        if (newKyc) {
          return await openURL(kycData.kycLink)
        } else {
          return await transferKyc(LOCKwalletName)
            .then(() => {
              setKycComplete()
              navigation.dispatch(StackActions.popToTop())
              navigation.navigate('LockDashboardScreen')
            })
          }
        })
      .catch(WalletAlertErrorApi)
      .finally(() => setIsSubmitting(false))
  }

  return (
    <View style={tailwind('flex-1 bg-gray-200 border-t border-dfxgray-500')}>
      <ScrollView contentContainerStyle={tailwind('flex-grow flex-col p-8')}>
        {hasKyc
          ? (
            <>
              <View style={tailwind('bg-white rounded-md p-2')}>
                <View style={tailwind('flex-row pb-2 mb-4 border-b border-gray-200')}>
                  <Checkbox
                    value={handoverKyc}
                    onValueChange={toggleHandover}
                    style={tailwind('h-6 w-6 rounded self-center ml-2 mr-3')}
                    color={handoverKyc ? getColor('lock-800') : undefined}
                  />
                  <TouchableOpacity onPress={toggleHandover} style={tailwind('flex-col')}>
                    <Text style={tailwind('text-lg font-bold')}>
                      {translate('LOCK/LockKycScreen', 'KYC Handover')}
                      <Rabbit height={22} width={22} style={tailwind('mr-4')} />
                    </Text>
                    <Text style={tailwind('flex self-center text-base mr-8')}>
                      {translate('LOCK/LockKycScreen', 'Transfer your KYC (Know-your-customer) data from DFX.swiss to LOCK and start staking right away.')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={tailwind('self-center text-xs')}>
                  {translate('LOCK/LockKycScreen', 'An additional KYC Process can be avoided by transferring your KYC data from DFX SA to MN IT Services LLC (Entity operating LOCK Staking) to start staking at LOCK immediately.\nFor this, I hereby agree to the transfer of my personal data that I have provided to DFX SA, incorporated in Switzerland, during the onboarding process to MN IT Services LLC on St.Vincent and the Grenadines for the purposes of carrying out know your customer (KYC) and anti-money-laundering (AML) procedures.I acknowledge that my personal data will be transferred to a country outside of the EU/Switzerland that is handling  data protection differently which means that my rights might not be enforceable in such country.You can withdraw your consent at any time.Please note however, that the withdrawal of your consent does not affect the lawfulness of processing based on your consent before its withdrawal.For further information please see our Privacy Notice or contact us: info@lock.space')}
                </Text>
              </View>

              <View style={tailwind('bg-white rounded-md p-2 my-8')}>
                <View style={tailwind('flex-row pb-2')}>
                  <Checkbox
                    value={newKyc}
                    onValueChange={toggleNew}
                    style={tailwind('h-6 w-6 rounded self-center ml-2 mr-3')}
                    color={newKyc ? getColor('lock-800') : undefined}
                  />
                  <TouchableOpacity onPress={toggleNew} style={tailwind('flex-col')}>
                    <Text style={tailwind('text-lg font-bold')}>
                      {translate('LOCK/LockKycScreen', 'New KYC Process')}
                      <Snail height={22} width={22} style={tailwind('mr-4')} />
                    </Text>
                    <Text style={tailwind('flex self-center text-base mr-8')}>
                      {translate('LOCK/LockKycScreen', 'New KYC (Know-your-customer) via LOCK (operated by MN IT Services LLC based on St. Vincent and the Grenadines).')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )
        : (
          <>
            <View style={tailwind('bg-white rounded-md p-2 mb-8')}>
              <View style={tailwind('flex-col pb-2')}>
                <Text style={tailwind('text-lg font-bold')}>
                  {translate('LOCK/LockKycScreen', 'KYC Process')}
                </Text>
                <Text style={tailwind('flex self-center text-base mr-8')}>
                  {translate('LOCK/LockKycScreen', 'KYC (Know-your-customer) via LOCK (operated by MN IT Services LLC based on St. Vincent and the Grenadines).')}
                </Text>
              </View>
            </View>
            <View style={tailwind('flex-1')} />
          </>
        )}

        <TouchableOpacity style={tailwind('flex-row mb-2')} onPress={async () => await Linking.openURL('https://lock.space/terms')}>
          <MaterialCommunityIcons
            style={tailwind('mr-2 text-lock-800 self-center')}
            iconType='MaterialCommunityIcons'
            name='information-outline'
            size={24}
          />
          <Text style={tailwind('text-xs font-medium underline mr-8')}>
            {translate('LOCK/LockKycScreen', 'I take note that by pressing “{{buttonText}}” I agree with the terms and conditions of MN IT Services LLC.', { buttonText })}
          </Text>
        </TouchableOpacity>

        <Button
          fill='fill'
          label={translate('LOCK/LockKycScreen', buttonText)}
          margin=''
          onPress={submit}
          lock
          isSubmitting={isSubmitting}
          disabled={isSubmitting || (!handoverKyc && !newKyc)}
        />
      </ScrollView>
    </View>
  )
}
