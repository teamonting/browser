declare module 'selenium-webdriver/firefox.js' {
  interface DriverService {
    address(): Promise<string>;
    getExecutable(): string;
    isRunning(): boolean;
    kill(): Promise<void>;
    setExecutable(value: string): void;
    start(timeoutMs?: number): Promise<string>;
  }

  // firefox.ServiceBuilder extends remote.DriverService.Builder.
  class ServiceBuilder {
    constructor(exe?: string);

    addArguments(...args: readonly string[]): this;
    build(): DriverService;
    enableVerboseLogging(trace?: boolean): this;
    setEnvironment(env: Record<string, string> | Map<string, string>): this;
    setHostname(hostname: string): this;
    setLoopback(loopback: boolean): this;
    setPath(basePath: string): this;
    setPort(port: number): this;
    setStdio(config: string | readonly (number | string | null | undefined)[]): this;
  }

  // firefox.Options extends Capabilities.
  class Options {
    constructor(other?: unknown);

    addArguments(...args: readonly string[]): this;
    addExtensions(...paths: readonly string[]): this;
    enableBidi(): this;
    enableDebugger(): this;
    enableMobile(androidPackage?: string, androidActivity?: string | null, deviceSerial?: string | null): this;
    set(key: string, value: unknown): this;
    setBinary(binary: string): this;
    setPreference(key: string, value: boolean | number | string): this;
    setProfile(profile: string): this;
    windowSize(size: { height: number; width: number }): this;
  }
}
