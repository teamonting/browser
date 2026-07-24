interface DriverService {
  [Symbol.asyncDispose](): Promise<void>;
  address(): Promise<string>;
  isRunning(): boolean;
  kill(): Promise<void>;
  start(timeoutMS?: number | undefined): Promise<string>;
}

export type { DriverService };
