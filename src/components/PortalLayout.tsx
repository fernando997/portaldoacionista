import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ShareholderSidebar } from '@/components/ShareholderSidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useLocation } from 'react-router-dom';

interface PortalLayoutProps {
  children: ReactNode;
  type: 'shareholder' | 'admin';
}

const PAGE_TITLES: Record<string, string> = {
  '/':                  'Visão Geral',
  '/frota':             'Minha Frota',
  '/mapa':              'Mapa da Frota',
  '/extrato':           'Extrato',
  '/contratos':         'Contratos',
  '/financeiro':        'Financeiro',
  '/documentos':        'Documentos',
  '/relatorios':        'Relatórios',
  '/seguranca':         'Segurança',
  '/admin':             'Acionistas',
  '/admin/cadastrar':   'Cadastrar Acionista',
  '/admin/onboarding':  'Onboarding',
};

export default function PortalLayout({ children, type }: PortalLayoutProps) {
  const { currentShareholder } = useAuth();
  const { pathname } = useLocation();
  const pageTitle = PAGE_TITLES[pathname] ?? '';

  const initials = currentShareholder.name
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {type === 'shareholder' ? <ShareholderSidebar /> : <AdminSidebar />}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <header className="h-14 sm:h-16 flex items-center border-b bg-card/80 backdrop-blur-sm px-3 sm:px-5 gap-3 sticky top-0 z-30">
            <SidebarTrigger className="shrink-0" />

            {/* Logo — only on mobile (sidebar hides on mobile) */}
            <img src={logo} alt="Modo Corre" className="h-9 w-auto lg:hidden" />

            {/* Page title — desktop */}
            {pageTitle && (
              <h1 className="hidden lg:block text-sm font-semibold text-foreground tracking-tight">
                {pageTitle}
              </h1>
            )}

            <div className="flex-1" />

            {/* Notification */}
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />
            </button>

            {/* User */}
            <div className="flex items-center gap-2.5 pl-3 border-l">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${type === 'shareholder' ? 'gradient-accent' : 'gradient-primary'}`}>
                <span className="text-[11px] font-bold text-white">
                  {type === 'admin' ? 'A' : initials}
                </span>
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-medium text-foreground leading-none">
                  {type === 'admin' ? 'Administrador' : currentShareholder.name.split(' ')[0]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {type === 'admin' ? 'Acesso total' : currentShareholder.group}
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-background">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
