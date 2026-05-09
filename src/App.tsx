import { Suspense, lazy } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index"; // keep eager: it's the LCP page
import WhatsAppButton from "@/components/layout/WhatsAppButton";

// Public pages — lazy loaded
const InsightsPage = lazy(() => import("./pages/Insights"));
const InsightDetail = lazy(() => import("./pages/InsightDetail"));
const OffPlan = lazy(() => import("./pages/OffPlan"));
const Ready = lazy(() => import("./pages/Ready"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Buy = lazy(() => import("./pages/Buy"));
const Commercial = lazy(() => import("./pages/Commercial"));
const Sell = lazy(() => import("./pages/Sell"));
const ListProperty = lazy(() => import("./pages/ListProperty"));
const Invest = lazy(() => import("./pages/Invest"));
const About = lazy(() => import("./pages/About"));
const BuyerGuide = lazy(() => import("./pages/BuyerGuide"));
const Careers = lazy(() => import("./pages/Careers"));

// Admin — lazy loaded (huge bundle, never needed on the public site)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProperties = lazy(() => import("./pages/admin/AdminProperties"));
const AdminGallery = lazy(() => import("./pages/admin/AdminGallery"));
const AdminInquiries = lazy(() => import("./pages/admin/AdminInquiries"));
const AdminTranslations = lazy(() => import("./pages/admin/AdminTranslations"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminInsights = lazy(() => import("./pages/admin/AdminInsights"));
const InsightEditorPage = lazy(() => import("./pages/admin/InsightEditorPage"));
const AdminHomeContent = lazy(() => import("./pages/admin/AdminHomeContent"));
const PropertyWizardPage = lazy(() => import("./pages/admin/PropertyWizardPage"));
const AdminAmenityLibrary = lazy(() => import("./pages/admin/AdminAmenityLibrary"));
const AdminBulkImport = lazy(() => import("./pages/admin/AdminBulkImport"));
const AdminAboutPage = lazy(() => import("./pages/admin/AdminAboutPage"));
const ImporterDashboard = lazy(() => import("./pages/admin/importer/ImporterDashboard"));
const ImporterScan = lazy(() => import("./pages/admin/importer/ImporterScan"));
const ImporterQueue = lazy(() => import("./pages/admin/importer/ImporterQueue"));
const ImporterSettings = lazy(() => import("./pages/admin/importer/ImporterSettings"));
const ImporterApproval = lazy(() => import("./pages/admin/importer/ImporterApproval"));
const AdminCommunications = lazy(() => import("./pages/admin/AdminCommunications"));
const AdminEmailSettings = lazy(() => import("./pages/admin/AdminEmailSettings"));
const AdminEmailPage = lazy(() => import("./pages/admin/AdminEmailPage"));
const AdminSellerSubmissions = lazy(() => import("./pages/admin/AdminSellerSubmissions"));

const queryClient = new QueryClient();

const PageFallback = () => <div className="min-h-screen bg-background" />;

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<PageFallback />}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/buy" element={<Buy />} />
                  <Route path="/buy/guide" element={<BuyerGuide />} />
                  <Route path="/off-plan" element={<OffPlan />} />
                  <Route path="/ready" element={<Ready />} />
                  <Route path="/commercial" element={<Commercial />} />
                  <Route path="/sell" element={<Sell />} />
                  <Route path="/list-property" element={<ListProperty />} />
                  <Route path="/invest" element={<Invest />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/about/careers" element={<Careers />} />
                  <Route path="/property/:slug" element={<PropertyDetail />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/insights/:slug" element={<InsightDetail />} />

                  {/* Admin Routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                  <Route path="/admin/properties" element={<AdminLayout><AdminProperties /></AdminLayout>} />
                  <Route path="/admin/properties/new" element={<AdminLayout><PropertyWizardPage /></AdminLayout>} />
                  <Route path="/admin/properties/:id/edit" element={<AdminLayout><PropertyWizardPage /></AdminLayout>} />
                  <Route path="/admin/properties/import" element={<AdminLayout><AdminBulkImport /></AdminLayout>} />
                  <Route path="/admin/gallery" element={<AdminLayout><AdminGallery /></AdminLayout>} />
                  <Route path="/admin/inquiries" element={<AdminLayout><AdminInquiries /></AdminLayout>} />
                  <Route path="/admin/communications" element={<AdminLayout><AdminCommunications /></AdminLayout>} />
                  <Route path="/admin/communications/settings" element={<AdminLayout><AdminEmailSettings /></AdminLayout>} />
                  <Route path="/admin/email" element={<AdminLayout><AdminEmailPage /></AdminLayout>} />
                  <Route path="/admin/insights" element={<AdminLayout><AdminInsights /></AdminLayout>} />
                  <Route path="/admin/insights/new" element={<AdminLayout><InsightEditorPage /></AdminLayout>} />
                  <Route path="/admin/insights/:id/edit" element={<AdminLayout><InsightEditorPage /></AdminLayout>} />
                  <Route path="/admin/home-content" element={<AdminLayout><AdminHomeContent /></AdminLayout>} />
                  <Route path="/admin/about" element={<AdminLayout><AdminAboutPage /></AdminLayout>} />
                  <Route path="/admin/amenities" element={<AdminLayout><AdminAmenityLibrary /></AdminLayout>} />
                  <Route path="/admin/translations" element={<AdminLayout><AdminTranslations /></AdminLayout>} />
                  <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />

                  {/* Auto Importer Routes */}
                  <Route path="/admin/importer" element={<AdminLayout><ImporterDashboard /></AdminLayout>} />
                  <Route path="/admin/importer/scan" element={<AdminLayout><ImporterScan /></AdminLayout>} />
                  <Route path="/admin/importer/queue" element={<AdminLayout><ImporterQueue /></AdminLayout>} />
                  <Route path="/admin/importer/settings" element={<AdminLayout><ImporterSettings /></AdminLayout>} />
                  <Route path="/admin/importer/approval" element={<AdminLayout><ImporterApproval /></AdminLayout>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <WhatsAppButton />
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </Suspense>
    </I18nextProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
