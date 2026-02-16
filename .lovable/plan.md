
# Asas Invest: Sales & Investment Platform Expansion

## Overview

Restructure the website around two core verticals -- **Buy** (unified Residential + Commercial sales) and **Invest** -- while removing all rental references. Add a dedicated About page, Sell page, and mega menu navigation. No design changes: all new pages reuse existing "Bright Luxury" components.

---

## Phase 1: Navigation Mega Menu

### What changes
Replace the current flat nav bar (Home, Off-Plan, Ready, About, Insights, Contact) with a structured dropdown menu system.

**New menu structure:**
- **BUY** (dropdown): Ready Residential, Off-Plan Projects, Commercial Sales, Buyer's Guide
- **SELL** (dropdown): Request Valuation, List Your Property
- **INVEST** (dropdown): Portfolio Advisory, Golden Visa, ROI Calculator, Why Dubai?
- **INSIGHTS** (link to /insights)
- **ABOUT ASAS** (dropdown): Our Vision, The Private Office, Careers
- **CONTACT** (gold button)

**Desktop**: Hover-activated dropdown panels with clean gold-accented styling.
**Mobile**: Accordion-style collapsible groups inside the existing slide-in panel.

### Files involved
- **Create** `src/components/navigation/MegaMenu.tsx` -- dropdown logic + desktop rendering
- **Create** `src/components/navigation/MobileMegaMenu.tsx` -- accordion for mobile panel
- **Modify** `src/components/Navigation.tsx` -- integrate new menu components
- **Modify** `src/components/Footer.tsx` -- update link columns to match new sitemap

---

## Phase 2: Database Schema Updates

### Add commercial columns to `properties` table
```
license_type       text     (freezone, ded_mainland, difc)
fit_out_status     text     (shell_core, fitted, furnished)
office_type        text     (office, retail, warehouse, full_floor)
power_load_kw      text
pantry_available   boolean  (default false)
washroom_type      text     (private, shared)
parking_spaces     integer
parking_ratio      text
projected_roi      text     (e.g. "7.2%")
tenancy_status     text     (vacant, tenanted)
service_charges    text     (e.g. "AED 18/sqft")
```

### Create `services` table (for About/Services management)
Columns: `id, title_en, title_ar, description_en, description_ar, icon, category, sort_order, is_active, created_at`
With standard RLS (public read, admin write).

### Create `page_sections` table (for About page CMS)
Columns: `id, page_slug, section_key, title_en, title_ar, content_en, content_ar, sort_order, updated_at`
With standard RLS (public read, admin write).

---

## Phase 3: New Pages

### A. Commercial Listing Page (`/commercial`)
- Reuses the exact Ready/OffPlan page layout and `PropertyCard` component
- Queries `properties WHERE category = 'commercial'`
- Adds commercial-specific filters: Property Type (Office, Retail, Warehouse, Full Floor), Ownership (Freehold/Leasehold), Condition (Shell & Core, Fitted), ROI Potential
- New component: `src/components/properties/CommercialFilters.tsx`

### B. Buy Landing Page (`/buy`)
- Simple choice page: two large cards -- "Living" (Residential) and "Business" (Commercial)
- Links to existing `/ready`, `/off-plan`, and new `/commercial`

### C. Sell Page (`/sell`)
- "Get Your Instant Valuation" lead form (Area, Type, Size, Contact) -- submits to `inquiries` table with `inquiry_type = 'valuation'`
- Visual timeline: Valuation -> Staging -> Marketing -> Transfer (horizontal stepper)
- "List Your Property" section with CTA

### D. Invest Page (`/invest`)
- Hero: "Wealth Creation Through Real Estate" with cinematic background
- Value props: Rental Yields, Capital Appreciation, Golden Visa (3-column grid)
- ROI Calculator: inputs (Purchase Price, Expected Rent) -> outputs (Gross ROI %, Net ROI)
- "Why Invest in Dubai?" content section

### E. About Page (`/about`)
- Hero: "Curating Wealth Through Real Estate"
- The Asas Philosophy: 3 pillars (Precision, Access, Stewardship)
- Founder's Note (editable via CMS)
- "The Private Office" service highlight for HNWIs
- Team section (reuses existing Team component)

### F. Buyer's Guide (`/buy/guide`) and Careers (`/about/careers`)
- Static content pages managed via `pages_content` table

---

## Phase 4: Property Detail Updates

### Commercial specs in Overview tab
- Update `PropertyOverview.tsx` to conditionally show commercial fields (Power Load, Pantry, Washroom Type, Parking Ratio, Projected ROI, Tenancy Status, Service Charges) when `property.category === 'commercial'`

### Investment tab enhancements
- Show Projected ROI, Capital Appreciation Estimates, and Tenancy Status for commercial properties

---

## Phase 5: Admin CMS Updates

### Property Wizard
- Add **Category** dropdown (Residential/Commercial) to `GeneralInfoStep.tsx`
- Conditionally show commercial fields (license_type, fit_out_status, office_type, power_load_kw, pantry, washroom, parking_spaces, projected_roi, tenancy_status, service_charges) when Commercial is selected
- Update `PropertyData` type in `types.ts`

### About Page Manager
- New admin page `/admin/about` to edit Founder's Note and Philosophy Pillars
- Uses `page_sections` table

### Admin Sidebar
- Add "About Page" link to `AdminSidebar.tsx`

---

## Phase 6: Translations (i18n)

Add all new keys to both `en.json` and `ar.json`:
- Navigation mega menu items (nav.buy, nav.sell, nav.invest, nav.aboutAsas, etc.)
- All sub-menu labels
- New page titles, descriptions, form labels
- Commercial filter options
- ROI calculator labels
- About page section headers
- Sell page content

---

## New Files Summary

| File | Purpose |
|------|---------|
| `src/components/navigation/MegaMenu.tsx` | Desktop dropdown menu |
| `src/components/navigation/MobileMegaMenu.tsx` | Mobile accordion menu |
| `src/pages/Buy.tsx` | Buy landing (Living vs Business) |
| `src/pages/Commercial.tsx` | Commercial listings with filters |
| `src/pages/Sell.tsx` | Valuation form + vendor journey |
| `src/pages/Invest.tsx` | Investment hub + ROI calculator |
| `src/pages/About.tsx` | Full About page |
| `src/pages/BuyerGuide.tsx` | Buyer's guide content |
| `src/pages/Careers.tsx` | Careers placeholder |
| `src/components/properties/CommercialFilters.tsx` | Commercial-specific filters |
| `src/components/invest/ROICalculator.tsx` | Interactive calculator |
| `src/components/sell/ValuationForm.tsx` | Lead capture form |
| `src/components/sell/ProcessTimeline.tsx` | Visual stepper |
| `src/pages/admin/AdminAboutPage.tsx` | About page CMS |

## Modified Files Summary

| File | Changes |
|------|---------|
| `src/components/Navigation.tsx` | Mega menu integration |
| `src/components/Footer.tsx` | Updated link structure |
| `src/App.tsx` | New routes |
| `src/components/property-detail/PropertyOverview.tsx` | Commercial specs |
| `src/components/admin/property-wizard/steps/GeneralInfoStep.tsx` | Category + commercial fields |
| `src/components/admin/property-wizard/types.ts` | New field types |
| `src/components/admin/AdminSidebar.tsx` | About Page link |
| `src/i18n/locales/en.json` | New translation keys |
| `src/i18n/locales/ar.json` | New translation keys |

## Database Migrations
1. Add commercial + investment columns to `properties`
2. Create `services` table with RLS
3. Create `page_sections` table with RLS
