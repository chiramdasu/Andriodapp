# Paste this into Google Antigravity (agent mode, this repo open)

> You are building the Receipt Vault Android app from this repository
> (package `com.chiramdasu.receiptvault`). Work step by step and report
> after each stage. Do not skip verification.
>
> 1. `git pull origin main` — make sure you have the latest code.
> 2. Run `npm ci`, then `npm run build`, then `npx cap sync android`.
>    All three must succeed; if any fails, show me the exact error and stop.
> 3. Build the debug APK: `cd android && ./gradlew assembleDebug`
>    (use `gradlew.bat` on Windows). Confirm the file exists at
>    `android/app/build/outputs/apk/debug/app-debug.apk` and tell me its size.
> 4. If my Android phone is connected by USB with USB debugging on, install
>    it with `adb install -r` on that APK and confirm the app launches.
> 5. STOP before creating any keystore or signing key. Ask me for:
>    the keystore location (suggested: a `keys` folder OUTSIDE this repo),
>    the keystore password, key alias (`receipt-vault`), and key password.
>    Never invent passwords, never store them in any file, and never let a
>    keystore, `key.properties`, or `local.properties` be committed to git.
> 6. Once I provide the keystore details, configure release signing using a
>    `key.properties` file that stays out of version control, then build the
>    signed bundle: `./gradlew bundleRelease`. Confirm the output at
>    `android/app/build/outputs/bundle/release/app-release.aab` and report
>    its exact full path and size.
> 7. Final report: each stage's result, both file paths, and any error you
>    hit verbatim. The `.aab` is what I will upload to Google Play Console
>    closed testing.
>
> Environment notes: JDK 17 is required (Android Studio's bundled JDK is
> fine). The app needs no server and no API keys — OCR is on-device.

After the agent finishes, the only remaining step is uploading
`app-release.aab` in Play Console (Receipt Vault → Closed testing – Alpha),
which Darla can drive in the browser with you, as before.
