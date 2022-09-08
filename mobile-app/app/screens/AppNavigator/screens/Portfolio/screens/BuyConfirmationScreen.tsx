// import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { StackActions } from '@react-navigation/native'
import { ThemedScrollView, ThemedSectionTitle, ThemedText, ThemedTextBasic, ThemedView } from '@components/themed'
import { tailwind } from '@tailwind'
import { translate } from '@translations'
import { PortfolioParamList } from '../PortfolioNavigator'
import { Button } from '@components/Button'
import { FlatList } from 'react-native-gesture-handler'
import BankTransferIcon from '@assets/images/dfx_buttons/misc/BankTransfer.svg'
import React from 'react'
import { InfoText } from '@components/InfoText'
import { View } from '@components'

type Props = StackScreenProps<PortfolioParamList, 'BuyConfirmationScreen'>

export function BuyConfirmationScreen ({ route, navigation }: Props): JSX.Element {
  const buttonTitle = translate('screens/BuyConfirmationScreen', 'BANK TRANSFER COMPLETED')

  const buyPaymentInfo = route.params.buyPaymentInfo

  const paymentInfoList: ListItemProps[] = [
    { title: 'IBAN', detail: buyPaymentInfo.iban },
    { title: 'SWIFT/BIC', detail: buyPaymentInfo.bic },
    { title: 'PURPOSE OF PAYMENT', detail: buyPaymentInfo.remittanceInfo },
    { title: 'BENEFICIARY', detail: buyPaymentInfo.name },
    { detail: `${buyPaymentInfo.street} ${buyPaymentInfo.number}` },
    { detail: `${buyPaymentInfo.zip} ${buyPaymentInfo.city}` },
    { detail: buyPaymentInfo.country }
  ]

  const transactionDetailList: ListItemProps[] = [
    { title: 'You are buying', detail: route.params.transactionDetails.token },
    { title: 'Your IBAN', detail: route.params.transactionDetails.iban },
    { title: 'Transaction Fee', detail: `${buyPaymentInfo.fee}%` }
  ]

  return (
    <ThemedScrollView style={tailwind('flex-col h-full text-lg')}>

      <View style={tailwind('mx-4')}>
        <BankTransferIcon style={tailwind('mt-4 self-center')} />

        <ThemedSectionTitle
          dark={tailwind('text-dfxred-500')}
          testID='network_title'
          text={translate('screens/BuyConfirmationScreen', 'PAYMENT INFORMATION')}
        />
        <ThemedView dark={tailwind('bg-dfxblue-800 rounded-md border border-dfxblue-900')}>
          <List list={paymentInfoList} copyIcon />
        </ThemedView>

        <InfoText
          testID='dfx_kyc_info'
          text={translate('screens/BuyConfirmationScreen', 'Please transfer the purchase amount using this information. The payment purpose is important and also that the payment is executed from your stored IBAN!')}
          style={tailwind('mt-4')}
          noBorder
        />

        <ThemedSectionTitle
          testID='network_title'
          text={translate('screens/SendScreen', 'TRANSACTION DETAILS')}
        />
        <ThemedView dark={tailwind('rounded-md border-2 border-dfxblue-800')}>
          <List list={transactionDetailList} />
        </ThemedView>

        <Button
          fill='fill'
          label={translate('screens/common', buttonTitle)}
          margin='m-8 mb-24'
          onPress={() => navigation.dispatch(StackActions.popToTop())}
          testID={`button_finish_${buttonTitle}`}
          title={buttonTitle}
          style={tailwind('flex')}
        />
      </View>

    </ThemedScrollView>
  )
}

interface ListProps {
  list: ListItemProps[]
  copyIcon?: boolean
}
function List ({ list, copyIcon }: ListProps): JSX.Element {
  return (
    <FlatList
      data={list}
      renderItem={({ item }) => <ListItem title={item.title} detail={item.detail} copyIcon={copyIcon} />}
      scrollEnabled={false}
    />
  )
}

interface ListItemProps {
  title?: string
  detail: string
  copyIcon?: boolean
}
function ListItem ({ title, detail, copyIcon }: ListItemProps): JSX.Element {
  return (
    <ThemedView dark={tailwind('flex px-4 border-b border-dfxblue-900', (copyIcon ?? false) ? ' py-2' : 'py-1')}>
      {(title != null) && (
        <View style={tailwind('flex-row')}>
          <ThemedText dark={tailwind('text-xs text-dfxgray-400')}>
            {translate('screens/BuyConfirmationScreen', title)}
          </ThemedText>

          {title === 'Your IBAN' && (
            <ThemedView style={tailwind('ml-3 px-2')} dark={tailwind('bg-dfxgray-300 rounded border-b border-dfxgray-500')}>
              <ThemedTextBasic style={tailwind('text-xs')} dark={tailwind('text-dfxblue-900')}>
                SEPA instant available
              </ThemedTextBasic>
            </ThemedView>
          )}
        </View>
      )}
      <ThemedTextBasic style={tailwind('text-lg')}>
        {translate('screens/BuyConfirmationScreen', detail)}
      </ThemedTextBasic>
    </ThemedView>
  )
}
