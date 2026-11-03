import { createWorker } from 'tesseract.js';

/**
 * ocr.ts — fully on-device OCR via Tesseract.js.
 *
 * All engine assets (worker script, WASM core, English traineddata) are
 * bundled with the app and copied into dist/tesseract/ at build time by
 * scripts/copy-tesseract-assets.mjs, so recognition works 100% OFFLINE:
 * no API key, no server, no CDN. This is what makes the Android build a
 * genuinely standalone app.
 */

export interface OcrProgress {
  /** 0–1 overall progress estimate */
  progress: number;
  status: string;
}

export interface OcrResult {
  text: string;
  /** Tesseract mean confidence 0–100 */
  confidence: number;
}

const assetBase = `${import.meta.env.BASE_URL}tesseract/`;

let workerPromise: ReturnType<typeof createWorker> | null = null;

async function getWorker(onProgress?: (p: OcrProgress) => void) {
  if (!workerPromise) {
    workerPromise = createWorker('eng', undefined, {
      workerPath: `${assetBase}worker.min.js`,
      corePath: `${assetBase}core`,
      langPath: `${assetBase}lang`,
      gzip: true,
      logger: (m: { status: string; progress: number }) => {
        if (onProgress) {
          onProgress({
            status: m.status,
            // Engine load is quick after first run; weight recognition most
            progress: m.status === 'recognizing text' ? 0.25 + m.progress * 0.75 : m.progress * 0.25,
          });
        }
      },
    }).catch((err) => {
      workerPromise = null; // allow retry on next scan
      throw err;
    });
  }
  return workerPromise;
}

/**
 * Run OCR on an image (data URL, blob URL, File or Blob).
 * Throws on engine/recognition failure so callers can offer manual entry.
 */
export async function recognizeReceiptImage(
  image: string | File | Blob,
  onProgress?: (p: OcrProgress) => void
): Promise<OcrResult> {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(image as any);
  const text = (data.text || '').trim();
  if (!text) {
    throw new Error('OCR found no readable text in this image.');
  }
  return { text, confidence: typeof data.confidence === 'number' ? data.confidence : 0 };
}
