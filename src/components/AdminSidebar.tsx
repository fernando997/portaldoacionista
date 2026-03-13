import { Users, UserPlus, LogOut, Shield, Link2 } from 'lucide-react';
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
            'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
            isActive
              ? 'bg-[hsl(210,80%,52%)]/15 text-white'
              : 'text-[hsl(210,30%,60%)] hover:text-white hover:bg-white/[0.06]',
          )}
        >
          {isActive && (
            <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[hsl(210,80%,60%)] rounded-r-full" />
          )}
          <Icon className={cn('h-[17px] w-[17px] shrink-0', isActive && 'text-[hsl(210,80%,65%)]')} />
          {!collapsed && <span>{title}</span>}
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
      <SidebarContent className="bg-gradient-to-b from-[hsl(220,60%,12%)] to-[hsl(220,60%,8%)] overflow-x-hidden">

        {/* Logo */}
        <div className={cn('flex items-center border-b border-white/[0.06]', collapsed ? 'justify-center px-2 py-3' : 'px-5 py-4')}>
          <img
            src={logo}
            alt="Modo Corre"
            className={cn('brightness-0 invert transition-all duration-200', collapsed ? 'h-7 w-auto' : 'h-12 w-auto')}
          />
        </div>

        {/* Admin badge */}
        {!collapsed && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-[hsl(210,80%,52%)]/10 border border-[hsl(210,80%,52%)]/20 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[hsl(210,80%,60%)] shrink-0" />
            <span className="text-[11px] font-semibold text-[hsl(210,80%,60%)] uppercase tracking-wider">Painel Admin</span>
          </div>
        )}

        <SidebarGroup className="px-2 pt-3 pb-2">
          {!collapsed && (
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/20 select-none">
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

      <SidebarFooter className="bg-[hsl(220,60%,8%)] border-t border-white/[0.06] p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.05] transition-colors mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(220,60%,25%)] to-[hsl(220,60%,18%)] border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white/90">A</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white/90 leading-tight">Administrador</p>
              <p className="text-[11px] text-white/35 mt-0.5">Acesso total</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(220,60%,25%)] to-[hsl(220,60%,18%)] border border-white/10 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white/90">A</span>
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
