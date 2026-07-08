import { PNG } from '@onting/common/repack/pngjs/browser.js';
import { decode } from 'base64-arraybuffer';

export default function parsePNG(base64Image: string): Promise<PNG> {
  return new Promise((resolve, reject) =>
    new PNG().parse(decode(base64Image) satisfies ArrayBuffer as unknown as Buffer<ArrayBufferLike>, (error, png) =>
      error ? reject(error) : resolve(png)
    )
  );
}
