import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import InsightsPage from "./pages/Insights";
import InsightDetail from "./pages/InsightDetail";
import OffPlan from "./pages/OffPlan";
import Ready from "./pages/Ready";
import PropertyDetail from "./pages/PropertyDetail";
import NotFound from "./pages/NotFound";
import WhatsAppButton from "@/components/layout/WhatsAppButton";

// New pages
import Buy from "./pages/Buy";
import Commercial from "./pages/Commercial";
import Sell from "./pages/Sell";
import Invest from "./pages/Invest";
import About from "./pages/About";
import BuyerGuide from "./pages/BuyerGuide";
import Careers from "./pages/Careers";

// Admin imports
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminInquiries from "./pages/admin/AdminInquiries";
import AdminTranslations from "./pages/admin/AdminTranslations";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminInsights from "./pages/admin/AdminInsights";
import InsightEditorPage from "./pages/admin/InsightEditorPage";
import AdminHomeContent from "./pages/admin/AdminHomeContent";
import PropertyWizardPage from "./pages/admin/PropertyWizardPage";
import AdminAmenityLibrary from "./pages/admin/AdminAmenityLibrary";
import AdminBulkImport from "./pages/admin/AdminBulkImport";
import AdminAboutPage from "./pages/admin/AdminAboutPage";
import ImporterDashboard from "./pages/admin/importer/ImporterDashboard";
import ImporterScan from "./pages/admin/importer/ImporterScan";
import ImporterQueue from "./pages/admin/importer/ImporterQueue";
import ImporterSettings from "./pages/admin/importer/ImporterSettings";
import AdminCommunications from "./pages/admin/AdminCommunications";
import AdminEmailSettings from "./pages/admin/AdminEmailSettings";
import AdminEmailPage from "./pages/admin/AdminEmailPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/buy" element={<Buy />} />
                <Route path="/buy/guide" element={<BuyerGuide />} />
                <Route path="/off-plan" element={<OffPlan />} />
                <Route path="/ready" element={<Ready />} />
                <Route path="/commercial" element={<Commercial />} />
                <Route path="/sell" element={<Sell />} />
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
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              <WhatsAppButton />
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </Suspense>
    </I18nextProvider>
  </QueryClientProvider>
);

export default App;
