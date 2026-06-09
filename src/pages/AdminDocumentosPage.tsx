import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileText, Upload, Trash2, Loader2, ExternalLink, CheckCircle2,
  AlertTriangle, FolderOpen, ShieldCheck, IdCard, FileCheck, ScrollText,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Documento {
  id: string;
  pedido_id: string;
  tipo: string;
  nome: string | null;
  file_url: string;
  created_at: string;
}

interface OnboardingRequest {
  id: string;
  pedido_id: string;
  cliente: string | null;
  cnpj: string | null;
  certificado_digital_url: string | null;
  cnh_url: string | null;
  procuracao_url: string | null;
  status: string;
}

const DOC_TYPES = [
  { tipo: 'precontrato',        nome: 'Pré Contrato',       categoria: 'Contrato',     icon: ScrollText  },
  { tipo: 'contrato',           nome: 'Contrato',            categoria: 'Contrato',     icon: FileText    },
  { tipo: 'cnpj',               nome: 'CNPJ',                categoria: 'Documento',    icon: ShieldCheck },
  { tipo: 'certificadodigital', nome: 'Certificado Digital', categoria: 'Certificação', icon: FileCheck   },
  { tipo: 'cnh',                nome: 'CNH',                 categoria: 'Documento',    icon: IdCard      },
  { tipo: 'procuracao',         nome: 'Procuração',          categoria: 'Legal',        icon: FileText    },
];

const ONBOARDING_MAP: Record<string, keyof OnboardingRequest> = {
  certificadodigital: 'certificado_digital_url',
  cnh: 'cnh_url',
  procuracao: 'procuracao_url',
};

export default function AdminDocumentosPage() {
  const { shareholders, role, session } = useAuth();
  const isViewer = role === 'viewer';
  const canDelete = role === 'admin' || role === 'superadmin';

  const [selectedId, setSelectedId] = useState<string>('');
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Documento | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedShareholder = shareholders.find(s => s.id === selectedId);
  const pedidoId = selectedShareholder?.idPedido ?? '';

  const fetchDocumentos = async (pid: string) => {
    setLoading(true);
    const [{ data: docs }, { data: onb }] = await Promise.all([
      supabase.from('documentos').select('*').eq('pedido_id', pid).order('created_at', { ascending: false }),
      supabase.from('onboarding_requests').select('*').eq('pedido_id', pid).maybeSingle(),
    ]);
    setDocumentos((docs as Documento[]) || []);
    setOnboarding((onb as OnboardingRequest) || null);
    setLoading(false);
  };

  useEffect(() => {
    if (pedidoId) {
      fetchDocumentos(pedidoId);
    } else {
      setDocumentos([]);
      setOnboarding(null);
    }
  }, [pedidoId]);

  const handleUpload = async (tipo: string, file: File) => {
    if (!pedidoId) return;
    setUploading(tipo);
    try {
      // 1. Upload para storage
      const ext = file.name.split('.').pop() || 'bin';
      const path = `documentos/${pedidoId}/${tipo}/${Date.now()}.${ext}`;
      toast.info('Enviando arquivo...');

      const { error: uploadError } = await supabase.storage
        .from('onboarding-docs')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error('[upload storage]', uploadError);
        throw new Error(`Storage: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from('onboarding-docs').getPublicUrl(path);
      const fileUrl = urlData.publicUrl;
      console.log('[upload] URL gerada:', fileUrl);

      // 2. Remove anterior do mesmo tipo
      const existing = documentos.find(d => d.tipo === tipo);
      if (existing) {
        const { error: delErr } = await supabase.from('documentos').delete().eq('id', existing.id);
        if (delErr) console.warn('[upload] erro ao remover anterior:', delErr.message);
      }

      // 3. Insere na tabela
      const { error: insertError } = await supabase.from('documentos').insert({
        pedido_id: pedidoId,
        tipo,
        nome: file.name,
        file_url: fileUrl,
        created_by: session?.user?.id ?? null,
      });

      if (insertError) {
        console.error('[upload insert]', insertError);
        throw new Error(`DB Insert: ${insertError.message} (code: ${insertError.code})`);
      }

      toast.success('Documento salvo com sucesso!');
      fetchDocumentos(pedidoId);
    } catch (err: any) {
      toast.error(err.message || 'Erro desconhecido ao enviar');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Remove from storage
      const url = deleteTarget.file_url;
      const bucketBase = 'onboarding-docs';
      const marker = `/${bucketBase}/`;
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const storagePath = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
        await supabase.storage.from(bucketBase).remove([storagePath]);
      }
      // Remove from table
      const { error } = await supabase.from('documentos').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Documento excluído!');
      fetchDocumentos(pedidoId);
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err.message || ''));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Administração</p>
        <h1 className="section-title mb-0">Gestão de Documentos</h1>
      </div>

      {/* Seletor de acionista */}
      <div className="bg-card rounded-xl border p-5 animate-fade-in" style={{ animationDelay: '0.05s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
        <Label className="font-semibold mb-2 block">Selecionar Acionista</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="h-11 max-w-sm">
            <SelectValue placeholder="Escolha um acionista..." />
          </SelectTrigger>
          <SelectContent>
            {shareholders.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}{s.idPedido ? ` — ${s.idPedido}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedShareholder && pedidoId && (
          <p className="text-xs text-muted-foreground mt-2">
            Pedido: <span className="font-mono font-semibold text-foreground">{pedidoId}</span>
          </p>
        )}
        {selectedShareholder && !pedidoId && (
          <p className="text-xs text-destructive mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Este acionista não tem <strong>ID do Pedido</strong> cadastrado. Edite o cadastro dele para adicionar o pedido antes de fazer upload.
          </p>
        )}
      </div>

      {/* Conteúdo */}
      {selectedShareholder && !pedidoId && !loading && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 text-sm text-destructive animate-fade-in">
          <p className="font-semibold mb-1">ID do Pedido não configurado</p>
          <p className="text-destructive/80">Acesse o cadastro do acionista <strong>{selectedShareholder.name}</strong> e preencha o campo <strong>ID do Pedido</strong> para habilitar o gerenciamento de documentos.</p>
        </div>
      )}

      {selectedShareholder && pedidoId && (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Documentos Admin */}
              <div className="animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  Documentos do Acionista
                </h2>
                <div className="grid gap-3">
                  {DOC_TYPES.map(({ tipo, nome, categoria, icon: Icon }) => {
                    const doc = documentos.find(d => d.tipo === tipo);
                    const isUploading = uploading === tipo;
                    return (
                      <div
                        key={tipo}
                        className="bg-card rounded-xl border p-4 flex items-center justify-between gap-4"
                        style={{ boxShadow: 'var(--shadow-card)' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2.5 rounded-xl shrink-0 ${doc ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className={`w-4 h-4 ${doc ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground">{nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-xs">{categoria}</Badge>
                              {doc ? (
                                <span className="text-xs text-accent font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Disponível
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Sem documento
                                </span>
                              )}
                            </div>
                            {doc?.nome && (
                              <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] mt-0.5">{doc.nome}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {doc && (
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                                <ExternalLink className="w-3.5 h-3.5" /> Abrir
                              </Button>
                            </a>
                          )}

                          {!isViewer && (
                            <>
                              <input
                                id={`upload-${tipo}`}
                                type="file"
                                className="hidden"
                                disabled={isUploading}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(tipo, file);
                                  e.target.value = '';
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                disabled={isUploading}
                                asChild
                              >
                                <label htmlFor={`upload-${tipo}`} className="cursor-pointer">
                                  {isUploading ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                                  ) : (
                                    <><Upload className="w-3.5 h-3.5" /> {doc ? 'Substituir' : 'Upload'}</>
                                  )}
                                </label>
                              </Button>
                              {doc && canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(doc)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dados do Onboarding */}
              {onboarding && (
                <div className="animate-fade-in" style={{ animationDelay: '0.15s', opacity: 0 }}>
                  <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[hsl(38,92%,50%)]" />
                    Dados do Onboarding
                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Somente leitura</Badge>
                  </h2>
                  <div className="bg-card rounded-xl border p-5 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
                    {onboarding.cnpj && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">CNPJ</span>
                        <span className="font-mono font-semibold text-foreground">{onboarding.cnpj}</span>
                      </div>
                    )}
                    {(['certificadodigital', 'cnh', 'procuracao'] as const).map(tipo => {
                      const key = ONBOARDING_MAP[tipo] as keyof OnboardingRequest;
                      const url = onboarding[key] as string | null;
                      const label = DOC_TYPES.find(d => d.tipo === tipo)?.nome ?? tipo;
                      return (
                        <div key={tipo} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-medium">{label}</span>
                          {url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-primary hover:text-primary/80">
                                <ExternalLink className="w-3 h-3" /> Abrir arquivo
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não enviado</span>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground font-medium">Status</span>
                      {onboarding.status === 'completo' ? (
                        <Badge className="bg-accent/15 text-accent border-accent/30 gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Completo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-500/30 bg-amber-500/10">
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!selectedShareholder && (
        <div className="text-center py-16 text-muted-foreground animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-7 h-7 opacity-40" />
          </div>
          <p className="font-medium">Selecione um acionista</p>
          <p className="text-sm mt-1">Escolha um acionista com pedido vinculado para gerenciar documentos.</p>
        </div>
      )}

      {/* Confirm Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O documento <strong>{deleteTarget?.nome || deleteTarget?.tipo}</strong> será removido permanentemente do storage e da tabela. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
