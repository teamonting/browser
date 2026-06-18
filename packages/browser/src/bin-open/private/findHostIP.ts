/// <reference types="node" />

import { exec } from 'node:child_process';

const LOOPBACK_ADDRESS = '127.0.0.1';

export default async function findHostIP(): Promise<string> {
  return new Promise(resolve => {
    exec('ip route show default', (error, stdout) => {
      if (error) {
        return resolve(LOOPBACK_ADDRESS);
      }

      resolve(stdout.split(' ')?.[2] || LOOPBACK_ADDRESS);
    });
  });
}
