import { Home, Bike, FileText, DollarSign, BarChart3, ShieldCheck, LogOut, Sparkles } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

const shareholderItems = [
  { title: 'Visão Geral', url: '/', icon: Home },
  { title: 'Minha Frota', url: '/frota', icon: Bike },
  { title: 'Documentos', url: '/documentos', icon: FileText },
  // { title: 'Financeiro', url: '/financeiro', icon: DollarSign },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
  { title: 'Segurança', url: '/seguranca', icon: ShieldCheck },
];

export function ShareholderSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout, currentShareholder } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-gradient-to-b from-[hsl(220,60%,12%)] to-[hsl(220,60%,8%)]">
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <div className="flex items-center gap-3 px-2 py-4 mb-2">
                <img src={logo} alt="Modo Corre" className="h-14 w-auto brightness-0 invert" />
              </div>
            )}
            {collapsed && (
              <div className="flex justify-center py-3">
                <img src={logo} alt="Modo Corre" className="h-8 w-auto brightness-0 invert" />
              </div>
            )}
          </SidebarGroupLabel>

          {!collapsed && (
            <div className="mx-3 mb-4 px-3 py-2.5 rounded-xl bg-[hsl(135,55%,42%)]/10 border border-[hsl(135,55%,42%)]/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[hsl(135,55%,48%)]" />
                <span className="text-[11px] font-semibold text-[hsl(135,55%,48%)] uppercase tracking-wider">Portal Acionista</span>
              </div>
            </div>
          )}

          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {shareholderItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[hsl(210,30%,65%)] hover:text-[hsl(0,0%,95%)] hover:bg-[hsl(0,0%,100%)]/[0.06] transition-all duration-200"
                      activeClassName="bg-[hsl(135,55%,42%)]/15 text-[hsl(0,0%,98%)] border border-[hsl(135,55%,42%)]/20 shadow-[0_0_20px_hsl(135,55%,42%,0.08)]"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-[hsl(220,60%,8%)] border-t border-[hsl(0,0%,100%)]/[0.06] p-3">
        {!collapsed && (
          <div className="px-3 py-3 rounded-xl bg-[hsl(0,0%,100%)]/[0.05] border border-[hsl(0,0%,100%)]/[0.08] mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[hsl(135,55%,42%)] to-[hsl(135,65%,35%)] flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-[hsl(0,0%,100%)]">
                  {currentShareholder.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[hsl(0,0%,95%)] truncate">{currentShareholder.name}</p>
                <p className="text-[11px] text-[hsl(210,30%,55%)] mt-0.5">{currentShareholder.group}</p>
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-[hsl(210,30%,50%)] hover:text-[hsl(0,72%,60%)] hover:bg-[hsl(0,72%,51%)]/10 rounded-xl transition-all duration-200"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && 'Sair'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
