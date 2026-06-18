import { findUp } from 'find-up';

async function findChromeDriverBin_({ windows }: { readonly windows?: boolean | undefined }): Promise<string> {
  let path = windows
    ? await findUp('chromedriver.exe')
    : (await findUp('chromedriver')) || (await findUp('/usr/bin/chromedriver'));

  if (!path) {
    throw new Error('ChromeDriver is not found under the current path up to the root, please download ChromeDriver');
  }

  return path;
}

let findChromeDriverBinResult: Promise<string>;

export default function findChromeDriverBin({
  windows
}: { readonly windows?: boolean | undefined } = {}): Promise<string> {
  return findChromeDriverBinResult || (findChromeDriverBinResult = findChromeDriverBin_({ windows }));
}
