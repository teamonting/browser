/// <reference types="node" />

import { exec } from 'node:child_process';

const LOOPBACK_ADDRESS = '127.0.0.1';

export default async function findLocalIP(): Promise<string> {
  return new Promise(resolve => {
    exec('hostname -I', (error, stdout) => {
      if (error) {
        return resolve(LOOPBACK_ADDRESS);
      }

      resolve(stdout.split(' ')?.[0] || LOOPBACK_ADDRESS);
    });
  });
}
