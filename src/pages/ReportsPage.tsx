import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Download, BarChart3, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Report {
  _id: string;
  Descricao?: string;
  arquivos?: string[];
  pool?: string;
  'Created Date'?: number;
  'Modified Date'?: number;
}

export default function ReportsPage() {
  const { currentShareholder } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const res = await fetch('https://modocorreapp.com.br/api/1.1/wf/Pool_relatorios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pool: currentShareholder.idGrupo,
            locadora: currentShareholder.idLocadora,
          }),
        });
        const data = await res.json();
        const list: Report[] = data?.response?.relatorios || [];
        setReports(list);
      } catch (err) {
        console.error('Erro ao carregar relatórios:', err);
      } finally {
        setLoading(false);
      }
    }

    if (currentShareholder.idGrupo && currentShareholder.idLocadora) {
      fetchReports();
    } else {
      setLoading(false);
    }
  }, [currentShareholder.idGrupo, currentShareholder.idLocadora]);

  const handleDownload = (report: Report) => {
    if (report.arquivos && report.arquivos.length > 0) {
      const fileUrl = report.arquivos[0].startsWith('//')
        ? `https:${report.arquivos[0]}`
        : report.arquivos[0];
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Análises</p>
        <h1 className="section-title">Relatórios</h1>
      </div>

      {loading ? (
        <div className="grid gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              <Skeleton className="h-9 w-32" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center" style={{ animationDelay: '0.1s' }}>
          <div className="p-4 rounded-2xl bg-muted/50 mb-4">
            <Inbox className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum relatório disponível</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Ainda não há relatórios cadastrados para o seu grupo. Quando disponíveis, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
          {reports.map((report) => (
            <div key={report._id} className="bg-card rounded-xl border p-5 flex items-center justify-between hover:shadow-md transition-all group" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/10 group-hover:bg-accent/15 transition-colors">
                  <BarChart3 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{report.Descricao || 'Relatório'}</p>
                  {report.arquivos && report.arquivos.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">{report.arquivos.length} arquivo(s)</p>
                  )}
                </div>
              </div>
              {report.arquivos && report.arquivos.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => handleDownload(report)}>
                  <Download className="h-4 w-4 mr-1.5" /> Download PDF
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
