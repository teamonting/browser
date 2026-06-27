interface DriverService {
  address(): Promise<string>;
  isRunning(): boolean;
  kill(): Promise<void>;
  start(timeoutMs?: number): Promise<string>;
}

export type { DriverService };
