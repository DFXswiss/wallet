import { AnnouncementData } from '@shared-types/website';
import { Announcement, findDisplayedAnnouncementForVersion } from '../../Portfolio/components/Announcements';
import { useLanguageContext } from '@shared-contexts/LanguageProvider';
import { nativeApplicationVersion } from 'expo-application';
import { useCallback, useState } from 'react';
import { OwnedTokenState, TokenState } from '../CompositeSwap/CompositeSwapScreen';
import { useTokenBestPath } from '@screens/AppNavigator/screens/Portfolio/hooks/TokenBestPath';
import { useFocusEffect } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import { useSelector } from 'react-redux';
import { RootState } from '@store';
import { SwapPathPoolPair } from '@defichain/whale-api-client/dist/api/poolpairs';

export type DexStabilizationType = 'direct-dusd-with-fee' | 'composite-dusd-with-fee' | 'return-path-with-fee' | 'none';

type DexStabilizationTokenA = OwnedTokenState | undefined;
type DexStabilizationTokenB = TokenState | undefined;

interface DexStabilization {
  dexStabilizationType: DexStabilizationType;
  dexStabilizationFee: string;
  pair: {
    tokenADisplaySymbol: string;
    tokenBDisplaySymbol: string;
  };
}

export function useDexStabilization(
  tokenA: DexStabilizationTokenA,
  tokenB: DexStabilizationTokenB,
): {
  dexStabilizationAnnouncement: Announcement | undefined;
  dexStabilization: DexStabilization;
} {
  const { getBestPath } = useTokenBestPath();
  const { language } = useLanguageContext();
  const pairs = useSelector((state: RootState) => state.wallet.poolpairs);

  // local state
  const [announcementToDisplay, setAnnouncementToDisplay] = useState<AnnouncementData[]>();
  const [dexStabilization, setDexStabilization] = useState<DexStabilization>({
    dexStabilizationType: 'none',
    pair: { tokenADisplaySymbol: '', tokenBDisplaySymbol: '' },
    dexStabilizationFee: '0',
  });

  const swapAnnouncement = findDisplayedAnnouncementForVersion(
    nativeApplicationVersion ?? '0.0.0',
    language,
    [],
    announcementToDisplay,
  );

  useFocusEffect(
    useCallback(() => {
      const _setAnnouncementToDisplay = async (): Promise<void> => {
        setAnnouncementToDisplay(await _getHighDexStabilizationFeeAnnouncement(tokenA, tokenB));
      };

      _setAnnouncementToDisplay();
    }, [tokenA, tokenB, pairs]),
  );

  const getDexStabilizationFee = (tokenADisplaySymbol: string, tokenBDisplaySymbol: string): string => {
    let fee;
    const dusdDFIPair = pairs.find((p) => p.data.displaySymbol === 'DUSD-DFI');
    const dUSDCDUSDPair = pairs.find((p) => p.data.displaySymbol === 'dUSDC-DUSD');
    const dUSDTDUSDPair = pairs.find((p) => p.data.displaySymbol === 'dUSDT-DUSD');

    if (dusdDFIPair !== undefined && tokenADisplaySymbol === 'DUSD' && tokenBDisplaySymbol === 'DFI') {
      fee = dusdDFIPair.data.tokenA.fee?.pct;
    } else if (dUSDCDUSDPair !== undefined && tokenADisplaySymbol === 'DUSD' && tokenBDisplaySymbol === 'dUSDC') {
      fee = dUSDCDUSDPair.data.tokenB.fee?.pct;
    } else if (dUSDTDUSDPair !== undefined && tokenADisplaySymbol === 'DUSD' && tokenBDisplaySymbol === 'dUSDT') {
      fee = dUSDTDUSDPair.data.tokenB.fee?.pct;
    }

    return fee === undefined ? '0' : new BigNumber(fee).multipliedBy(100).toFixed(2);
  };

  const getHighFeesUrl = (tokenA: OwnedTokenState, tokenB: TokenState): string => {
    let highFeesUrl = '';

    if (tokenA.displaySymbol === 'DUSD' && tokenB.displaySymbol === 'DFI') {
      highFeesUrl = 'https://defiscan.live/dex/DUSD';
    } else if (tokenA.displaySymbol === 'DUSD' && tokenB.displaySymbol === 'dUSDT') {
      highFeesUrl = 'https://defiscan.live/dex/dUSDT-DUSD';
    } else if (tokenA.displaySymbol === 'DUSD' && tokenB.displaySymbol === 'dUSDC') {
      highFeesUrl = 'https://defiscan.live/dex/dUSDC-DUSD';
    }

    return highFeesUrl;
  };

  const _getHighDexStabilizationFeeAnnouncement = useCallback(
    async (tokenA: DexStabilizationTokenA, tokenB: DexStabilizationTokenB): Promise<AnnouncementData[]> => {
      let announcement: AnnouncementData[] = [];
      if (tokenA === undefined || tokenB === undefined) {
        return announcement;
      }

      const dexStabilization = await _getDexStabilization(tokenA, tokenB);
      setDexStabilization(dexStabilization);

      const { dexStabilizationType, pair, dexStabilizationFee: fee } = dexStabilization;
      const highFeesUrl = getHighFeesUrl(tokenA, tokenB);

      if (dexStabilizationType === 'direct-dusd-with-fee') {
        announcement = [
          {
            lang: {
              en: `There is currently a high DEX Stabilization fee of ${fee}% imposed on ${tokenA.displaySymbol} -> ${tokenB.displaySymbol} swaps. Proceed with caution!`,
              de: `Derzeit wird eine hohe DEX-Stabilisierungsgebühr von ${fee}% auf ${tokenA.displaySymbol} -> ${tokenB.displaySymbol}-Tauschgeschäfte erhoben. Vorsicht ist geboten!`,
              'zh-Hans': `There is currently a high DEX Stabilization fee of ${fee}% imposed on ${tokenA.displaySymbol} -> ${tokenB.displaySymbol} swaps. Proceed with caution!`,
              'zh-Hant': `There is currently a high DEX Stabilization fee of ${fee}% imposed on ${tokenA.displaySymbol} -> ${tokenB.displaySymbol} swaps. Proceed with caution!`,
              fr: `Il y a actuellement des frais de stabilisation DEX élevés de ${fee}% imposés sur les échanges de ${tokenA.displaySymbol} -> ${tokenB.displaySymbol}. Procéder avec prudence !`,
              es: `There is currently a high DEX Stabilization fee of ${fee}% imposed on ${tokenA.displaySymbol} -> ${tokenB.displaySymbol} swaps. Proceed with caution!`,
              it: `There is currently a high DEX Stabilization fee of ${fee}% imposed on ${tokenA.displaySymbol} -> ${tokenB.displaySymbol} swaps. Proceed with caution!`,
            },
            version: '>=1.16.1',
            url: {
              ios: highFeesUrl,
              android: highFeesUrl,
              windows: highFeesUrl,
              web: highFeesUrl,
              macos: highFeesUrl,
            },
            type: 'EMERGENCY',
          },
        ];
      } else if (dexStabilizationType === 'composite-dusd-with-fee') {
        announcement = [
          {
            lang: {
              en: `Your swap consists of a composite path (${pair.tokenADisplaySymbol} -> ${pair.tokenBDisplaySymbol}) which will incur DEX Stabilization fees of ${fee}%.`,
              de: `Dein Tausch besteht aus einem zusammengesetzten Pfad (${pair.tokenADisplaySymbol} -> ${pair.tokenBDisplaySymbol}) im Rahmen eines Komposit-Swaps, für den DEX-Stabilisierungsgebühren in Höhe von ${fee}% anfallen.`,
              'zh-Hans': `Your swap consists of a composite path (${pair.tokenADisplaySymbol} -> ${pair.tokenBDisplaySymbol}) which will incur DEX Stabilization fees of ${fee}%.`,
              'zh-Hant': `Your swap consists of a composite path (${pair.tokenADisplaySymbol} -> ${pair.tokenBDisplaySymbol}) which will incur DEX Stabilization fees of ${fee}%.`,
              fr: `Votre échange consiste en un chemin composite (${pair.tokenADisplaySymbol} -> ${pair.tokenBDisplaySymbol}) dans le cadre d'un swap composite qui entraînera des frais de stabilisation DEX de ${fee}%. `,
              es: `Your swap consists of a composite path (${pair.tokenADisplaySymbol} -> ${pair.tokenBDisplaySymbol}) which will incur DEX Stabilization fees of ${fee}%.`,
              it: `Your swap consists of a composite path (${pair.tokenADisplaySymbol} -> ${pair.tokenBDisplaySymbol}) which will incur DEX Stabilization fees of ${fee}%.`,
            },
            version: '>=1.16.1',
            url: {
              ios: highFeesUrl,
              android: highFeesUrl,
              windows: highFeesUrl,
              web: highFeesUrl,
              macos: highFeesUrl,
            },
            type: 'EMERGENCY',
          },
        ];
      } else if (dexStabilizationType === 'return-path-with-fee') {
        // This info is default for informing beforehand of the returning swap dexFee
        announcement = [
          {
            lang: {
              en: `When swapping into dToken assets, please note that if you want to exchange them back into crypto tokens (DFI, dBTC, dETH...), stablecoins (dUSDC, dUSDT) or sell them via DFX against FIAT (EUR, USD, FR...) at a later point in time, a DEX stabilization fee of ${fee}% will apply. In case of a later exchange within the dToken (dUSD, dTSLA, dAMZN, dCOIN ...), the aforementioned DEX stabilization fee does not apply.`,
              de: `Beim Tausch in dToken-Vermögenswerte beachte bitte, dass bei einem späteren Rücktausch in Krypto-Token (DFI, dBTC, dETH...), Stablecoins (dUSDC, dUSDT) oder einem Verkauf über DFX gegen FIAT (EUR, USD, FR...) eine DEX-Stabilisierungsgebühr von derzeit ${fee}% anfällt. Bei einem späteren Umtausch innerhalb des dToken (dUSD, dTSLA, dAMZN, dCOIN ...) entfällt die vorgenannte DEX-Stabilisierungsgebühr.`,
              'zh-Hans': `当交换到dToken资产时，请注意，如果你想把它们换回加密代币（DFI，dBTC，dETH...），稳定币（dUSDC，dUSDT）或在以后的时间点通过DFX对FIAT（EUR，USD，FR...）出售，将适用大约12%的DEX稳定费（目前为${fee}%）。如果以后在dToken（dUSD, dTSLA, dAMZN, dCOIN ...）内进行兑换，上述的DEX稳定费不适用。`,
              'zh-Hant': `当交换到dToken资产时，请注意，如果你想把它们换回加密代币（DFI，dBTC，dETH...），稳定币（dUSDC，dUSDT）或在以后的时间点通过DFX对FIAT（EUR，USD，FR...）出售，将适用大约12%的DEX稳定费（目前为${fee}%）。如果以后在dToken（dUSD, dTSLA, dAMZN, dCOIN ...）内进行兑换，上述的DEX稳定费不适用。`,
              fr: `Lors de l'échange contre des actifs dToken, veuillez noter que si vous souhaitez les échanger à nouveau contre des crypto-tokens (DFI, dBTC, dETH...), des stablecoins (dUSDC, dUSDT) ou les vendre via DFX contre des FIAT (EUR, USD, FR...) ultérieurement, des frais de stabilisation DEX ${fee}% s'appliqueront. En cas d'échange ultérieur au sein du dToken (dUSD, dTSLA, dAMZN, dCOIN ...), les frais de stabilisation DEX susmentionnés ne s'appliquent pas.`,
              es: `Cuando cambie a activos dToken, tenga en cuenta que si quiere volver a cambiarlos por cripto tokens (DFI, dBTC, dETH...), stablecoins (dUSDC, dUSDT) o venderlos a través de DFX contra FIAT (EUR, USD, FR...) en un momento posterior, se aplicará una tasa de estabilización DEX ${fee}%. En caso de un intercambio posterior dentro del dToken (dUSD, dTSLA, dAMZN, dCOIN ...), no se aplica la mencionada tasa de estabilización DEX.`,
              it: `Quando si scambiano asset in dToken, si noti che se si desidera scambiarli nuovamente in crypto token (DFI, dBTC, dETH...), stablecoin (dUSDC, dUSDT) o venderli tramite DFX contro FIAT (EUR, USD, FR...) in un momento successivo, si applicherà una commissione di stabilizzazione DEX ${fee}%. In caso di scambio successivo all'interno del dToken (dUSD, dTSLA, dAMZN, dCOIN...), la suddetta commissione di stabilizzazione DEX non si applica.`,
            },
            version: '>=1.16.1',
            url: {
              ios: highFeesUrl,
              android: highFeesUrl,
              windows: highFeesUrl,
              web: highFeesUrl,
              macos: highFeesUrl,
            },
            type: 'EMERGENCY',
          },
        ];
      }
      return announcement;
    },
    [],
  );

  const convertPairsToNodes = (bestPath: SwapPathPoolPair[]): string[] => {
    /*
      Convert pairs[] to bestPathNodes[] in proper direction in array shape -- bestPathNodes[]
      pairs: [w-x -> y-x -> z-y] ---> proper direction [w-x -> x-y -> y-z] ---> bestPathNodes: [w,x,y,z]
    */
    let bestPathNodes: string[] = [];
    bestPath.forEach((currentPair, index) => {
      const nextPair = bestPath[index + 1];
      const prevPair = bestPath[index - 1];

      if (nextPair === undefined) {
        // last pair
        const prevPairTokenB =
          bestPathNodes[bestPathNodes.length - 1] === prevPair.tokenA.displaySymbol
            ? prevPair.tokenB.displaySymbol
            : prevPair.tokenA.displaySymbol;

        bestPathNodes =
          prevPairTokenB === currentPair.tokenA.displaySymbol
            ? bestPathNodes.concat([currentPair.tokenA.displaySymbol, currentPair.tokenB.displaySymbol])
            : bestPathNodes.concat([currentPair.tokenB.displaySymbol, currentPair.tokenA.displaySymbol]);
      } else if (
        [nextPair.tokenA.displaySymbol, nextPair.tokenB.displaySymbol].includes(currentPair.tokenA.displaySymbol)
      ) {
        bestPathNodes.push(currentPair.tokenB.displaySymbol);
      } else {
        bestPathNodes.push(currentPair.tokenA.displaySymbol);
      }
    });

    return bestPathNodes;
  };

  const getCompositeSwapDexStabilization = useCallback(
    (
      bestPath: SwapPathPoolPair[],
      pairsWithDexFee: Array<{ tokenADisplaySymbol: string; tokenBDisplaySymbol: string }>,
    ): DexStabilization | undefined => {
      /* Not composite swap if there's only one leg */
      if (bestPath.length === 1) {
        return;
      }

      const bestPathNodes = convertPairsToNodes(bestPath);

      /*
      Based from bestPathNodes: [w,x,y,z], check if direction is correct in pairsWithDexFee e.g [w-x,y-x,z-y]
      Right direction: [w-x],
      Wrong direction: [z-y], [y.x]
    */
      let pairWithDexFee: { tokenADisplaySymbol: string; tokenBDisplaySymbol: string } | undefined;
      for (let i = 0; i <= bestPathNodes.length; i++) {
        pairWithDexFee =
          pairsWithDexFee.find(
            (p) => p.tokenADisplaySymbol === bestPathNodes[i] && p.tokenBDisplaySymbol === bestPathNodes[i + 1],
          ) ?? pairWithDexFee;
      }

      if (pairWithDexFee === undefined) {
        return undefined;
      }

      const { tokenADisplaySymbol, tokenBDisplaySymbol } = pairWithDexFee;
      return {
        dexStabilizationType: 'composite-dusd-with-fee',
        pair: {
          tokenADisplaySymbol,
          tokenBDisplaySymbol,
        },
        dexStabilizationFee: getDexStabilizationFee(tokenADisplaySymbol, tokenBDisplaySymbol),
      };
    },
    [],
  );

  const _getDexStabilization = async (
    tokenA: DexStabilizationTokenA,
    tokenB: DexStabilizationTokenB,
  ): Promise<DexStabilization> => {
    const _dexStabilization: DexStabilization = {
      dexStabilizationType: 'none',
      pair: {
        tokenADisplaySymbol: '',
        tokenBDisplaySymbol: '',
      },
      dexStabilizationFee: '0',
    };

    if (tokenA === undefined || tokenB === undefined) {
      return _dexStabilization;
    }

    const { bestPath } = await getBestPath(
      tokenA.id === '0_unified' ? '0' : tokenA.id,
      tokenB.id === '0_unified' ? '0' : tokenB.id,
    );

    /*
      Direct swap - checking the length is impt because when the pair is disabled, then the path used will be different
    */
    if (
      bestPath.length === 1 &&
      ((tokenA.displaySymbol === 'DUSD' && tokenB.displaySymbol === 'DFI') ||
        (tokenA.displaySymbol === 'DUSD' && tokenB.displaySymbol === 'dUSDT') ||
        (tokenA.displaySymbol === 'DUSD' && tokenB.displaySymbol === 'dUSDC'))
    ) {
      return {
        dexStabilizationType: 'direct-dusd-with-fee',
        pair: {
          tokenADisplaySymbol: tokenA.displaySymbol,
          tokenBDisplaySymbol: tokenB.displaySymbol,
        },
        dexStabilizationFee: getDexStabilizationFee(tokenA.displaySymbol, tokenB.displaySymbol),
      };
    }

    // check for direct return path fee info
    if (
      bestPath.length === 1 &&
      ((tokenA.displaySymbol === 'DFI' && tokenB.displaySymbol === 'DUSD') ||
        (tokenA.displaySymbol === 'dUSDT' && tokenB.displaySymbol === 'DUSD') ||
        (tokenA.displaySymbol === 'dUSDC' && tokenB.displaySymbol === 'DUSD'))
    ) {
      return {
        dexStabilizationType: 'return-path-with-fee',
        pair: {
          tokenADisplaySymbol: tokenA.displaySymbol,
          tokenBDisplaySymbol: tokenB.displaySymbol,
        },
        dexStabilizationFee: getDexStabilizationFee(tokenB.displaySymbol, tokenA.displaySymbol),
      };
    }

    /*
      Otherwise, check for composite swap
        1. Get index of DUSD-(DFI | USDT | USDC) pair
        2. If index === 0 Check if first leg in best path is DUSD-(DFI | USDT | USDC) and second leg is (DFI | USDT | USDC) respectively
        3. Else check if the previous pair tokenB is DUSD to ensure that the direction of DUSD-DFI is DUSD -> DFI | USDT | USDC
    */
    const compositeSwapDexStabilization = getCompositeSwapDexStabilization(bestPath, [
      { tokenADisplaySymbol: 'DUSD', tokenBDisplaySymbol: 'DFI' },
      { tokenADisplaySymbol: 'DUSD', tokenBDisplaySymbol: 'dUSDT' },
      { tokenADisplaySymbol: 'DUSD', tokenBDisplaySymbol: 'dUSDC' },
    ]);

    const compositeInverted = getCompositeSwapDexStabilization(bestPath, [
      { tokenADisplaySymbol: 'DFI', tokenBDisplaySymbol: 'DUSD' },
      { tokenADisplaySymbol: 'dUSDT', tokenBDisplaySymbol: 'DUSD' },
      { tokenADisplaySymbol: 'dUSDC', tokenBDisplaySymbol: 'DUSD' },
    ]);
    if (compositeInverted != null) {
      compositeInverted.dexStabilizationType = 'return-path-with-fee';
      compositeInverted.dexStabilizationFee = '0';
    }

    return compositeSwapDexStabilization ?? compositeInverted ?? _dexStabilization;
  };

  return {
    dexStabilizationAnnouncement: swapAnnouncement,
    dexStabilization,
  };
}
