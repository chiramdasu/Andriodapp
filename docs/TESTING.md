# Receipt Vault — Testing & Release Guide

Full steps to test the app before any public upload, in order. Work through
them when ready; nothing here expires.

App: **Receipt Vault** · package `com.chiramdasu.receiptvault` ·
OCR runs 100% on-device (Tesseract.js, bundled) — no server, no API key.

---

## Part A — Build the test APK (your computer)

Prerequisites: Node.js 20+, Android Studio (bundles JDK 17).

1. Get the code: `git clone https://github.com/chiramdasu/Andriodapp.git`
   (or `git pull` in an existing clone).
2. In the project folder:
   - `npm ci`
   - `npm run build`
   - `npx cap sync android`
3. Open the `android/` folder in Android Studio.
4. Quick test build: **Build → Build APK(s)** →
   output: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Part B — Test on your own phone (no store)

Either copy `app-debug.apk` to the phone and tap it (allow "install from this
source" when asked), or connect the phone by USB with USB debugging on and
press **Run ▶** in Android Studio.

Test checklist (the app's real risk points):

- [ ] Camera opens from the Scan tab and captures a receipt photo
- [ ] OCR works in **airplane mode** (it must — the engine is on-device)
- [ ] Scan 4–5 real receipts: flat/well-lit AND crumpled/faded; check store,
      date, total, tax, items against the paper
- [ ] Correct a wrong field in the review screen, save, confirm the edit sticks
- [ ] A grocery receipt gets **no** warranty; an electronics receipt gets the
      12-month default with the correct expiry date
- [ ] Warranty tab: items sorted by expiry, days-remaining correct,
      expiring-soon (≤30 days) flagged
- [ ] Force-close and reopen the app — receipts still in the Vault

## Part C — Create your keystore + signed bundle (for Play testing tracks)

⚠️ The keystore is your developer identity. If you lose it you can never
update the app under the same listing. Create it once, back it up in two
places, and never commit it to git (the repo's .gitignore already blocks it).

1. Android Studio: **Build → Generate Signed App Bundle / APK**
2. Choose **Android App Bundle** → **Create new…** (keystore)
3. Fill in:
   - Key store path: somewhere safe outside the repo, e.g. `~/keys/receipt-vault.jks`
   - Password: a strong one you record in your password manager
   - Key alias: `receipt-vault`
   - Key password: same or separate — record it too
   - Validity: 25+ years
   - Certificate fields: your name / organisation / country (US)
4. Finish → output: `app-release.aab`

## Part D — Google Group for testers

1. Go to **groups.google.com → Create group**
2. Name it e.g. **Receipt Vault Testers**; add your testers' email addresses
   as members
3. Keep the group address — it looks like `receiptvaulttesters@googlegroups.com`

## Part E — Play Console testing tracks

Requires a Play Console developer account (one-time $25).

**Internal testing (first outside check — no waiting period):**
1. Play Console → **Create app** → Receipt Vault
2. **Testing → Internal testing → Create release** → upload `app-release.aab`
3. **Testers** tab → add tester emails, or the Google Group address
4. Share the **opt-in link** — testers accept and install from Play like a
   normal app; updates reach them automatically

**Closed testing (required before public launch for new personal accounts):**
1. **Testing → Closed testing → Create track** → upload the `.aab`
2. **Testers** tab → add the **Google Group** address from Part D
3. Google's rule for new personal accounts: **12+ testers, opted in for 14
   days**, before production access is granted — plan the group size for this
4. Run feedback through the Google Group; fix, bump version, upload a new
   `.aab` to the same track

**Promote:** when the closed test runs clean, use **Promote release** on the
track to move the same build to Production.

---

## Notes

- OCR quality on real photos depends on lighting and flatness; the
  review-and-edit screen and manual entry are the safety net by design.
- After any code change: `npm run build` → `npx cap sync android` → rebuild.
