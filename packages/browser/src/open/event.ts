abstract class CustomEventTarget<T extends { [K: string]: Event }> extends EventTarget {
  override addEventListener<K extends string>(
    type: K,
    listener: ((this: this, event: K extends keyof T ? T[K] : Event) => void) | EventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener as EventListenerOrEventListenerObject | null, options);
  }

  override removeEventListener<K extends string>(
    type: K,
    listener: ((this: this, event: K extends keyof T ? T[K] : Event) => void) | EventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, listener as EventListenerOrEventListenerObject | null, options);
  }

  override dispatchEvent<K extends keyof T>(event: T[K]): boolean;

  override dispatchEvent(event: Event): boolean;

  override dispatchEvent(event: Event): boolean {
    return super.dispatchEvent(event);
  }
}

class RealmEvent extends Event {
  constructor(
    type: string,
    eventInitDict: {
      readonly browsingContext: string;
      readonly origin: string;
      readonly realmId: string;
      readonly realmType?: string | undefined;
    }
  ) {
    super(type);

    this.#browsingContext = eventInitDict.browsingContext;
    this.#origin = eventInitDict.origin;
    this.#realmId = eventInitDict.realmId;
    this.#realmType = eventInitDict.realmType;
  }

  #browsingContext: string;
  #origin: string;
  #realmId: string;
  #realmType: string | undefined;

  get browsingContext(): string {
    return this.#browsingContext;
  }

  get origin(): string {
    return this.#origin;
  }

  get realmId(): string {
    return this.#realmId;
  }

  get realmType(): string | undefined {
    return this.#realmType;
  }
}

class RealmConsoleEvent extends RealmEvent {
  constructor(
    type: string,
    eventInitDict: {
      readonly args: readonly unknown[];
      readonly browsingContext: string;
      readonly origin: string;
      readonly realmId: string;
      readonly realmType?: string | undefined;
    }
  ) {
    super(type, eventInitDict);

    this.#args = eventInitDict.args;
  }

  #args: readonly unknown[];

  get args(): readonly unknown[] {
    return this.#args;
  }
}

class RealmErrorEvent extends RealmEvent {
  constructor(
    type: string,
    eventInitDict: {
      readonly error: unknown;
      readonly browsingContext: string;
      readonly origin: string;
      readonly realmId: string;
      readonly realmType?: string | undefined;
    }
  ) {
    super(type, eventInitDict);

    this.#error = eventInitDict.error;
  }

  #error: unknown;

  get error(): unknown {
    return this.#error;
  }
}

class WebDriverEvent extends Event {
  constructor(type: string) {
    super(type);
  }
}

class WebDriverErrorEvent extends WebDriverEvent {
  constructor(
    type: string,
    eventInitDict: {
      readonly error: unknown;
    }
  ) {
    super(type);

    this.#error = eventInitDict.error;
  }

  #error: unknown;

  get error(): unknown {
    return this.#error;
  }
}

export { CustomEventTarget, RealmConsoleEvent, RealmErrorEvent, RealmEvent, WebDriverErrorEvent, WebDriverEvent };
