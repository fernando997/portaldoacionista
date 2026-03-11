import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Bike, Loader2 } from 'lucide-react';
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

// Paleta de cores para status dinâmicos
const COLOR_PALETTE = [
  { bg: 'bg-emerald-500/10', text: 'text-emerald-600', hex: '#10b981' },
  { bg: 'bg-amber-500/10',   text: 'text-amber-600',   hex: '#f59e0b' },
  { bg: 'bg-red-500/10',     text: 'text-red-600',     hex: '#ef4444' },
  { bg: 'bg-blue-500/10',    text: 'text-blue-600',    hex: '#3b82f6' },
  { bg: 'bg-purple-500/10',  text: 'text-purple-600',  hex: '#8b5cf6' },
  { bg: 'bg-slate-500/10',   text: 'text-slate-600',   hex: '#64748b' },
  { bg: 'bg-pink-500/10',    text: 'text-pink-600',    hex: '#ec4899' },
  { bg: 'bg-orange-500/10',  text: 'text-orange-600',  hex: '#f97316' },
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

  // Gera mapa de status_veiculo_desc → cor dinamicamente
  const statusColorMap = useMemo(() => {
    const unique = Array.from(new Set(veiculos.map(v => v.status_veiculo_desc || v.status || 'Sem status')));
    const map: Record<string, typeof COLOR_PALETTE[0]> = {};
    unique.forEach((s, i) => { map[s] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });
    return map;
  }, [veiculos]);

  // Contagem por status_veiculo_desc
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    veiculos.forEach(v => {
      const key = v.status_veiculo_desc || v.status || 'Sem status';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [veiculos]);

  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Frota</p>
        <h1 className="section-title">Mapa da Frota</h1>
      </div>

      {/* KPI Cards dinâmicos */}
      <div className="flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: '0.05s', opacity: 0 }}>
        {/* Total */}
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bike className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{veiculos.length}</p>
            <p className="text-xs text-muted-foreground font-medium">Total no mapa</p>
          </div>
        </div>

        {/* Um card por status_veiculo_desc */}
        {Object.entries(statusCounts).map(([label, count]) => {
          const color = statusColorMap[label] ?? COLOR_PALETTE[5];
          const ativo = filtroStatus === label;
          return (
            <button
              key={label}
              onClick={() => setFiltroStatus(ativo ? null : label)}
              className={`bg-card rounded-xl border p-4 flex items-center gap-3 text-left transition-all ${ativo ? 'ring-2 ring-primary border-primary' : 'hover:border-muted-foreground/40'}`}
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center shrink-0`}>
                <span className={`text-sm font-bold ${color.text}`}>{count}</span>
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mapa */}
      <div className="rounded-xl border overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, boxShadow: 'var(--shadow-card)', height: '520px' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center bg-muted/30">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : veiculos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-muted/30 gap-3">
            <Bike className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Nenhum veículo com localização disponível</p>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
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
                    <span className="font-bold">{moto.placa}</span>
                    {' — '}
                    <span>{descKey}</span>
                  </Tooltip>
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[140px]">
                      <p className="font-bold text-base">{moto.placa}</p>
                      <p className="text-gray-600">{moto.modelo}</p>
                      <p className="text-gray-500">{moto['ano-modelo'] ?? moto.ano}</p>
                      <div className="pt-1">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium"
                          style={{ backgroundColor: color.hex }}
                        >
                          {descKey}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
