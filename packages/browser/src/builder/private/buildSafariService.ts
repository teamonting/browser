import { ServiceBuilder as SafariServiceBuilder } from 'selenium-webdriver/safari.js';
import type { DriverService } from '../type.d.ts';
import findSafariDriverBin from './findSafariDriverBin.ts';

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

  const nativeDriverService = builder.build();

  return Object.assign(nativeDriverService, {
    async [Symbol.asyncDispose]() {
      await nativeDriverService.kill();
    }
  });
}

export default buildSafariService;
