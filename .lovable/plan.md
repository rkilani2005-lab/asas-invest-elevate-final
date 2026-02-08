

# Navigation Visibility Fix

## Problem Analysis

The navigation bar uses `text-foreground/70` for link colors, which is a dark charcoal color. This works well on light backgrounds but becomes invisible when placed over:

1. **Home Page Video**: The video hero has a dark charcoal gradient overlay at the top, making dark text invisible
2. **Property Detail Hero**: The new cinematic letterbox uses `from-charcoal` gradient bars, also making dark text invisible

Currently, the navigation only gets a solid background when scrolled (`isScrolled` state), leaving it transparent and unreadable at the top of both pages.

---

## Solution Options

### Option A: Always-Visible Scrolled State (Simple)
Add a semi-transparent dark background to the nav bar at all times, not just when scrolled.

**Pros**: Simple, consistent across all pages
**Cons**: Reduces the immersive feel of the hero sections

### Option B: Smart Context-Aware Navigation (Recommended)
Detect which page/section the user is on and adjust text colors accordingly:
- On hero sections (home video, property detail): Use white/light text with text shadows
- After scrolling: Use the current scrolled style with background

**Pros**: Maintains immersive design, readable everywhere
**Cons**: Slightly more complex

### Option C: Persistent Dark Header Bar
Keep the dark gradient bar from the cinematic letterbox but extend it to cover the navigation height properly, and change nav text to light colors when not scrolled.

**Pros**: Elegant solution that works with existing design
**Cons**: Requires coordinating nav and hero gradients

---

## Recommended Implementation: Option B

### Changes Required

**1. Navigation Component (`src/components/Navigation.tsx`)**

Add logic to detect if user is on a "dark hero" page (home or property detail):

```typescript
const isDarkHeroPage = location.pathname === "/" || location.pathname.startsWith("/property/");

// When not scrolled on dark hero pages, use light text
const navTextClass = !isScrolled && isDarkHeroPage 
  ? "text-white/90 hover:text-white" 
  : "text-foreground/70 hover:text-accent";

const activeNavClass = !isScrolled && isDarkHeroPage
  ? "text-white"
  : "text-accent";
```

**2. Add Text Shadows for Legibility**

When on dark hero backgrounds, add subtle text shadows to ensure readability:

```typescript
const navStyle = !isScrolled && isDarkHeroPage 
  ? { textShadow: '0px 2px 8px rgba(0, 0, 0, 0.5)' }
  : undefined;
```

**3. Mobile Menu Button Color**

Update the hamburger icon color to be white when on dark hero pages:

```typescript
className={cn(
  "lg:hidden p-2",
  !isScrolled && isDarkHeroPage ? "text-white" : "text-foreground"
)}
```

**4. Logo Border Adjustment**

Make the logo border more visible on dark backgrounds:

```typescript
className={cn(
  "h-14 w-14 rounded-full object-cover",
  !isScrolled && isDarkHeroPage 
    ? "border-2 border-white/50" 
    : "border border-accent/30"
)}
```

**5. Language Switcher & CTA Button**

Pass a prop or use context to style these components appropriately on dark backgrounds.

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/Navigation.tsx` | Add dark hero detection, conditional text colors, text shadows |
| `src/components/layout/LanguageSwitcher.tsx` | Accept variant prop for light/dark styling |

### Conditional Logic Summary

```
if (isScrolled) {
  // Current scrolled behavior: solid background, dark text
} else if (isDarkHeroPage) {
  // NEW: Light text with shadows on transparent background
} else {
  // Default: Dark text on transparent background (for light hero pages)
}
```

### Visual Result

| State | Background | Text Color | Additional |
|-------|------------|------------|------------|
| Scrolled (all pages) | Semi-transparent with blur | Dark charcoal | Border + shadow |
| Not scrolled (dark hero) | Transparent | White/light | Text shadow |
| Not scrolled (light page) | Transparent | Dark charcoal | None |

---

## Implementation Order

1. Update Navigation component with dark hero page detection
2. Add conditional text color classes for nav links
3. Add text shadows for legibility on dark backgrounds
4. Update mobile menu button color
5. Adjust logo border for better visibility
6. Update CTA button styling for dark backgrounds
7. Test on home page, property detail page, and other pages

