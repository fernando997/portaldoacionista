import {
  Home, Bike, FileText, BarChart3, ShieldCheck, LogOut,
  Map, ScrollText, FileSignature, ArrowLeftCircle, ChevronRight,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { title: 'Visão Geral', url: '/', icon: Home, end: true },
    ],
  },
  {
    label: 'Operação',
    items: [
      { title: 'Minha Frota', url: '/frota', icon: Bike },
      { title: 'Mapa da Frota', url: '/mapa', icon: Map },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { title: 'Extrato', url: '/extrato', icon: ScrollText },
      { title: 'Contratos', url: '/contratos', icon: FileSignature },
      { title: 'Financeiro', url: '/financeiro', icon: BarChart3 },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Documentos', url: '/documentos', icon: FileText },
      { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
      { title: 'Segurança', url: '/seguranca', icon: ShieldCheck },
    ],
  },
];

function NavItem({ title, url, icon: Icon, end = false }: { title: string; url: string; icon: any; end?: boolean }) {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isActive = end ? pathname === url : pathname.startsWith(url);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={title}>
        <Link
          to={url}
          className={cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
            isActive
              ? 'bg-[hsl(135,55%,42%)]/[0.18] text-white'
              : 'text-[hsl(210,25%,55%)] hover:text-white/90 hover:bg-white/[0.06]',
          )}
          style={{ fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 500 }}
        >
          {/* Active left bar */}
          {isActive && (
            <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-gradient-to-b from-[hsl(135,60%,55%)] to-[hsl(135,55%,40%)] rounded-r-full shadow-[0_0_8px_hsl(135,55%,48%)]" />
          )}

          <Icon className={cn(
            'shrink-0 transition-colors duration-200',
            isActive ? 'w-[17px] h-[17px] text-[hsl(135,60%,58%)]' : 'w-[17px] h-[17px] text-current',
          )} />

          {!collapsed && (
            <span className="flex-1 truncate">{title}</span>
          )}

          {/* Active chevron */}
          {!collapsed && isActive && (
            <ChevronRight className="w-3 h-3 text-[hsl(135,55%,48%)]/60 shrink-0" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function ShareholderSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout, currentShareholder, isImpersonating, returnToAdmin } = useAuth();
  const navigate = useNavigate();

  const initials = currentShareholder.name
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="overflow-x-hidden" style={{
        background: 'linear-gradient(180deg, hsl(222,65%,10%) 0%, hsl(220,62%,8%) 50%, hsl(220,60%,6%) 100%)',
      }}>

        {/* Ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, hsl(135,55%,42%,0.12) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className={cn(
          'relative flex items-center shrink-0',
          collapsed ? 'justify-center px-2 py-4' : 'px-5 py-4',
        )}>
          <img
            src={logo}
            alt="Modo Corre"
            className={cn('brightness-0 invert transition-all duration-300 object-contain', collapsed ? 'h-7 w-auto' : 'h-11 w-auto')}
          />
          {/* Bottom separator gradient */}
          <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
        </div>

        <SidebarGroup className="px-2 pt-3 pb-2 flex-1">
          <SidebarGroupContent>
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label} className={cn(gi > 0 && 'mt-5')}>
                {!collapsed && (
                  <p
                    className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.12em] text-white/25 select-none"
                    style={{ fontFamily: 'var(--font-body)', fontWeight: 700 }}
                  >
                    {group.label}
                  </p>
                )}
                {collapsed && gi > 0 && (
                  <div className="mx-3 my-2.5 border-t border-white/[0.08]" />
                )}
                <SidebarMenu className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem key={item.url} {...item} />
                  ))}
                </SidebarMenu>
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl gap-2 text-xs font-medium"
            style={{ fontFamily: 'var(--font-body)' }}
            onClick={() => { returnToAdmin(); navigate('/admin'); }}
          >
            <ArrowLeftCircle className="h-4 w-4 shrink-0" />
            {!collapsed && 'Voltar para admin'}
          </Button>
        </div>
      )}

      {/* Footer */}
      <SidebarFooter
        className="border-t border-white/[0.07] p-3"
        style={{ background: 'hsl(220,60%,6%)' }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors duration-200 mb-1 group">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(135,55%,45%)] to-[hsl(135,65%,30%)] flex items-center justify-center shadow-lg shadow-[hsl(135,55%,42%)]/20">
                <span className="text-[12px] font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>{initials}</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[hsl(135,60%,50%)] border-2 border-[hsl(220,60%,6%)] rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/90 truncate leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
                {currentShareholder.name}
              </p>
              <p className="text-[11px] text-white/35 truncate mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                {currentShareholder.group}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-1">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(135,55%,45%)] to-[hsl(135,65%,30%)] flex items-center justify-center shadow-lg shadow-[hsl(135,55%,42%)]/20">
              <span className="text-[12px] font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>{initials}</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[hsl(135,60%,50%)] border-2 border-[hsl(220,60%,6%)] rounded-full" />
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl gap-2.5 transition-all duration-200"
          style={{ fontFamily: 'var(--font-body)' }}
          onClick={logout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Sair da conta</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
