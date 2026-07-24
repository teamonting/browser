declare module 'selenium-webdriver/safari.js' {
  interface DriverService {
    address(): Promise<string>;
    getExecutable(): string;
    isRunning(): boolean;
    kill(): Promise<void>;
    setExecutable(value: string): void;
    start(timeoutMs?: number): Promise<string>;
  }

  // safari.ServiceBuilder extends remote.DriverService.Builder.
  class ServiceBuilder {
    constructor(exe?: string);

    addArguments(...args: readonly string[]): this;
    build(): DriverService;
    setEnvironment(env: Record<string, string> | Map<string, string>): this;
    setHostname(hostname: string): this;
    setLoopback(loopback: boolean): this;
    setPath(basePath: string): this;
    setPort(port: number): this;
    setStdio(config: string | readonly (number | string | null | undefined)[]): this;
  }

  // safari.Options extends Capabilities.
  class Options {
    constructor(other?: unknown);

    enableLogging(): this;
    set(key: string, value: unknown): this;
    setTechnologyPreview(useTechnologyPreview: boolean): this;
  }
}
