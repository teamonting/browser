import { ServiceBuilder as SafariServiceBuilder } from 'selenium-webdriver/safari.js';
import findSafariDriverBin from './findSafariDriverBin.ts';
import type { DriverService } from '../type.d.ts';

async function buildSafariService({
  hostIP,
  pipeStdio
}: {
  readonly hostIP: string;
  readonly pipeStdio: boolean;
}): Promise<DriverService> {
  const builder = new SafariServiceBuilder(await findSafariDriverBin())
    .addArguments('--host', hostIP)
    .setHostname(hostIP);

  pipeStdio && builder.setStdio([0, 1, 2]);

  return builder.build();
}

export default buildSafariService;
