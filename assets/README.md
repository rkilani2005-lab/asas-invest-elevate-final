# App icon & splash sources (Capacitor)

`@capacitor/assets` generates every iOS + Android icon/splash size from the
source images in this folder. Drop these files here, then run
`npx capacitor-assets generate` (see ../NATIVE_APPS.md).

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | **1024×1024** | App icon (opaque, no rounded corners — the OS masks it) |
| `icon-foreground.png` | 1024×1024 | *(optional)* Android adaptive-icon foreground (logo on transparent, ~66% safe zone) |
| `icon-background.png` | 1024×1024 | *(optional)* Android adaptive-icon background (solid `#1A1A1A` or a subtle brand fill) |
| `splash.png` | **2732×2732** | Launch screen (logo centered on `#1A1A1A`; keep content within the center ~40%) |
| `splash-dark.png` | 2732×2732 | *(optional)* Dark-mode launch screen |

`icon.png` here is currently a **placeholder** (the web favicon). Replace it with
a crisp 1024×1024 export of the ASAS logo before generating store assets.
Brand: background `#1A1A1A`, gold accent `#C5A059`.
