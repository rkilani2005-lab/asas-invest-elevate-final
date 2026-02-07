
# Fix Property Hero Image Display on Desktop

## Problem Analysis
The Property Hero currently uses viewport-height sizing (`h-[60vh]` mobile, `h-[70vh]` desktop) which creates display issues:
- **Desktop**: Full-width container (~1920px) with 70vh height creates an ultra-wide landscape container (roughly 2.5:1 ratio). Portrait images get heavily cropped on the sides.
- **Mobile**: Narrower screens (~375px) with 60vh creates a more square-ish container where portrait images fit naturally.

## Solution
Implement responsive aspect ratio control:
- **Mobile**: Keep the current viewport-height approach (`h-[60vh]`) which works well
- **Desktop**: Switch to a fixed cinematic aspect ratio (`aspect-[21/9]` or `aspect-[16/9]`) that ensures consistent landscape display regardless of image orientation

## Implementation Details

### File to Modify
`src/components/property-detail/PropertyHero.tsx`

### Changes

1. **Update Hero Container Classes** (Line 63)
   - Current: `h-[60vh] md:h-[70vh]`
   - New: `h-[60vh] md:h-auto md:aspect-[21/9]`
   
   This applies:
   - Mobile: Fixed 60vh height (existing behavior - works well)
   - Desktop: Auto height with 21:9 cinematic aspect ratio (fixes the vertical image issue)

2. **Adjust Image Wrapper** (Line 72 - motion.div)
   - Add `md:relative md:h-full` to ensure proper containment on desktop
   - The `absolute inset-0` already handles mobile

3. **Add Object Position** (Line 77 - img tag)
   - Add `object-center` to ensure images are centered when cropped
   - This focuses on the center of the image which is typically the most important part

### Visual Result
```text
┌────────────────────────────────────────────────────────────┐
│                    DESKTOP (21:9 aspect)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │        Image cropped to 21:9 landscape format        │  │
│  │         (center-focused, sides cropped)              │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

┌──────────────┐
│   MOBILE     │
│ ┌──────────┐ │
│ │          │ │
│ │  60vh    │ │
│ │  height  │ │
│ │  (works) │ │
│ └──────────┘ │
└──────────────┘
```

## Alternative Aspect Ratios (if 21:9 feels too cinematic)
- `aspect-[16/9]`: Standard widescreen - slightly taller hero
- `aspect-[2/1]`: Simple 2:1 ratio - balanced option
- `aspect-[21/9]`: Ultra-wide cinematic - dramatic, shorter hero

## Technical Notes
- The `pt-20` padding for navigation will be preserved
- Gradient overlays will continue to work as they use `absolute inset-0`
- Navigation arrows and indicators remain properly positioned
- No changes needed to mobile behavior
