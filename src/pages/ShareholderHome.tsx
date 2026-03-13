import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp, Bike, DollarSign, PieChart, Target,
  ArrowUpRight, Wrench, Receipt, CalendarDays,
  FileText, Map, BarChart3, FolderOpen, ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const currentMonthLabel = () => {
  const now = new Date();
  return now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
};

const fmt = (v: any) =>
  v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null;

function KpiCard({
  label, value, icon: Icon, highlight, sub,
}: {
  label: string; value: string | null; icon: any; highlight?: 'accent' | 'warning' | 'default'; sub?: string;
}) {
  const loading = value === null;
  const iconBg =
    highlight === 'accent' ? 'bg-accent/10 text-accent' :
    highlight === 'warning' ? 'bg-amber-50 text-amber-500' :
    'bg-muted text-muted-foreground';
  const valueCls =
    highlight === 'accent' ? 'text-accent' :
    highlight === 'warning' ? 'text-amber-600' :
    'text-foreground';

  return (
    <div className="stat-card group flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${iconBg} transition-transform group-hover:scale-105`}>
          <Icon className="h-4 w-4" />
        </div>
        {!loading && highlight === 'accent' && (
          <ArrowUpRight className="w-4 h-4 text-accent opacity-60" />
        )}
      </div>
      <div>
        <p className="stat-label mb-1">{label}</p>
        {loading ? (
          <Skeleton className="h-7 w-3/4 rounded-md" />
        ) : (
          <p className={`text-xl font-bold tracking-tight ${valueCls}`}>{value}</p>
        )}
        {sub && !loading && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressKpiCard({ label, value, total, icon: Icon }: { label: string; value: number | null; total: number | null; icon: any }) {
  const loading = value === null || total === null;
  const pct = !loading && total! > 0 ? Math.round((value! / total!) * 100) : 0;

  return (
    <div className="stat-card group flex flex-col gap-3 col-span-2 sm:col-span-1">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-muted text-muted-foreground transition-transform group-hover:scale-105">
          <Icon className="h-4 w-4" />
        </div>
        {!loading && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
            {pct}%
          </span>
        )}
      </div>
      <div>
        <p className="stat-label mb-1">{label}</p>
        {loading ? (
          <>
            <Skeleton className="h-7 w-1/2 rounded-md mb-2" />
            <Skeleton className="h-2 w-full rounded-full" />
          </>
        ) : (
          <>
            <p className="text-xl font-bold tracking-tight text-foreground">
              {value} <span className="text-sm font-normal text-muted-foreground">/ {total} motos</span>
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, sub }: { to: string; icon: any; label: string; sub: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-accent/40 hover:shadow-md transition-all group"
    >
      <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
    </Link>
  );
}

export default function ShareholderHome() {
  const { currentShareholder } = useAuth();
  const [poolData, setPoolData] = useState<any>(null);
  const [loadingPool, setLoadingPool] = useState(true);
  const [clientMotos, setClientMotos] = useState<number | null>(null);

  useEffect(() => {
    if (!currentShareholder.idGrupo) return;
    fetch('https://modocorreapp.com.br/api/1.1/wf/pool_financeiro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool: currentShareholder.idGrupo }),
    })
      .then(r => r.json())
      .then(d => setPoolData(d.response ?? d))
      .catch(err => console.error('Erro pool financeiro:', err))
      .finally(() => setLoadingPool(false));
  }, [currentShareholder.idGrupo]);

  useEffect(() => {
    if (!currentShareholder.idLocadora) return;
    fetch('https://modocorreapp.com.br/api/1.1/wf/pool_frota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locadora: currentShareholder.idLocadora }),
    })
      .then(r => r.json())
      .then(d => setClientMotos((d.response ?? d).total ?? null))
      .catch(err => console.error('Erro frota:', err));
  }, [currentShareholder.idLocadora]);

  const frotaTotal = poolData?.frota_total != null ? Number(poolData.frota_total) : null;
  const frotaLocada = poolData?.frota_locada != null ? Number(poolData.frota_locada) : null;
  const receitaBruta = poolData?.receita_bruta != null ? Number(poolData.receita_bruta) : null;
  const receitaFaturada = poolData?.receita_faturada != null ? Number(poolData.receita_faturada) : null;
  const despesas = poolData?.despesas != null ? Number(poolData.despesas) : null;
  const receitaTotal = receitaBruta != null && receitaFaturada != null ? receitaBruta + receitaFaturada : null;
  const participacao =
    clientMotos != null && frotaTotal != null && frotaTotal > 0
      ? `${((clientMotos / frotaTotal) * 100).toFixed(1)}%`
      : null;

  const fullName = currentShareholder.name;
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="page-container space-y-8">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(220,60%,18%)] to-[hsl(220,60%,10%)] px-6 py-8 text-white shadow-elevated animate-fade-in">
        {/* Glow */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, hsl(135,55%,42%), transparent 60%)' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          {/* Avatar + texto */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(135,55%,42%)] to-[hsl(135,65%,32%)] flex items-center justify-center shrink-0 shadow-lg">
              <span className="text-lg font-bold text-white">{initials}</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white/50">{greeting},</p>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {fullName}
              </h1>
              {currentShareholder.group && (
                <p className="text-xs text-white/40 font-medium">{currentShareholder.group}</p>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-medium text-white/50 bg-white/10 px-3 py-1.5 rounded-full">
              <CalendarDays className="w-3.5 h-3.5" />
              {currentMonthLabel()}
            </div>
            <p className="text-xs text-white/30">Portal do Acionista</p>
          </div>
        </div>
      </div>

      {/* Sua Participação */}
      <section className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <SectionHeader accent label="Sua Participação" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            label="Percentual na Frota"
            value={loadingPool ? null : (participacao ?? 'Indisponível')}
            icon={PieChart}
            highlight="accent"
            sub={clientMotos != null ? `${clientMotos} motos suas` : undefined}
          />
          <ProgressKpiCard
            label="Ocupação da Frota"
            value={loadingPool ? null : frotaLocada}
            total={loadingPool ? null : frotaTotal}
            icon={Target}
          />
        </div>
      </section>

      {/* Financeiro */}
      <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <SectionHeader label="Financeiro do Grupo" />
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 stat-card group flex flex-col gap-3 border-accent/20">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <DollarSign className="h-4 w-4" />
              </div>
              <span className="text-xs text-muted-foreground">Receita total prevista</span>
            </div>
            <div>
              <p className="stat-label mb-1">Receita Prevista Bruta</p>
              {loadingPool ? (
                <Skeleton className="h-9 w-2/3 rounded-md" />
              ) : (
                <p className="text-3xl font-bold text-accent tracking-tight">
                  {receitaTotal != null ? `R$ ${receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Indisponível'}
                </p>
              )}
              {!loadingPool && receitaBruta != null && receitaFaturada != null && (
                <div className="flex gap-4 mt-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Recebido</p>
                    <p className="text-sm font-semibold text-foreground">{fmt(receitaBruta)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Faturado</p>
                    <p className="text-sm font-semibold text-foreground">{fmt(receitaFaturada)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <KpiCard
            label="Despesas"
            value={loadingPool ? null : (despesas != null ? `R$ ${despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Indisponível')}
            icon={Receipt}
            highlight="warning"
          />
          <KpiCard
            label="OS Geradas"
            value={loadingPool ? null : (poolData?.os != null ? `${poolData.os}` : 'Indisponível')}
            icon={Wrench}
          />
        </div>
      </section>

      {/* Frota */}
      <section className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <SectionHeader label="Operação da Frota" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Frota Total"
            value={loadingPool ? null : (frotaTotal != null ? `${frotaTotal} motos` : 'Indisponível')}
            icon={Bike}
          />
          <KpiCard
            label="Motos Locadas"
            value={loadingPool ? null : (frotaLocada != null ? `${frotaLocada} motos` : 'Indisponível')}
            icon={Target}
            highlight="accent"
          />
          <KpiCard
            label="Taxa de Locação"
            value={loadingPool ? null : (frotaLocada != null && frotaTotal != null && frotaTotal > 0
              ? `${((frotaLocada / frotaTotal) * 100).toFixed(1)}%`
              : 'Indisponível')}
            icon={TrendingUp}
          />
        </div>
      </section>

      {/* Acesso Rápido */}
      <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <SectionHeader label="Acesso Rápido" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink to="/extrato" icon={BarChart3} label="Extrato" sub="Histórico de transações" />
          <QuickLink to="/frota" icon={Bike} label="Frota" sub="Veículos e status" />
          <QuickLink to="/mapa" icon={Map} label="Mapa" sub="Localização da frota" />
          <QuickLink to="/documentos" icon={FolderOpen} label="Documentos" sub="Contratos e arquivos" />
        </div>
      </section>

    </div>
  );
}

function SectionHeader({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-1 h-4 rounded-full ${accent ? 'gradient-accent' : 'gradient-primary'}`} />
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</h2>
    </div>
  );
}
