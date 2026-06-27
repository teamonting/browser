import { ServiceBuilder as FirefoxServiceBuilder } from 'selenium-webdriver/firefox.js';
import findGeckoDriverBin from './findGeckoDriverBin.ts';
import type { DriverService } from '../type.d.ts';

async function buildFirefoxService({
  hostIP,
  pipeStdio,
  useWindowsBinary
}: {
  readonly hostIP: string;
  readonly pipeStdio: boolean;
  readonly useWindowsBinary: boolean;
}): Promise<DriverService> {
  const builder = new FirefoxServiceBuilder(await findGeckoDriverBin({ windows: useWindowsBinary }))
    // WSL2: Firefox currently has a bug that it does not use host for the `webSocketUrl`, https://github.com/mozilla/geckodriver/issues/2249.
    .addArguments('--host', hostIP)
    .setHostname(hostIP);

  pipeStdio && builder.setStdio([0, 1, 2]);

  const nativeDriverService = builder.build();

  return Object.freeze({
    [Symbol.asyncDispose]: () => nativeDriverService.kill(),
    address: () => nativeDriverService.address(),
    isRunning: () => nativeDriverService.isRunning(),
    kill: () => nativeDriverService.kill(),
    start: (timeoutMS?: number | undefined) => nativeDriverService.start(timeoutMS)
  });
}

export default buildFirefoxService;
