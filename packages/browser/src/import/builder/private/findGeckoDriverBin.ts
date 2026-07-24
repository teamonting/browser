import { findUp } from 'find-up';

async function findGeckoDriverBin_({ windows }: { readonly windows?: boolean | undefined }): Promise<string> {
  const path = windows
    ? await findUp('geckodriver.exe')
    : (await findUp('geckodriver')) || (await findUp('/usr/bin/geckodriver'));

  if (!path) {
    throw new Error('GeckoDriver is not found under the current path up to the root, please download GeckoDriver');
  }

  return path;
}

let findGeckoDriverBinResult: Promise<string>;

export default function findGeckoDriverBin({
  windows
}: { readonly windows?: boolean | undefined } = {}): Promise<string> {
  return findGeckoDriverBinResult || (findGeckoDriverBinResult = findGeckoDriverBin_({ windows }));
}
