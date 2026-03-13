import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bike, CheckCircle, PackageOpen, Percent, Wrench,
  AlertTriangle, Archive, Search, X,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

const statusConfig: Record<string, { label: string; dot: string; badge: string; icon: any }> = {
  'Ativa':        { label: 'Ativa',        dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',   icon: CheckCircle },
  'Manutenção':   { label: 'Manutenção',   dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200',         icon: Wrench },
  'Inadimplente': { label: 'Inadimplente', dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200',               icon: AlertTriangle },
  'Reserva':      { label: 'Reserva',      dot: 'bg-sky-500',     badge: 'bg-sky-50 text-sky-700 border-sky-200',               icon: Archive },
};

interface FleetData {
  total: number;
  locadas: number;
  disponiveis: number;
  veiculos: Array<{
    placa: string;
    modelo: string;
    ano: number;
    status: string;
    contratoAtivo: boolean;
    [key: string]: any;
  }>;
}

// ── Stat card ──────────────────────────────────────────────
function FleetStatCard({ label, value, icon: Icon, gradient, suffix, sub }: {
  label: string; value: number; icon: any;
  gradient?: string; suffix?: string; sub?: string;
}) {
  return (
    <div
      className="group relative bg-card rounded-2xl border border-border/70 p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
        style={{ background: gradient ?? 'hsl(var(--muted))', color: gradient ? '#fff' : 'hsl(var(--muted-foreground))' }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
          {value}{suffix}
        </p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Skeleton row ───────────────────────────────────────────
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28 rounded" /></TableCell>
      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12 rounded" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24 rounded" /></TableCell>
    </TableRow>
  );
}

// ── Page ───────────────────────────────────────────────────
export default function FleetPage() {
  const { currentShareholder } = useAuth();
  const [fleetData, setFleetData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchFleet = async () => {
      if (!currentShareholder.idLocadora) { setLoading(false); return; }
      try {
        const response = await fetch('https://modocorreapp.com.br/api/1.1/wf/pool_frota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locadora: currentShareholder.idLocadora }),
        });
        const data = await response.json();
        if (data.status === 'success') setFleetData(data.response);
      } catch (error) {
        console.error('Erro ao carregar frota:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFleet();
  }, [currentShareholder.idLocadora]);

  const total       = fleetData?.total ?? 0;
  const locadas     = fleetData?.locadas ?? 0;
  const disponiveis = fleetData?.disponiveis ?? 0;
  const taxaLocacao = total > 0 ? Math.round((locadas / total) * 100) : 0;
  const veiculos    = fleetData?.veiculos ?? [];

  const filtered = veiculos.filter(m => {
    const q = search.toLowerCase();
    return !q || m.placa?.toLowerCase().includes(q) || m.modelo?.toLowerCase().includes(q) || m.status?.toLowerCase().includes(q);
  });

  return (
    <div className="page-container space-y-6">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="animate-fade-in">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-0.5"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Operação
        </p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
          Minha Frota
        </h1>
      </div>

      {/* ── KPI cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in" style={{ animationDelay: '0.06s' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/70 p-5 space-y-4">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-7 w-12 rounded" />
              </div>
            </div>
          ))
        ) : (
          <>
            <FleetStatCard
              label="Total de Motos"
              value={total}
              icon={Bike}
              gradient="linear-gradient(135deg, hsl(220,60%,28%), hsl(220,60%,18%))"
            />
            <FleetStatCard
              label="Locadas"
              value={locadas}
              icon={CheckCircle}
              gradient="linear-gradient(135deg, hsl(135,55%,42%), hsl(135,65%,32%))"
              sub={`${taxaLocacao}% da frota`}
            />
            <FleetStatCard
              label="Disponíveis"
              value={disponiveis}
              icon={PackageOpen}
              gradient="linear-gradient(135deg, hsl(38,85%,50%), hsl(38,92%,42%))"
            />
            <FleetStatCard
              label="Taxa de Locação"
              value={taxaLocacao}
              icon={Percent}
              gradient="linear-gradient(135deg, hsl(210,80%,55%), hsl(210,80%,45%))"
              suffix="%"
            />
          </>
        )}
      </div>

      {/* ── Table card ──────────────────────────────────── */}
      <div
        className="bg-card rounded-2xl border border-border/70 overflow-hidden animate-fade-in"
        style={{ animationDelay: '0.12s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        {/* Table header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 border-b border-border/60">
          <div>
            <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
              Detalhamento da Frota
            </h2>
            {!loading && (
              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                {filtered.length} {filtered.length === 1 ? 'veículo' : 'veículos'}
                {search ? ` encontrados para "${search}"` : ' no total'}
              </p>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar placa, modelo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-8 h-9 text-xs rounded-xl bg-muted/40 border-input"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-bold text-[11px] uppercase tracking-[0.08em] text-muted-foreground whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  Placa
                </TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-[0.08em] text-muted-foreground"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  Modelo
                </TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-[0.08em] text-muted-foreground whitespace-nowrap hidden sm:table-cell"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  Ano
                </TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-[0.08em] text-muted-foreground whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  Status
                </TableHead>
                <TableHead className="font-bold text-[11px] uppercase tracking-[0.08em] text-muted-foreground hidden md:table-cell"
                  style={{ fontFamily: 'var(--font-body)' }}>
                  Situação
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                          <Bike className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                            {search ? 'Nenhum resultado' : 'Nenhum veículo'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                            {search ? `Tente outro termo de busca` : 'Sua frota está vazia'}
                          </p>
                        </div>
                        {search && (
                          <button onClick={() => setSearch('')} className="text-xs text-accent font-medium underline underline-offset-2"
                            style={{ fontFamily: 'var(--font-body)' }}>
                            Limpar busca
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
                : filtered.map((moto) => {
                  const cfg = statusConfig[moto.status] ?? statusConfig['Ativa'];
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow key={moto.placa} className="hover:bg-muted/25 transition-colors">
                      <TableCell className="whitespace-nowrap">
                        <span className="font-mono font-bold text-sm text-foreground tracking-wider">
                          {moto.placa}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                          {moto.modelo}
                        </p>
                        <p className="text-xs text-muted-foreground sm:hidden" style={{ fontFamily: 'var(--font-body)' }}>
                          {moto['ano-modelo'] ?? moto.ano}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap"
                        style={{ fontFamily: 'var(--font-body)' }}>
                        {moto['ano-modelo'] ?? moto.ano}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                          {moto.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground"
                        style={{ fontFamily: 'var(--font-body)' }}>
                        {moto.status_veiculo_desc || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              }
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}
