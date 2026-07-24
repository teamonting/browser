/// <reference types="node" />

import { exec } from 'node:child_process';

export default async function findHostIP(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec('ip route show default', (error, stdout) => {
      if (error) {
        return reject(error);
      }

      resolve(stdout.split(' ')?.[2] || '127.0.0.1');
    });
  });
}
