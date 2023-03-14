import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import Popover, { PopoverPlacement } from 'react-native-popover-view';
import { tailwind } from '@tailwind';
import { StyleSheet, Linking, TouchableOpacity, TouchableOpacityProps, View, Platform, StatusBar } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useWalletContext } from '@shared-contexts/WalletContext';
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider';

import BuyIcon from '@assets/images/dfx_buttons/buttons/Buy_Icon.svg';
import SellIcon from '@assets/images/dfx_buttons/buttons/Sell_Icon.svg';
import BtcIcon from '@assets/images/dfx_buttons/crypto/Bitcoin_icon.svg';
import DfxIcon from '@assets/images/dfx_buttons/buttons/DFX_Icon.svg';
import DefichainIncomeIcon from '@assets/images/dfx_buttons/buttons/Defichain_Income_Icon.svg';
import DFItaxIcon from '@assets/images/dfx_buttons/buttons/DFItax_Icon.svg';
import MoreIcon from '@assets/images/dfx_buttons/buttons/More_Icon.svg';

// import BtnDobby from '@assets/images/dfx_buttons/btn_dobby.png'

import {
  ThemedActivityIndicator,
  ThemedIcon,
  ThemedProps,
  ThemedScrollView,
  ThemedText,
  ThemedView,
} from '@components/themed';
import { PortfolioParamList } from '../PortfolioNavigator';
import { getUserDetail } from '@shared-api/dfx/ApiService';
import { DFXPersistence } from '@api/persistence/dfx_storage';
import { CryptoButtonGroupTabKey } from '../screens/ReceiveDTokenScreen';
import { SvgProps } from 'react-native-svg';
import { translate } from '@translations';
import { BottomSheetNavScreen, BottomSheetWebWithNav, BottomSheetWithNav } from '@components/BottomSheetWithNav';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { AuthService } from '@shared-api/dfx/AuthService';

interface DfxButton {
  hide?: boolean;
  Svg: React.FC<SvgProps>;
  label: string;
  onPress: () => Promise<void> | void;
}

export function DfxButtons(): JSX.Element {
  const { address } = useWalletContext();
  const { openDfxServices } = useDFXAPIContext();
  const navigation = useNavigation<NavigationProp<PortfolioParamList>>();

  const [isLoadingKycInfo, setIsLoadingKycInfo] = useState<boolean>();

  async function onOverviewButtonPress(): Promise<void> {
    const url = `https://defichain-income.com/address/${encodeURIComponent(address)}`;
    await Linking.openURL(url);
  }

  async function onTaxButtonPress(): Promise<void> {
    const url = `https://dfi.tax/adr/${encodeURIComponent(address)}`;
    await Linking.openURL(url);
  }

  async function onDobbyButtonPress(): Promise<void> {
    const url = `https://defichain-dobby.com/#/setup/${encodeURIComponent(address)}`;
    await Linking.openURL(url);
  }

  // update loading, set isKInfo state & navigate accordingly
  const navigateAfterKycCheckTo = (isKyc: boolean, screen: string): void => {
    setIsLoadingKycInfo(false);
    isKyc ? navigation.navigate(screen) : navigation.navigate('UserDetails');
  };

  function checkUserProfile(screen: string): void {
    // start loading UserInfoCompleted/KycDataComplete --> (1) from STORE --> (2) from API + store result
    setIsLoadingKycInfo(true);

    void (async () => {
      // (1) from STORE
      const isUserDetailStored = await DFXPersistence.getUserInfoComplete(address);

      if (isUserDetailStored !== null && isUserDetailStored) {
        // if stored, navigate to Sell Screen
        navigateAfterKycCheckTo(true, screen);
      } else {
        // if not, retrieve from API
        void (async () => {
          // (2) from API
          const userDetail = await getUserDetail();
          userDetail.kycDataComplete = userDetail?.kycDataComplete ?? false;

          // persist result to STORE
          await DFXPersistence.setUserInfoComplete(address, userDetail.kycDataComplete);

          // navigate based on BackendData result
          navigateAfterKycCheckTo(userDetail.kycDataComplete, screen);
        })();
      }
    })();
  }

  const buttons: DfxButton[] = [
    {
      Svg: BuyIcon,
      label: 'Buy',
      onPress: () => {
        // check kycData
        // DEACTIVATED (next line)
        // checkUserProfile('Buy')
        navigation.navigate('Buy');
      },
    },
    {
      Svg: SellIcon,
      label: 'Sell',
      onPress: () => {
        // check kycData
        checkUserProfile('Sell');
      },
    },
    {
      Svg: BtcIcon,
      label: 'Deposit Bitcoin',
      onPress: () => {
        // TODO: (thabrad) maybe will need to do kycCheck here in future
        navigation.navigate({
          name: 'ReceiveDTokenScreen',
          params: { crypto: CryptoButtonGroupTabKey.BTC },
          merge: true,
        });
      },
    },
    {
      Svg: DfxIcon,
      label: 'My DFX',
      onPress: openDfxServices,
    },
    {
      Svg: DefichainIncomeIcon,
      label: 'Defichain Income',
      onPress: onOverviewButtonPress,
    },
    {
      Svg: DFItaxIcon,
      label: 'DFI.Tax',
      onPress: onTaxButtonPress,
    },
    {
      hide: true, // TODO(davidleomay)
      Svg: DFItaxIcon,
      label: 'Dobby',
      onPress: onDobbyButtonPress,
    },
  ];

  const devButtons = __DEV__
    ? [
        {
          Svg: DfxIcon,
          label: 'delete session',
          onPress: () => AuthService.deleteSession(),
        },
      ]
    : [];

  const BUTTONS_SHOWN = 5;
  const partnerServiceButtons = buttons.splice(BUTTONS_SHOWN - 1);

  // Bottom sheet
  const [isModalDisplayed, setIsModalDisplayed] = useState(false);
  const [bottomSheetScreen, setBottomSheetScreen] = useState<BottomSheetNavScreen[]>([]);
  const containerRef = useRef(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const expandModal = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsModalDisplayed(true);
    } else {
      bottomSheetRef.current?.present();
    }
  }, []);
  const dismissModal = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsModalDisplayed(false);
    } else {
      bottomSheetRef.current?.close();
    }
  }, []);

  const setPartnerServices = useCallback(() => {
    setBottomSheetScreen([
      {
        stackScreenName: 'PartnerServices',
        component: BottomSheetPartnerServices({
          partnerServiceButtons: partnerServiceButtons.concat(devButtons),
          headerLabel: translate('screens/DfxButtons', 'Partner Services'),
          onCloseButtonPress: () => dismissModal(),
          onPress: async (): Promise<void> => dismissModal(),
        }),
        option: {
          header: () => {
            return (
              <ThemedView
                light={tailwind('bg-white border-gray-200')}
                dark={tailwind('bg-dfxblue-800 border-dfxblue-900')}
                style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b', {
                  'py-3.5 border-t -mb-px': Platform.OS === 'android',
                })} // border top on android to handle 1px of horizontal transparent line when scroll past header
              >
                <ThemedText style={tailwind('text-lg font-medium')}>
                  {translate('screens/DfxButtons', 'Partner Services')}
                </ThemedText>
                <TouchableOpacity onPress={() => dismissModal()}>
                  <ThemedIcon iconType="MaterialIcons" name="close" size={20} />
                </TouchableOpacity>
              </ThemedView>
            );
          },
        },
      },
    ]);
  }, [partnerServiceButtons]);

  return (
    <View style={tailwind('flex justify-center flex-row mt-3')} ref={containerRef}>
      <View style={tailwind('flex w-2')} />
      {buttons
        .filter((b) => !(b.hide ?? false))
        .map((b, i) =>
          b.Svg === BuyIcon || b.Svg === SellIcon ? ( // loading spinner when loading userInfo
            <SvgButton
              key={i}
              Svg={b.Svg}
              label={b.label}
              onPress={async () => await b.onPress()}
              loading={isLoadingKycInfo}
            />
          ) : (
            <SvgButton key={i} Svg={b.Svg} label={b.label} onPress={async () => await b.onPress()} />
          ),
        )}
      <SvgButton
        Svg={MoreIcon}
        label="more"
        onPress={() => {
          setPartnerServices();
          expandModal();
        }}
      />
      <View style={tailwind('flex w-2')} />

      {/* <PopoverView buttons={partnerServiceButtons} /> */}
      {Platform.OS === 'web' && (
        <BottomSheetWebWithNav
          modalRef={containerRef}
          screenList={bottomSheetScreen}
          isModalDisplayed={isModalDisplayed}
          modalStyle={{
            position: 'absolute',
            height: '350px',
            width: '375px',
            zIndex: 50,
            bottom: '0',
          }}
        />
      )}

      {Platform.OS !== 'web' && <BottomSheetWithNav modalRef={bottomSheetRef} screenList={bottomSheetScreen} />}
    </View>
  );
}

interface SvgButtonProps extends TouchableOpacityProps {
  Svg: React.FC<SvgProps>;
  label?: string;
  // source: ImageSourcePropType
  loading?: boolean;
}

export function SvgButton(props: SvgButtonProps): JSX.Element {
  const styles = StyleSheet.create({
    button: {
      aspectRatio: 1,
      flex: 2,
      marginBottom: 8,
    },
  });

  return (
    <TouchableOpacity style={styles.button} {...props}>
      <View style={tailwind('mt-1 justify-center items-center')}>
        <props.Svg width={50} height={50} />
        <ThemedText style={tailwind('h-8 mt-1 text-center text-xs')}>
          {translate('screens/DfxButtons', props.label ?? '')}
        </ThemedText>
      </View>
      {(props.loading ?? false) && (
        <ThemedActivityIndicator
          size="large"
          color="#65728a"
          style={tailwind('absolute inset-0 items-center justify-center')}
        />
      )}
    </TouchableOpacity>
  );
}

interface BottomSheetPartnerServicesProps {
  headerLabel: string;
  onCloseButtonPress: () => void;
  onPress: () => void;
  partnerServiceButtons: DfxButton[];
}

const BottomSheetPartnerServices = ({
  headerLabel,
  onCloseButtonPress,
  onPress,
  partnerServiceButtons,
}: BottomSheetPartnerServicesProps): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    // modal scrollView setup
    const bottomSheetComponents = {
      mobile: BottomSheetScrollView,
      web: ThemedScrollView,
    };
    const ScrollView = Platform.OS === 'web' ? bottomSheetComponents.web : bottomSheetComponents.mobile;

    return (
      <ScrollView>
        <View style={tailwind('flex flex-row')}>
          {partnerServiceButtons
            .filter((btn) => !(btn.hide ?? false))
            .map((btn, i) => (
              <View key={`ov${i}`} style={tailwind('p-4')}>
                <SvgButton Svg={btn.Svg} label={btn.label} onPress={async () => await btn.onPress()} />
              </View>
            ))}
        </View>
      </ScrollView>
    );
  });

interface PopoverViewProps extends ThemedProps {
  buttons: DfxButton[];
}

export function PopoverView(props: PopoverViewProps): JSX.Element {
  const offsetAndroidHeight = StatusBar.currentHeight !== undefined ? StatusBar.currentHeight * -1 : 0;
  const [showPopover, setShowPopover] = useState(false);

  // to fix memory leak error
  useEffect(() => {
    // May work on Web, but not officially supported, as per documentation, add condition to hide popover/tooltip
    if (Platform.OS === 'web') {
      setTimeout(() => setShowPopover(false), 2000);
    }
  }, [showPopover]);

  return (
    <Popover
      verticalOffset={Platform.OS === 'android' ? offsetAndroidHeight : 0} // to correct tooltip poition on android
      placement={PopoverPlacement.AUTO}
      popoverStyle={tailwind('bg-dfxblue-800')}
      isVisible={showPopover}
      onRequestClose={() => setShowPopover(false)}
      from={
        <View>
          <SvgButton key="xtra" Svg={MoreIcon} label="more" onPress={() => setShowPopover(true)} />
        </View>
      }
    >
      <View style={tailwind('flex-row')}>
        {props.buttons
          .filter((btn) => !(btn.hide ?? false))
          .map((btn, i) => (
            <View key={`ov${i}`} style={tailwind('p-4')}>
              <SvgButton Svg={btn.Svg} label={btn.label} onPress={async () => await btn.onPress()} />
            </View>
          ))}
      </View>
    </Popover>
  );
}
