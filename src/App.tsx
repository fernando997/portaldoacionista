import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import LoginPage from "./pages/LoginPage";
import PortalLayout from "./components/PortalLayout";
import ShareholderHome from "./pages/ShareholderHome";
import FleetPage from "./pages/FleetPage";
import MapPage from "./pages/MapPage";
import ExtratoPage from "./pages/ExtratoPage";
import ContratosPage from "./pages/ContratosPage";
import DocumentsPage from "./pages/DocumentsPage";
import FinancialPage from "./pages/FinancialPage";
import ReportsPage from "./pages/ReportsPage";
import SecurityPage from "./pages/SecurityPage";
import AdminListPage from "./pages/AdminListPage";
import AdminRegisterPage from "./pages/AdminRegisterPage";
import AdminRegisterViewerPage from "./pages/AdminRegisterViewerPage";
import AdminOnboardingPage from "./pages/AdminOnboardingPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Public onboarding route (no auth needed)
  const path = window.location.pathname;
  if (path === '/onboarding') {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Routes>
    );
  }

  if (!role) return <LoginPage />;

  if (role === 'admin') {
    return (
      <PortalLayout type="admin">
        <Routes>
          <Route path="/admin" element={<AdminListPage />} />
          <Route path="/admin/cadastrar" element={<AdminRegisterPage />} />
          <Route path="/admin/cadastrar-admin" element={<AdminRegisterViewerPage />} />
          <Route path="/admin/onboarding" element={<AdminOnboardingPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </PortalLayout>
    );
  }

  if (role === 'viewer') {
    return (
      <PortalLayout type="admin">
        <Routes>
          <Route path="/admin" element={<AdminListPage />} />
          <Route path="/admin/onboarding" element={<AdminOnboardingPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout type="shareholder">
      <Routes>
        <Route path="/" element={<ShareholderHome />} />
        <Route path="/frota" element={<FleetPage />} />
        <Route path="/mapa" element={<MapPage />} />
        <Route path="/documentos" element={<DocumentsPage />} />
        <Route path="/extrato" element={<ExtratoPage />} />
        <Route path="/contratos" element={<ContratosPage />} />
        <Route path="/financeiro" element={<FinancialPage />} />
        <Route path="/relatorios" element={<ReportsPage />} />
        <Route path="/seguranca" element={<SecurityPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PortalLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
