# Krypton — Receipt OCR & Warranty Tracker

Scan paper receipts with your phone camera, extract the store, date, totals and
line items automatically, and track warranty expirations for everything you buy.
Receipts are stored locally on the device; a dashboard surfaces warranties that
are active, expiring soon (≤ 30 days), or expired.

Runs as a **web app** and as a standalone **Android app** (Capacitor) from the
same codebase.

## How OCR works (fully offline, no API key)

OCR is 100% on-device — there is **no server and no AI API key**:

1. **Capture** — Capacitor Camera plugin on Android, or file upload /
   browser camera on web (`src/components/ReceiptUploader.tsx`).
2. **Recognize** — [Tesseract.js](https://github.com/naptha/tesseract.js) runs
   in a web worker (`src/utils/ocr.ts`). The WASM engine, worker script and
   English language data are bundled with the app: `scripts/copy-tesseract-assets.mjs`
   copies them from `node_modules` into `dist/tesseract/` at build time, so
   recognition works with **zero network access**.
3. **Parse** — `src/utils/receiptParser.ts` turns the raw OCR text into a
   structured receipt with deterministic heuristics: store name (known-store
   matching + header fallback), purchase date/time, receipt number, payment
   method (incl. card last-4), subtotal / tax / total, and line items with
   quantities.
4. **Review** — OCR is imperfect, so every scan lands on an editable review
   screen (`ReceiptDetails`) before saving. If OCR fails or reads nothing,
   the app offers a **manual entry** fallback with the photo attached.
5. **Save** — receipts persist in `localStorage` (`rcpt_vault_v1`).

### Warranty tracking

- Explicit terms printed on a receipt ("2YR Geek Squad Protect", "…coverage
  through 2028-03-15", "3-Year Manufacturer Warranty") are detected and
  attached to the relevant items.
- When a receipt states no term, sensible **defaults by category** are applied
  at parse time (Electronics / Appliances / Computers / Tools / Furniture:
  12 months) — only for durable items ≥ $25, and always labelled
  *"Default … warranty assumed — edit if your coverage differs"*
  (`src/utils/warranty.ts`). Consumables (groceries, food, pharmacy…) get none.
- Per-item expiration = purchase date + duration; the receipt's overall
  expiry is the latest item expiry. Statuses (`active` / `expiring_soon` ≤ 30d /
  `expired` / `none`) come from `src/utils/dateUtils.ts`.
- The **Warranty Dashboard** lists every warrantied item across all receipts,
  sorted by expiry, with days remaining. Durations and dates stay editable
  per item in the receipt editor (changing months recomputes the date).

## Run on web

```bash
npm install
npm run dev        # Vite dev server
npm run build      # production build -> dist/ (standalone static app)
npm run preview    # serve the production build
npm run lint       # TypeScript check (tsc --noEmit)
```

The built `dist/` folder is a complete static app — no Express server is
needed or used anymore (the old Gemini-based `server.ts` was removed).

## Build the Android app

Prerequisites: Node 18+, JDK 17, Android SDK (API 34+) with
`ANDROID_HOME` set (or `sdk.dir` in `android/local.properties`).

```bash
npm install
npm run build          # build web assets into dist/
npx cap sync android   # copy dist/ + plugins into the android/ project
# then either open in Android Studio:
npx cap open android
# or build a debug APK from the command line:
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

App identity (see `capacitor.config.ts`):
**appId** `com.chiramdasu.receiptvault`, **appName** `Krypton`.

The debug APK is fine for sideloading/testing. A **signed release build**
(`assembleRelease` / Play Store AAB) requires **your own keystore** —
generate one with `keytool`, keep it out of git (`.gitignore` already excludes
`*.keystore` / `*.jks` / `key.properties`), and configure signing in
`android/app/build.gradle`. Publishing additionally needs a Google Play
Console developer account.

## Project layout

```
src/
  components/   Navbar, ReceiptUploader (camera + OCR), ReceiptDetails
                (editable review), ReceiptVault, WarrantyDashboard, Analytics
  utils/
    ocr.ts             Tesseract.js wrapper (bundled offline assets, progress)
    receiptParser.ts   OCR text -> structured receipt heuristics
    warranty.ts        default warranty periods + expiry computation
    dateUtils.ts       warranty status / date / currency helpers
    sampleReceipts.ts  demo receipts (pre-parsed fixtures, seeded on first run)
  types/receipt.ts     ReceiptData / ReceiptItem types
scripts/copy-tesseract-assets.mjs   build-time OCR asset bundling
capacitor.config.ts                 appId / appName / webDir
android/                            generated Capacitor Android project
```
