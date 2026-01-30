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
import OffPlan from "./pages/OffPlan";
import Ready from "./pages/Ready";
import PropertyDetail from "./pages/PropertyDetail";
import NotFound from "./pages/NotFound";
import WhatsAppButton from "@/components/layout/WhatsAppButton";

// Admin imports
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProperties from "./pages/admin/AdminProperties";
import AdminInquiries from "./pages/admin/AdminInquiries";
import AdminTranslations from "./pages/admin/AdminTranslations";
import AdminSettings from "./pages/admin/AdminSettings";

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
                <Route path="/off-plan" element={<OffPlan />} />
                <Route path="/ready" element={<Ready />} />
                <Route path="/property/:slug" element={<PropertyDetail />} />
                <Route path="/insights" element={<InsightsPage />} />
                
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                <Route path="/admin/properties" element={<AdminLayout><AdminProperties /></AdminLayout>} />
                <Route path="/admin/inquiries" element={<AdminLayout><AdminInquiries /></AdminLayout>} />
                <Route path="/admin/translations" element={<AdminLayout><AdminTranslations /></AdminLayout>} />
                <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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