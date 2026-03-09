import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Bike, AlertTriangle, DollarSign, PieChart, Wallet, BarChart3, Target, ArrowUpRight, Loader2, Wrench, Receipt, CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';

const currentMonthLabel = () => {
  const now = new Date();
  return now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
};

function StatCard({ label, value, icon: Icon, accent, change }: { label: string; value: string; icon: any; accent?: boolean; change?: string }) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${accent ? 'gradient-accent' : 'bg-muted'} transition-transform group-hover:scale-105`}>
          <Icon className={`h-5 w-5 ${accent ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
        </div>
        {change && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-success">
            <ArrowUpRight className="w-3 h-3" />
            {change}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="stat-label">{label}</p>
        <p className={`stat-value ${accent ? 'text-accent' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

export default function ShareholderHome() {
  const { currentShareholder } = useAuth();
  const [poolData, setPoolData] = useState<any>(null);
  const [loadingPool, setLoadingPool] = useState(true);
  const [clientMotos, setClientMotos] = useState<number | null>(null);

  useEffect(() => {
    const fetchPool = async () => {
      if (!currentShareholder.idGrupo) return;
      try {
        const res = await fetch('https://modocorreapp.com.br/api/1.1/wf/pool_financeiro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pool: currentShareholder.idGrupo }),
        });
        const data = await res.json();
        const d = data.response ?? data;
        setPoolData(d);
      } catch (err) {
        console.error('Erro ao buscar dados financeiros:', err);
      } finally {
        setLoadingPool(false);
      }
    };
    fetchPool();
  }, [currentShareholder.idGrupo]);

  useEffect(() => {
    const fetchFleet = async () => {
      if (!currentShareholder.idLocadora) return;
      try {
        const res = await fetch('https://modocorreapp.com.br/api/1.1/wf/pool_frota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locadora: currentShareholder.idLocadora }),
        });
        const data = await res.json();
        const d = data.response ?? data;
        setClientMotos(d.total ?? null);
      } catch (err) {
        console.error('Erro ao buscar frota do cliente:', err);
      }
    };
    fetchFleet();
  }, [currentShareholder.idLocadora]);

  return (
    <div className="page-container">
      <div className="space-y-1 animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Portal do Acionista</p>
        <h1 className="section-title mb-1">Bem-vindo, {currentShareholder.name.split(' ')[0]}.</h1>
        <p className="text-muted-foreground">Aqui está o resumo do seu investimento e da operação.</p>
      </div>

      <div className="space-y-8">
        <div className="animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 gradient-primary rounded-full" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Grupo Modo Corre</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <CalendarDays className="w-3.5 h-3.5" />
              {currentMonthLabel()}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard label="Recebido (mês)" value={loadingPool ? '...' : (poolData?.receita_bruta != null ? `R$ ${Number(poolData.receita_bruta).toLocaleString('pt-BR')}` : 'Indisponível')} icon={DollarSign} />
            <StatCard label="Receita Faturada" value={loadingPool ? '...' : (poolData?.receita_faturada != null ? `R$ ${Number(poolData.receita_faturada).toLocaleString('pt-BR')}` : 'Indisponível')} icon={TrendingUp} />
            <StatCard label="Receita Prevista Bruta" value={loadingPool ? '...' : (poolData?.receita_bruta != null && poolData?.receita_faturada != null ? `R$ ${(Number(poolData.receita_bruta) + Number(poolData.receita_faturada)).toLocaleString('pt-BR')}` : 'Indisponível')} icon={DollarSign} />
            <StatCard label="Despesas" value={loadingPool ? '...' : (poolData?.despesas != null ? `R$ ${Number(poolData.despesas).toLocaleString('pt-BR')}` : 'Indisponível')} icon={Receipt} />
            <StatCard label="Frota Total" value={loadingPool ? '...' : (poolData?.frota_total != null ? `${poolData.frota_total} motos` : 'Indisponível')} icon={Bike} />
            <StatCard label="Motos Locadas" value={loadingPool ? '...' : (poolData?.frota_locada != null ? `${poolData.frota_locada}` : 'Indisponível')} icon={Target} />
            <StatCard label="Taxa de Locação" value={loadingPool ? '...' : (poolData?.frota_locada != null && poolData?.frota_total != null && Number(poolData.frota_total) > 0 ? `${((Number(poolData.frota_locada) / Number(poolData.frota_total)) * 100).toFixed(1)}%` : 'Indisponível')} icon={Target} />
            <StatCard label="OS Geradas" value={loadingPool ? '...' : (poolData?.os != null ? `${poolData.os}` : 'Indisponível')} icon={Wrench} />
          </div>
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 gradient-accent rounded-full" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Sua Participação</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Percentual de Participação" value={clientMotos != null && poolData?.frota_total != null && Number(poolData.frota_total) > 0 ? `${((clientMotos / Number(poolData.frota_total)) * 100).toFixed(1)}%` : (loadingPool ? '...' : 'Indisponível')} icon={PieChart} accent />
          </div>
        </div>
      </div>
    </div>
  );
}
