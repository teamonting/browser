import { platform } from 'node:os';
import findWSL2HostIP from './findWSL2HostIP.ts';
import findWSL2LocalIP from './findWSL2LocalIP.ts';

const isWindows = platform() === 'win32';

async function getIP({
  useWindowsBinary
}: {
  readonly useWindowsBinary: boolean;
}): Promise<{ readonly hostIP: string; readonly localIP: string }> {
  return {
    hostIP: useWindowsBinary && !isWindows ? await findWSL2HostIP() : '127.0.0.1',
    localIP: useWindowsBinary && !isWindows ? await findWSL2LocalIP() : '127.0.0.1'
  };
}

export default getIP;
