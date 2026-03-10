import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Bike, CheckCircle, Wrench, AlertTriangle, Archive, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with Vite/Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import L from 'leaflet';

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'Ativa':        { label: 'Ativa',        color: 'bg-emerald-500', icon: CheckCircle },
  'Manutenção':   { label: 'Manutenção',   color: 'bg-amber-500',   icon: Wrench },
  'Inadimplente': { label: 'Inadimplente', color: 'bg-red-500',     icon: AlertTriangle },
  'Reserva':      { label: 'Reserva',      color: 'bg-slate-500',   icon: Archive },
};

const statusIcon = (status: string) => {
  const colors: Record<string, string> = {
    'Ativa': '#10b981',
    'Manutenção': '#f59e0b',
    'Inadimplente': '#ef4444',
    'Reserva': '#64748b',
  };
  const color = colors[status] || '#6366f1';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
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
  lat: number;
  long: number;
  [key: string]: any;
}

export default function MapPage() {
  const { currentShareholder } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState<[number, number]>([-15.7801, -47.9292]);

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

  const counts = Object.keys(statusConfig).reduce((acc, s) => {
    acc[s] = veiculos.filter(v => v.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Frota</p>
        <h1 className="section-title">Mapa da Frota</h1>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: '0.05s', opacity: 0 }}>
        {Object.entries(statusConfig).map(([key, { label, color, icon: Icon }]) => (
          <div key={key} className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">{label}</span>
            <span className="text-muted-foreground font-mono">{counts[key] ?? 0}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 text-sm ml-auto">
          <Bike className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">{veiculos.length} motos no mapa</span>
        </div>
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
            {veiculos.map((moto) => (
              <Marker
                key={moto.placa}
                position={[moto.lat, moto.long ?? moto.lng]}
                icon={statusIcon(moto.status)}
              >
                <Popup>
                  <div className="text-sm space-y-1 min-w-[140px]">
                    <p className="font-bold text-base">{moto.placa}</p>
                    <p className="text-gray-600">{moto.modelo}</p>
                    <p className="text-gray-500">{moto['ano-modelo'] ?? moto.ano}</p>
                    <div className="pt-1">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-medium"
                        style={{ backgroundColor: moto.status === 'Ativa' ? '#10b981' : moto.status === 'Manutenção' ? '#f59e0b' : moto.status === 'Inadimplente' ? '#ef4444' : '#64748b' }}
                      >
                        {moto.status}
                      </span>
                    </div>
                    {moto.status_veiculo_desc && (
                      <p className="text-gray-500 text-xs">{moto.status_veiculo_desc}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
