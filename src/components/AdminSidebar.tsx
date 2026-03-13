import { Users, UserPlus, LogOut, Shield, Link2, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

const adminItems = [
  { title: 'Acionistas',  url: '/admin',             icon: Users,    end: true },
  { title: 'Cadastrar',   url: '/admin/cadastrar',    icon: UserPlus, end: true },
  { title: 'Onboarding',  url: '/admin/onboarding',   icon: Link2,    end: true },
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
              ? 'bg-[hsl(210,80%,52%)]/[0.18] text-white'
              : 'text-[hsl(210,25%,55%)] hover:text-white/90 hover:bg-white/[0.06]',
          )}
          style={{ fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 500 }}
        >
          {/* Active left bar */}
          {isActive && (
            <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-gradient-to-b from-[hsl(210,80%,65%)] to-[hsl(210,80%,45%)] rounded-r-full shadow-[0_0_8px_hsl(210,80%,55%)]" />
          )}

          <Icon className={cn(
            'shrink-0 transition-colors duration-200',
            isActive ? 'w-[17px] h-[17px] text-[hsl(210,80%,68%)]' : 'w-[17px] h-[17px] text-current',
          )} />

          {!collapsed && (
            <span className="flex-1 truncate">{title}</span>
          )}

          {!collapsed && isActive && (
            <ChevronRight className="w-3 h-3 text-[hsl(210,80%,60%)]/60 shrink-0" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="overflow-x-hidden" style={{
        background: 'linear-gradient(180deg, hsl(222,65%,10%) 0%, hsl(220,62%,8%) 50%, hsl(220,60%,6%) 100%)',
      }}>

        {/* Ambient glow — blue for admin */}
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, hsl(210,80%,52%,0.1) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className={cn(
          'relative flex items-center justify-center shrink-0',
          collapsed ? 'px-2 py-4' : 'px-5 py-5',
        )}>
          <img
            src={logo}
            alt="Modo Corre"
            className={cn('brightness-0 invert transition-all duration-300 object-contain mx-auto', collapsed ? 'h-14 w-auto' : 'h-24 w-auto')}
          />
          <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
        </div>

        {/* Admin badge */}
        {!collapsed && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-[hsl(210,80%,52%)]/[0.12] border border-[hsl(210,80%,52%)]/[0.2] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[hsl(210,80%,60%)]" />
            <Shield className="w-3 h-3 text-[hsl(210,80%,65%)] shrink-0" />
            <span
              className="text-[10px] uppercase tracking-[0.1em] text-[hsl(210,80%,65%)]"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 700 }}
            >
              Painel Admin
            </span>
          </div>
        )}

        <SidebarGroup className="px-2 pt-3 pb-2 flex-1">
          {!collapsed && (
            <p
              className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.12em] text-white/25 select-none"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 700 }}
            >
              Navegação
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {adminItems.map((item) => (
                <NavItem key={item.url} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter
        className="border-t border-white/[0.07] p-3"
        style={{ background: 'hsl(220,60%,6%)' }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors duration-200 mb-1">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(220,60%,28%)] to-[hsl(220,60%,18%)] border border-white/[0.12] flex items-center justify-center shadow-md">
                <span className="text-[12px] font-bold text-white/90" style={{ fontFamily: 'var(--font-body)' }}>A</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[hsl(210,80%,60%)] border-2 border-[hsl(220,60%,6%)] rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/90 leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
                Administrador
              </p>
              <p className="text-[11px] text-white/35 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                Acesso total
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-1">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(220,60%,28%)] to-[hsl(220,60%,18%)] border border-white/[0.12] flex items-center justify-center">
              <span className="text-[12px] font-bold text-white/90" style={{ fontFamily: 'var(--font-body)' }}>A</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[hsl(210,80%,60%)] border-2 border-[hsl(220,60%,6%)] rounded-full" />
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
