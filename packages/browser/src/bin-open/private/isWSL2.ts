/// <reference types="node" />

import { readFile } from 'node:fs/promises';

// https://docs.microsoft.com/en-us/windows/wsl/compare-versions#accessing-windows-networking-apps-from-linux-host-ip
async function isWSL2_(): Promise<boolean> {
  try {
    const procVersion = await readFile('/proc/version', 'utf-8');

    return /WSL2/iu.test(procVersion);
  } catch (err) {
    return false;
  }
}

let promise: Promise<boolean>;

export default function isWSL2(): Promise<boolean> {
  return promise || (promise = isWSL2_());
}
