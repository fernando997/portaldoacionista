import { ShieldCheck, Clock, Key, AlertTriangle, Globe, Monitor } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Conta</p>
        <h1 className="section-title">Segurança</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="stat-label">Sessão Ativa</p>
              <p className="text-lg font-bold text-foreground mt-0.5">Autenticado</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50">
              <Key className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="stat-label">Token</p>
              <p className="text-lg font-bold text-foreground mt-0.5">Válido</p>
              <p className="text-xs text-muted-foreground mt-0.5">Expira em 24h</p>
            </div>
          </div>
        </div>

        <div className="stat-card border-warning/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="stat-label">Aviso</p>
              <p className="text-lg font-bold text-foreground mt-0.5">Sessão expira em breve</p>
              <p className="text-xs text-muted-foreground mt-0.5">Renove seu acesso</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-6 space-y-5 animate-fade-in" style={{ animationDelay: '0.15s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Informações da Sessão</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          {[
            { label: 'IP de acesso', value: '192.168.1.***', icon: Globe },
            { label: 'Navegador', value: 'Chrome 120', icon: Monitor },
            { label: 'Último login', value: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, icon: Clock },
            { label: 'Tipo de acesso', value: 'Acionista', icon: ShieldCheck },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3.5 border-b last:border-0">
              <div className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4 text-muted-foreground/60" />
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground/60 text-center">
        Dados simulados · Nenhuma lógica real de segurança nesta versão
      </p>
    </div>
  );
}
