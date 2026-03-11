import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileSignature, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Contrato {
  _id: string;
  'Numero ctr': number;
  'Created Date': number;
  url_contrato: string;
  status: string;
  'status assinatura': string;
  'tipo de contrato': string;
}

const statusCls: Record<string, string> = {
  ATIVO:      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  INATIVO:    'bg-red-500/10 text-red-600 border-red-500/20',
  PENDENTE:   'bg-amber-500/10 text-amber-600 border-amber-500/20',
  ASSINADO:   'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  AGUARDANDO: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export default function ContratosPage() {
  const { currentShareholder, session } = useAuth();

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentShareholder.idLocadora) {
      toast.error('Nenhuma locadora associada ao seu perfil.');
      setLoading(false);
      return;
    }
    fetchContratos();
  }, [currentShareholder.idLocadora]);

  async function fetchContratos() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-contratos', {
        body: { locadora: currentShareholder.idLocadora },
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-user-token': session?.access_token ?? '',
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const raw = data?.data;
      const results: Contrato[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.contratos)
        ? raw.contratos
        : Array.isArray(raw?.results)
        ? raw.results
        : [];

      setContratos(results);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar contratos');
    } finally {
      setLoading(false);
    }
  }

  function abrirContrato(urlRaw: string) {
    if (!urlRaw) {
      toast.error('Link do contrato não disponível');
      return;
    }
    // URL pode vir como "//cdn.bubble.io/..." (protocolo-relativo)
    const url = urlRaw.startsWith('//') ? `https:${urlRaw}` : urlRaw;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function formatDate(ts: number) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('pt-BR');
  }

  function statusBadge(label: string) {
    const cls = statusCls[label?.toUpperCase()] ?? 'text-muted-foreground';
    return (
      <Badge variant="outline" className={`text-[11px] ${cls}`}>
        {label || '—'}
      </Badge>
    );
  }

  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Documentos</p>
        <h1 className="section-title mb-0">Contratos</h1>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden animate-fade-in" style={{ boxShadow: 'var(--shadow-card)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando contratos...</span>
          </div>
        ) : contratos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <FileSignature className="w-10 h-10 opacity-30" />
            <p className="font-medium">Nenhum contrato encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold whitespace-nowrap">Nº Contrato</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap">Data</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap">Status</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap hidden sm:table-cell">Assinatura</TableHead>
                  <TableHead className="font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((c, i) => (
                  <TableRow key={c._id ?? i} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm font-semibold whitespace-nowrap">
                      {c['Numero ctr'] ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(c['Created Date'])}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                      {c['tipo de contrato'] || '—'}
                    </TableCell>
                    <TableCell>
                      {statusBadge(c.status)}
                      <div className="mt-0.5 sm:hidden">{statusBadge(c['status assinatura'])}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{statusBadge(c['status assinatura'])}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 whitespace-nowrap"
                        disabled={!c.url_contrato}
                        onClick={() => abrirContrato(c.url_contrato)}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">Ver Contrato</span>
                        <span className="sm:hidden">Ver</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
