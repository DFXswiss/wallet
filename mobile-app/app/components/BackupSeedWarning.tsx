import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { SettingsParamList } from '@screens/AppNavigator/screens/Settings/SettingsNavigator';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { Text, TouchableOpacity, View } from 'react-native';

export function BackupSeedWarning(): JSX.Element {
  const navigation = useNavigation<NavigationProp<SettingsParamList>>();

  return (
    <View style={tailwind('px-4 py-2')}>
      <TouchableOpacity
        accessibilityRole="button"
        style={tailwind('h-9 p-2 flex flex-row self-baseline rounded-lg bg-warning-400')}
        onPress={() => navigation.navigate('Settings', { screen: 'BackupExplanation' })}
      >
        <Ionicons name="warning-outline" size={18} color="#072440" />
        <Text style={tailwind('text-dfxblue-900 ml-1 font-semibold text-sm')}>
          {translate('screens/PortfolioScreen', 'Backup not verified')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
