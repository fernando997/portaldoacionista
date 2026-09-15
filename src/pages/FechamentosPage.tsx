import { Receipt, Download, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Fechamento {
  id: string;
  nome: string | null;
  file_url: string;
  created_at: string;
}

export default function FechamentosPage() {
  const { currentShareholder } = useAuth();
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Fechamento | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      let investidorId: string | null = null;
      try {
        const { data: inv } = await (supabase as any)
          .from('investidores')
          .select('id')
          .eq('profile_id', currentShareholder.id)
          .maybeSingle();
        investidorId = inv?.id ?? null;
      } catch {
        // silencioso
      }

      if (investidorId) {
        try {
          const { data } = await (supabase as any)
            .from('investidor_arquivos')
            .select('id, nome, file_url, created_at')
            .eq('investidor_id', investidorId)
            .eq('tipo', 'fechamento')
            .order('created_at', { ascending: false });

          if (data) setFechamentos(data);
        } catch {
          // silencioso
        }
      }

      setLoading(false);
    };

    fetch();
  }, [currentShareholder.id]);

  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Financeiro</p>
        <h1 className="section-title">Fechamentos</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fechamentos.length === 0 ? (
        <div className="animate-fade-in flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">Nenhum fechamento disponível</p>
          <p className="text-sm text-muted-foreground">Seus fechamentos financeiros aparecerão aqui quando forem publicados.</p>
        </div>
      ) : (
        <div className="grid gap-3 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
          {fechamentos.map((f) => (
            <div
              key={f.id}
              className="bg-card rounded-xl border p-5 flex items-center justify-between transition-all group hover:shadow-md"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{f.nome ?? 'Fechamento'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(f.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setViewing(f)} className="text-muted-foreground hover:text-foreground">
                  <Eye className="h-4 w-4 mr-1.5" /> Visualizar
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(f.file_url, '_blank')}>
                  <Download className="h-4 w-4 mr-1.5" /> Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewing?.nome ?? 'Fechamento'}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <iframe src={viewing.file_url} className="w-full h-full rounded-md" title="Visualizar fechamento" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
