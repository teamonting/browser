import { encode } from 'base64-arraybuffer';
import type { AsyncExpectationResult } from 'expect';
import { onErrorResumeNext } from 'on-error-resume-next/async';
import pixelmatch from 'pixelmatch';
import { PNG } from '@onting/common/repack/pngjs/browser.js';
import type { Stub } from '../type.ts';
import parsePNG from './parsePNG.ts';

type PixelMatchOptions = Parameters<typeof pixelmatch>[5];

type ImageSnapshotMatcher = (
  currentBase64Image: string,
  pixelMatchOptions: PixelMatchOptions
) => AsyncExpectationResult;

function createToMatchImageSnapshot(stub: Stub): ImageSnapshotMatcher {
  return async function toMatchImageSnapshot(currentBase64Image, pixelMatchOptions) {
    const current = await parsePNG(currentBase64Image);

    const baselineImageBase64 = await stub.getNextSnapshot('image/png');

    if (!baselineImageBase64) {
      await stub.setCurrentSnapshot('image/png', currentBase64Image);

      const png = await parsePNG(currentBase64Image);
      const dataURL = `data:image/png;base64,${encode(PNG.sync.write(png) satisfies Buffer as unknown as ArrayBuffer)}`;

      console.log(
        '⚠️ Image snapshot recorded as baseline\n%c ',
        `background-image: url(${dataURL}); background-repeat: no-repeat; background-size: 100%; color: transparent; font-size: 1px; padding-top: ${png.height / 3}px; padding-right: ${png.width / 3}px;`
      );

      return {
        message: () => 'Pass without baseline',
        pass: true
      };
    }

    const baseline: PNG =
      (await onErrorResumeNext(async () => await parsePNG(baselineImageBase64))) ??
      new PNG({ height: current.height, width: current.width });

    const height = Math.max(baseline.height, current.height);
    const width = Math.max(baseline.width, current.width);

    const diff = new PNG({ height, width });

    const numDiffPixels = pixelmatch(baseline.data, current.data, diff.data, width, height, pixelMatchOptions);

    if (numDiffPixels) {
      const sideBySide = new PNG({ height, width: width * 3 });

      baseline.bitblt(sideBySide, 0, 0, width, height, 0, 0);
      diff.bitblt(sideBySide, 0, 0, width, height, width, 0);
      current.bitblt(sideBySide, 0, 0, width, height, width * 2, 0);

      const dataURL = `data:image/png;base64,${encode(PNG.sync.write(sideBySide) satisfies Buffer as unknown as ArrayBuffer)}`;

      console.log(
        '⛔ Image snapshot DOES NOT match baseline\n%c %c\nNumber of pixel differ from baseline: %d',
        `background-image: url(${dataURL}); background-repeat: no-repeat; background-size: 100%; color: transparent; font-size: 1px; padding-top: ${height / 3}px; padding-right: ${width}px;`,
        '',
        numDiffPixels
      );

      return {
        message: () => `Image has ${numDiffPixels} pixels different from baseline`,
        pass: false
      };
    } else {
      const dataURL = `data:image/png;base64,${encode(PNG.sync.write(baseline) satisfies Buffer as unknown as ArrayBuffer)}`;

      console.log(
        '✅ Image snapshot match baseline\n%c ',
        `background-image: url(${dataURL}); background-repeat: no-repeat; background-size: 100%; color: transparent; font-size: 1px; padding-top: ${height / 3}px; padding-right: ${width / 3}px;`
      );
    }

    return { message: () => 'Pass', pass: true };
  };
}

export type { ImageSnapshotMatcher };
export default createToMatchImageSnapshot;
