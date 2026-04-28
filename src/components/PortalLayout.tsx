import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ShareholderSidebar } from '@/components/ShareholderSidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Home, Bike, Map, ScrollText, FileSignature, BarChart3, FileText, ShieldCheck, Users, UserPlus, Link2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useLocation } from 'react-router-dom';
import SacButton from '@/components/SacButton';

interface PortalLayoutProps {
  children: ReactNode;
  type: 'shareholder' | 'admin';
}

const PAGE_META: Record<string, { title: string; icon: any }> = {
  '/':                  { title: 'Visão Geral',        icon: Home },
  '/frota':             { title: 'Minha Frota',         icon: Bike },
  '/mapa':              { title: 'Mapa da Frota',       icon: Map },
  '/extrato':           { title: 'Extrato',             icon: ScrollText },
  '/contratos':         { title: 'Contratos',           icon: FileSignature },
  '/financeiro':        { title: 'Financeiro',          icon: BarChart3 },
  '/documentos':        { title: 'Documentos',          icon: FileText },
  '/relatorios':        { title: 'Relatórios',          icon: BarChart3 },
  '/seguranca':         { title: 'Segurança',           icon: ShieldCheck },
  '/admin':             { title: 'Acionistas',          icon: Users },
  '/admin/cadastrar':   { title: 'Cadastrar Acionista', icon: UserPlus },
  '/admin/onboarding':  { title: 'Onboarding',          icon: Link2 },
};

export default function PortalLayout({ children, type }: PortalLayoutProps) {
  const { currentShareholder } = useAuth();
  const { pathname } = useLocation();
  const pageMeta = PAGE_META[pathname];
  const PageIcon = pageMeta?.icon;

  const initials = currentShareholder.name
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const accentColor = type === 'shareholder'
    ? 'hsl(135,55%,42%)'
    : 'hsl(210,80%,52%)';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {type === 'shareholder' ? <ShareholderSidebar /> : <AdminSidebar />}

        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Top bar ───────────────────────────────────────── */}
          <header className="h-14 sm:h-16 flex items-center bg-card/90 backdrop-blur-md px-3 sm:px-5 gap-3 sticky top-0 z-30"
            style={{ borderBottom: '1px solid hsl(var(--border) / 0.6)', boxShadow: '0 1px 0 0 hsl(var(--border) / 0.4)' }}
          >
            <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" />

            {/* Mobile logo */}
            <img src={logo} alt="Modo Corre" className="h-8 w-auto lg:hidden object-contain" />

            {/* Separator — desktop only */}
            <div className="hidden lg:block w-px h-5 bg-border/60 shrink-0" />

            {/* Page title with icon — desktop */}
            {pageMeta && (
              <div className="hidden lg:flex items-center gap-2">
                {PageIcon && (
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${accentColor}18` }}
                  >
                    <PageIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  </div>
                )}
                <span
                  className="text-sm text-foreground"
                  style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}
                >
                  {pageMeta.title}
                </span>
              </div>
            )}

            <div className="flex-1" />

            {/* Notification bell */}
            <button
              aria-label="Notificações"
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
            >
              <Bell className="w-4 h-4" />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-card"
                style={{ background: accentColor }}
              />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-border/60 shrink-0" />

            {/* User section */}
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={
                    type === 'shareholder'
                      ? { background: 'linear-gradient(135deg, hsl(135,55%,42%), hsl(135,65%,32%))' }
                      : { background: 'linear-gradient(135deg, hsl(220,60%,28%), hsl(220,60%,18%))' }
                  }
                >
                  <span
                    className="text-[11px] text-white"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 700 }}
                  >
                    {type === 'admin' ? 'A' : initials}
                  </span>
                </div>
                {/* Online dot */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card"
                  style={{ background: accentColor }}
                />
              </div>

              {/* Name + role */}
              <div className="hidden sm:block leading-tight">
                <p
                  className="text-sm text-foreground leading-none"
                  style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}
                >
                  {type === 'admin' ? 'Administrador' : currentShareholder.name}
                </p>
                <p
                  className="text-[11px] text-muted-foreground mt-0.5"
                  style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}
                >
                  {type === 'admin' ? 'Acesso total' : currentShareholder.group}
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-background">{children}</main>
        </div>
      </div>

      <SacButton />
    </SidebarProvider>
  );
}
