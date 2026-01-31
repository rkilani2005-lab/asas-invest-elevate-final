

# Complete CMS Implementation Plan
## Advanced Property Management + Global Content Management

---

## Part A: Advanced Property Management CMS (Original Plan)

### A1. Database Schema Updates

**A1.1 Add Category to Media Table**
```sql
ALTER TABLE public.media ADD COLUMN category text DEFAULT 'general';
```

**A1.2 Add Map Embed Support**
```sql
ALTER TABLE public.properties ADD COLUMN map_embed_code text;
```

**A1.3 Predefined Amenities Library**
```sql
CREATE TABLE public.amenity_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ar text,
  icon text NOT NULL,
  category text DEFAULT 'General',
  is_active boolean DEFAULT true
);
-- Insert standard Dubai amenities (Pool, Gym, Security, etc.)
-- RLS policies for admin management
```

### A2. Multi-Step Property Wizard

```text
src/components/admin/property-wizard/
+-- PropertyWizard.tsx          (Main container)
+-- WizardStepper.tsx           (Visual progress)
+-- steps/
|   +-- GeneralInfoStep.tsx     (Name, Location, Price)
|   +-- MediaStep.tsx           (Images & Video)
|   +-- DetailsStep.tsx         (Amenities, Landmarks)
|   +-- FinancialsStep.tsx      (Payment Plan, Status)
+-- components/
    +-- MediaUploader.tsx       (Drag-drop + categories)
    +-- VideoUploader.tsx       (Native .mp4 upload)
    +-- AmenitiesSelector.tsx   (Checklist + custom)
    +-- LandmarksBuilder.tsx    (Nearby places)
    +-- PaymentPlanBuilder.tsx  (Milestone reordering)
```

**Step Details:**
- **Step 1 - General Info**: Bilingual name/tagline, slug, developer, location, price/size ranges, unit types, ownership, handover date
- **Step 2 - Media**: Categorized image uploads (Exterior, Interior, Material Board, Amenities, Floor Plans), native video upload to `property-media` bucket
- **Step 3 - Details**: Amenities checklist from library + custom, nearby landmarks builder, rich text overview (EN/AR side-by-side)
- **Step 4 - Financials**: Payment milestone builder with drag-to-reorder, status toggle (Available/Reserved/Sold), featured toggle

---

## Part B: Global Content Management System (New Addition)

### B1. Database Schema - New Tables

**B1.1 Insights/Blog Table**
```sql
CREATE TABLE public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_ar text,
  excerpt_en text,
  excerpt_ar text,
  content_en text,          -- Rich text/HTML
  content_ar text,
  category text NOT NULL,   -- 'market_news', 'project_updates', 'lifestyle', 'investment_guide'
  featured_image text,      -- URL from storage
  author_en text,
  author_ar text,
  read_time_minutes integer DEFAULT 5,
  is_featured boolean DEFAULT false,
  is_published boolean DEFAULT false,
  published_at timestamp with time zone,
  meta_title_en text,
  meta_title_ar text,
  meta_description_en text,
  meta_description_ar text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS policies for public read, admin write
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published insights" ON public.insights FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage insights" ON public.insights FOR ALL USING (has_role(auth.uid(), 'admin'));
```

**B1.2 Extend pages_content Table (Already Exists)**
The existing `pages_content` table with `page_slug`, `section_key`, `content_en`, `content_ar` will be populated with:

| page_slug | section_key | content_en (JSONB) | content_ar (JSONB) |
|-----------|-------------|--------------------|--------------------|
| home | hero | `{subtitle, headline, highlight, tagline, video_url}` | Arabic equivalents |
| home | featured_properties | `{subtitle, title, description}` | Arabic equivalents |
| home | why_asas | `{subtitle, title, description, mission, mission_author}` | Arabic equivalents |
| home | why_asas_values | `[{icon, title, description}, ...]` | Arabic array |
| home | stats | `[{value, label}, ...]` | Arabic array |
| insights | hero | `{eyebrow, title, description}` | Arabic equivalents |
| insights | newsletter | `{title, description, disclaimer}` | Arabic equivalents |

**B1.3 Extend site_settings Table (Already Exists)**
Already has contact/social/seo keys. Will be used as-is.

### B2. Admin Module Architecture

```text
src/pages/admin/
+-- AdminDashboard.tsx         (Enhanced with recent insights)
+-- AdminProperties.tsx        (Links to wizard)
+-- AdminInquiries.tsx         (Existing)
+-- AdminTranslations.tsx      (Existing)
+-- AdminSettings.tsx          (Contact, Social, SEO)
+-- AdminInsights.tsx          (NEW - Blog management)
+-- AdminHomeContent.tsx       (NEW - Home page sections)
+-- PropertyWizardPage.tsx     (NEW - Multi-step wizard)

src/components/admin/
+-- AdminSidebar.tsx           (Add new nav items)
+-- insights/
|   +-- InsightsList.tsx       (Table with status badges)
|   +-- InsightEditor.tsx      (Full article editor)
+-- home-content/
|   +-- HeroEditor.tsx         (Video + headlines)
|   +-- WhyAsasEditor.tsx      (Values cards manager)
|   +-- StatsEditor.tsx        (Metrics editor)
```

### B3. Home Page Manager Features

**B3.1 Hero Content Editor**
- Video file upload to `site-assets` bucket
- Bilingual headline fields (EN/AR side-by-side)
- Subtitle and tagline fields
- Live preview thumbnail

**B3.2 Why Asas Section Editor**
- Dynamic list of value cards
- Each card: Icon selector (from Lucide), Title (EN/AR), Description (EN/AR)
- Add/Remove/Reorder cards
- Mission statement editor with author field

**B3.3 Stats Section Editor**
- Dynamic metrics list
- Each metric: Value (number), Label (EN/AR)
- Add/Remove/Reorder

### B4. Insights (Blog) Editor Features

**B4.1 Article List View**
- Table with columns: Title, Category, Status, Date, Actions
- Status badges: Draft (gray), Published (green), Featured (gold)
- Filters: Category, Status
- Search by title

**B4.2 Article Editor**
- Bilingual title and excerpt (EN/AR side-by-side)
- Rich text editor for content (Tiptap)
- Featured image upload
- Category selector (Market News, Project Updates, Lifestyle, Investment Guide)
- SEO fields: Meta title, Meta description (bilingual)
- Publish controls: Save Draft, Publish, Schedule

### B5. Contact Settings (Extend Existing)

The existing `AdminSettings.tsx` already handles:
- Contact info (phone, email, WhatsApp, address EN/AR)
- Social links (Instagram, LinkedIn, YouTube)
- SEO settings

**Enhancement needed:**
- Add Google Maps embed code field
- Add map preview

---

## Part C: Implementation Details

### C1. New Routes
```typescript
// In App.tsx
<Route path="/admin/insights" element={<AdminLayout><AdminInsights /></AdminLayout>} />
<Route path="/admin/insights/new" element={<AdminLayout><InsightEditorPage /></AdminLayout>} />
<Route path="/admin/insights/:id/edit" element={<AdminLayout><InsightEditorPage /></AdminLayout>} />
<Route path="/admin/home-content" element={<AdminLayout><AdminHomeContent /></AdminLayout>} />
<Route path="/admin/properties/new" element={<AdminLayout><PropertyWizardPage /></AdminLayout>} />
<Route path="/admin/properties/:id/edit" element={<AdminLayout><PropertyWizardPage /></AdminLayout>} />
```

### C2. Updated Admin Sidebar Navigation
```typescript
const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/properties", icon: Building2, label: "Properties" },
  { href: "/admin/inquiries", icon: Users, label: "Inquiries" },
  { href: "/admin/insights", icon: Newspaper, label: "Insights" },        // NEW
  { href: "/admin/home-content", icon: Home, label: "Home Page" },       // NEW
  { href: "/admin/translations", icon: Languages, label: "Translations" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];
```

### C3. Frontend Integration

**C3.1 Home Page - Fetch from Database**
Modify `Hero.tsx`, `WhyAsas.tsx`, `Stats.tsx`, `Contact.tsx` to:
1. Query `pages_content` table for section data
2. Use fetched content instead of i18n translations
3. Fallback to i18n if database content not found

**C3.2 Insights Page - Dynamic Content**
Modify `src/pages/Insights.tsx` to:
1. Query `insights` table for published articles
2. Support category filtering from database
3. Display featured article from database
4. Link to individual insight pages (new route needed)

**C3.3 Contact Component - Dynamic Settings**
Modify `Contact.tsx` to:
1. Query `site_settings` for contact info
2. Display real phone/email/address from database

### C4. File Changes Summary

**New Files (17 total):**
1. `src/pages/admin/AdminInsights.tsx`
2. `src/pages/admin/InsightEditorPage.tsx`
3. `src/pages/admin/AdminHomeContent.tsx`
4. `src/pages/admin/PropertyWizardPage.tsx`
5. `src/components/admin/insights/InsightsList.tsx`
6. `src/components/admin/insights/InsightEditor.tsx`
7. `src/components/admin/home-content/HeroEditor.tsx`
8. `src/components/admin/home-content/WhyAsasEditor.tsx`
9. `src/components/admin/home-content/StatsEditor.tsx`
10. `src/components/admin/property-wizard/PropertyWizard.tsx`
11. `src/components/admin/property-wizard/WizardStepper.tsx`
12. `src/components/admin/property-wizard/steps/GeneralInfoStep.tsx`
13. `src/components/admin/property-wizard/steps/MediaStep.tsx`
14. `src/components/admin/property-wizard/steps/DetailsStep.tsx`
15. `src/components/admin/property-wizard/steps/FinancialsStep.tsx`
16. `src/components/admin/property-wizard/components/MediaUploader.tsx`
17. `src/components/admin/property-wizard/components/PaymentPlanBuilder.tsx`

**Modified Files (10 total):**
1. `src/App.tsx` - Add new routes
2. `src/components/admin/AdminSidebar.tsx` - Add nav items
3. `src/pages/admin/AdminProperties.tsx` - Link to wizard
4. `src/pages/admin/AdminSettings.tsx` - Add map embed field
5. `src/components/Hero.tsx` - Fetch from database
6. `src/components/WhyAsas.tsx` - Fetch from database
7. `src/components/Stats.tsx` - Fetch from database
8. `src/components/Contact.tsx` - Fetch settings
9. `src/components/Footer.tsx` - Fetch settings
10. `src/pages/Insights.tsx` - Fetch from insights table

**Database Migrations (4 total):**
1. Add `category` column to `media` table
2. Add `map_embed_code` to `properties` table
3. Create `amenity_library` table with seed data
4. Create `insights` table with RLS policies

---

## Part D: Technical Notes

### D1. Rich Text Editor
Will use **Tiptap** for:
- Property overview (bilingual)
- Insight article content (bilingual)

Features: Bold, italic, bullet points, numbered lists, headings, block quotes.

### D2. Drag-and-Drop
Will use **@dnd-kit/core** for:
- Media image reordering
- Payment milestone reordering
- Why Asas value cards reordering
- Stats metrics reordering

### D3. File Storage Strategy
All uploads go to existing Supabase storage buckets:
- `property-media`: Property images and videos
- `site-assets`: Hero video, insight featured images, logos

### D4. Performance Note
The user mentioned ISR (Incremental Static Regeneration). Since this is a React/Vite SPA (not Next.js), we will use:
- React Query with caching for data fetching
- Stale-while-revalidate pattern for content updates
- Skeleton loaders during fetch

---

## Implementation Order

1. **Phase 1 - Database**: Run all migrations (media category, insights table, amenity_library)
2. **Phase 2 - Admin Sidebar**: Update navigation with new menu items
3. **Phase 3 - Insights Module**: InsightsList + InsightEditor pages
4. **Phase 4 - Home Content Module**: Hero, WhyAsas, Stats editors
5. **Phase 5 - Property Wizard**: Multi-step form with all sub-components
6. **Phase 6 - Frontend Integration**: Connect public pages to database content
7. **Phase 7 - Testing**: Verify bilingual sync, media uploads, content display

