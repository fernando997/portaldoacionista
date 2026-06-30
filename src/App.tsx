import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, INTERNAL_ROLES } from "@/contexts/AuthContext";
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
import AdminRegisterAdminPage from "./pages/AdminRegisterAdminPage";
import AdminDocumentosPage from "./pages/AdminDocumentosPage";
import AdminEquipePage from "./pages/AdminEquipePage";
import AdminSacPage from "./pages/AdminSacPage";
import AdminPedidosPage from "./pages/AdminPedidosPage";
import AdminAcionistaPage from "./pages/AdminAcionistaPage";
import AdminSwaggerPage from "./pages/AdminSwaggerPage";
import AdminOnboardingPage from "./pages/AdminOnboardingPage";
import AdminFinanceiroPage from "./pages/AdminFinanceiroPage";
import AdminVeiculosRecebidosPage from "./pages/AdminVeiculosRecebidosPage";
import OnboardingPendingScreen from "./components/OnboardingPendingScreen";
import SacPage from "./pages/SacPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PermRoute({ permission, element }: { permission: string; element: React.ReactNode }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission as any) ? <>{element}</> : <Navigate to="/admin" replace />;
}

function AppRoutes() {
  const { role, loading, onboardingPending, hasPermission } = useAuth();

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

  // Unified routing for all internal roles
  if (role && INTERNAL_ROLES.includes(role)) {
    // Determine the default fallback page
    const fallbackRoutes = [
      { perm: 'acionistas', path: '/admin' },
      { perm: 'sac', path: '/admin/sac' },
      { perm: 'documentos', path: '/admin/documentos' },
      { perm: 'veiculos', path: '/admin/veiculos' },
    ] as const;
    const defaultPath = fallbackRoutes.find(r => hasPermission(r.perm))?.path ?? '/admin';

    return (
      <PortalLayout type="admin">
        <Routes>
          {hasPermission('acionistas') && <Route path="/admin" element={<AdminListPage />} />}
          {hasPermission('equipe') && <Route path="/admin/equipe" element={<AdminEquipePage />} />}
          {hasPermission('cadastrar') && <Route path="/admin/cadastrar" element={<AdminRegisterPage />} />}
          {hasPermission('cadastrar_visualizador') && <Route path="/admin/cadastrar-visualizador" element={<AdminRegisterViewerPage />} />}
          {hasPermission('cadastrar_admin') && <Route path="/admin/cadastrar-admin" element={<AdminRegisterAdminPage />} />}
          {hasPermission('documentos') && <Route path="/admin/documentos" element={<AdminDocumentosPage />} />}
          {hasPermission('sac') && <Route path="/admin/sac" element={<AdminSacPage />} />}
          {hasPermission('pedidos') && <Route path="/admin/pedidos" element={<AdminPedidosPage />} />}
          {hasPermission('onboarding') && <Route path="/admin/onboarding" element={<AdminOnboardingPage />} />}
          {hasPermission('financeiro') && <Route path="/admin/financeiro" element={<AdminFinanceiroPage />} />}
          {hasPermission('veiculos') && <Route path="/admin/veiculos" element={<AdminVeiculosRecebidosPage />} />}
          {hasPermission('acionista_detalhe') && <Route path="/admin/acionista/:id" element={<AdminAcionistaPage />} />}
          {hasPermission('api') && <Route path="/admin/api" element={<AdminSwaggerPage />} />}
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      </PortalLayout>
    );
  }

  if (onboardingPending) {
    return (
      <Routes>
        <Route path="*" element={<OnboardingPendingScreen />} />
      </Routes>
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
        <Route path="/sac" element={<SacPage />} />
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
