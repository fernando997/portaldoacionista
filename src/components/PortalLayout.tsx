import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ShareholderSidebar } from '@/components/ShareholderSidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';
import logo from '@/assets/logo.png';

interface PortalLayoutProps {
  children: ReactNode;
  type: 'shareholder' | 'admin';
}

export default function PortalLayout({ children, type }: PortalLayoutProps) {
  const { currentShareholder } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {type === 'shareholder' ? <ShareholderSidebar /> : <AdminSidebar />}
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center border-b bg-card/80 backdrop-blur-sm px-6 gap-4 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex-1 flex items-center gap-3">
              <img src={logo} alt="Modo Corre" className="h-16 w-auto" />
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
              </button>
              {type === 'shareholder' && (
                <div className="flex items-center gap-3 pl-4 border-l">
                  <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center">
                    <span className="text-xs font-semibold text-accent-foreground">
                      {currentShareholder.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-foreground leading-tight">{currentShareholder.name}</p>
                    <p className="text-xs text-muted-foreground">{currentShareholder.group}</p>
                  </div>
                </div>
              )}
              {type === 'admin' && (
                <div className="flex items-center gap-3 pl-4 border-l">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">A</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground hidden sm:block">Administrador</span>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
