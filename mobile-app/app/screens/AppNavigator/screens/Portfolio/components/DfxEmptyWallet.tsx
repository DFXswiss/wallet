import { tailwind } from '@tailwind'
import { ThemedText, ThemedView } from '@components/themed'
import { translate } from '@translations'
import { TouchableOpacity } from 'react-native'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import { PortfolioParamList } from '../PortfolioNavigator'

export function DfxEmptyWallet (): JSX.Element {
    const navigation = useNavigation<NavigationProp<PortfolioParamList>>()

    return (
      <ThemedView
        light={tailwind('bg-gray-50')}
        style={tailwind('px-4 mt-4 pb-2 text-center')}
        testID='dfx_empty_wallet'
      >
        <ThemedText testID='empty_tokens_note' style={tailwind('font-normal text-sm text-center')}>
          {translate('components/DfxEmptyWallet', 'Add your DFI and other dTokens to get started or')}
        </ThemedText>
        <TouchableOpacity onPress={() => navigation.navigate('Buy')}>
          <ThemedText
            light={tailwind('text-primary-500')}
            dark={tailwind('text-dfxred-500')}
            style={tailwind('pb-1 font-normal text-sm text-center')}
            testID='empty_tokens_note'
          >
            {translate('components/DfxEmptyWallet', 'buy them with a bank transfer')}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    )
}
