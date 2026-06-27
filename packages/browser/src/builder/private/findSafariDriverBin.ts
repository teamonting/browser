import { findUp } from 'find-up';

async function findSafariDriverBin_(): Promise<string> {
  const path = (await findUp('safaridriver')) || (await findUp('/usr/bin/safaridriver'));

  if (!path) {
    throw new Error('SafariDriver is not found under the current path up to the root, please download SafariDriver');
  }

  return path;
}

let findSafariDriverBinResult: Promise<string>;

export default function findSafariDriverBin(): Promise<string> {
  return findSafariDriverBinResult || (findSafariDriverBinResult = findSafariDriverBin_());
}
