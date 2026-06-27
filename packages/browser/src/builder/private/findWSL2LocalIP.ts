/// <reference types="node" />

import { exec } from 'node:child_process';

export default async function findLocalIP(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec('hostname -I', (error, stdout) => {
      if (error) {
        return reject(error);
      }

      resolve(stdout.split(' ')?.[0] || '127.0.0.1');
    });
  });
}
