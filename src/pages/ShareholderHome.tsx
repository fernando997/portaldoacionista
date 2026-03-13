import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp, Bike, DollarSign, PieChart, Target,
  ArrowUpRight, Wrench, Receipt, CalendarDays,
  FileText, Map, BarChart3, FolderOpen, ChevronRight,
  TrendingDown, Activity,
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

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, highlight, sub,
}: {
  label: string; value: string | null; icon: any;
  highlight?: 'accent' | 'warning' | 'default'; sub?: string;
}) {
  const loading = value === null;

  const iconStyle =
    highlight === 'accent'
      ? { background: 'linear-gradient(135deg, hsl(135,55%,42%), hsl(135,65%,32%))', color: '#fff' }
      : highlight === 'warning'
      ? { background: 'linear-gradient(135deg, hsl(38,92%,50%), hsl(38,85%,42%))', color: '#fff' }
      : undefined;

  const iconCls =
    highlight === 'accent' ? '' :
    highlight === 'warning' ? '' :
    'bg-muted text-muted-foreground';

  const valueCls =
    highlight === 'accent' ? 'text-accent' :
    highlight === 'warning' ? 'text-amber-600' :
    'text-foreground';

  return (
    <div className="group relative bg-card rounded-2xl border border-border/70 p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-border"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
    >
      {/* Accent top stripe */}
      {highlight === 'accent' && (
        <div className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full bg-gradient-to-r from-transparent via-accent to-transparent" />
      )}
      {highlight === 'warning' && (
        <div className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      )}

      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconCls}`}
          style={iconStyle}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {!loading && highlight === 'accent' && (
          <div className="flex items-center gap-1 text-xs font-semibold text-accent bg-accent/10 px-2 py-1 rounded-full"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <ArrowUpRight className="w-3 h-3" />
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-7 w-3/4 rounded-lg" />
        ) : (
          <p className={`text-xl font-bold tracking-tight tabular-nums ${valueCls}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {value}
          </p>
        )}
        {sub && !loading && (
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Progress KPI Card ─────────────────────────────────────────────────────────
function ProgressKpiCard({ label, value, total, icon: Icon }: {
  label: string; value: number | null; total: number | null; icon: any;
}) {
  const loading = value === null || total === null;
  const pct = !loading && total! > 0 ? Math.round((value! / total!) * 100) : 0;
  const isHigh = pct >= 80;

  return (
    <div className="group bg-card rounded-2xl border border-border/70 p-5 flex flex-col gap-4 col-span-2 sm:col-span-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 text-muted-foreground transition-transform duration-200 group-hover:scale-105">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {!loading && (
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full tabular-nums ${isHigh ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {pct}%
          </span>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {label}
        </p>
        {loading ? (
          <>
            <Skeleton className="h-7 w-1/2 rounded-lg mb-3" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </>
        ) : (
          <>
            <p className="text-xl font-bold tracking-tight text-foreground tabular-nums"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {value}{' '}
              <span className="text-sm font-normal text-muted-foreground">/ {total} motos</span>
            </p>
            {/* Progress bar */}
            <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: isHigh
                    ? 'linear-gradient(90deg, hsl(135,55%,42%), hsl(135,65%,52%))'
                    : 'linear-gradient(90deg, hsl(215,80%,55%), hsl(210,80%,65%))',
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5" style={{ fontFamily: 'var(--font-body)' }}>
              {total! - value!} vagas disponíveis
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Quick Link ────────────────────────────────────────────────────────────────
function QuickLink({ to, icon: Icon, label, sub }: { to: string; icon: any; label: string; sub: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3.5 p-4 rounded-2xl bg-card border border-border/70 hover:border-accent/30 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-all duration-200 flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>
          {sub}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
    </Link>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ label, icon: Icon, accent }: { label: string; icon?: any; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Icon ? (
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: accent ? 'hsl(135,55%,42%,0.12)' : 'hsl(220,60%,18%,0.08)' }}
        >
          <Icon
            className="w-3.5 h-3.5"
            style={{ color: accent ? 'hsl(135,55%,42%)' : 'hsl(220,60%,35%)' }}
          />
        </div>
      ) : (
        <div
          className="w-1 h-4 rounded-full shrink-0"
          style={{
            background: accent
              ? 'linear-gradient(180deg, hsl(135,60%,52%), hsl(135,55%,38%))'
              : 'linear-gradient(180deg, hsl(220,60%,35%), hsl(220,60%,22%))',
          }}
        />
      )}
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {label}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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

  const frotaTotal     = poolData?.frota_total    != null ? Number(poolData.frota_total)    : null;
  const frotaLocada    = poolData?.frota_locada   != null ? Number(poolData.frota_locada)   : null;
  const receitaBruta   = poolData?.receita_bruta  != null ? Number(poolData.receita_bruta)  : null;
  const receitaFaturada= poolData?.receita_faturada != null ? Number(poolData.receita_faturada) : null;
  const despesas       = poolData?.despesas       != null ? Number(poolData.despesas)       : null;
  const receitaTotal   = receitaBruta != null && receitaFaturada != null ? receitaBruta + receitaFaturada : null;
  const participacao   =
    clientMotos != null && frotaTotal != null && frotaTotal > 0
      ? `${((clientMotos / frotaTotal) * 100).toFixed(1)}%`
      : null;
  const taxaLocacao    =
    frotaLocada != null && frotaTotal != null && frotaTotal > 0
      ? `${((frotaLocada / frotaTotal) * 100).toFixed(1)}%`
      : null;

  const fullName  = currentShareholder.name;
  const firstName = fullName.split(' ')[0];
  const initials  = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="page-container space-y-8">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-8 text-white animate-fade-in"
        style={{ background: 'linear-gradient(135deg, hsl(222,65%,16%) 0%, hsl(220,62%,12%) 50%, hsl(220,60%,8%) 100%)' }}
      >
        {/* Blobs */}
        <div className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(135,55%,42%,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-30px] left-[30%] w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(210,80%,52%,0.1) 0%, transparent 70%)' }} />

        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(hsl(0,0%,100%) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          {/* Left — avatar + greeting */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, hsl(135,55%,45%), hsl(135,65%,30%))' }}
              >
                <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>{initials}</span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[hsl(135,60%,50%)] border-2 border-[hsl(220,60%,12%)] rounded-full" />
            </div>

            <div className="space-y-0.5">
              <p className="text-sm text-white/50" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                {greeting},
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
                {firstName}
              </h1>
              {currentShareholder.group && (
                <p className="text-xs text-white/40" style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  {currentShareholder.group}
                </p>
              )}
            </div>
          </div>

          {/* Right — stats pills */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Month */}
            <div className="flex items-center gap-2 text-xs text-white/60 bg-white/[0.08] border border-white/[0.1] px-3 py-1.5 rounded-full"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {currentMonthLabel()}
            </div>

            {/* Participation pill */}
            {participacao && (
              <div className="flex items-center gap-1.5 text-xs font-semibold bg-[hsl(135,55%,42%)]/20 border border-[hsl(135,55%,42%)]/30 text-[hsl(135,60%,62%)] px-3 py-1.5 rounded-full"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <PieChart className="w-3 h-3" />
                {participacao} da frota
              </div>
            )}

            {/* Taxa locação pill */}
            {taxaLocacao && (
              <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/[0.08] border border-white/[0.1] text-white/60 px-3 py-1.5 rounded-full"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <Activity className="w-3 h-3" />
                {taxaLocacao} locado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sua Participação ─────────────────────────────────── */}
      <section className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <SectionHeader label="Sua Participação" icon={PieChart} accent />
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

      {/* ── Financeiro ───────────────────────────────────────── */}
      <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <SectionHeader label="Financeiro do Grupo" icon={DollarSign} />
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">

          {/* Featured — Receita total */}
          <div
            className="col-span-2 group relative bg-card rounded-2xl border border-accent/20 p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            {/* Top accent */}
            <div className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full bg-gradient-to-r from-transparent via-accent to-transparent" />

            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, hsl(135,55%,42%), hsl(135,65%,32%))' }}
              >
                <DollarSign className="h-[18px] w-[18px] text-white" />
              </div>
              <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                Receita total prevista
              </span>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1.5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Receita Prevista Bruta
              </p>
              {loadingPool ? (
                <Skeleton className="h-10 w-2/3 rounded-lg" />
              ) : (
                <p className="text-3xl font-bold text-accent tracking-tight tabular-nums"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {receitaTotal != null
                    ? `R$ ${receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : 'Indisponível'}
                </p>
              )}

              {!loadingPool && receitaBruta != null && receitaFaturada != null && (
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/60">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Recebido
                    </p>
                    <p className="text-sm font-bold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                      {fmt(receitaBruta)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Faturado
                    </p>
                    <p className="text-sm font-bold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                      {fmt(receitaFaturada)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <KpiCard
            label="Despesas"
            value={loadingPool ? null : (despesas != null ? `R$ ${despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Indisponível')}
            icon={TrendingDown}
            highlight="warning"
          />
          <KpiCard
            label="OS Geradas"
            value={loadingPool ? null : (poolData?.os != null ? `${poolData.os}` : 'Indisponível')}
            icon={Wrench}
          />
        </div>
      </section>

      {/* ── Operação da Frota ────────────────────────────────── */}
      <section className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <SectionHeader label="Operação da Frota" icon={Bike} />
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
            value={loadingPool ? null : (taxaLocacao ?? 'Indisponível')}
            icon={TrendingUp}
            highlight="accent"
          />
        </div>
      </section>

      {/* ── Acesso Rápido ────────────────────────────────────── */}
      <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <SectionHeader label="Acesso Rápido" icon={ChevronRight} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink to="/extrato"    icon={BarChart3}   label="Extrato"    sub="Histórico de transações" />
          <QuickLink to="/frota"      icon={Bike}        label="Frota"      sub="Veículos e status" />
          <QuickLink to="/mapa"       icon={Map}         label="Mapa"       sub="Localização da frota" />
          <QuickLink to="/documentos" icon={FolderOpen}  label="Documentos" sub="Contratos e arquivos" />
        </div>
      </section>

    </div>
  );
}
