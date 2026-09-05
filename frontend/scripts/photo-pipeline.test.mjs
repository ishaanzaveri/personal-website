import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { derivativeSet } from './photo-pipeline.mjs';

for (const [label, size, expectedWidth, expectedHeight] of [
  ['portrait', '800x1200', 800, 1200],
  ['small', '120x80', 120, 80],
  ['landscape', '3000x2000', 2048, 1365],
]) {
  test(`derivative metadata matches actual ${label} output without duplicate widths`, () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'photo-pipeline-'));
    try {
      mkdirSync(path.join(dir, 'album'));
      for (const bound of [480, 960, 1440, 2048, null]) {
        execFileSync('magick', ['-size', size, 'xc:teal', '-resize', `${bound ?? 2048}x${bound ?? 2048}>`, path.join(dir, 'album', `frame${bound ? `-${bound}` : ''}.jpg`)]);
      }
      const image = derivativeSet('album', 'frame.jpg', dir);
      assert.equal(image.width, expectedWidth);
      assert.equal(image.height, expectedHeight);
      assert.equal(new Set(image.variants.map((variant) => variant.width)).size, image.variants.length);
      if (label === 'portrait') assert.equal(image.variants[0].width, 320);
      if (label === 'small') assert.deepEqual(image.variants.map((variant) => variant.width), [120]);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

test('seed refuses missing derivatives rather than inventing pixel widths', () => {
  assert.throws(() => derivativeSet('missing', 'frame.jpg', '/nonexistent'), /run photos:assets/);
});
