import { ServiceBuilder as ChromeServiceBuilder } from 'selenium-webdriver/chrome.js';
import findChromeDriverBin from './findChromeDriverBin.ts';
import type { DriverService } from '../type.d.ts';

async function buildChromeService({
  hostIP,
  localIP,
  pipeStdio,
  useWindowsBinary
}: {
  readonly hostIP: string;
  readonly localIP: string;
  readonly pipeStdio: boolean;
  readonly useWindowsBinary: boolean;
}): Promise<DriverService> {
  const builder = new ChromeServiceBuilder(await findChromeDriverBin({ windows: useWindowsBinary }))
    // WSL2: Despite ChromeDriver hosted on same subnet, local IP must be explicitly allowed, otherwise it default to 127.0.0.1.
    .addArguments('--allowed-ips', localIP)
    .setHostname(hostIP);

  pipeStdio && builder.setStdio([0, 1, 2]);

  return builder.build();
}

export default buildChromeService;
