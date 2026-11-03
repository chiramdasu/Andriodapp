/**
 * Copies the Tesseract.js OCR engine assets from node_modules into
 * public/tesseract/ so Vite bundles them into dist/ and the app can run
 * OCR fully offline (including inside the Capacitor Android WebView).
 *
 * Runs automatically via the predev / prebuild npm hooks. The copied
 * files are git-ignored (see .gitignore) — they are build artifacts.
 */
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'tesseract');

const copies = [
  // Worker script
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  // WASM cores (all SIMD variants the loader may pick) + their JS loaders
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm', 'core/tesseract-core-simd-lstm.wasm'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm', 'core/tesseract-core-relaxedsimd-lstm.wasm'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm', 'core/tesseract-core-lstm.wasm'],
  // English language data (gzipped traineddata)
  ['node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
];

let copied = 0;
for (const [srcRel, destRel] of copies) {
  const src = join(root, srcRel);
  const dest = join(out, destRel);
  if (!existsSync(src)) {
    console.warn(`[tesseract-assets] MISSING source: ${srcRel} (run npm install first)`);
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
  copied++;
}
console.log(`[tesseract-assets] copied ${copied}/${copies.length} OCR asset files to public/tesseract/`);
