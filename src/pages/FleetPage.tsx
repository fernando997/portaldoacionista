import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bike, CheckCircle, PackageOpen, Percent, Wrench, AlertTriangle, Archive } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { className: string; icon: any }> = {
  'Ativa': { className: 'badge-status-active', icon: CheckCircle },
  'Manutenção': { className: 'badge-status-maintenance', icon: Wrench },
  'Inadimplente': { className: 'badge-status-inactive', icon: AlertTriangle },
  'Reserva': { className: 'badge-status-reserve', icon: Archive },
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
  }>;
}

function FleetStatCard({ label, value, icon: Icon, color, suffix }: { label: string; value: number; icon: any; color?: string; suffix?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color || 'bg-muted'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="stat-label">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{value}{suffix}</p>
        </div>
      </div>
    </div>
  );
}

export default function FleetPage() {
  const { currentShareholder } = useAuth();
  const [fleetData, setFleetData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFleet = async () => {
      if (!currentShareholder.idLocadora) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('https://modocorreapp.com.br/api/1.1/wf/pool_frota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locadora: currentShareholder.idLocadora }),
        });
        const data = await response.json();
        if (data.status === 'success') {
          setFleetData(data.response);
        }
      } catch (error) {
        console.error('Erro ao carregar frota:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFleet();
  }, [currentShareholder.idLocadora]);

  const total = fleetData?.total ?? 0;
  const locadas = fleetData?.locadas ?? 0;
  const disponiveis = fleetData?.disponiveis ?? 0;
  const taxaLocacao = total > 0 ? Math.round((locadas / total) * 100) : 0;
  const veiculos = fleetData?.veiculos ?? [];

  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Frota</p>
        <h1 className="section-title">Minha Frota</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <FleetStatCard label="Total" value={total} icon={Bike} color="bg-primary/10 text-primary" />
            <FleetStatCard label="Locadas" value={locadas} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
            <FleetStatCard label="Disponíveis" value={disponiveis} icon={PackageOpen} color="bg-amber-50 text-amber-600" />
            <FleetStatCard label="Taxa de Locação" value={taxaLocacao} icon={Percent} color="bg-blue-50 text-blue-600" suffix="%" />
          </div>

          <div className="bg-card rounded-xl border overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
            <div className="p-5 border-b">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Detalhamento da Frota</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Placa</TableHead>
                  <TableHead className="font-semibold">Modelo</TableHead>
                  <TableHead className="font-semibold">Ano/Modelo</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Status Veículo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {veiculos.map((moto) => {
                  const cfg = statusConfig[moto.status] || statusConfig['Ativa'];
                  return (
                    <TableRow key={moto.placa} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-semibold text-foreground">{moto.placa}</TableCell>
                      <TableCell className="text-foreground">{moto.modelo}</TableCell>
                      <TableCell className="text-muted-foreground">{(moto as any)['ano-modelo'] ?? moto.ano}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>
                          <cfg.icon className="mr-1.5 h-3 w-3" />
                          {moto.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">{(moto as any).status_veiculo_desc || '—'}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {veiculos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum veículo encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
