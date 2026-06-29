import { Users, UserPlus, LogOut, Shield, ShieldCheck, ChevronRight, Eye, FolderOpen, Headphones, Wrench, TrendingUp, Users2, MessageCircle, ClipboardList, Code2, Package, DollarSign, Truck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

type RoleConfig = {
  label: string;
  abbr: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
};

const roleConfig: Record<NonNullable<UserRole>, RoleConfig> = {
  superadmin: { label: 'Super Admin',  abbr: 'S',  desc: 'Acesso máximo',      icon: ShieldCheck },
  admin:      { label: 'Admin',        abbr: 'A',  desc: 'Acesso total',        icon: Shield      },
  viewer:     { label: 'Visualizador', abbr: 'V',  desc: 'Somente leitura',     icon: Eye         },
  vendedor:   { label: 'Vendedor',     abbr: 'Ve', desc: 'Equipe de vendas',    icon: TrendingUp  },
  sac:        { label: 'SAC',          abbr: 'SC', desc: 'Atendimento',         icon: Headphones  },
  suporte:    { label: 'Suporte',      abbr: 'Su', desc: 'Suporte técnico',     icon: Wrench      },
  shareholder:{ label: 'Acionista',    abbr: 'Ac', desc: '',                    icon: Users       },
};

type NavItemDef = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  roles: string[];
};

type NavSection = {
  label: string;
  items: NavItemDef[];
};

const navSections: NavSection[] = [
  {
    label: 'Admin',
    items: [
      { title: 'Equipe Interna',    url: '/admin/equipe',                  icon: Users2,      end: true, roles: ['superadmin', 'admin'] },
      { title: 'Novo Acionista',    url: '/admin/cadastrar',               icon: UserPlus,    end: true, roles: ['superadmin', 'admin'] },
      { title: 'Novo Visualizador', url: '/admin/cadastrar-visualizador',  icon: Eye,         end: true, roles: ['superadmin', 'admin'] },
      { title: 'Novo Membro',       url: '/admin/cadastrar-admin',         icon: ShieldCheck, end: true, roles: ['superadmin'] },
    ],
  },
  {
    label: 'Vendas',
    items: [
      { title: 'Acionistas',  url: '/admin',             icon: Users,         end: true, roles: ['superadmin', 'admin', 'vendedor', 'viewer', 'sac'] },
      // { title: 'Documentos',  url: '/admin/documentos',  icon: FolderOpen,    end: true, roles: ['superadmin', 'admin', 'vendedor', 'viewer', 'sac', 'suporte'] },
      { title: 'Pedidos',     url: '/admin/pedidos',     icon: ClipboardList, end: true, roles: ['superadmin', 'admin', 'vendedor'] },
    ],
  },
  {
    label: 'Onboarding',
    items: [
      { title: 'Onboarding', url: '/admin/onboarding', icon: Package, end: true, roles: ['superadmin', 'admin', 'vendedor', 'sac'] },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { title: 'Cobranças', url: '/admin/financeiro', icon: DollarSign, end: true, roles: ['superadmin', 'admin', 'vendedor'] },
      { title: 'Veículos Recebidos', url: '/admin/veiculos', icon: Truck, end: true, roles: ['superadmin', 'admin', 'sac', 'suporte'] },
    ],
  },
  {
    label: 'Atendimento',
    items: [
      { title: 'SAC', url: '/admin/sac', icon: MessageCircle, end: true, roles: ['superadmin', 'admin', 'sac', 'suporte'] },
    ],
  },
  {
    label: 'Desenvolvedor',
    items: [
      { title: 'API Explorer', url: '/admin/api', icon: Code2, end: true, roles: ['superadmin', 'admin'] },
    ],
  },
];

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
              ? 'bg-[hsl(210,80%,52%)]/[0.18] text-white'
              : 'text-[hsl(210,25%,55%)] hover:text-white/90 hover:bg-white/[0.06]',
          )}
          style={{ fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 500 }}
        >
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

          {!collapsed && badge > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[hsl(210,80%,52%)] text-white text-[10px] font-bold shrink-0">
              {badge > 9 ? '9+' : badge}
            </span>
          )}

          {!collapsed && isActive && badge === 0 && (
            <ChevronRight className="w-3 h-3 text-[hsl(210,80%,60%)]/60 shrink-0" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="mx-auto my-1.5 w-5 h-px bg-white/10 rounded-full" />;
  }
  return (
    <p
      className="px-3 mb-1 mt-3 first:mt-0 text-[10px] uppercase tracking-[0.12em] text-white/25 select-none"
      style={{ fontFamily: 'var(--font-body)', fontWeight: 700 }}
    >
      {label}
    </p>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout, role } = useAuth();
  const cfg = role ? roleConfig[role] : roleConfig['admin'];
  const RoleIcon = cfg.icon;
  const [openTickets, setOpenTickets] = useState(0);
  const [pendingOnboardings, setPendingOnboardings] = useState(0);

  // Filter sections by role, removing empty sections
  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => role && item.roles.includes(role)),
    }))
    .filter(section => section.items.length > 0);

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from('sac_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aberto');
      setOpenTickets(count ?? 0);
    };
    load();

    const channel = supabase
      .channel('admin-sac-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sac_tickets' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const load = async () => {
      const { count } = await (supabase as any)
        .from('onboarding_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');
      setPendingOnboardings(count ?? 0);
    };
    load();
    const channel = supabase
      .channel('admin-onboarding-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'onboarding_requests' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="overflow-x-hidden" style={{
        background: 'linear-gradient(180deg, hsl(222,65%,10%) 0%, hsl(220,62%,8%) 50%, hsl(220,60%,6%) 100%)',
      }}>

        {/* Ambient glow */}
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
            <RoleIcon className="w-3 h-3 text-[hsl(210,80%,65%)] shrink-0" />
            <span
              className="text-[10px] uppercase tracking-[0.1em] text-[hsl(210,80%,65%)]"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 700 }}
            >
              {cfg.label}
            </span>
          </div>
        )}

        {/* Navigation sections */}
        <SidebarGroup className="px-2 pt-2 pb-2 flex-1">
          <SidebarGroupContent>
            {visibleSections.map((section) => (
              <div key={section.label}>
                <SectionLabel label={section.label} collapsed={collapsed} />
                <SidebarMenu className="space-y-0.5">
                  {section.items.map(({ roles: _, ...item }) => (
                    <NavItem
                      key={item.url}
                      {...item}
                      badge={item.url === '/admin/sac' ? openTickets : item.url === '/admin/onboarding' ? pendingOnboardings : 0}
                    />
                  ))}
                </SidebarMenu>
              </div>
            ))}
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
                <span className="text-[11px] font-bold text-white/90" style={{ fontFamily: 'var(--font-body)' }}>{cfg.abbr}</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[hsl(210,80%,60%)] border-2 border-[hsl(220,60%,6%)] rounded-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/90 leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
                {cfg.label}
              </p>
              <p className="text-[11px] text-white/35 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                {cfg.desc}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-1">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(220,60%,28%)] to-[hsl(220,60%,18%)] border border-white/[0.12] flex items-center justify-center">
              <span className="text-[11px] font-bold text-white/90" style={{ fontFamily: 'var(--font-body)' }}>{cfg.abbr}</span>
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
