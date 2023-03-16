import { Logging } from '@api';
import { MnemonicStorage } from '@api/wallet/mnemonic_storage';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useWalletNodeContext } from '@shared-contexts/WalletNodeProvider';
import { authentication, Authentication } from '@store/authentication';
import { translate } from '@translations';
import React, { useCallback } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { SettingsParamList } from '../SettingsNavigator';
import BackupPhrase from '@assets/images/backup-phrase.png';
import { Button } from '@components/Button';
import { MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { tailwind } from '@tailwind';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ExplanationItem {
  title: string;
  text: string;
  icon: JSX.Element;
}

export function BackupExplanation(): JSX.Element {
  const navigation = useNavigation<NavigationProp<SettingsParamList>>();
  const dispatch = useAppDispatch();
  const {
    data: { type },
  } = useWalletNodeContext();
  const isEncrypted = type === 'MNEMONIC_ENCRYPTED';

  const revealRecoveryWords = useCallback(() => {
    if (!isEncrypted) {
      return;
    }

    const auth: Authentication<string[]> = {
      consume: async (passphrase) => await MnemonicStorage.get(passphrase),
      onAuthenticated: async (words) => {
        navigation.navigate({
          name: 'RecoveryWordsScreen',
          params: { words },
          merge: true,
        });
      },
      onError: (e) => Logging.error(e),
      message: translate('screens/Settings', 'Enter passcode to continue'),
      loading: translate('screens/Settings', 'Verifying access'),
    };
    dispatch(authentication.actions.prompt(auth));
  }, [dispatch, isEncrypted, navigation]);

  const items: ExplanationItem[] = [
    {
      title: translate('screens/BackupExplanation', 'Secret words'),
      text: translate(
        'screens/BackupExplanation',
        'Your recovery phrase is a list of 12 secret words in a predefined order that back up your private key.',
      ),
      icon: <MaterialCommunityIcons style={tailwind('pt-1')} name="file-document-outline" size={18} color="#F5516C" />,
    },
    {
      title: translate('screens/BackupExplanation', 'Unrestorable'),
      text: translate(
        'screens/BackupExplanation',
        'if you lose your recovery phrase, you will de unable to access your funds, as nobody will be able to restore it.',
      ),
      icon: <MaterialIcons style={tailwind('pt-0.5')} name="restore" size={20} color="#F5516C" />,
    },
    {
      title: translate('screens/BackupExplanation', 'Only Chance'),
      text: translate(
        'screens/BackupExplanation',
        'This phrase is your only chance to recover access to your funds if your DFX Bitcoin App or usual device is unavailable for you.',
      ),
      icon: <Octicons style={tailwind('pt-1')} name="key" size={18} color="#F5516C" />,
    },
  ];

  return (
    <ScrollView>
      <SafeAreaView>
        <View style={tailwind('flex items-center px-4')}>
          <Image source={BackupPhrase} />
          <Text style={tailwind('text-white font-bold text-lg pt-5')}>
            {translate('screens/BackupExplanation', 'Recovery phrase backup')}
          </Text>
          <Text style={tailwind('text-dfxgray-300 text-sm text-center mt-1')}>
            {translate(
              'screens/BackupExplanation',
              'Find a safe and private place. Set a pen and some paper to write down your recovery phrase.',
            )}
          </Text>
          <View style={tailwind('flex p-7')}>
            {items.map((item: ExplanationItem) => (
              <View key={item.title} style={tailwind('flex flex-row pt-5')}>
                {item.icon}
                <View style={tailwind('flex flex-col px-2')}>
                  <Text style={tailwind('text-white font-bold text-base')}>{item.title}</Text>
                  <Text style={tailwind('text-dfxgray-300 text-sm')}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={tailwind('flex flex-grow flex-row items-end')}>
            <Button
              onPress={revealRecoveryWords}
              label={translate('components/Button', 'READY')}
              testID="BackupExplanationReady"
              grow
            />
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}
