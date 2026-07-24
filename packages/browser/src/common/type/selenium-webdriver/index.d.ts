declare module 'selenium-webdriver' {
  namespace logging {
    class Level {
      static ALL: Level;
      static DEBUG: Level;
      static FINE: Level;
      static FINER: Level;
      static FINEST: Level;
      static INFO: Level;
      static OFF: Level;
      static SEVERE: Level;
      static WARNING: Level;
      name: string;
      value: number;
    }

    const Type: {
      BROWSER: 'browser';
      CLIENT: 'client';
      DRIVER: 'driver';
      PERFORMANCE: 'performance';
      SERVER: 'server';
    };

    class Entry {
      level: Level;
      message: string;
      timestamp: number;
      type: string;
    }

    class Preferences {
      setLevel(type: string, level: Level | string | number): void;
    }
  }

  const Browser: {
    CHROME: 'chrome';
    EDGE: 'MicrosoftEdge';
    FIREFOX: 'firefox';
    INTERNET_EXPLORER: 'internet explorer';
    SAFARI: 'safari';
  };

  interface BrowsingContextInstance {
    close(): Promise<void>;
    id?: string;
    navigate(url: string): Promise<void>;
  }

  function BrowsingContext(
    driver: WebDriver,
    options: { browsingContextId?: string; createParameters?: unknown; type?: string }
  ): Promise<BrowsingContextInstance>;

  interface BidiSocket {
    close(): unknown;
    on(event: string, listener: (...args: unknown[]) => void): unknown;
    setMaxListeners?(n: number): unknown;
  }

  interface BidiConnection {
    close(): Promise<unknown>;
    readonly isConnected: boolean;
    send(params: { method: string; params?: Record<string, unknown> }): Promise<unknown>;
    readonly socket: BidiSocket;
    readonly status: Promise<unknown>;
    subscribe(events: string | string[], browsingContexts?: string | string[]): Promise<void>;
    unsubscribe(events: string | string[], browsingContexts?: string | string[]): Promise<void>;
    waitForConnection(): Promise<void>;
  }

  class WebDriver {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executeScript<T = any>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
    findElement(locator: unknown): WebElementPromise;
    findElements(locator: unknown): Promise<readonly WebElement[]>;
    getBidi(): Promise<BidiConnection>;
    getAllWindowHandles(): Promise<string[]>;
    getWindowHandle(): Promise<string>;
    manage(): { logs(): { get(type: string): Promise<readonly logging.Entry[]> } };
    navigate(): { to(url: string): Promise<void> };
    quit(): Promise<void>;
  }

  class ShadowRoot {
    constructor(driver: WebDriver, id: string | Promise<string>);

    static extractId(obj: unknown): string;
    static isId(obj: unknown): boolean;

    findElement(locator: unknown): WebElementPromise;
    findElements(locator: unknown): Promise<readonly WebElement[]>;
    getId(): Promise<string>;
  }

  class WebElement {
    constructor(driver: WebDriver, id: string | Promise<string>);

    static buildId(id: string, noLegacy?: boolean): Record<string, string>;
    static equals(a: WebElement, b: WebElement): Promise<boolean>;
    static extractId(obj: unknown): string;
    static isId(obj: unknown): boolean;

    clear(): Promise<void>;
    click(): Promise<void>;
    findElement(locator: unknown): WebElementPromise;
    findElements(locator: unknown): Promise<readonly WebElement[]>;
    getAccessibleName(): Promise<string>;
    getAriaRole(): Promise<string>;
    getAttribute(attributeName: string): Promise<string | null>;
    getCssValue(cssStyleProperty: string): Promise<string>;
    getDomAttribute(attributeName: string): Promise<string | null>;
    getDriver(): WebDriver;
    getId(): Promise<string>;
    getProperty<T = string>(propertyName: string): Promise<T>;
    getRect(): Promise<{ width: number; height: number; x: number; y: number }>;
    getShadowRoot(): Promise<ShadowRoot>;
    getTagName(): Promise<string>;
    getText(): Promise<string>;
    isDisplayed(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    isSelected(): Promise<boolean>;
    sendKeys(...args: readonly (number | string | Promise<number | string>)[]): Promise<void>;
    submit(): Promise<void>;
    takeScreenshot(): Promise<string>;
  }

  class WebElementPromise extends WebElement implements PromiseLike<WebElement> {
    constructor(driver: WebDriver, el: Promise<WebElement>);

    then<TResult1 = WebElement, TResult2 = never>(
      onfulfilled?: ((value: WebElement) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2>;
  }

  class Builder {
    build(): Promise<WebDriver>;
    disableEnvironmentOverrides(): this;
    forBrowser(name: string, version?: string, platform?: string): this;
    getCapabilities(): unknown;
    getChromeOptions(): unknown;
    getFirefoxOptions(): unknown;
    getHttpAgent(): import('node:http').Agent | null;
    getSafariOptions(): unknown;
    getServerUrl(): string;
    getWebDriverProxy(): string | null;
    setAlertBehavior(behavior: unknown): this;
    setCapability(key: string, value: unknown): this;
    setChromeOptions(options: unknown): this;
    setChromeService(service: unknown): this;
    setEdgeOptions(options: unknown): this;
    setEdgeService(service: unknown): this;
    setFirefoxOptions(options: unknown): this;
    setFirefoxService(service: unknown): this;
    setIeOptions(options: unknown): this;
    setIeService(service: unknown): this;
    setLoggingPrefs(prefs: logging.Preferences | Record<string, string>): this;
    setProxy(config: unknown): this;
    setSafariOptions(options: unknown): this;
    usingHttpAgent(agent: import('node:http').Agent): this;
    usingServer(url: string): this;
    usingWebDriverProxy(proxy: string): this;
    withCapabilities(capabilities: unknown): this;
  }

  namespace error {
    abstract class WebDriverError extends Error {}
    abstract class NoSuchSessionError extends WebDriverError {}
  }
}
