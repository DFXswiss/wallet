import { memo, useCallback, useEffect, useRef, useState } from 'react';
import * as React from 'react';
import { tailwind } from '@tailwind';
import { Platform, TouchableOpacity, View } from 'react-native';
import {
  ThemedActivityIndicator,
  ThemedIcon,
  ThemedScrollView,
  ThemedText,
  ThemedTouchableOpacity,
  ThemedView,
} from '@components/themed';
import { BottomSheetNavScreen, BottomSheetWebWithNav, BottomSheetWithNav } from '@components/BottomSheetWithNav';
import { translate } from '@translations';
import { SubmitButtonGroup } from '@components/SubmitButtonGroup';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useThemeContext } from '@shared-contexts/ThemeProvider';
import { isValidIBAN } from 'ibantools';
import { Control, Controller, useForm } from 'react-hook-form';
import { WalletTextInput } from '@components/WalletTextInput';
import { BottomSheetFiatPicker } from './BottomSheetFiatPicker';
import { DefaultFiat, Fiat } from '@shared-api/dfx/models/Fiat';
import { useLogger } from '@shared-contexts/NativeLoggingProvider';
import { getFiats, postBankAccount, putBankAccount } from '@shared-api/dfx/ApiService';
import { WalletAlertErrorApi } from '@components/WalletAlert';
import { BankAccount, BankAccountData } from '@shared-api/dfx/models/BankAccount';
import { SepaInstantOverlay } from '@screens/AppNavigator/screens/Portfolio/components/SepaInstantLayover';

interface BottomSheetFiatAccountCreateProps {
  headerLabel: string;
  onCloseButtonPress: () => void;
  onElementCreatePress: (fiatAccount: BankAccount, updatedAccounts?: BankAccount[]) => void;
  bankAccounts: BankAccount[];
}

export const BottomSheetFiatAccountCreate = ({
  headerLabel,
  onCloseButtonPress,
  onElementCreatePress,
  bankAccounts,
}: BottomSheetFiatAccountCreateProps): React.MemoExoticComponent<() => JSX.Element> =>
  memo(() => {
    const { isLight } = useThemeContext();
    const { control, formState, setValue, getValues, trigger } = useForm({ mode: 'onChange' });

    // returned from picker
    const [selectedFiat, setSelectedFiat] = useState<Fiat>(DefaultFiat);
    const [sepaInstantAccount, setSepaInstantAccount] = useState<BankAccount>();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // fiat picker modal setup
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

    // modal scrollView setup
    const bottomSheetComponents = {
      mobile: BottomSheetScrollView,
      web: ThemedScrollView,
    };

    // fiat picker modal => open / return
    const setBottomSheet = useCallback((fiats: Fiat[]) => {
      setBottomSheetScreen([
        {
          stackScreenName: 'FiatAccountList',
          component: BottomSheetFiatPicker({
            onFiatPress: async (selectedFiat): Promise<void> => {
              if (selectedFiat !== undefined) {
                setSelectedFiat(selectedFiat);
              }
              dismissModal();
            },
            onCloseModal: () => dismissModal(),
            fiats: fiats,
          }),
          option: {
            header: () => null,
          },
        },
      ]);
    }, []);
    const ScrollView = Platform.OS === 'web' ? bottomSheetComponents.web : bottomSheetComponents.mobile;

    const onSubmit = async (): Promise<void> => {
      setIsSubmitting(true);

      const iban: string = getValues('iban');
      const label: string = getValues('label');

      const createNewBankAccount: BankAccountData = {
        iban,
        preferredCurrency: selectedFiat,
        label,
      };

      // check if account already exists (based on iban) and replace currency and label
      const matchedAccount = bankAccounts?.find(
        (account: BankAccount) => account.iban.split(' ').join('') === createNewBankAccount.iban.split(' ').join(''),
      );
      let updatedAccountsList: BankAccount[] | undefined;
      if (matchedAccount != null) {
        const matchedIndex = bankAccounts?.indexOf(matchedAccount);
        if (bankAccounts != null && matchedIndex != null && matchedIndex > -1) {
          bankAccounts[matchedIndex] = {
            ...matchedAccount,
            label: createNewBankAccount.label,
            fiat: createNewBankAccount.preferredCurrency,
          };
          updatedAccountsList = bankAccounts;
        }
      }

      if (createNewBankAccount != null) {
        if (matchedAccount != null) {
          // if IBAN exists already, edit props
          putBankAccount(createNewBankAccount, matchedAccount.id)
            .then((updatedBankAccount) => onElementCreatePress(updatedBankAccount, updatedAccountsList))
            .catch(WalletAlertErrorApi)
            .finally(() => setIsSubmitting(false));
        } else {
          // create new account and show SEPAinstant popup if qualifying
          postBankAccount(createNewBankAccount)
            .then((newBankAccount) =>
              newBankAccount.sepaInstant ? setSepaInstantAccount(newBankAccount) : onElementCreatePress(newBankAccount),
            )
            .catch(WalletAlertErrorApi)
            .finally(() => setIsSubmitting(false));
        }
      }
    };

    return (
      <>
        <ThemedView
          light={tailwind('bg-white border-gray-200')}
          dark={tailwind('bg-dfxblue-800 border-dfxblue-900')}
          style={tailwind('flex flex-row justify-between items-center px-4 py-2 border-b', {
            'py-3.5 border-t -mb-px': Platform.OS === 'android',
          })} // border top on android to handle 1px of horizontal transparent line when scroll past header
        >
          <ThemedText style={tailwind('text-lg font-medium')}>{headerLabel}</ThemedText>
          <TouchableOpacity onPress={onCloseButtonPress}>
            <ThemedIcon iconType="MaterialIcons" name="close" size={20} />
          </TouchableOpacity>
        </ThemedView>

        <ScrollView
          style={tailwind([
            'flex-1',
            {
              'bg-white': isLight,
              'bg-dfxblue-800': !isLight,
            },
          ])}
        >
          <View style={tailwind('px-4 mt-4')}>
            <IbanInput
              control={control}
              onTextChange={async (iban) => {
                setValue('iban', iban, { shouldDirty: false });
                await trigger('iban');
              }}
              onClearButtonPress={async () => {
                setValue('iban', '');
                await trigger('iban');
              }}
            />

            <FiatPickerRow
              fiat={selectedFiat}
              openFiatBottomSheet={(fiats) => {
                setBottomSheet(fiats.filter((f) => f.buyable || f.sellable));
                expandModal();
              }}
              invertedColor
            />

            <LabelRow
              control={control}
              onTextChange={async (label) => {
                setValue('label', label, { shouldDirty: false });
                await trigger('label');
              }}
              onClearButtonPress={async () => {
                setValue('label', '');
                await trigger('label');
              }}
            />

            <View style={tailwind('my-6')}>
              <SubmitButtonGroup
                isDisabled={!formState.isValid}
                label={translate('components/Button', 'CONTINUE')}
                processingLabel={translate('components/Button', 'CONTINUE')}
                onSubmit={onSubmit}
                title="sell_continue"
                isProcessing={isSubmitting}
                displayCancelBtn={false}
              />
            </View>

            {sepaInstantAccount?.sepaInstant === true && (
              <SepaInstantOverlay onDismiss={() => onElementCreatePress(sepaInstantAccount)} />
            )}

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
        </ScrollView>
      </>
    );
  });

export function FiatPickerRow(props: {
  fiat: Fiat;
  openFiatBottomSheet: (fiats: Fiat[]) => void;
  invertedColor?: boolean;
}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const [fiats, setFiats] = useState<Fiat[]>({} as Fiat[]);
  const logger = useLogger();

  useEffect(() => {
    setIsLoading(true);

    getFiats()
      .then((fiats) => {
        setFiats(fiats);
      })
      .catch(logger.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <ThemedText
        testID="transaction_details_info_text"
        light={tailwind('text-gray-600')}
        dark={tailwind('text-dfxgray-300')}
        style={tailwind('flex-grow mt-4 mb-2')}
      >
        {translate('screens/SellScreen', 'Your Currency')}
      </ThemedText>

      {isLoading ? (
        <ThemedActivityIndicator />
      ) : (
        <ThemedTouchableOpacity
          onPress={() => props.openFiatBottomSheet(fiats)}
          dark={tailwind(
            props.invertedColor ?? false ? 'bg-dfxblue-900 border-dfxblue-900' : 'bg-dfxblue-800 border-dfxblue-800',
          )}
          light={tailwind('border-gray-300 bg-white')}
          style={tailwind('border rounded w-full flex flex-row justify-between h-12 items-center px-2 mb-4')}
          testID="select_fiatAccount_input"
        >
          <View style={tailwind('flex flex-row')}>
            <ThemedText style={tailwind('ml-2 font-medium')} testID="selected_fiatAccount">
              {props.fiat?.name ?? ''}
            </ThemedText>
          </View>
          <ThemedIcon
            iconType="MaterialIcons"
            name="unfold-more"
            size={24}
            dark={tailwind('text-dfxred-500')}
            light={tailwind('text-primary-500')}
            style={tailwind('-mr-1.5 flex-shrink-0')}
          />
        </ThemedTouchableOpacity>
      )}
    </>
  );
}

interface IbanForm {
  control: Control;
  onTextChange: (iban: string) => void;
  onClearButtonPress: () => void;
}

function IbanInput({ control, onTextChange, onClearButtonPress }: IbanForm): JSX.Element {
  // TODO: (thabrad) activate if needed (-> if keyboard bug comes back 🤷‍♂️)
  // const { shouldHandleKeyboardEvents } = useBottomSheetInternal()
  // const handleOnFocus = useCallback(
  //   () => {
  //     if (Platform.OS === 'ios') {
  //       shouldHandleKeyboardEvents.value = true
  //     }
  //   },
  //   [shouldHandleKeyboardEvents]
  // )
  // const handleOnBlur = useCallback(
  //   () => {
  //     if (Platform.OS === 'ios') {
  //       shouldHandleKeyboardEvents.value = true
  //     }
  //   },
  //   [shouldHandleKeyboardEvents]
  // )

  return (
    <Controller
      control={control}
      name="iban"
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <ThemedView
          dark={tailwind('bg-transparent')}
          light={tailwind('bg-transparent')}
          style={tailwind('flex-row w-full')}
        >
          <WalletTextInput
            autoCapitalize="characters"
            // pasteButton={{
            //   isPasteDisabled: false,
            //   onPasteButtonPress: async () => {
            //     value = await Clipboard.getString()
            //   }
            // }}
            onChange={onChange}
            onChangeText={onTextChange}
            placeholder="IBAN: XX 0000 0000 0000 00"
            style={tailwind('flex-grow w-2/5  h-8')}
            testID="iban_input"
            value={value}
            maxLength={34}
            displayClearButton={value !== ''}
            onClearButtonPress={onClearButtonPress}
            title={translate('screens/SellScreen', 'IBAN')}
            titleTestID="title_send"
            inputType="default"
            hasBottomSheet
            inlineText={{
              type: 'error',
              text: error?.message,
            }}
            // onBlur={handleOnBlur}
            // onFocus={handleOnFocus}
          />
        </ThemedView>
      )}
      rules={{
        required: true,
        validate: {
          isValidAddress: (iban: string) => {
            return isValidIBAN(iban.replace(/\s/g, ''));
          },
        },
      }}
    />
  );
}

interface LabelForm {
  control: Control;
  onTextChange: (iban: string) => void;
  onClearButtonPress: () => void;
}

function LabelRow({ control, onTextChange, onClearButtonPress }: LabelForm): JSX.Element {
  return (
    <Controller
      control={control}
      name="label"
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <ThemedView
          dark={tailwind('bg-transparent')}
          light={tailwind('bg-transparent')}
          style={tailwind('flex-row w-full')}
        >
          <WalletTextInput
            autoCapitalize="none"
            onChange={onChange}
            onChangeText={onTextChange}
            placeholder="e.g.: Deutsche Bank"
            style={tailwind('flex-grow w-2/5 h-8')}
            testID="iban_input"
            value={value}
            displayClearButton={value !== ''}
            onClearButtonPress={onClearButtonPress}
            title={translate('screens/SellScreen', 'Optional - Account Designation')}
            titleTestID="title_send"
            inputType="default"
            hasBottomSheet
          />
        </ThemedView>
      )}
    />
  );
}
