
# Asas Invest - Architectural Grade Real Estate Platform

## Executive Summary

A premium bilingual (English/Arabic RTL) digital brochure platform for UAE/Kuwait real estate, featuring Off-Plan and Ready property categories, developer-grade marketing asset pages, and a complete Admin CMS.

---

## Phase 1: Foundation & Infrastructure

### 1.1 Enable Lovable Cloud (Supabase)

First step is to enable the backend which will provision:
- PostgreSQL database
- Authentication system
- File storage buckets
- Edge Functions capability

### 1.2 Database Schema

```text
CORE TABLES
-----------

properties                    translations
├── id (uuid, PK)            ├── key (text, PK)
├── slug (text, unique)      ├── en_text (text)
├── type (enum: off-plan/    ├── ar_text (text)
│   ready)                   └── category (enum: ui/
├── name_en / name_ar            content/property)
├── tagline_en / tagline_ar
├── overview_en / overview_ar   media
├── highlights_en/ar (jsonb)   ├── id (uuid, PK)
├── location_en / location_ar  ├── property_id (fk)
├── location_coords (point)    ├── type (enum: render/
├── developer_en / developer_ar│   floorplan/material/
├── price_range (text)         │   video/interior/hero)
├── unit_types (text[])        ├── url (text)
├── size_range (text)          ├── caption_en/ar
├── handover_date (date)       └── order_index (int)
├── status (enum: available/
│   reserved/sold)            payment_milestones
├── ownership_type (text)     ├── id (uuid, PK)
├── parking (text)            ├── property_id (fk)
├── nearby_en/ar (jsonb)      ├── percentage (int)
├── investment_en/ar (text)   ├── milestone_en/ar
├── enduser_text_en/ar        └── sort_order (int)
├── video_url (text)
├── is_featured (bool)        amenities
├── sort_order (int)          ├── id (uuid, PK)
└── created_at                ├── property_id (fk)
                              ├── name_en / name_ar
inquiries                     ├── icon (text)
├── id (uuid, PK)             └── category (text)
├── property_id (fk)
├── name, email, phone        pages_content
├── message (text)            ├── id (uuid, PK)
├── interests (text[])        ├── page_slug (text)
│   (floorplan/brochure/etc)  ├── section_key (text)
├── inquiry_type (text)       ├── content_en/ar (jsonb)
├── status (enum: new/        └── updated_at
│   contacted/closed)
└── created_at                site_settings
                              ├── key (text, PK)
user_roles                    ├── value (jsonb)
├── id (uuid, PK)             └── updated_at
├── user_id (fk -> auth.users)
└── role (enum: admin/user)   seo_meta
                              ├── id (uuid, PK)
                              ├── page_type (text)
                              ├── reference_id (uuid)
                              ├── title_en/ar
                              ├── description_en/ar
                              └── og_image (text)
```

### 1.3 Storage Buckets

- `property-media` - Renders, floor plans, material boards, brochures
- `site-assets` - Hero images, general site assets

### 1.4 Row-Level Security

- Admin-only write access to all content tables
- Public read access for published properties
- Secure `has_role()` function to prevent RLS recursion

---

## Phase 2: Bilingual System (i18n + RTL)

### 2.1 Technology

- `react-i18next` for translation management
- Language context with `useLanguage` hook
- RTL/LTR switching via `dir` attribute

### 2.2 Font Strategy

| Language | Font Family | Weights |
|----------|-------------|---------|
| English | Inter | 400, 500, 600 |
| Arabic | IBM Plex Sans Arabic | 400, 500, 600 |
| Headings (both) | Playfair Display | 500, 600 |

### 2.3 URL Structure

```text
/                    -> Redirect to /en
/en                  -> Home (English)
/ar                  -> Home (Arabic RTL)
/en/off-plan         -> Off-Plan Listings
/ar/off-plan         -> Off-Plan (Arabic)
/en/ready            -> Ready Listings
/ar/ready            -> Ready (Arabic)
/en/property/:slug   -> Property Detail
/ar/property/:slug   -> Property Detail (Arabic)
/en/about            -> About Page
/ar/about            -> About (Arabic)
/en/contact          -> Contact Page
/ar/contact          -> Contact (Arabic)
/admin               -> Protected Admin Dashboard
```

### 2.4 Translation Architecture

All UI strings stored in `translations` table, loaded at app init:

```text
key                    | en_text        | ar_text
-----------------------|----------------|----------------
nav.home               | Home           | الرئيسية
nav.off_plan           | Off-Plan       | قيد الإنشاء
btn.register_interest  | Register Interest | سجل اهتمامك
btn.request_viewing    | Request Viewing | طلب معاينة
```

---

## Phase 3: Public Website Pages

### 3.1 Home Page Structure

```text
┌─────────────────────────────────────────────────────────────┐
│ STICKY HEADER                                                │
│ Logo | Off-Plan | Ready | About | Contact | [EN|AR] | CTA   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ HERO SECTION (Full viewport, video background)              │
│ ├── Buttery-smooth parallax on scroll                       │
│ ├── Headline + Tagline (bilingual)                          │
│ └── Two CTAs: "Explore Off-Plan" | "Browse Ready"           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ CATEGORY BLOCKS (Side-by-side cards)                        │
│ ┌─────────────────────┐  ┌─────────────────────┐            │
│ │ OFF-PLAN            │  │ READY               │            │
│ │ "The Vision"        │  │ "The Reality"       │            │
│ │ Investment focus    │  │ Move-in ready       │            │
│ │ Payment plans       │  │ Immediate ROI       │            │
│ │ [Explore ->]        │  │ [Browse ->]         │            │
│ └─────────────────────┘  └─────────────────────┘            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ FEATURED PROJECTS SLIDER                                     │
│ Horizontal carousel with property cards                      │
│ Hero image | Name | Location | Price | Badge | CTA          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ WHY ASAS (Trust Section - Advisory Tone)                    │
│ Icon grid with value propositions                           │
│ Market expertise | Personalized service | Transparency      │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ CONTACT CTA + FLOATING WHATSAPP BUTTON                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Category Listing Pages (Off-Plan / Ready)

**Property Card Design:**
- Hero image with subtle hover lift
- Property name + location
- Price range
- Unit type badges
- Status badge (Handover Q4 2026 / Available Now)
- CTA button

**Filter Panel:**
- Location dropdown (Dubai areas)
- Budget range slider
- Unit type checkboxes
- Developer filter (Off-Plan only)
- Clear all filters

### 3.3 Property Detail Page - "Marketing Pack" UX

```text
┌─────────────────────────────────────────────────────────────┐
│ STICKY CONVERSION BAR (appears on scroll)                   │
│ Property Name | Price | [Request VIP Pack] button           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ HERO SECTION                                                 │
│ ├── Full-width video/render with parallax                   │
│ ├── Badges: Off-Plan | Available                            │
│ ├── Property name, developer, location                      │
│ ├── Price range prominently displayed                       │
│ └── Primary CTA: "Register Interest" / "Request Viewing"    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ QUICK FACTS GRID (Fact Sheet Visualized)                    │
│ ┌─────────┬─────────┬─────────┬─────────┬─────────┐        │
│ │Developer│Unit Types│Size Range│Handover │Ownership│        │
│ │Emaar    │1-4 BR   │800-3200 │Q4 2026  │Freehold │        │
│ └─────────┴─────────┴─────────┴─────────┴─────────┘        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ STICKY IN-PAGE TABS (scroll-aware highlighting)             │
│ Overview | Location | Amenities | Gallery | Floor Plans |   │
│ Payment Plan* | Video | Investment | Inquire                │
│ (* Off-Plan only)                                           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION: OVERVIEW (Storytelling Layout)                     │
│ ├── Brochure-style narrative description                    │
│ └── Highlights list with icons                              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION: LOCATION                                           │
│ ├── Google Maps embed (interactive)                         │
│ └── Nearby landmarks grid with distances                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION: AMENITIES                                          │
│ Icon grid organized by category:                            │
│ Recreation | Wellness | Convenience | Security              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION: GALLERY (Marketing Asset Hub)                      │
│ Internal tabs: Renders | Interiors | Material Board         │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ MATERIAL BOARD COMPONENT                             │    │
│ │ Grid of texture swatches (marble, oak, brass)       │    │
│ │ Click to expand with full description               │    │
│ └─────────────────────────────────────────────────────┘    │
│ Lightbox/zoom on click for all images                       │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION: FLOOR PLANS (Interactive)                          │
│ Tabs: Floor Plans | Floor Plates                            │
│ Filter by unit type: 1BR | 2BR | 3BR | Penthouse           │
│ High-res PDF viewer with zoom capability                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION: PAYMENT PLAN (Off-Plan only)                       │
│ Step-Progress Timeline (NOT a table):                       │
│                                                              │
│ ●────────●────────●────────●────────●                      │
│ 20%      10%      10%      30%      30%                    │
│ Down     Const.   Const.   Const.   Handover               │
│ Payment  Mile 1   Mile 2   Mile 3                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION: VIDEO                                              │
│ Embedded video player (YouTube/Vimeo or direct)             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION: INVESTMENT (Split View)                            │
│ ┌─────────────────────┐  ┌─────────────────────┐            │
│ │ FOR INVESTORS       │  │ FOR END-USERS       │            │
│ │ ROI projections     │  │ Lifestyle benefits  │            │
│ │ Rental yields       │  │ Community features  │            │
│ │ Capital appreciation│  │ Move-in timeline    │            │
│ └─────────────────────┘  └─────────────────────┘            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ SECTION: INQUIRE                                            │
│ ├── Contact form with Zod validation                        │
│ ├── Checkbox interests: Floor Plan | Brochure | VIP Pack   │
│ ├── WhatsApp CTA button                                     │
│ └── Success toast on submission                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 About & Contact Pages

- CMS-editable content sections
- Team showcase
- Company values
- Contact form with inquiry storage

---

## Phase 4: Admin CMS Dashboard

### 4.1 Authentication

- Supabase Auth with email/password
- Role check via `has_role()` function
- Protected `/admin` routes

### 4.2 Dashboard Structure

```text
/admin
├── /dashboard          -> Stats overview, recent inquiries
├── /properties         -> List, add, edit properties
│   ├── /new            -> Multi-step wizard
│   └── /:id/edit       -> Edit existing
├── /media              -> Central media library
├── /pages              -> Edit page content
├── /translations       -> Global strings editor
├── /settings           -> Site settings (WhatsApp, socials)
├── /seo                -> Meta tags manager
└── /inquiries          -> Lead CRM inbox
```

### 4.3 Property Multi-Step Wizard

```text
Step 1: General Info
├── Name (EN/AR)
├── Tagline (EN/AR)
├── Type (Off-Plan / Ready)
├── Developer
├── Location + Coordinates
├── Price Range
├── Status

Step 2: Details
├── Overview (EN/AR) - Rich text editor
├── Highlights (EN/AR)
├── Unit Types
├── Size Range
├── Handover Date
├── Ownership Type
├── Parking

Step 3: Media Uploads
├── Hero Image/Video
├── Renders (drag-and-drop ordering)
├── Interior Photos
├── Material Board Images
├── Floor Plans (with unit type tags)
├── Floor Plates
├── Brochure PDF
├── Video URL

Step 4: Payment Plan (Off-Plan only)
├── Add milestones
├── Percentage + Description (EN/AR)
├── Reorderable

Step 5: Amenities
├── Add amenities by category
├── Icon selection
├── Name (EN/AR)

Step 6: Investment Content
├── For Investors text (EN/AR)
├── For End-Users text (EN/AR)
├── Nearby landmarks (EN/AR)

Step 7: SEO
├── Meta title (EN/AR)
├── Meta description (EN/AR)
├── OG Image
├── URL slug
```

### 4.4 Lead CRM (Inquiries)

- Inbox view with filters (property, date, status)
- Status management: New -> Contacted -> Closed
- View checkbox interests per inquiry
- Export to CSV functionality
- Linked to specific property

### 4.5 Global Translations Editor

- Table view of all translation keys
- Edit EN and AR text inline
- Category filtering (UI, Content, Property)
- Search functionality

---

## Phase 5: Visual & Interaction Design

### 5.1 "Quiet Luxury" Aesthetic

| Element | Specification |
|---------|---------------|
| Background | Pure white (#FFFFFF) |
| Borders | 1px solid #E5E5E5 |
| Shadows | Subtle, 4-8px blur |
| Spacing | Generous whitespace |
| Typography | Clean, high contrast |
| Accents | Muted champagne gold |

### 5.2 Animations (Framer Motion)

- Buttery-smooth parallax on hero images
- Scroll-triggered reveals for sections
- Subtle hover lifts on cards (4px)
- Tab content transitions
- Gallery lightbox animations
- Form submission feedback

### 5.3 Mobile-First Responsive

- Stacked layouts on mobile
- Collapsible filters
- Touch-optimized gallery
- Floating WhatsApp button
- Sticky conversion bar

---

## Phase 6: Technical Implementation

### 6.1 New Dependencies

| Package | Purpose |
|---------|---------|
| react-i18next | Internationalization |
| i18next-browser-languagedetector | Auto language detection |
| react-intersection-observer | Sticky tabs awareness |
| yet-another-react-lightbox | Image gallery lightbox |
| @react-google-maps/api | Google Maps embed |
| react-beautiful-dnd | Drag-and-drop in admin |

### 6.2 File Structure

```text
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx (bilingual nav)
│   │   ├── Footer.tsx (bilingual)
│   │   ├── LanguageSwitcher.tsx
│   │   └── WhatsAppButton.tsx
│   ├── property/
│   │   ├── PropertyCard.tsx
│   │   ├── PropertyHero.tsx
│   │   ├── QuickFacts.tsx
│   │   ├── StickyTabs.tsx
│   │   ├── OverviewSection.tsx
│   │   ├── LocationSection.tsx
│   │   ├── AmenitiesSection.tsx
│   │   ├── GallerySection.tsx
│   │   ├── MaterialBoard.tsx
│   │   ├── FloorPlansSection.tsx
│   │   ├── PaymentTimeline.tsx
│   │   ├── VideoSection.tsx
│   │   ├── InvestmentSection.tsx
│   │   └── InquiryForm.tsx
│   ├── listing/
│   │   ├── PropertyGrid.tsx
│   │   └── FilterPanel.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── CategoryBlocks.tsx
│   │   ├── FeaturedSlider.tsx
│   │   └── WhyAsas.tsx
│   └── admin/
│       ├── Sidebar.tsx
│       ├── PropertyWizard/
│       │   ├── Step1General.tsx
│       │   ├── Step2Details.tsx
│       │   ├── Step3Media.tsx
│       │   ├── Step4Payment.tsx
│       │   ├── Step5Amenities.tsx
│       │   ├── Step6Investment.tsx
│       │   └── Step7SEO.tsx
│       ├── MediaLibrary.tsx
│       ├── TranslationsEditor.tsx
│       ├── InquiriesInbox.tsx
│       └── PagesEditor.tsx
├── contexts/
│   └── LanguageContext.tsx
├── hooks/
│   ├── useProperties.ts
│   ├── useTranslations.ts
│   ├── useInquiries.ts
│   └── useAdmin.ts
├── i18n/
│   ├── config.ts
│   └── resources/ (fallback)
├── pages/
│   ├── Home.tsx
│   ├── OffPlan.tsx
│   ├── Ready.tsx
│   ├── PropertyDetail.tsx
│   ├── About.tsx
│   ├── Contact.tsx
│   └── admin/
│       ├── Dashboard.tsx
│       ├── Properties.tsx
│       ├── PropertyEdit.tsx
│       ├── Media.tsx
│       ├── Pages.tsx
│       ├── Translations.tsx
│       ├── Settings.tsx
│       ├── SEO.tsx
│       └── Inquiries.tsx
└── lib/
    └── supabase.ts
```

### 6.3 Google Maps Integration

You will need to provide a Google Maps API key. This can be added as a publishable key in the codebase since it's client-side and restricted by domain.

---

## Implementation Order

| Step | Description | Estimated Complexity |
|------|-------------|---------------------|
| 1 | Enable Lovable Cloud + Create schema | Medium |
| 2 | Bilingual system (i18n, RTL, fonts) | Medium |
| 3 | Layout components (Header, Footer, Language Switcher) | Low |
| 4 | Home page with all sections | Medium |
| 5 | Category listing pages with filters | Medium |
| 6 | Property detail page (all sections) | High |
| 7 | About & Contact pages | Low |
| 8 | Admin authentication + dashboard | Medium |
| 9 | Property wizard (multi-step) | High |
| 10 | Media library with drag-drop | Medium |
| 11 | Translations editor | Medium |
| 12 | Inquiries CRM | Medium |
| 13 | SEO & final polish | Low |

---

## Security Considerations

1. Admin routes protected by role check using `has_role()` function
2. RLS policies on all tables
3. User roles stored in separate `user_roles` table (not profiles)
4. Security definer functions to prevent RLS recursion
5. Zod validation on all forms (EN and AR)
6. Input sanitization for user content

---

## Notes

- **Framework**: Using React + Vite + React Router (Lovable's stack) - equivalent functionality to Next.js App Router
- **Email Notifications**: Skipped for now, inquiries stored in database
- **Maps**: Google Maps embed - will need API key
- **RTL**: Native implementation with `dir="rtl"` and font swapping
