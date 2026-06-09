import { FileText, Download, Eye, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DocItem {
  id: number;
  nome: string;
  tipo: string;
  data: string;
  apiKey: string;
  fileUrl?: string;
  origem?: 'admin' | 'onboarding' | 'api';
}

const documentsList: DocItem[] = [
  { id: 1, nome: 'Pré Contrato',       tipo: 'Contrato',     data: '', apiKey: 'precontrato' },
  { id: 2, nome: 'Contrato',           tipo: 'Contrato',     data: '', apiKey: 'contrato' },
  { id: 3, nome: 'CNPJ',               tipo: 'Documento',    data: '', apiKey: 'cnpj' },
  { id: 4, nome: 'Certificado Digital', tipo: 'Certificação', data: '', apiKey: 'certificadodigital' },
  { id: 5, nome: 'CNH',                tipo: 'Documento',    data: '', apiKey: 'cnh' },
  { id: 6, nome: 'Procuração',         tipo: 'Legal',        data: '', apiKey: 'procuracao' },
];

// Mapeamento onboarding_requests → apiKey
const ONBOARDING_MAP: Record<string, string> = {
  certificadodigital: 'certificado_digital_url',
  cnh: 'cnh_url',
  procuracao: 'procuracao_url',
};

export default function DocumentsPage() {
  const { currentShareholder } = useAuth();
  const [viewing, setViewing] = useState<DocItem | null>(null);
  const [docs, setDocs] = useState<DocItem[]>(documentsList);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      const idPedido = currentShareholder.idPedido;
      const idLocadora = currentShareholder.idLocadora;

      // Mapa acumulador: apiKey → { fileUrl, origem }
      const urlMap: Record<string, { fileUrl: string; origem: 'admin' | 'onboarding' | 'api' }> = {};

      // 1. API externa
      if (idPedido && idLocadora) {
        try {
          const res = await fetch('https://modocorreapp.com.br/api/1.1/wf/Pool_docs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pedido: idPedido, locadora: idLocadora }),
          });
          const data = await res.json();
          const response = data.response || {};
          for (const doc of documentsList) {
            const value = response[doc.apiKey];
            if (value && typeof value === 'string') {
              const url = value.startsWith('//') ? `https:${value}` : value;
              urlMap[doc.apiKey] = { fileUrl: url, origem: 'api' };
            }
          }
        } catch {
          // silencioso — API externa pode falhar
        }
      }

      // 2. Dados do onboarding (sobrescreve API)
      if (idPedido) {
        try {
          const { data: onb } = await supabase
            .from('onboarding_requests')
            .select('certificado_digital_url, cnh_url, procuracao_url')
            .eq('pedido_id', idPedido)
            .maybeSingle();

          if (onb) {
            for (const [apiKey, onbField] of Object.entries(ONBOARDING_MAP)) {
              const url = (onb as any)[onbField];
              if (url) {
                urlMap[apiKey] = { fileUrl: url, origem: 'onboarding' };
              }
            }
          }
        } catch {
          // silencioso
        }

        // 3. Docs do admin na tabela `documentos` (maior prioridade)
        try {
          const { data: adminDocs } = await supabase
            .from('documentos')
            .select('tipo, file_url')
            .eq('pedido_id', idPedido);

          if (adminDocs) {
            for (const d of adminDocs as { tipo: string; file_url: string }[]) {
              urlMap[d.tipo] = { fileUrl: d.file_url, origem: 'admin' };
            }
          }
        } catch {
          // silencioso
        }
      }

      setDocs(
        documentsList.map(doc => {
          const found = urlMap[doc.apiKey];
          return found ? { ...doc, fileUrl: found.fileUrl, origem: found.origem } : doc;
        })
      );
      setLoading(false);
    };

    fetchDocs();
  }, [currentShareholder.idPedido, currentShareholder.idLocadora]);

  const handleDownload = (doc: DocItem) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
  };

  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Documentação</p>
        <h1 className="section-title">Meus Documentos</h1>
      </div>

      <div className="grid gap-3 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
        {docs.map((doc) => {
          const available = !!doc.fileUrl;

          return (
            <div
              key={doc.id}
              className={`bg-card rounded-xl border p-5 flex items-center justify-between transition-all group ${
                available ? 'hover:shadow-md' : 'opacity-50'
              }`}
              style={{ boxShadow: available ? 'var(--shadow-card)' : undefined }}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-colors ${available ? 'bg-primary/5 group-hover:bg-primary/10' : 'bg-muted'}`}>
                  {available ? (
                    <FileText className="h-5 w-5 text-primary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className={`font-semibold ${available ? 'text-foreground' : 'text-muted-foreground'}`}>{doc.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs font-medium">{doc.tipo}</Badge>
                    {doc.origem === 'onboarding' && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30 bg-amber-500/10">Onboarding</Badge>
                    )}
                    {doc.origem === 'admin' && (
                      <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">Admin</Badge>
                    )}
                    {!available && (
                      <span className="text-xs text-muted-foreground">Indisponível</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {available ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setViewing(doc)} className="text-muted-foreground hover:text-foreground">
                      <Eye className="h-4 w-4 mr-1.5" /> Visualizar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4 mr-1.5" /> Download
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
                    <Lock className="h-4 w-4 mr-1.5" /> Aguardando
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{viewing?.nome}</DialogTitle>
          </DialogHeader>
          <div className="relative bg-muted/50 rounded-xl p-10 min-h-[300px] flex items-center justify-center border border-dashed">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] text-7xl font-display font-bold text-foreground rotate-[-25deg] select-none pointer-events-none">
              CONFIDENCIAL
            </div>
            <div className="text-center space-y-3 z-10">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground text-lg">{viewing?.nome}</p>
              <p className="text-sm text-muted-foreground">Tipo: {viewing?.tipo}</p>
              {viewing?.fileUrl && (
                <Button variant="outline" size="sm" onClick={() => window.open(viewing.fileUrl, '_blank')}>
                  <Download className="h-4 w-4 mr-1.5" /> Abrir Documento
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
