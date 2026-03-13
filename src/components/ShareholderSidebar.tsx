import {
  Home, Bike, FileText, BarChart3, ShieldCheck, LogOut,
  Map, ScrollText, FileSignature, ArrowLeftCircle,
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
            'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
            isActive
              ? 'bg-[hsl(135,55%,42%)]/15 text-white'
              : 'text-[hsl(210,30%,60%)] hover:text-white hover:bg-white/[0.06]',
          )}
        >
          {isActive && (
            <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[hsl(135,55%,48%)] rounded-r-full" />
          )}
          <Icon className={cn('h-[17px] w-[17px] shrink-0', isActive && 'text-[hsl(135,55%,55%)]')} />
          {!collapsed && <span>{title}</span>}
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
      <SidebarContent className="bg-gradient-to-b from-[hsl(220,60%,12%)] to-[hsl(220,60%,8%)] overflow-x-hidden">

        {/* Logo */}
        <div className={cn('flex items-center border-b border-white/[0.06]', collapsed ? 'justify-center px-2 py-3' : 'px-5 py-4')}>
          <img
            src={logo}
            alt="Modo Corre"
            className={cn('brightness-0 invert transition-all duration-200', collapsed ? 'h-7 w-auto' : 'h-12 w-auto')}
          />
        </div>

        <SidebarGroup className="px-2 pt-3 pb-2">
          <SidebarGroupContent>
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label} className={cn(gi > 0 && 'mt-4')}>
                {!collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/20 select-none">
                    {group.label}
                  </p>
                )}
                {collapsed && gi > 0 && (
                  <div className="mx-3 my-2 border-t border-white/[0.07]" />
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
            onClick={() => { returnToAdmin(); navigate('/admin'); }}
          >
            <ArrowLeftCircle className="h-4 w-4 shrink-0" />
            {!collapsed && 'Voltar para admin'}
          </Button>
        </div>
      )}

      {/* Footer */}
      <SidebarFooter className="bg-[hsl(220,60%,8%)] border-t border-white/[0.06] p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.05] transition-colors mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(135,55%,42%)] to-[hsl(135,65%,32%)] flex items-center justify-center shrink-0 shadow-md">
              <span className="text-[11px] font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white/90 truncate leading-tight">{currentShareholder.name}</p>
              <p className="text-[11px] text-white/35 truncate mt-0.5">{currentShareholder.group}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(135,55%,42%)] to-[hsl(135,65%,32%)] flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">{initials}</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl gap-2 transition-all duration-150"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
