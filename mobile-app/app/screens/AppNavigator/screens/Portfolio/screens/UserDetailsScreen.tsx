/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import BtnDobby from '@assets/images/dfx_buttons/btn_dobby.png';
import { StackScreenProps } from '@react-navigation/stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Control, Controller, FieldValues, UseControllerProps, useForm } from 'react-hook-form';
import { Platform, Image, View, Text, TouchableOpacity, KeyboardTypeOptions } from 'react-native';
import { ThemedScrollView, ThemedSectionTitle, ThemedTextInput, ThemedView } from '@components/themed';
import { tailwind } from '@tailwind';
import { translate } from '@translations';
import { useLogger } from '@shared-contexts/NativeLoggingProvider';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetNavScreen, BottomSheetWebWithNav, BottomSheetWithNav } from '@components/BottomSheetWithNav';
import { SubmitButtonGroup } from '@components/SubmitButtonGroup';
import { useDFXAPIContext } from '@shared-contexts/DFXAPIContextProvider';
import { BottomSheetCountryPicker } from '@components/SellComponents/BottomSheetCountryPicker';
import { PortfolioParamList } from '../PortfolioNavigator';
import { Country } from '@shared-api/dfx/models/Country';
import { putKycData } from '@shared-api/dfx/ApiService';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { KycData } from '@shared-api/dfx/models/KycData';
import { AccountType, User } from '@shared-api/dfx/models/User';
import { DFXPersistence } from '@api/persistence/dfx_storage';
import { ButtonGroup } from '../../Dex/components/ButtonGroup';
import { WalletAlertErrorApi } from '@components/WalletAlert';
import PNF, { PhoneNumberUtil } from 'google-libphonenumber';
import isEmailValidator from 'validator/lib/isEmail';
import { useWalletContext } from '@shared-contexts/WalletContext';

type Props = StackScreenProps<PortfolioParamList, 'UserDetailsScreen'>;

interface FormData {
  firstName: string;
  lastName: string;
  street: string;
  zip: number;
  email: string;
  phone: string;
}

export function UserDetailsScreen({ route, navigation }: Props): JSX.Element {
  const logger = useLogger();
  const { address } = useWalletContext();
  const [iconClicked, setIconClicked] = useState(true);

  enum Fields {
    accountType = 'accountType',
    firstName = 'firstName',
    lastName = 'lastName',
    street = 'street',
    houseNumber = 'houseNumber',
    zip = 'zip',
    location = 'location',
    country = 'country',
    organizationName = 'organizationName',
    organizationStreet = 'organizationStreet',
    organizationHouseNumber = 'organizationHouseNumber',
    organizationLocation = 'organizationLocation',
    organizationZip = 'organizationZip',
    organizationCountry = 'organizationCountry',
    mail = 'mail',
    phone = 'phone',
  }

  // TODO: (thabrad) refactor
  enum ButtonGroupTabKey {
    Personal = '0',
    BUSINESS = '1',
    SOLE_PROPRIETORSHIP = '2',
  }

  function selectButton(param: ButtonGroupTabKey): any {
    setSelectedButton(param);
    // needed for redux to update
    setTimeout(() => {
      trigger();
    }, 50);
  }

  const buttonOptions = [
    {
      id: ButtonGroupTabKey.Personal,
      label: translate('screens/UserDetails', 'Personal'),
      handleOnPress: () => selectButton(ButtonGroupTabKey.Personal),
    },
    {
      id: ButtonGroupTabKey.BUSINESS,
      label: translate('screens/UserDetails', 'Business'),
      handleOnPress: () => selectButton(ButtonGroupTabKey.BUSINESS),
    },
    {
      id: ButtonGroupTabKey.SOLE_PROPRIETORSHIP,
      label: translate('screens/UserDetails', 'Sole Proprietorship'),
      handleOnPress: () => selectButton(ButtonGroupTabKey.SOLE_PROPRIETORSHIP),
    },
  ];
  const [selectedButton, setSelectedButton] = useState(ButtonGroupTabKey.Personal);

  // Helper for phone validation
  const phoneNumberUtil = PhoneNumberUtil.getInstance();

  // optional company validation
  const optionalSchema = yup
    .object({
      organizationName: yup.string().required(),
      organizationStreet: yup.string().required(),
      organizationHouseNumber: yup.string().max(12).required(),
      organizationLocation: yup.string().required(),
      organizationZip: yup.string().max(12).required(),
    })
    .required();

  // validation for personal info
  const basicSchema = yup
    .object({
      firstName: yup.string().required(),
      lastName: yup.string().required(),
      street: yup.string().required(),
      houseNumber: yup.string().max(12).required(),
      zip: yup.string().max(12).required(),
      location: yup.string().required(),
      // mail: yup.string().email().required(), // old faulty validation
      mail: yup
        .string()
        .email('Invalid email format')
        .required('Mail is required')
        .test(
          'is-valid',
          (message) => `${message.path} is invalid`,
          (value) => (value != null ? isEmailValidator(value) : new yup.ValidationError('Invalid value')),
        ),

      phone: yup
        .string()
        .test('phone number check', 'Phone number is not valid', (value) => {
          let number;
          try {
            number = phoneNumberUtil.parseAndKeepRawInput(value ?? '');
          } catch (error) {
            logger.info(JSON.stringify(error));
          }
          try {
            number = phoneNumberUtil.isValidNumber(number as PNF.PhoneNumber);
          } catch (error) {
            logger.info(JSON.stringify(error));
          }
          number = typeof number !== 'boolean' ? false : number;
          return number ?? false;
        })
        .required(),
    })
    .required();

  // if ButtonGroupTabKey.BUSINESS or .SOLE_PROPRIETORSHIP is selected, also validate optionalSchema
  let schema;
  if (selectedButton !== ButtonGroupTabKey.Personal) {
    schema = basicSchema.concat(optionalSchema);
  } else {
    schema = basicSchema;
  }

  const {
    control,
    formState: { errors, isValid },
    trigger,
    getValues,
    handleSubmit,
  } = useForm(/* <User & KycData> */ { mode: 'onChange', resolver: yupResolver(schema) });

  const { listCountries } = useDFXAPIContext();
  const [countries, setCountries] = useState<Country[]>([]);
  const defaultCountry = {
    id: 55,
    updated: '2021-08-26T01:04:19.900Z',
    created: '2021-08-26T01:04:19.900Z',
    symbol: 'DE',
    name: 'Germany',
    enable: true,
    ipEnable: true,
  };
  const [country, setCountry] = useState<Country>(defaultCountry);
  const [orgCountry, setOrgCountry] = useState<Country>(defaultCountry);
  const [loadingText, setLoadingText] = useState<string>('…loading');
  const [isloading, setIsLoading] = useState<boolean>(true);

  // Bottom sheet token
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

  const setBottomSheet = useCallback(
    (fn: React.Dispatch<React.SetStateAction<Country>>) => {
      setBottomSheetScreen([
        {
          stackScreenName: 'SheetFiatPicker',
          component: BottomSheetCountryPicker({
            onItemPress: async (item): Promise<void> => {
              fn(item);
              dismissModal();
            },
            countries: countries,
            onCloseButtonPress: () => dismissModal(),
          }),
          option: {
            header: () => null,
          },
        },
      ]);
    },
    [countries, setCountry, setOrgCountry, country, orgCountry],
  );

  // TODO: (thabrad) type fix
  // const x = <User extends any>(firstName: keyof User): any => firstName

  async function onSubmit(data: (User & KycData) | FieldValues): Promise<void> {
    if (!isValid) {
      logger.error(errors);
      return;
    }
    // const ob = { ...data }
    // TODO quick & dirty --> clean up
    let type;
    switch (selectedButton) {
      case ButtonGroupTabKey.Personal:
        type = AccountType.PERSONAL;
        break;
      case ButtonGroupTabKey.BUSINESS:
        type = AccountType.BUSINESS;
        break;
      case ButtonGroupTabKey.SOLE_PROPRIETORSHIP:
        type = AccountType.SOLE_PROPRIETORSHIP;
        break;
      default:
        type = AccountType.PERSONAL;
        break;
    }

    const kycData: KycData = {
      accountType: type,
      firstName: getValues(Fields.firstName),
      lastName: getValues(Fields.lastName),
      street: getValues(Fields.street),
      houseNumber: getValues(Fields.houseNumber),
      zip: getValues(Fields.zip),
      location: getValues(Fields.location),
      country: country,
      mail: getValues(Fields.mail),
      phone: getValues(Fields.phone),
      organizationName: getValues(Fields.organizationName),
      organizationStreet: getValues(Fields.organizationStreet),
      organizationHouseNumber: getValues(Fields.organizationHouseNumber),
      organizationLocation: getValues(Fields.organizationLocation),
      organizationZip: getValues(Fields.organizationZip),
      organizationCountry: orgCountry,
    };

    setIsLoading(true);
    setLoadingText('SENDING');
    putKycData(kycData)
      .then(() => {
        setLoadingText('SUCCESS');

        void (async () => await DFXPersistence.setUserInfoComplete(address))();

        navigation.popToTop();
        navigation.navigate('Sell');
      })
      .catch(WalletAlertErrorApi)
      .finally(() => setIsLoading(false));
  }

  // load available countries
  useEffect(() => {
    listCountries()
      .then((fetchedCountries) => {
        setCountries(fetchedCountries);
        setIsLoading(false);
        setLoadingText('Submit');
      })
      .catch(logger.error);
  }, []);

  if (!iconClicked) {
    return (
      <TouchableOpacity onPress={() => setIconClicked(true)} style={tailwind('h-full w-full')}>
        <Image source={BtnDobby} style={tailwind('max-h-full max-w-full')} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={tailwind('h-full')} ref={containerRef}>
      <ThemedScrollView style={tailwind('flex-1 pb-8')} testID="setting_screen">
        <ThemedView style={tailwind('mt-6 rounded-3xl self-center')}>
          <ButtonGroup
            buttons={buttonOptions}
            activeButtonGroupItem={selectedButton}
            modalStyle={tailwind('text-base')}
            testID="portfolio_button_group"
            darkThemeStyle={tailwind('bg-dfxblue-800')}
            customActiveStyle={{
              dark: tailwind('bg-dfxblue-900'),
            }}
          />
        </ThemedView>

        {(selectedButton === ButtonGroupTabKey.BUSINESS ||
          selectedButton === ButtonGroupTabKey.SOLE_PROPRIETORSHIP) && (
          <>
            <ThemedSectionTitle testID="network_title" text={translate('screens/UserDetails', 'ORGANIZATION DATA')} />
            <View style={tailwind('mx-4 bg-dfxblue-800 rounded-md border border-dfxblue-900')}>
              <AddressDetailItem
                control={control}
                fieldName={Fields.organizationName}
                title={translate('screens/UserDetails', 'Name')}
                example="DFX Inc."
              />
              <AddressDetailItem
                control={control}
                fieldName={Fields.organizationStreet}
                title={translate('screens/UserDetails', 'Street Name')}
                example="Main Street"
              />
              <AddressDetailItem
                control={control}
                fieldName={Fields.organizationHouseNumber}
                title={translate('screens/UserDetails', 'House Number')}
                example="42"
                keyboardType="number-pad"
              />
              <AddressDetailItem
                control={control}
                fieldName={Fields.organizationZip}
                title={translate('screens/UserDetails', 'Zip Code')}
                example="1234"
              />
              <AddressDetailItem
                control={control}
                fieldName={Fields.organizationLocation}
                title={translate('screens/UserDetails', 'City')}
                example="Berlin"
              />

              <View style={tailwind('h-12 flex-row border-b border-dfxblue-900')}>
                <Text style={tailwind('ml-4 self-center text-sm text-gray-400')}>
                  {translate('screens/UserDetails', 'Country')}
                </Text>
                <Text
                  style={tailwind('ml-4 flex-grow self-center text-sm text-white')}
                  onPress={() => {
                    setBottomSheet(setOrgCountry);
                    expandModal();
                  }}
                >
                  {orgCountry?.name}
                </Text>
              </View>
            </View>
          </>
        )}

        <ThemedSectionTitle testID="network_title" text={translate('screens/UserDetails', 'PERSONAL INFORMATION')} />
        <View style={tailwind('mx-4 bg-dfxblue-800 rounded-md border border-dfxblue-900')}>
          <AddressDetailItem
            fieldName={Fields.firstName}
            control={control}
            title={translate('screens/UserDetails', 'First Name')}
            example="John"
          />
          <AddressDetailItem
            fieldName={Fields.lastName}
            control={control}
            title={translate('screens/UserDetails', 'Last Name')}
            example="Doe"
          />
          <AddressDetailItem
            fieldName={Fields.street}
            control={control}
            title={translate('screens/UserDetails', 'Street Name')}
            example="Main Street"
          />
          <AddressDetailItem
            fieldName={Fields.houseNumber}
            control={control}
            title={translate('screens/UserDetails', 'House Number')}
            example="42"
            keyboardType="number-pad"
          />
          <AddressDetailItem
            fieldName={Fields.zip}
            control={control}
            title={translate('screens/UserDetails', 'Zip Code')}
            example="1234"
          />
          <AddressDetailItem
            fieldName={Fields.location}
            control={control}
            title={translate('screens/UserDetails', 'City')}
            example="Berlin"
          />

          <View style={tailwind('h-12 flex-row border-b border-dfxblue-900')}>
            <Text style={tailwind('ml-4 self-center text-sm text-gray-400')}>
              {translate('screens/UserDetails', 'Country')}
            </Text>
            <Text
              style={tailwind('ml-4 flex-grow self-center text-sm text-white')}
              onPress={() => {
                setBottomSheet(setCountry);
                expandModal();
              }}
            >
              {country?.name}
            </Text>
          </View>
        </View>

        <ThemedSectionTitle testID="contact_data_title" text={translate('screens/UserDetails', 'CONTACT DATA')} />
        <View style={tailwind('mx-4 bg-dfxblue-800 rounded-md border border-dfxblue-900')}>
          <AddressDetailItem
            fieldName={Fields.mail}
            control={control}
            title="Email"
            example="John.Doe@gmail.com"
            keyboardType="email-address"
          />
          <AddressDetailItem
            fieldName={Fields.phone}
            control={control}
            title={translate('screens/UserDetails', 'Phone Number')}
            example="+4977001234"
            keyboardType="phone-pad"
          />
        </View>
        {/* <ThemedText>{JSON.stringify(errors)}</ThemedText> */}

        <View style={tailwind('h-12')} />
        <SubmitButtonGroup
          isDisabled={isloading || !isValid}
          label={translate('screens/UserDetails', 'SUBMIT')}
          processingLabel={translate('screens/UserDetails', loadingText)}
          onSubmit={handleSubmit(onSubmit)}
          title="sell_continue"
          isProcessing={isloading}
          displayCancelBtn={false}
        />

        <View style={tailwind('h-60')} />

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
      </ThemedScrollView>
    </View>
  );
}

interface AddressDetailProps {
  dropdownOptions: any;
}

function AddressDetailItem({
  control,
  fieldName,
  title,
  required = true,
  example,
  keyboardType,
  props,
}: {
  control: Control;
  fieldName: string;
  title: string;
  required?: boolean;
  example?: string;
  keyboardType?: KeyboardTypeOptions;
  props?: AddressDetailProps & UseControllerProps<User & KycData>;
}): JSX.Element {
  return (
    <View style={tailwind('h-12 flex-row border-b border-dfxblue-900')}>
      <Text style={tailwind('ml-4 self-center text-sm text-dfxgray-400')}>
        {translate('screens/UserDetails', title)}
      </Text>

      <Controller
        control={control}
        // defaultValue={defaultValue}
        name={fieldName}
        render={({ field: { onBlur, onChange, value } }) => (
          <ThemedTextInput
            autoCapitalize="words"
            style={tailwind('ml-4 flex-grow')}
            onBlur={onBlur}
            onChangeText={onChange}
            // onEndEditing={() => console.log(control._fields)}
            value={value}
            placeholder={example}
            keyboardType={keyboardType ?? 'default'}
          />
        )}
        rules={{
          required: required,
          // pattern: /^\d*\.?\d*$/,
          // max: maxAmount,
          validate: {
            // greaterThanZero: (value: string) => new BigNumber(value !== undefined && value !== '' ? value : 0).isGreaterThan(0)
          },
        }}
      />
    </View>
  );
}
