declare module 'selenium-webdriver/edge.js' {
  interface DriverService {
    address(): Promise<string>;
    getExecutable(): string;
    isRunning(): boolean;
    kill(): Promise<void>;
    setExecutable(value: string): void;
    start(timeoutMs?: number): Promise<string>;
  }

  // edge.ServiceBuilder extends chromium.ServiceBuilder extends remote.DriverService.Builder.
  class ServiceBuilder {
    constructor(exe?: string);

    addArguments(...args: readonly string[]): this;
    build(): DriverService;
    enableChromeLogging(): this;
    enableVerboseLogging(): this;
    loggingTo(path: string): this;
    setAdbPort(port: number): this;
    setEnvironment(env: Record<string, string> | Map<string, string>): this;
    setHostname(hostname: string): this;
    setLoopback(loopback: boolean): this;
    setNumHttpThreads(n: number): this;
    setPath(basePath: string): this;
    setPort(port: number): this;
    setStdio(config: string | readonly (number | string | null | undefined)[]): this;
  }

  // edge.Options extends chromium.Options extends Capabilities.
  class Options {
    constructor(other?: unknown);

    addArguments(...args: readonly string[]): this;
    addExtensions(...args: readonly (string | Buffer)[]): this;
    androidActivity(name: string): this;
    androidDeviceSerial(serial: string): this;
    androidPackage(pkg: string): this;
    androidProcess(processName: string): this;
    androidUseRunningApp(useRunning: boolean): this;
    debuggerAddress(address: string): this;
    enableBidi(): this;
    excludeSwitches(...args: readonly string[]): this;
    set(key: string, value: unknown): this;
    setBinaryPath(path: string): this;
    setBrowserLogFile(path: string): this;
    setBrowserMinidumpPath(path: string): this;
    setEdgeChromiumBinaryPath(path: string): this;
    setLocalState(state: unknown): this;
    setMobileEmulation(config: unknown): this;
    setPerfLoggingPrefs(prefs: unknown): this;
    setUserPreferences(prefs: unknown): this;
    detachDriver(detach: boolean): this;
    useWebView(enable: boolean): this;
    windowSize(size: { height: number; width: number }): this;
    windowTypes(...args: readonly string[]): this;
  }
}
