import { Logging } from '@api';
import { DFXAPIContextI } from '@shared-contexts/DFXAPIContextProvider';
import jwtDecode from 'jwt-decode';
import { Observable, ReplaySubject } from 'rxjs';
import { UserRole } from './models/User';
import { StorageService } from './StorageService';

const SessionKey = 'session';

export enum ApiDomain {
  LOCK = 'LOCK',
}

export interface Credentials {
  address?: string;
  signature?: string;
}

export interface ISession {
  accessToken?: string;
}

interface JWT {
  exp: number;
  iat: number;
  address: string;
  role: UserRole;
}

export class Session implements ISession {
  public accessToken?: string;
  public address?: string;
  public role?: UserRole;
  public expires?: Date;

  public get isLoggedIn(): boolean {
    return Boolean(this.accessToken);
  }

  public get isBetaUser(): boolean {
    return [UserRole.Admin, UserRole.BETA].includes(this.role ?? UserRole.Unknown);
  }

  public get isExpired(): boolean {
    return this.expires != null && Date.now() > this.expires.getTime();
  }

  constructor(session?: ISession) {
    this.accessToken = session?.accessToken;
    if (this.accessToken != null && this.accessToken.length > 0) {
      const jwt: JWT = jwtDecode(this.accessToken);
      this.address = jwt.address;
      this.role = jwt.role;
      this.expires = new Date(jwt.exp * 1000);
    }
  }
}

class AuthServiceClass {
  // TODO: (thabrad) check if able to remove!
  private readonly session$ = new ReplaySubject<Session>();
  private dfxApiHook: DFXAPIContextI | undefined;

  constructor() {
    this.Session()
      .then((session) => this.session$.next(session))
      .catch(() => this.session$.next(new Session()));
  }

  // was unused, so commented out for for, check replay subject use
  public get Session$(): Observable<Session> {
    return this.session$;
  }

  private static SessionKey(forApiDomain?: ApiDomain): string {
    return SessionKey.concat(forApiDomain != null ? '-' + forApiDomain : '');
  }

  public async Session(noCredential?: boolean, forApiDomain?: ApiDomain): Promise<Session> {
    if (noCredential ?? false) {
      return new Session();
    }

    const session = new Session(await StorageService.getValue<ISession>(AuthServiceClass.SessionKey(forApiDomain)));
    if (
      session.isExpired ||
      session.address !== this.dfxApiHook?.debouncedAddress ||
      session.accessToken === undefined ||
      session.accessToken.length < 10
    ) {
      Logging.info(
        `session is expired (${session.isExpired}), non existent (${
          session.accessToken === undefined || session.accessToken.length < 10
        }) or from another address (${session.address !== this.dfxApiHook?.debouncedAddress})`,
      );
      session.accessToken =
        forApiDomain === ApiDomain.LOCK
          ? await this.dfxApiHook?.LOCKcreateWebToken()
          : await this.dfxApiHook?.getActiveWebToken();
    }
    return await StorageService.getValue<ISession>(AuthServiceClass.SessionKey(forApiDomain)).then(
      (session) => new Session(session),
    );
  }

  public async updateSession(session: ISession, forApiDomain?: ApiDomain): Promise<void> {
    return await StorageService.storeValue(AuthServiceClass.SessionKey(forApiDomain), session).then(() =>
      this.session$.next(new Session(session)),
    );
  }

  public async deleteSession(forApiDomain?: ApiDomain): Promise<void> {
    return await this.updateSession({ accessToken: undefined }, forApiDomain);
  }

  public async getSession(forApiDomain?: ApiDomain): Promise<Session> {
    return new Session(await StorageService.getValue<ISession>(AuthServiceClass.SessionKey(forApiDomain)));
  }

  public setHookAccessor(dfxApiHook: DFXAPIContextI): void {
    this.dfxApiHook = dfxApiHook;
  }
}

export const AuthService = new AuthServiceClass();
