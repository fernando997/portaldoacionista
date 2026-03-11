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
  token_zapsign: string;
  contrato_assinado: string;
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
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentShareholder.idLocadora) {
      toast.error('Nenhuma locadora associada ao seu perfil.');
      setLoading(false);
      return;
    }
    fetchContratos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function abrirContrato(token: string) {
    setOpeningId(token);
    try {
      const { data, error } = await supabase.functions.invoke('get-contrato-url', {
        body: { token },
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-user-token': session?.access_token ?? '',
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const url =
        data?.signers?.[0]?.sign_url ??
        `https://app.zapsign.com.br/verificar/${token}`;

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir contrato');
    } finally {
      setOpeningId(null);
    }
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
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Nº Contrato</TableHead>
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Assinatura</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratos.map((c, i) => {
                const token = c.token_zapsign;
                const isOpening = openingId === token;
                return (
                  <TableRow key={c._id ?? i} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm font-semibold">
                      {c['Numero ctr'] ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(c['Created Date'])}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c['tipo de contrato'] || '—'}
                    </TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell>{statusBadge(c['status assinatura'])}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={!token || isOpening}
                        onClick={() => token && abrirContrato(token)}
                      >
                        {isOpening
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <ExternalLink className="w-4 h-4" />}
                        Ver Contrato
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
