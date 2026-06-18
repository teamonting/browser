import { findUp } from 'find-up';

async function findEdgeDriverBin_({ windows }: { readonly windows?: boolean | undefined }): Promise<string> {
  let path = windows
    ? await findUp('msedgedriver.exe')
    : (await findUp('msedgedriver')) || (await findUp('/usr/bin/msedgedriver'));

  if (!path) {
    throw new Error('EdgeDriver is not found under the current path up to the root, please download EdgeDriver');
  }

  return path;
}

let findEdgeDriverBinResult: Promise<string>;

export default function findEdgeDriverBin({
  windows
}: { readonly windows?: boolean | undefined } = {}): Promise<string> {
  return findEdgeDriverBinResult || (findEdgeDriverBinResult = findEdgeDriverBin_({ windows }));
}
