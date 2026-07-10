import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config — wraps the built web app (dist/) into native iOS + Android
 * apps. App data still comes live from Supabase, so the bundled shell stays
 * current without resubmission; only shell/native changes need a new build.
 *
 * appId must match the Android TWA package + Digital Asset Links
 * (public/.well-known/assetlinks.json) and the iOS bundle identifier.
 */
const config: CapacitorConfig = {
  appId: "com.asasinvest.app",
  appName: "Asas Invest",
  webDir: "dist",
  backgroundColor: "#1A1A1A",
  ios: {
    contentInset: "always",
    backgroundColor: "#1A1A1A",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#1A1A1A",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#1A1A1A",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },

  // ── Alternative: always load the LIVE site (TWA-like), no bundled shell ──────
  // Trade-off: instant content updates, but Apple review is stricter on pure
  // remote wrappers (guideline 4.2). Prefer the bundled shell above for the App
  // Store. To switch, comment out `webDir` behavior by uncommenting this:
  // server: { url: "https://www.asasinvest.com", cleartext: false },
};

export default config;
