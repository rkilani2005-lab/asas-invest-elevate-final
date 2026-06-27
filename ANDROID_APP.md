# Asas Invest — Android App (APK / Play Store)

The website is now an installable **PWA**. The recommended way to ship it on
Android & the Play Store is a **TWA (Trusted Web Activity)** — a thin native
wrapper that runs the live site full-screen with no browser UI. Google
recommends TWAs for web content on Play.

> An APK/AAB is a **signed binary** — it must be produced by the Android build
> toolchain (or PWABuilder's cloud builder) using **your own signing key**. It
> can't be generated from this repo alone. Everything the build needs (the web
> manifest, icons, asset-links) is now in the repo and live on the site.

---

## Option A — PWABuilder (easiest, no local tools) ✅ recommended

1. Deploy is already live at **https://www.asasinvest.com** with `/manifest.webmanifest`.
2. Go to **https://www.pwabuilder.com** → enter `https://www.asasinvest.com` → **Start**.
3. Open **Package For Stores → Android**.
   - Package ID: **`com.asasinvest.app`** (must match `public/.well-known/assetlinks.json`).
   - App name: **Asas Invest**.
   - Let PWABuilder **generate a new signing key** (download & keep the `.keystore`
     + passwords safe — you need the SAME key for every future update).
4. Download the zip. It contains:
   - `app-release-signed.apk` → **sideload this on any Android device** (enable
     "Install unknown apps").
   - `app-release-bundle.aab` → **upload this to the Play Store**.
   - `assetlinks.json` → the real Digital Asset Links file with your key's
     fingerprint.
5. **Wire up Digital Asset Links** so the app verifies your domain (hides the URL bar):
   - Copy the `sha256_cert_fingerprints` value from PWABuilder's `assetlinks.json`
     into `public/.well-known/assetlinks.json` (replace `REPLACE_WITH_...`).
   - Commit & push → it must be live at
     `https://www.asasinvest.com/.well-known/assetlinks.json`.
   - **If you use Play App Signing** (default on Play), also add the **Play-managed
     signing-key SHA-256** (Play Console → Setup → App integrity) to the same array.

---

## Option B — Bubblewrap (CLI, full control)

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://www.asasinvest.com/manifest.webmanifest
#   applicationId: com.asasinvest.app
bubblewrap build      # produces app-release-signed.apk + .aab; prints SHA-256
```
Take the printed SHA-256, put it in `public/.well-known/assetlinks.json`, push.
Requires JDK 17 + Android SDK locally.

---

## Option C — Capacitor (native WebView wrapper, if you want native plugins)

Use this only if you need device APIs (push, camera, etc.) beyond a TWA.
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Asas Invest" com.asasinvest.app --web-dir=dist
npm run build && npx cap add android && npx cap sync android
npx cap open android   # build/sign the APK/AAB in Android Studio
```

---

## Notes
- **Same key forever:** keep the keystore PWABuilder/Bubblewrap generated — losing
  it means you can't publish updates under the same listing.
- **Updating the app:** because it's a TWA, content updates ship automatically when
  you deploy the website — you only rebuild/resubmit the app to change the
  package itself (icon, name, splash, target SDK).
- **Icons:** the manifest currently points at `/favicon.png`. For crisp Play
  Store art, replace it (or add dedicated 192/512 PNGs + a maskable icon) and
  re-run PWABuilder.
- **Play listing needs:** 512×512 icon, feature graphic (1024×500), screenshots,
  privacy-policy URL, content rating questionnaire.
