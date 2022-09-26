import { History } from './models/History'
import { getEnvironment } from '@environment'
import { AuthResponse, SignMessageRespone } from './models/ApiDto'
import { Asset } from './models/Asset'
import { BuyPaymentInfoDto, BuyRoute, BuyRouteDto, fromBuyRouteDto, GetBuyPaymentInfoDto, toBuyRouteDto } from './models/BuyRoute'
import { CfpResult } from './models/CfpResult'
import { Country } from './models/Country'
import { Fiat } from './models/Fiat'
import { Language } from './models/Language'
import { fromSellRouteDto, GetSellPaymentInfoDto, SellData, SellPaymentInfoDto, SellRoute, SellRouteDto, toSellRouteDto } from './models/SellRoute'
import {
  CfpVotes,
  fromUserDetailDto,
  fromUserDto,
  KycInfo,
  KycResult,
  NewUser,
  toUserDto,
  User,
  UserDetail,
  UserDetailDto,
  UserDetailRequestDto,
  UserDto
} from './models/User'
import { AuthService, Credentials, Session } from './AuthService'
import { StakingRoute } from './models/StakingRoute'
import { RoutesDto, fromRoutesDto, Routes } from './models/Route'
import { LimitRequest } from './models/LimitRequest'
import { KycData, toKycDataDto } from './models/KycData'
import { Settings } from './models/Settings'
import { HistoryType } from './models/HistoryType'
import { CryptoRoute } from './models/CryptoRoute'
import * as Updates from 'expo-updates'
import { BankAccount, BankAccountData, BankAccountDto, fromBankAccountDto, toBankAccountDto } from './models/BankAccount'

const BaseUrl = getEnvironment(Updates.releaseChannel).dfxApiUrl
const AuthUrl = 'auth'
const UserUrl = 'user'
const KycUrl = 'kyc'
const BankAccountUrl = 'bankAccount'
const BuyUrl = 'buy'
const PaymentInfosUrl = 'paymentInfos'
const RouteUrl = 'route'
const SellUrl = 'sell'
const StakingUrl = 'staking'
const CryptoRouteUrl = 'cryptoRoute'
const HistoryUrl = 'history'
const AssetUrl = 'asset'
const FiatUrl = 'fiat'
const CountryUrl = 'country'
const LanguageUrl = 'language'
const BankTxUrl = 'bankTx'
const StatisticUrl = 'statistic'
const SettingUrl = 'setting/frontend'

// --- AUTH --- //
export const signIn = async (credentials?: Credentials): Promise<string> => {
  return await fetchFrom<AuthResponse>(`${AuthUrl}/signIn`, 'POST', credentials).then((resp) => {
    return resp.accessToken
  })
}

export const signUp = async (user: NewUser): Promise<string> => {
  return await fetchFrom<AuthResponse>(`${AuthUrl}/signUp`, 'POST', user).then((resp) => {
    return resp.accessToken
  })
}

export const getSignMessage = async (address: string): Promise<string> => {
  return await fetchFrom<SignMessageRespone>(`${AuthUrl}/signMessage`, 'GET', undefined, undefined, { address: address }).then((resp) => {
    return resp.message
  })
}

// --- USER --- //
export const getUser = async (): Promise<User> => {
  return await fetchFrom<UserDto>(UserUrl).then(fromUserDto)
}

export const getUserDetail = async (): Promise<UserDetail> => {
  return await fetchFrom<UserDetailDto>(`${UserUrl}/detail`).then(fromUserDetailDto)
}

export const putUser = async (user: User | UserDetailRequestDto): Promise<UserDetail> => {
  return await fetchFrom<UserDetailDto>(UserUrl, 'PUT', toUserDto(user as User)).then(fromUserDetailDto)
}

export const updateRefFee = async (fee: number): Promise<void> => {
  return await fetchFrom(UserUrl, 'PUT', { refFeePercent: fee })
}

// --- KYC --- //
export const putKycData = async (data: KycData, code?: string): Promise<KycInfo> => {
  if (code === undefined) {
    return await putKycDataOLD(data) as unknown as KycInfo
  }
  return await fetchFrom<KycInfo>(`${KycUrl}/${code}/data`, 'PUT', toKycDataDto(data))
}

export const postKyc = async (code?: string): Promise<KycInfo> => {
  if (code === undefined) {
    return await postKycOLD() as unknown as KycInfo
  }
  return await fetchFrom<KycInfo>(`${KycUrl}/${code}`, 'POST')
}

export const getKyc = async (code: string): Promise<KycInfo> => {
  try {
    return await fetchFrom<KycInfo>(`${KycUrl}/${code}`)
  } catch (err) {
    return await getKycOLD(code) as unknown as KycInfo
  }
}

export const postLimit = async (request: LimitRequest, code?: string): Promise<LimitRequest> => {
  if (code === undefined) {
    return await postLimitOLD(request)
  }
  return await fetchFrom<LimitRequest>(`${KycUrl}/${code}/limit`, 'POST', request)
}

export const postFounderCertificate = async (files: File[], code?: string): Promise<void> => {
  if (code === undefined) {
    return await postFounderCertificateOLD(files)
  }
  return await postFiles(`${KycUrl}/${code}/incorporationCertificate`, files)
}

// --- KYC @deprecated --- //
/**
 * @deprecated The method should not be used
 */
export const putKycDataOLD = async (data: KycData): Promise<void> => {
  return await fetchFrom(`${KycUrl}/data`, 'POST', toKycDataDto(data))
}

/**
 * @deprecated The method should not be used
 */
export const postKycOLD = async (): Promise<string> => {
  return await fetchFrom<string>(KycUrl, 'POST')
}

/**
 * @deprecated The method should not be used
 */
export const getKycOLD = async (code: string): Promise<KycResult> => {
  return await fetchFrom<KycResult>(`${KycUrl}?code=${code}`)
}

/**
 * @deprecated The method should not be used
 */
export const postLimitOLD = async (request: LimitRequest): Promise<LimitRequest> => {
  return await fetchFrom<LimitRequest>(`${KycUrl}/limit`, 'POST', request)
}

/**
 * @deprecated The method should not be used
 */
export const postFounderCertificateOLD = async (files: File[]): Promise<void> => {
  return await postFiles(`${KycUrl}/incorporationCertificate`, files)
}

// --- VOTING --- //
export const getSettings = async (): Promise<Settings> => {
  return await fetchFrom<Settings>(SettingUrl)
}

export const getCfpVotes = async (): Promise<CfpVotes> => {
  return await fetchFrom<CfpVotes>(`${UserUrl}/cfpVotes`)
}

export const putCfpVotes = async (votes: CfpVotes): Promise<CfpVotes> => {
  return await fetchFrom<CfpVotes>(`${UserUrl}/cfpVotes`, 'PUT', votes)
}

// --- ACCOUNTS --- //
export const getBankAccounts = async (): Promise<BankAccount[]> => {
  return await fetchFrom<BankAccountDto[]>(BankAccountUrl).then((dtoList) => dtoList.map((dto) => fromBankAccountDto(dto)))
}

export const postBankAccount = async (bankAccount: BankAccountData): Promise<BankAccount> => {
  return await fetchFrom<BankAccountDto>(BankAccountUrl, 'POST', toBankAccountDto(bankAccount)).then(fromBankAccountDto)
}

export const putBankAccount = async (bankAccount: BankAccountData, id: BankAccount['id']): Promise<BankAccount> => {
  return await fetchFrom<BankAccountDto>(`${BankAccountUrl}/${id}`, 'PUT', toBankAccountDto(bankAccount)).then(fromBankAccountDto)
}

// --- PAYMENT ROUTES --- //
export const getRoutes = async (): Promise<Routes> => {
  return await fetchFrom<RoutesDto>(RouteUrl).then(fromRoutesDto)
}

export const getBuyRoutes = async (): Promise<BuyRoute[]> => {
  return await fetchFrom<BuyRouteDto[]>(BuyUrl).then((dtoList) => dtoList.map((dto) => fromBuyRouteDto(dto)))
}

export const postBuyRoute = async (route: BuyRoute): Promise<BuyRoute> => {
  return await fetchFrom<BuyRouteDto>(BuyUrl, 'POST', toBuyRouteDto(route)).then(fromBuyRouteDto)
}

export const putBuyRoute = async (route: BuyRoute): Promise<BuyRoute> => {
  return await fetchFrom<BuyRouteDto>(`${BuyUrl}/${route.id}`, 'PUT', toBuyRouteDto(route)).then(fromBuyRouteDto)
}

export const buyWithPaymentInfos = async (payentInfos: GetBuyPaymentInfoDto): Promise<BuyPaymentInfoDto> => {
  return await fetchFrom<BuyPaymentInfoDto>(`${BuyUrl}/${PaymentInfosUrl}`, 'PUT', payentInfos)//, toBuyRouteDto(route)).then(fromBuyRouteDto)
}

export const sellWithPaymentInfos = async (payentInfos: GetSellPaymentInfoDto): Promise<SellPaymentInfoDto> => {
  return await fetchFrom<SellPaymentInfoDto>(`${SellUrl}/${PaymentInfosUrl}`, 'PUT', payentInfos)//, toBuyRouteDto(route)).then(fromBuyRouteDto)
}

export const getSellRoutes = async (): Promise<SellRoute[]> => {
  return await fetchFrom<SellRouteDto[]>(SellUrl).then((dtoList) => dtoList.map((dto) => fromSellRouteDto(dto)))
}

export const postSellRoute = async (route: SellData): Promise<SellRoute> => {
  return await fetchFrom<SellRouteDto>(SellUrl, 'POST', toSellRouteDto(route)).then(fromSellRouteDto)
}

export const putSellRoute = async (route: SellRoute): Promise<SellRoute> => {
  return await fetchFrom<SellRouteDto>(`${SellUrl}/${route.id}`, 'PUT', toSellRouteDto(route)).then(fromSellRouteDto)
}

export const getStakingRoutes = async (): Promise<StakingRoute[]> => {
  return await fetchFrom<StakingRoute[]>(StakingUrl)
}

export const postStakingRoute = async (route: StakingRoute): Promise<StakingRoute> => {
  return await fetchFrom<StakingRoute>(StakingUrl, 'POST', route)
}

export const putStakingRoute = async (route: StakingRoute): Promise<StakingRoute> => {
  return await fetchFrom<StakingRoute>(`${StakingUrl}/${route.id}`, 'PUT', route)
}

export const getCryptoRoutes = async (): Promise<CryptoRoute[]> => {
  return await fetchFrom<CryptoRoute[]>(CryptoRouteUrl)
}

export const postCryptoRoute = async (route: CryptoRoute): Promise<CryptoRoute> => {
  return await fetchFrom<CryptoRoute>(CryptoRouteUrl, 'POST', route)
}

export const putCryptoRoute = async (route: CryptoRoute): Promise<CryptoRoute> => {
  return await fetchFrom<CryptoRoute>(`${CryptoRouteUrl}/${route.id}`, 'PUT', route)
}

export const getHistory = async (types: HistoryType[]): Promise<History[]> => {
  return await fetchFrom<History[]>(`HistoryUrl${toHistoryQuery(types)}`)
}

export const createHistoryCsv = async (types: HistoryType[]): Promise<number> => {
  return await fetchFrom(`${HistoryUrl}/csv${toHistoryQuery(types)}`, 'POST')
}

const toHistoryQuery = (types?: HistoryType[]): string => ((types != null) ? '?' + Object.values(types).join('&') : '')

// --- PAYMENT --- //
export const postSepaFiles = async (files: File[]): Promise<void> => {
  return await postFiles(BankTxUrl, files)
}

// --- STATISTIC --- //
export const getCfpResults = async (voting: string): Promise<CfpResult[]> => {
  return await fetchFrom(`${StatisticUrl}/cfp/${voting}`)
}

// --- MASTER DATA --- //
export const getAssets = async (): Promise<Asset[]> => {
  return await fetchFrom<Asset[]>(AssetUrl)
}

export const getFiats = async (): Promise<Fiat[]> => {
  return await fetchFrom<Fiat[]>(FiatUrl)
}

export const getCountries = async (): Promise<Country[]> => {
  return await fetchFrom<Country[]>(CountryUrl).then((countries) => countries.sort((a, b) => (a.name > b.name ? 1 : -1)))
}

export const getLanguages = async (): Promise<Language[]> => {
  return await fetchFrom<Language[]>(LanguageUrl)
}

// --- HELPERS --- //
const postFiles = async (url: string, files: File[]): Promise<void> => {
  const formData = new FormData()
  files.forEach((value, index) => {
    formData.append('files', value)
  })
  return await fetchFrom(url, 'POST', formData, true)
}

const fetchFrom = async <T>(
  url: string,
  method: 'GET' | 'PUT' | 'POST' = 'GET',
  data?: any,
  noJson?: boolean,
  queryParams?: string | string[][] | Record<string, string> | URLSearchParams
): Promise<T> => {
  // QueryParams object conversion helper
  url += (queryParams != null) ? `?${new URLSearchParams(queryParams).toString()}` : ''

  return (
    await AuthService.Session.then((session) => buildInit(method, session, data, noJson))
      .then(async (init) => await fetch(`${BaseUrl}/${url}`, init))
      .then(async (response) => {
        if (response.ok) {
          return await response.json()
        }
        return await response.json().then((body) => {
          throw body
        })
      })
      .catch((error) => {
        if (error.statusCode === 401) {
          AuthService.deleteSession().catch(() => 'You shall not pass!')
        }

        throw error
      })
  )
}

const buildInit = (method: 'GET' | 'PUT' | 'POST', session: Session, data?: any, noJson?: boolean): RequestInit => ({
  method: method,
  headers: {
    ...((noJson !== undefined && noJson) ? undefined : { 'Content-Type': 'application/json' }),
    Authorization: session.accessToken !== undefined ? 'Bearer ' + session.accessToken : ''
  },
  body: (noJson !== undefined && noJson) ? data : JSON.stringify(data)
})
