# Asas Invest — Native iOS & Android apps (Capacitor)

Wraps the existing Vite build into **real native projects** — `ios/` (Xcode) and
`android/` (Android Studio) — that load the app in a native WebView while data
streams live from Supabase. This is the path for the **App Store** and **Google
Play** as first-class native apps.

> Already in the repo: `capacitor.config.ts` (appId `com.asasinvest.app`),
> `assets/` icon/splash scaffold, and native build-artifact `.gitignore` rules.
> You do **not** need `npx cap init` — the config is done.
>
> The lighter Android-only path (TWA via PWABuilder) is still available and
> documented in [ANDROID_APP.md](ANDROID_APP.md); Capacitor supersedes it when
> you want both stores as native apps.

## Prerequisites
- **Node 18+**.
- **iOS:** a **Mac** with **Xcode 15+** and **CocoaPods** (`sudo gem install cocoapods`). No Mac? See "Building iOS without a Mac" below.
- **Android:** **Android Studio** + **JDK 17**.

## One-time setup
```bash
# 1. Install Capacitor (updates your bun/npm lockfile — do it on your machine)
npm i @capacitor/core @capacitor/ios @capacitor/android @capacitor/splash-screen
npm i -D @capacitor/cli @capacitor/assets

# 2. Build the web app
npm run build

# 3. Add the native platforms (creates ios/ and android/)
npx cap add android
npx cap add ios          # Mac only

# 4. Generate all icons + splash screens from assets/ (replace assets/icon.png
#    with a 1024x1024 logo first — see assets/README.md)
npx capacitor-assets generate --iconBackgroundColor "#1A1A1A" --splashBackgroundColor "#1A1A1A"
```

## Every time you ship a web change
```bash
npm run build && npx cap sync      # copies dist/ into both native projects
```

## Build & run
```bash
npx cap open android   # Android Studio → Run, or Build → Generate Signed Bundle/APK (.aab)
npx cap open ios       # Xcode → select a team/signing → Run, or Product → Archive
```

## Store submission

### Google Play
- Build a **signed `.aab`** in Android Studio (keep the keystore safe — same key forever).
- Play Console → create app → upload the bundle → fill listing (512 icon, 1024×500 feature graphic, screenshots, **privacy-policy URL**, content rating).
- `com.asasinvest.app` matches `public/.well-known/assetlinks.json` — add your signing key's SHA-256 there for verified App Links.

### Apple App Store
- In Xcode: set the **Team**, bundle id `com.asasinvest.app`, version/build, app icons (generated).
- **Product → Archive → Distribute** to App Store Connect; test via **TestFlight**.
- App Store Connect: listing, screenshots (6.7" + 5.5" + iPad), **privacy policy**, App Privacy questionnaire.
- ⚠️ **Guideline 4.2 (minimum functionality):** Apple frequently rejects apps that are *only* a website in a WebView. Add native value before submitting — the strongest, low-effort options:
  - **Push notifications** (`@capacitor/push-notifications`) — new-property alerts.
  - **Native share / deep links** (Universal Links via an `apple-app-site-association` file).
  - Offline shell + splash + haptics (`@capacitor/haptics`).
  Keep the bundled-shell config (default) rather than a pure remote URL — it reads as a real app, not a bookmark.

## Building iOS without a Mac
Capacitor iOS builds need macOS. Options:
- **Cloud CI:** Codemagic or Ionic Appflow build/sign iOS from this repo on hosted macOS runners.
- **Rented Mac:** MacinCloud / a CI macOS runner (GitHub Actions `macos-latest`) with `xcodebuild`.

## Config notes (`capacitor.config.ts`)
- Default: **bundled shell** (`webDir: "dist"`) — best for App Store approval; data stays live via Supabase.
- Optional: uncomment `server.url` to always load `https://www.asasinvest.com` (instant content updates, TWA-like) — but riskier for Apple review.
- `appId` / `appName` / brand `#1A1A1A` are pre-set.

## Note for the Lovable/web deploy
Capacitor files (`capacitor.config.ts`, `ios/`, `android/`, `assets/`) are ignored
by the Vite web build — the website deploy is unaffected. Do **not** import
`@capacitor/*` in shared web code; native bootstrapping stays in the native
projects so the web bundle never depends on Capacitor being installed.
