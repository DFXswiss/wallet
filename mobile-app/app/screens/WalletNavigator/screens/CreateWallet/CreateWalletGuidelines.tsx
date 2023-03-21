import { StackScreenProps } from '@react-navigation/stack';
import { useState } from 'react';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';
import { View } from '@components/index';
import { Button } from '@components/Button';
import { ThemedText } from '@components/themed';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { WalletParamList } from '../../WalletNavigator';
import { openURL } from '@api/linking';
import { MnemonicUnprotected } from '@api/wallet';
import { ThemedCheckbox } from '@components/themed/ThemedCheckbox';
import { DFXPersistence } from '@api/persistence/dfx_storage';

type Props = StackScreenProps<WalletParamList, 'CreateWalletGuidelines'>;

const HARDCODED_PIN_LENGTH = 6;

export function CreateWalletGuidelines({ navigation }: Props): JSX.Element {
  const [isTermsEnabled, setIsTermsEnabled] = useState(false);

  function navigateToPinCreation(): void {
    DFXPersistence.removeVerifiedBackup();
    navigation.navigate({
      name: 'PinCreation',
      params: {
        pinLength: HARDCODED_PIN_LENGTH,
        words: MnemonicUnprotected.generateWords(),
        type: 'create',
      },
      merge: true,
    });
  }

  return (
    <View style={tailwind('flex-1 p-4 pt-6')}>
      <View style={tailwind('flex flex-col flex-grow justify-end')}>
        <TouchableOpacity
          onPress={async () =>
            await openURL(translate('screens/Guidelines', 'https://dfx.swiss/terms-and-conditions/'))
          }
          style={tailwind('mb-2 self-center')}
          testID="recovery_words_button"
        >
          <ThemedText
            dark={tailwind('text-dfxred-500')}
            light={tailwind('text-primary-500')}
            style={tailwind('font-medium text-sm')}
          >
            {translate('screens/Guidelines', 'View terms and conditions.')}
          </ThemedText>
        </TouchableOpacity>
        <ThemedCheckbox
          initialValue={isTermsEnabled}
          onChanged={setIsTermsEnabled}
          text={translate('screens/Guidelines', 'I have read and agree to the terms and conditions.')}
        />
        <Button
          disabled={!isTermsEnabled}
          label={translate('screens/Onboarding', 'CREATE A WALLET')}
          margin="mx-0 mt-3 mb-12"
          onPress={navigateToPinCreation}
          testID="create_recovery_words_button"
          title="create mnemonic words"
        />
      </View>
    </View>
  );
}
