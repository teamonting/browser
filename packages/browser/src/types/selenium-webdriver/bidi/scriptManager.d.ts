declare module 'selenium-webdriver/bidi/scriptManager.js' {
  import type { RemoteValue } from 'selenium-webdriver/bidi/protocolValue.js';

  export interface EvaluateResultException {
    exceptionDetails: unknown;
    realmId: string;
    resultType: 'exception';
  }

  export interface EvaluateResultSuccess {
    realmId: string;
    result: unknown;
    resultType: 'success';
  }

  export interface LocalValue {
    asMap(): Record<string, unknown>;
    type: string;
    value?: unknown;
  }

  export interface Message {
    channel: string;
    data: RemoteValue;
    source: unknown;
  }

  export interface RealmInfo {
    browsingContext: string;
    origin: string;
    realmId: string;
    realmType?: string;
  }

  export interface ResultOwnership {
    readonly value?: string;
  }

  export interface ScriptManager {
    addPreloadScript(
      functionDeclaration: string,
      argumentValueList?: Array<LocalValue> | null,
      sandbox?: string | null
    ): Promise<string>;
    callFunctionInBrowsingContext(
      browsingContextId: string,
      functionDeclaration: string,
      awaitPromise: boolean,
      argumentValueList?: Array<LocalValue> | null,
      thisParameter?: unknown,
      resultOwnership?: ResultOwnership | null,
      sandbox?: string | null
    ): Promise<EvaluateResultSuccess | EvaluateResultException>;
    callFunctionInRealm(
      realmId: string,
      functionDeclaration: string,
      awaitPromise: boolean,
      argumentValueList?: Array<LocalValue> | null,
      thisParameter?: unknown,
      resultOwnership?: ResultOwnership | null
    ): Promise<EvaluateResultSuccess | EvaluateResultException>;
    close(): Promise<void>;
    disownBrowsingContextScript(browsingContextId: string, handles: string[], sandbox?: string | null): Promise<void>;
    disownRealmScript(realmId: string, handles: string[]): Promise<void>;
    evaluateFunctionInBrowsingContext(
      browsingContextId: string,
      expression: string,
      awaitPromise: boolean,
      resultOwnership?: ResultOwnership | null,
      sandbox?: string | null
    ): Promise<EvaluateResultSuccess | EvaluateResultException>;
    evaluateFunctionInRealm(
      realmId: string,
      expression: string,
      awaitPromise: boolean,
      resultOwnership?: ResultOwnership | null
    ): Promise<EvaluateResultSuccess | EvaluateResultException>;
    getAllRealms(): Promise<RealmInfo[]>;
    getRealmsByType(type: string): Promise<RealmInfo[]>;
    getRealmsInBrowsingContext(browsingContext: string): Promise<RealmInfo[]>;
    getRealmsInBrowsingContextByType(browsingContext: string, type: string): Promise<RealmInfo[]>;
    onMessage(callback: (message: Message | RealmInfo) => void): Promise<number>;
    onRealmCreated(callback: (realm: RealmInfo | WindowRealmInfo) => void): Promise<number>;
    onRealmDestroyed(callback: (realm: RealmInfo | WindowRealmInfo) => void): Promise<number>;
    removePreloadScript(script: string): Promise<unknown>;
  }

  export interface WindowRealmInfo extends RealmInfo {
    browsingContext?: string;
    sandbox?: string | null;
  }

  export default function getScriptManagerInstance(
    browsingContextId: string | string[],
    driver: unknown
  ): Promise<ScriptManager>;
}
