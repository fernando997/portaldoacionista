import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Bike, Loader2, Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import L from 'leaflet';

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const COLOR_PALETTE = [
  { bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', hex: '#10b981' },
  { bg: 'bg-amber-500/10',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   hex: '#f59e0b' },
  { bg: 'bg-red-500/10',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500',     hex: '#ef4444' },
  { bg: 'bg-blue-500/10',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    hex: '#3b82f6' },
  { bg: 'bg-purple-500/10',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500',  hex: '#8b5cf6' },
  { bg: 'bg-slate-500/10',   text: 'text-slate-700',   border: 'border-slate-200',   dot: 'bg-slate-500',   hex: '#64748b' },
  { bg: 'bg-pink-500/10',    text: 'text-pink-700',    border: 'border-pink-200',    dot: 'bg-pink-500',    hex: '#ec4899' },
  { bg: 'bg-orange-500/10',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500',  hex: '#f97316' },
];

const makeIcon = (hex: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z"
        fill="${hex}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>`;
  return new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
};

interface Veiculo {
  placa: string;
  modelo: string;
  ano: number;
  status: string;
  status_veiculo_desc?: string;
  lat: number;
  long: number;
  [key: string]: any;
}

// ── Filter chip ─────────────────────────────────────────────
function FilterChip({
  label, count, pct, color, active, total: isTotal, onClick,
}: {
  label: string; count: number; pct?: number; color?: typeof COLOR_PALETTE[0];
  active: boolean; total?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-3 bg-card rounded-2xl border p-4 text-left transition-all duration-200 min-w-[140px] hover:-translate-y-0.5 hover:shadow-md ${
        active ? 'border-accent/50 shadow-md ring-1 ring-accent/30' : 'border-border/70 hover:border-accent/30'
      }`}
      style={{ boxShadow: active ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Active indicator */}
      {active && (
        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-accent" />
      )}

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${isTotal ? 'bg-primary/10' : color?.bg}`}>
        {isTotal
          ? <Bike className="w-5 h-5 text-primary" />
          : <span className={`text-sm font-bold tabular-nums ${color?.text}`}>{count}</span>
        }
      </div>

      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground leading-none tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
          {count}
        </p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate max-w-[100px]"
          style={{ fontFamily: 'var(--font-body)' }}>
          {label}
        </p>
        {pct != null && (
          <p className={`text-[10px] font-bold mt-0.5 tabular-nums ${color?.text ?? 'text-muted-foreground'}`}
            style={{ fontFamily: 'var(--font-body)' }}>
            {pct}% da frota
          </p>
        )}
      </div>
    </button>
  );
}

// ── Page ────────────────────────────────────────────────────
export default function MapPage() {
  const { currentShareholder } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<[number, number]>([-15.7801, -47.9292]);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);

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
        if (data.status === 'success') {
          const lista: Veiculo[] = (data.response.veiculos ?? []).filter(
            (v: any) => v.lat && (v.long ?? v.lng)
          );
          setVeiculos(lista);
          if (lista.length > 0) setCenter([lista[0].lat, lista[0].long ?? lista[0].lng]);
        }
      } catch (err) {
        console.error('Erro ao carregar mapa da frota:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFleet();
  }, [currentShareholder.idLocadora]);

  const veiculosFiltrados = useMemo(() =>
    filtroStatus ? veiculos.filter(v => (v.status_veiculo_desc || v.status || 'Sem status') === filtroStatus) : veiculos,
    [veiculos, filtroStatus]
  );

  const statusColorMap = useMemo(() => {
    const unique = Array.from(new Set(veiculos.map(v => v.status_veiculo_desc || v.status || 'Sem status')));
    const map: Record<string, typeof COLOR_PALETTE[0]> = {};
    unique.forEach((s, i) => { map[s] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });
    return map;
  }, [veiculos]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    veiculos.forEach(v => {
      const key = v.status_veiculo_desc || v.status || 'Sem status';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [veiculos]);

  return (
    <div className="page-container space-y-6">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="animate-fade-in">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-0.5"
          style={{ fontFamily: 'var(--font-body)' }}>
          Operação
        </p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
          Mapa da Frota
        </h1>
      </div>

      {/* ── Filter chips ────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <FilterChip
          label="Todos"
          count={veiculos.length}
          active={filtroStatus === null}
          total
          onClick={() => setFiltroStatus(null)}
        />
        {Object.entries(statusCounts).map(([label, count]) => {
          const color = statusColorMap[label] ?? COLOR_PALETTE[5];
          const pct = veiculos.length > 0 ? Math.round((count / veiculos.length) * 100) : 0;
          return (
            <FilterChip
              key={label}
              label={label}
              count={count}
              pct={pct}
              color={color}
              active={filtroStatus === label}
              onClick={() => setFiltroStatus(filtroStatus === label ? null : label)}
            />
          );
        })}
      </div>

      {/* ── Map ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-border/70 overflow-hidden animate-fade-in"
        style={{ animationDelay: '0.1s', height: '520px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
      >
        {/* Map header bar */}
        <div className="absolute z-[500] top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          {!loading && filtroStatus && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 border border-border/60 shadow-md text-sm font-semibold text-foreground backdrop-blur-sm pointer-events-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className={`w-2 h-2 rounded-full ${statusColorMap[filtroStatus]?.dot ?? 'bg-muted'}`} />
              {filtroStatus}
              <span className="text-muted-foreground font-normal">· {veiculosFiltrados.length} motos</span>
              <button onClick={() => setFiltroStatus(null)} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                ×
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-full flex flex-col items-center justify-center bg-muted/20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>
              Carregando localização da frota...
            </p>
          </div>
        ) : veiculos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-muted/20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Bike className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                Localização indisponível
              </p>
              <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                Nenhum veículo com dados de GPS
              </p>
            </div>
          </div>
        ) : (
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {veiculosFiltrados.map((moto) => {
              const descKey = moto.status_veiculo_desc || moto.status || 'Sem status';
              const color = statusColorMap[descKey] ?? COLOR_PALETTE[5];
              return (
                <Marker
                  key={moto.placa}
                  position={[moto.lat, moto.long ?? moto.lng]}
                  icon={makeIcon(color.hex)}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                    <span style={{ fontFamily: 'sans-serif', fontWeight: 700 }}>{moto.placa}</span>
                    {' — '}
                    <span style={{ fontFamily: 'sans-serif' }}>{descKey}</span>
                  </Tooltip>
                  <Popup>
                    <div style={{ fontFamily: 'sans-serif', minWidth: 160 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{moto.placa}</p>
                      <p style={{ color: '#475569', fontSize: 13, marginBottom: 2 }}>{moto.modelo}</p>
                      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>{moto['ano-modelo'] ?? moto.ano}</p>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '3px 10px', borderRadius: 999, fontSize: 12,
                        fontWeight: 600, color: '#fff', backgroundColor: color.hex,
                      }}>
                        {descKey}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────── */}
      {!loading && Object.keys(statusCounts).length > 0 && (
        <div
          className="bg-card rounded-2xl border border-border/70 p-4 animate-fade-in"
          style={{ animationDelay: '0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
              style={{ fontFamily: 'var(--font-body)' }}>
              Legenda
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(statusCounts).map(([label, count]) => {
              const color = statusColorMap[label] ?? COLOR_PALETTE[5];
              return (
                <button
                  key={label}
                  onClick={() => setFiltroStatus(filtroStatus === label ? null : label)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-150 ${
                    filtroStatus === label
                      ? `${color.bg} ${color.text} ${color.border} shadow-sm`
                      : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-border'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                  {label}
                  <span className="tabular-nums opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
