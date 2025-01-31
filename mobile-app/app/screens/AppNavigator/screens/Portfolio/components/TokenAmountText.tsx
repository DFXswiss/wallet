import { tailwind } from '@tailwind';
import { View } from '@components';
import { NumericFormat as NumberFormat } from 'react-number-format';
import { BalanceText } from '@screens/AppNavigator/screens/Portfolio/components/BalanceText';
import { ActiveUSDValue } from '@screens/AppNavigator/screens/Loans/VaultDetail/components/ActiveUSDValue';
import BigNumber from 'bignumber.js';

interface TokenAmountTextProps {
  testID: string;
  isBalancesDisplayed: boolean;
  usdAmount: BigNumber;
  tokenAmount: string;
  denominationCurrency: string;
  decimalScale?: number;
}

export function TokenAmountText({
  testID,
  isBalancesDisplayed,
  usdAmount,
  tokenAmount,
  denominationCurrency,
  decimalScale = 8,
}: TokenAmountTextProps): JSX.Element {
  return (
    <View style={tailwind('flex-row')}>
      <NumberFormat
        decimalScale={decimalScale}
        displayType="text"
        renderText={(value) => (
          <>
            <View style={tailwind('flex leading-6 items-end')}>
              <BalanceText
                dark={tailwind('text-gray-200')}
                light={tailwind('text-black')}
                style={tailwind('flex-wrap')}
                testID={`${testID}_amount`}
                value={value}
              />
              {isBalancesDisplayed && (
                <ActiveUSDValue
                  testId={`${testID}_usd_amount`}
                  price={usdAmount}
                  containerStyle={tailwind('justify-end')}
                  denominationCurrency={denominationCurrency}
                />
              )}
            </View>
          </>
        )}
        thousandSeparator
        value={new BigNumber(tokenAmount).toFixed(8)}
      />
    </View>
  );
}
