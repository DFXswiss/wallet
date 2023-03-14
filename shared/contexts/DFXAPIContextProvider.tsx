/* eslint-disable @typescript-eslint/no-unused-vars */
import { WalletHdNodeProvider } from '@defichain/jellyfish-wallet';
import { MnemonicHdNode } from '@defichain/jellyfish-wallet-mnemonic';
import { WalletAddressIndexPersistence } from '@api/wallet/address_index';
import { initJellyfishWallet, MnemonicEncrypted, MnemonicUnprotected } from '@api/wallet';
import { getJellyfishNetwork } from '@shared-api/wallet/network';
import { signAsync } from 'bitcoinjs-message';
import { DFXAddrSignature, DFXPersistence } from '@api/persistence/dfx_storage';
import { WalletType } from '@shared-contexts/WalletPersistenceContext';
import { authentication, Authentication } from '@store/authentication';
import { translate } from '@translations';
import {
  getSellRoutes,
  signIn,
  signUp,
  getCountries,
  getSignMessage,
  getUser,
  LOCKgetSignMessage,
  LOCKsignUp,
  LOCKsignIn,
} from '@shared-api/dfx/ApiService';
import { ApiDomain, AuthService } from '@shared-api/dfx/AuthService';
import { useNetworkContext } from '@shared-contexts/NetworkContext';
import { useWalletNodeContext } from '@shared-contexts/WalletNodeProvider';
import { useLogger } from '@shared-contexts/NativeLoggingProvider';
import { useWhaleApiClient } from '@shared-contexts/WhaleContext';
import { useWalletContext } from '@shared-contexts/WalletContext';
import { useDispatch } from 'react-redux';
import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { getEnvironment } from '@environment';
import { useDebounce } from '@hooks/useDebounce';
import { SellRoute } from '@shared-api/dfx/models/SellRoute';
import { Country } from '@shared-api/dfx/models/Country';
import { getReleaseChannel } from '@api/releaseChannel';
import { Logging } from '@api';
import { WalletAlertNotAvailableInCountry } from '@components/WalletAlert';

export interface DFXAPIContextI {
  openDfxServices: () => Promise<void>;
  openKycLink: () => Promise<void>;
  clearDfxTokens: () => Promise<void>;
  listFiatAccounts: () => Promise<SellRoute[]>;
  listCountries: () => Promise<Country[]>;
  signMessage: (message: string) => Promise<string>;
  getActiveWebToken: () => Promise<string>;
  LOCKcreateWebToken: () => Promise<string>;
  debouncedAddress?: string;
  isNotAllowedInCountry: boolean;
  LOCKisNotAllowedInCountry: boolean;
  getUnavailableServices: () => string;
}

const DFXAPIContext = createContext<DFXAPIContextI>(undefined as any);

export function useDFXAPIContext(): DFXAPIContextI {
  return useContext(DFXAPIContext);
}

export function DFXAPIContextProvider(props: PropsWithChildren<{}>): JSX.Element | null {
  const { network, networkName } = useNetworkContext();
  const { data: providerData } = useWalletNodeContext();
  const logger = useLogger();
  const whaleApiClient = useWhaleApiClient();
  const dispatch = useDispatch();
  const { address } = useWalletContext();
  const debouncedAddress = useDebounce(address, 500);
  const debouncedNetworkName = useDebounce(networkName, 500);
  const [previousDebouncedAddress, setPreviousDebouncedAddress] = useState<string>();
  const [previousDebouncedNetworkName, setPreviousDebouncedNetworkName] = useState<string>();

  const [isNotAllowedInCountry, setIsNotAllowedInCountry] = useState(false);
  const [LOCKisNotAllowedInCountry, LOCKsetIsNotAllowedInCountry] = useState(false);

  const openKycLink = async (): Promise<void> => {
    const user = await getUser();

    interface kycParams {
      code: string;
      [key: string]: string;
    }

    const params: kycParams = {
      code: user.kycHash,
    };
    user.mail != null && (params.mail = user.mail);
    user.mail != null && (params.phone = user.mobileNumber);
    const url = `/kyc?${new URLSearchParams(params).toString()}`;

    checkLoginAndRouteTo(url);
  };

  const openDfxServices = async (): Promise<void> => {
    return await checkLoginAndRouteTo();
  };

  const checkLoginAndRouteTo = async (url?: string): Promise<void> => {
    Logging.info('checkLoginAndRouteTo');
    if (isNotAllowedInCountry) {
      WalletAlertNotAvailableInCountry('DFX');
      return;
    }
    await getActiveWebToken()
      .catch(async () => {
        // try login first
        Logging.info('catch of checkLoginAndRouteTo');
        await activePairHandler({ network: networkName, addr: address });
        return await getActiveWebToken().catch(() => {});
      })
      .then(async (token) => {
        if (token === undefined || token.length === 0) {
          throw new Error('webToken is undefined');
        }
        const baseUrl = getEnvironment(getReleaseChannel()).dfx.paymentUrl;
        const urlEnding = url ?? `/login?token=${token}`;

        // console.log(urlEnding) // TODO!!! (thabrad) comment out / REMOVE!!
        await Linking.openURL(`${baseUrl}${urlEnding}`);
      })
      .catch(logger.error);
  };

  const listFiatAccounts = async (): Promise<SellRoute[]> => {
    return await getSellRoutes();
  };

  const listCountries = async (): Promise<Country[]> => {
    return await getCountries();
  };

  // returns webtoken string of current active Wallet address
  const getActiveWebToken = async (): Promise<string> => {
    Logging.info('getActiveWebToken');
    let webToken = await DFXPersistence.getToken(address);

    // TODO: (thabrad) quick fix - recheck
    webToken = '';

    if (webToken === undefined || webToken.length === 0) {
      await createWebToken(address);
      webToken = await DFXPersistence.getToken(address);
    }

    if (webToken !== undefined) {
      await AuthService.updateSession({ accessToken: webToken });
    }
    return webToken;
  };

  // check if Web session is expired
  const isSessionExpired = async (): Promise<boolean> => {
    const session = await AuthService.Session();
    Logging.info(`isSessionExpired ${session.isExpired}`);
    return session.isExpired;
  };

  async function signMessageNoPersistence(message: string): Promise<string> {
    return await createSignature(debouncedAddress, message);
  }

  // start signing process and return signature
  const createSignature = async (address: string, message?: string): Promise<string> => {
    /**
     * Signing message callback
     * @param provider
     * @returns Promise<Buffer>
     */
    const signMessage = async (
      provider: WalletHdNodeProvider<MnemonicHdNode>,
      altMessage?: string,
    ): Promise<Buffer> => {
      const activeIndex = await WalletAddressIndexPersistence.getActive();
      const account = initJellyfishWallet(provider, network, whaleApiClient).get(activeIndex);
      const privKey = await account.privateKey();
      const messagePrefix = getJellyfishNetwork(network).messagePrefix;
      const message =
        altMessage ??
        `By signing this message, you confirm that you are the sole owner of the provided DeFiChain address and are in possession of its private key. Your ID: ${address}`
          .split(' ')
          .join('_');
      const signMessage = await getSignMessage(address);
      // signMessage: login with AltCoins possible || message: -> fallback
      return await signAsync(altMessage != null ? message : signMessage ?? message, privKey, true, messagePrefix);
    };

    // message signed callback
    const onMessageSigned = async (sigBuffer: Buffer, message?: string): Promise<string> => {
      const sig = sigBuffer.toString('base64');
      if (message != null) {
        // console.log('sig: ', sig)
        return sig;
      }
      await DFXPersistence.setPair({
        network: networkName,
        addr: address,
        signature: sig,
      });
      return sig;
    };

    // show authentication Prompt
    if (providerData.type === WalletType.MNEMONIC_UNPROTECTED) {
      const provider = MnemonicUnprotected.initProvider(providerData, network);
      const sigBuffer = await signMessage(provider, message);
      return await onMessageSigned(sigBuffer, message);
    } else if (providerData.type === WalletType.MNEMONIC_ENCRYPTED) {
      const pin = await DFXPersistence.getWalletPin();
      if (pin.length === 0) {
        return await new Promise<string>((resolve, reject) => {
          const auth: Authentication<Buffer> = {
            consume: async (passphrase) => {
              const provider = MnemonicEncrypted.initProvider(providerData, network, {
                prompt: async () => passphrase,
              });
              return await signMessage(provider, message);
            },
            onAuthenticated: async (buffer) => {
              const signedMessage = await onMessageSigned(buffer, message);
              resolve(signedMessage);
            },
            onError: (e) => reject(e),
            message: translate(
              'screens/UnlockWallet',
              message != null
                ? 'To access LOCK Services, we need you to enter your passcode.'
                : 'To access DFX Services, we need you to enter your passcode.',
            ),
            loading: translate('screens/TransactionAuthorization', 'Verifying access'),
          };

          dispatch(authentication.actions.prompt(auth));
        });
      } else {
        await DFXPersistence.resetPin();
        const provider = MnemonicEncrypted.initProvider(providerData, network, { prompt: async () => pin });
        const sigBuffer = await signMessage(provider, message);
        return await onMessageSigned(sigBuffer, message);
      }
    } else {
      throw new Error('Missing wallet provider data handler');
    }
  };

  // start sign in/up process and set web token to pair
  const createWebToken = async (address: string): Promise<void> => {
    if (isNotAllowedInCountry) return;

    const pair = await DFXPersistence.getPair(address);
    if (pair.signature === undefined || pair.signature.length === 0) {
      await createSignature(address);
    }

    // first try, sign up
    await AuthService.deleteSession();
    // try sign in
    const signa = pair.signature ?? undefined;
    if (signa === undefined) {
      throw new Error('signature is undefined');
    }
    Logging.info(`trying to sign in with ${pair.addr} ...`);
    await signIn({ address: pair.addr, signature: signa })
      .then(async (respWithToken) => {
        Logging.info('... success');
        setIsNotAllowedInCountry(false);
        await DFXPersistence.setToken(pair.addr, respWithToken);
      })
      .catch(async (resp) => {
        Logging.info(`... failed ${resp.statusCode}`);
        await DFXPersistence.resetToken(pair.addr);
        if (resp.statusCode !== undefined && resp.statusCode === 401) {
          // Invalid credentials
          // -> fetch signature
          await createSignature(pair.addr);
          return;
        }

        if (resp.statusCode === 403) {
          setIsNotAllowedInCountry(true);
        }

        if (resp.statusCode === 404) {
          // try sign up
          await signUp({ address: pair.addr, signature: signa, walletId: 1, usedRef: null })
            .then(async (respWithToken) => {
              await DFXPersistence.setToken(pair.addr, respWithToken);
            })
            .catch(async (resp) => {
              if (resp.message !== undefined) {
                throw new Error(resp.message);
              }
              throw new Error(resp);
            });
        }
      });
  };

  // start sign in/up process and set web token to pair
  const LOCKcreateWebToken = async (): Promise<string> => {
    if (LOCKisNotAllowedInCountry) return '';

    const address = debouncedAddress;
    const message = `By_signing_this_message,_you_confirm_to_LOCK_that_you_are_the_sole_owner_of_the_provided_Blockchain_address._Your_ID:_${address}`;
    const signMessage = await LOCKgetSignMessage(address);
    const loginSignature = await signMessageNoPersistence(signMessage.message ?? message);

    await AuthService.deleteSession(ApiDomain.LOCK);
    Logging.info(`trying to sign in to LOCK with ${address} ...`);
    return await LOCKsignIn({ address: address, signature: loginSignature })
      .then(async (accessToken) => {
        Logging.info('... success');
        LOCKsetIsNotAllowedInCountry(false);
        await AuthService.updateSession({ accessToken }, ApiDomain.LOCK);
        return accessToken;
      })
      .catch(async (resp) => {
        Logging.info(`... failed ${resp.statusCode}`);
        AuthService.deleteSession(ApiDomain.LOCK);

        if (resp.statusCode !== undefined && resp.statusCode === 401) {
          // Invalid credentials
          // -> fetch signature
          // await createSignature(pair.addr)
          logger.error('Invalid credentials');
          return '';
        }

        if (resp.statusCode === 403) {
          LOCKsetIsNotAllowedInCountry(true);
        }

        if (resp.statusCode === 404) {
          // try sign up
          return await LOCKsignUp({
            address: address,
            signature: loginSignature,
            blockchain: 'DeFiChain',
            walletName: 'DFX',
          })
            .then(async (accessToken) => {
              await AuthService.updateSession({ accessToken }, ApiDomain.LOCK);
              return accessToken;
            })
            .catch(async (resp) => {
              if (resp.message !== undefined) {
                throw new Error(resp.message);
              }
              throw new Error(resp);
            });
        }

        return '';
      });
  };

  // create/update DFX addr signature pair
  const activePairHandler = async (pair: DFXAddrSignature): Promise<void> => {
    Logging.info('activePairHandler');
    // - do we have a signature?
    if (pair.signature === undefined || pair.signature.length === 0) {
      await createSignature(pair.addr).catch(logger.error);
    }

    // - do we have a web token?
    // - do we have an active web session?
    if (pair.token === undefined || pair.token.length === 0 || (await isSessionExpired())) {
      await createWebToken(pair.addr).catch(logger.error);
    }

    // Set web session token
    const webToken = await DFXPersistence.getToken(pair.addr);
    if (webToken !== undefined && webToken.length > 0) {
      await AuthService.updateSession({ accessToken: webToken }).catch(() => {});
    }
  };

  const clearDfxTokens = async (): Promise<void> => {
    await DFXPersistence.reset(networkName);
  };

  // public context API
  const context: DFXAPIContextI = {
    openDfxServices,
    openKycLink,
    clearDfxTokens,
    listFiatAccounts,
    listCountries,
    signMessage: signMessageNoPersistence,
    getActiveWebToken,
    LOCKcreateWebToken,
    debouncedAddress,
    isNotAllowedInCountry,
    LOCKisNotAllowedInCountry,
    getUnavailableServices: () =>
      isNotAllowedInCountry && LOCKisNotAllowedInCountry ? 'DFX & LOCK' : LOCKisNotAllowedInCountry ? 'LOCK' : 'DFX',
  };

  // observe address state change
  useEffect(() => {
    Logging.info(`debouncedAddress changed ${debouncedAddress} (previous: ${previousDebouncedAddress})`);
    setPreviousDebouncedAddress(debouncedAddress);
    if (!previousDebouncedAddress || previousDebouncedAddress === debouncedAddress) {
      Logging.info('\tearly return');
      return;
    }
    getActiveWebToken()
      .then(() =>
        DFXPersistence.getPair(debouncedAddress)
          .then(async (pair) => {
            Logging.info('then of useEffect');
            await activePairHandler(pair).catch(() => {});
          })
          .catch(async () => {
            Logging.info('catch of useEffect');
            await activePairHandler({
              network: networkName,
              addr: debouncedAddress,
              signature: undefined,
              token: undefined,
            }).catch(() => {});
          }),
      )
      .catch(() => {});
  }, [debouncedAddress]);

  // observe network state change
  useEffect(() => {
    Logging.info(`debouncedNetworkName changed ${debouncedNetworkName} (previous: ${previousDebouncedNetworkName})`);
    setPreviousDebouncedNetworkName(debouncedNetworkName);
    if (!previousDebouncedNetworkName || previousDebouncedNetworkName === debouncedNetworkName) {
      return;
    }
    getActiveWebToken().catch(() => {});
  }, [debouncedNetworkName]);

  AuthService.setHookAccessor(context);

  // ---------------------------------------------------------------

  return <DFXAPIContext.Provider value={context}>{props.children}</DFXAPIContext.Provider>;
}
