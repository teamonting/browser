declare module 'selenium-webdriver/bidi/logInspector.js' {
  export interface FilterBy {
    getLevel(): string;
  }

  export interface Source {
    browsingContextId: string | null;
    realmId: string;
  }

  export interface BaseLogEntry {
    level: string;
    source: Source;
    stackTrace: string | undefined;
    text: string;
    timeStamp: number;
  }

  export interface GenericLogEntry extends BaseLogEntry {
    type: string;
  }

  export interface ConsoleLogEntry extends GenericLogEntry {
    args: unknown[];
    method: string;
  }

  export interface JavascriptLogEntry extends GenericLogEntry {}

  export interface LogInspector {
    close(): Promise<void>;
    onConsoleEntry(callback: (entry: ConsoleLogEntry) => void, filterBy?: FilterBy): Promise<number>;
    onJavascriptException(callback: (entry: JavascriptLogEntry) => void): Promise<number>;
    onJavascriptLog(callback: (entry: JavascriptLogEntry) => void, filterBy?: FilterBy): Promise<number>;
    onLog(
      callback: (entry: ConsoleLogEntry | JavascriptLogEntry | GenericLogEntry) => void,
      filterBy?: FilterBy
    ): Promise<number>;
    removeCallback(id: number): void;
  }

  export default function getLogInspectorInstance(
    driver?: unknown,
    browsingContextIds?: string[] | null
  ): Promise<LogInspector>;
}
