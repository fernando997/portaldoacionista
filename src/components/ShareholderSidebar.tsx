import {
  Home, Bike, FileText, BarChart3, UserCircle, LogOut,
  Map, ScrollText, FileSignature, ArrowLeftCircle, ChevronRight, MessageCircle, Receipt,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { marca, classeLogo, grupoVisivel, abaVisivel } from '@/lib/marca';

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
      { title: 'Fechamentos', url: '/fechamentos', icon: Receipt },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Documentos', url: '/documentos', icon: FileText },
      { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
      { title: 'Minha Conta', url: '/seguranca', icon: UserCircle },
      { title: 'SAC', url: '/sac', icon: MessageCircle },
    ],
  },
].map((g) => ({ ...g, items: g.items.filter((i) => abaVisivel(i.url)) }));

function NavItem({ title, url, icon: Icon, end = false, badge = 0 }: { title: string; url: string; icon: any; end?: boolean; badge?: number }) {
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
              ? 'bg-[hsl(var(--marca)/0.18)] text-white'
              : 'text-[hsl(var(--marca-texto-menu))] hover:text-white/90 hover:bg-white/[0.06]',
          )}
          style={{ fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 500 }}
        >
          {/* Active left bar */}
          {isActive && (
            <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-gradient-to-b from-[hsl(var(--marca-claro))] to-[hsl(var(--marca-escuro))] rounded-r-full shadow-[0_0_8px_hsl(var(--marca-medio))]" />
          )}

          <Icon className={cn(
            'shrink-0 transition-colors duration-200',
            isActive ? 'w-[17px] h-[17px] text-[hsl(var(--marca-claro))]' : 'w-[17px] h-[17px] text-current',
          )} />

          {!collapsed && (
            <span className="flex-1 truncate">{title}</span>
          )}

          {!collapsed && badge > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[hsl(var(--marca))] text-white text-[10px] font-bold shrink-0">
              {badge > 9 ? '9+' : badge}
            </span>
          )}

          {/* Active chevron */}
          {!collapsed && isActive && badge === 0 && (
            <ChevronRight className="w-3 h-3 text-[hsl(var(--marca-medio)/0.6)] shrink-0" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function ShareholderSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout, currentShareholder, user, isImpersonating, returnToAdmin } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count ?? 0);
    };
    load();

    const channel = supabase
      .channel('sidebar-notif-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const initials = currentShareholder.name
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="overflow-x-hidden" style={{
        background: 'linear-gradient(180deg, hsl(var(--marca-fundo-1)) 0%, hsl(var(--marca-fundo-2)) 50%, hsl(var(--marca-fundo-3)) 100%)',
      }}>

        {/* Ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, hsl(var(--marca) / 0.12) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className={cn(
          'relative flex items-center justify-center shrink-0',
          collapsed ? 'px-2 py-4' : 'px-5 py-5',
        )}>
          <img
            src={collapsed ? marca.simbolo.src : marca.logoFundoEscuro.src}
            alt={marca.nome}
            className={cn(
              'transition-all duration-300 object-contain mx-auto',
              collapsed ? [classeLogo(marca.simbolo), marca.tamanhoLogo.recolhido] : [classeLogo(marca.logoFundoEscuro), marca.tamanhoLogo.menu, 'w-auto'],
            )}
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
                    <NavItem key={item.url} {...item} badge={item.url === '/sac' ? unreadCount : 0} />
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
        style={{ background: 'hsl(var(--marca-fundo-3))' }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors duration-200 mb-1 group">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--marca-medio))] to-[hsl(var(--marca-escuro))] flex items-center justify-center shadow-lg shadow-[hsl(var(--marca)/0.2)]">
                <span className="text-[12px] font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>{initials}</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[hsl(var(--marca-medio))] border-2 border-[hsl(var(--marca-fundo-3))] rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/90 truncate leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
                {currentShareholder.name}
              </p>
              <p className="text-[11px] text-white/35 truncate mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                {grupoVisivel(currentShareholder.group)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-1">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--marca-medio))] to-[hsl(var(--marca-escuro))] flex items-center justify-center shadow-lg shadow-[hsl(var(--marca)/0.2)]">
              <span className="text-[12px] font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>{initials}</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[hsl(var(--marca-medio))] border-2 border-[hsl(var(--marca-fundo-3))] rounded-full" />
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
