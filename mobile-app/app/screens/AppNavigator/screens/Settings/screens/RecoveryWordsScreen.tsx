import { StackScreenProps } from '@react-navigation/stack';
import { View } from '@components/index';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { SettingsParamList } from '../SettingsNavigator';
import { ScrollView, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedCheckbox } from '@components/themed/ThemedCheckbox';
import { Button } from '@components/Button';
import { useState } from 'react';
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider';

type Props = StackScreenProps<SettingsParamList, 'RecoveryWordsScreen'>;

export function RecoveryWordsScreen({ route, navigation }: Props): JSX.Element {
  const { words, needsToAccept } = route.params;
  const { verifiedBackup } = useDFXAPIContext();
  const [isAccepted, setIsAccpted] = useState(false);

  const handleContinue = (): void => {
    isAccepted && verifiedBackup();
    // pops to top, which in current case is the explanation screen
    navigation.popToTop();
    // pop explanation screen to go back to portfolio
    navigation.pop();
  };

  return (
    <ScrollView contentContainerStyle={tailwind('flex px-4')}>
      <View style={tailwind('items-center')}>
        <Text style={tailwind('text-white font-bold text-lg pt-5')}>
          {translate('screens/RecoveryWordsScreen', 'Your Recovery phrase')}
        </Text>
        <Text style={tailwind('text-dfxgray-300 text-sm text-center mt-1')}>
          {translate(
            'screens/RecoveryWordsScreen',
            'Write down these words in the right order and save them somewhere safe.',
          )}
        </Text>
      </View>
      <View style={tailwind('flex flex-row bg-warning-400 opacity-90 rounded-lg mt-10 mb-4 p-2 pr-5')}>
        <MaterialIcons style={tailwind('pt-0.5')} name="info-outline" color={'#072440'} size={18} />
        <Text style={tailwind('text-dfxblue-900 text-sm mx-1')}>
          {translate('screens/RecoveryWordsScreen', 'Never share recovery phrase with anyone, store it securely!')}
        </Text>
      </View>
      <View style={tailwind('flex flex-col flex-grow')}>
        <View style={tailwind('flex flex-row flex-wrap justify-center mt-4')}>
          {words.map((word, index) => (
            <MnemonicWordRow key={`${index}-${word}`} word={word} index={index} />
          ))}
        </View>
      </View>
      {needsToAccept && (
        <View style={tailwind('flex flex-grow flex-col items-center justify-end')}>
          <ThemedCheckbox
            text={translate(
              'screens/RecoveryWordsScreen',
              'I understand that if I lose my recovery phrase, I will not be able to access my funds.',
            )}
            onChanged={setIsAccpted}
          />
          <View style={tailwind('flex flex-grow flex-row items-end')}>
            <Button
              onPress={handleContinue}
              disabled={!isAccepted}
              label={translate('components/Button', 'CONTINUE')}
              grow
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function MnemonicWordRow(props: { word: string; index: number }): JSX.Element {
  const text = `${props.index + 1}.  ${props.word}  `;
  return (
    <View style={[tailwind('rounded-md mr-2 mb-2 px-2 py-1.5 bg-violet-500'), { minWidth: '47%' }]}>
      <Text style={tailwind('text-white text-base text-left')} textBreakStrategy="simple">
        {text}
      </Text>
    </View>
  );
}
