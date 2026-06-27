import { platform } from 'os';
import buildChromeService from './private/buildChromeService.ts';
import buildEdgeService from './private/buildEdgeService.ts';
import buildFirefoxService from './private/buildFirefoxService.ts';
import buildSafariService from './private/buildSafariService.ts';
import getIP from './private/getIP.ts';
import isWSL2 from './private/isWSL2.ts';
import type { DriverService } from './type.d.ts';

async function buildDriverService(
  browser: 'chrome' | 'edge' | 'firefox' | 'safari',
  {
    pipeStdio,
    useWindowsBinary
  }: {
    readonly pipeStdio: boolean;
    readonly useWindowsBinary: boolean;
  }
): Promise<DriverService> {
  if (useWindowsBinary && !(await isWSL2())) {
    console.warn('`useWindowsBinary` is only supported when running on Windows or WSL2.');

    useWindowsBinary = false;
  } else if (platform() === 'win32') {
    useWindowsBinary = true;
  }

  const { hostIP, localIP } = await getIP({ useWindowsBinary });

  switch (browser) {
    case 'edge':
      return await buildEdgeService({ hostIP, localIP, pipeStdio, useWindowsBinary });

    case 'firefox':
      return await buildFirefoxService({ hostIP, pipeStdio, useWindowsBinary });

    case 'safari':
      return await buildSafariService({ hostIP, pipeStdio });

    default:
      browser satisfies 'chrome';

      return await buildChromeService({ hostIP, localIP, pipeStdio, useWindowsBinary });
  }
}

export default buildDriverService;
