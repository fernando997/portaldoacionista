import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Link2, Plus, Copy, CheckCircle2, Clock, Loader2, FileText,
  Eye, XCircle, ShieldCheck, IdCard, FileCheck, AlertTriangle, RefreshCw, Trash2,
  ScrollText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OnboardingRequest {
  id: string;
  pedido_id: string;
  client_name: string | null;
  token: string;
  cnpj: string | null;
  senha_certificado: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  certificado_digital_url: string | null;
  cnh_url: string | null;
  procuracao_url: string | null;
}

interface OnboardingLog {
  id: string;
  request_payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

const DOC_FIELDS = [
  { key: 'cnpj', label: 'CNPJ', icon: ShieldCheck, type: 'text' },
  { key: 'certificado_digital_url', label: 'Certificado Digital', icon: FileCheck, type: 'file' },
  { key: 'senha_certificado', label: 'Senha do Certificado', icon: ShieldCheck, type: 'text' },
  { key: 'cnh_url', label: 'CNH', icon: IdCard, type: 'file' },
  { key: 'procuracao_url', label: 'Procuração', icon: FileText, type: 'file' },
] as const;

function getProgress(r: OnboardingRequest) {
  let filled = 0;
  if (r.cnpj) filled++;
  if (r.certificado_digital_url) filled++;
  if (r.senha_certificado) filled++;
  if (r.cnh_url) filled++;
  if (r.procuracao_url) filled++;
  return { filled, total: 5, percent: Math.round((filled / 5) * 100) };
}

function getMissing(r: OnboardingRequest) {
  const missing: string[] = [];
  if (!r.cnpj) missing.push('CNPJ');
  if (!r.certificado_digital_url) missing.push('Certificado Digital');
  if (!r.senha_certificado) missing.push('Senha do Certificado');
  if (!r.cnh_url) missing.push('CNH');
  if (!r.procuracao_url) missing.push('Procuração');
  return missing;
}

export default function AdminOnboardingPage() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [pedidoId, setPedidoId] = useState('');
  const [clientName, setClientName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<OnboardingRequest | null>(null);
  const [resending, setResending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OnboardingRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [logs, setLogs] = useState<OnboardingLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchLogs = async (requestId: string) => {
    setLogsLoading(true);
    const { data } = await supabase
      .from('onboarding_logs')
      .select('*')
      .eq('onboarding_request_id', requestId)
      .order('created_at', { ascending: false });
    setLogs((data as OnboardingLog[]) || []);
    setLogsLoading(false);
  };

  const openDetails = (r: OnboardingRequest) => {
    setSelected(r);
    fetchLogs(r.id);
  };
  const fetchRequests = async () => {
    const { data } = await supabase
      .from('onboarding_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests((data as OnboardingRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleCreate = async () => {
    if (!pedidoId.trim()) {
      toast.error('Informe o ID do Pedido');
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('onboarding_requests').insert({
      pedido_id: pedidoId.trim(),
      client_name: clientName.trim() || null,
      created_by: session?.user?.id,
    } as any);
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Link de onboarding criado!');
    setPedidoId('');
    setClientName('');
    setShowCreate(false);
    fetchRequests();
  };

  const copyLink = (token: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/onboarding?token=${token}`);
    setCopiedId(id);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResend = async (r: OnboardingRequest) => {
    setResending(true);
    const payload = {
      pedido: r.pedido_id,
      cnpj: r.cnpj,
      certificado: r.certificado_digital_url,
      senha: r.senha_certificado,
      cnh: r.cnh_url,
      procuracao: r.procuracao_url,
    };
    try {
      const res = await fetch('https://modocorreapp.com.br/api/1.1/wf/pool_envioonboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resBody = await res.text().catch(() => '');
      await supabase.from('onboarding_logs').insert({
        onboarding_request_id: r.id,
        pedido_id: r.pedido_id,
        request_payload: payload,
        response_status: res.status,
        response_body: resBody,
        success: res.ok,
        error_message: res.ok ? null : `HTTP ${res.status}`,
      } as any);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      toast.success('Dados reenviados com sucesso!');
      if (selected) fetchLogs(selected.id);
    } catch (err: any) {
      toast.error('Falha ao reenviar: ' + (err.message || ''));
    } finally {
      setResending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('onboarding_requests').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    toast.success('Processo de onboarding excluído!');
    setDeleteTarget(null);
    if (selected?.id === deleteTarget.id) setSelected(null);
    fetchRequests();
  };

  // KPIs
  const total = requests.length;
  const completos = requests.filter(r => r.status === 'completo').length;
  const pendentes = total - completos;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Administração</p>
          <h1 className="section-title mb-0">Links de Onboarding</h1>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Gerar Link
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.05s', opacity: 0 }}>
        <div className="bg-card rounded-xl border p-5 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground font-medium">Total de Links</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{completos}</p>
            <p className="text-xs text-muted-foreground font-medium">Completos</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-11 h-11 rounded-xl bg-[hsl(38,92%,50%)]/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[hsl(38,92%,50%)]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{pendentes}</p>
            <p className="text-xs text-muted-foreground font-medium">Pendentes</p>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-7 h-7 opacity-40" />
          </div>
          <p className="font-medium">Nenhum link criado ainda</p>
          <p className="text-sm mt-1">Clique em "Gerar Link" para começar.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Pedido</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Progresso</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Itens Pendentes</TableHead>
                <TableHead className="font-semibold">Criado em</TableHead>
                <TableHead className="text-right font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const progress = getProgress(r);
                const missing = getMissing(r);
                return (
                  <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono font-bold text-foreground">{r.pedido_id}</TableCell>
                    <TableCell className="text-foreground">{r.client_name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <Progress value={progress.percent} className="h-2 flex-1" />
                        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {progress.filled}/{progress.total}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.status === 'completo' ? (
                        <Badge className="bg-accent/15 text-accent border-accent/30 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/30 bg-[hsl(38,92%,50%)]/10">
                          <Clock className="w-3 h-3" /> Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {missing.length === 0 ? (
                        <span className="text-xs text-accent font-medium">Tudo enviado ✓</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {missing.map(m => (
                            <Badge key={m} variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-destructive/80 border-destructive/20 bg-destructive/5">
                              <XCircle className="w-2.5 h-2.5" /> {m}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(r)}
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="w-4 h-4" /> Detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLink(r.token, r.id)}
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === r.id ? (
                            <><CheckCircle2 className="w-4 h-4 text-accent" /> Copiado</>
                          ) : (
                            <><Copy className="w-4 h-4" /> Link</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(r)}
                          className="gap-1.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (() => {
            const progress = getProgress(selected);
            return (
              <>
                <SheetHeader className="space-y-4 pb-6">
                  <SheetTitle className="text-xl">
                    Onboarding — <span className="font-mono">{selected.pedido_id}</span>
                    {selected.client_name && (
                      <p className="text-sm font-normal text-muted-foreground mt-1">{selected.client_name}</p>
                    )}
                  </SheetTitle>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Progresso geral</span>
                      <span className="font-bold text-foreground">{progress.percent}%</span>
                    </div>
                    <Progress value={progress.percent} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      {progress.filled} de {progress.total} itens preenchidos
                    </p>
                  </div>
                </SheetHeader>

                <div className="space-y-3 pt-2">
                  {DOC_FIELDS.map(({ key, label, icon: Icon, type }) => {
                    const value = (selected as any)[key];
                    const filled = !!value;
                    return (
                      <div
                        key={key}
                        className={`rounded-xl border p-4 transition-colors ${
                          filled
                            ? 'bg-accent/5 border-accent/20'
                            : 'bg-destructive/5 border-destructive/15'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              filled ? 'bg-accent/15' : 'bg-destructive/10'
                            }`}>
                              <Icon className={`w-4 h-4 ${filled ? 'text-accent' : 'text-destructive/60'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{label}</p>
                              {filled ? (
                                type === 'file' ? (
                                  <a
                                    href={value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    Abrir arquivo ↗
                                  </a>
                                ) : (
                                  <p className="text-xs text-muted-foreground font-mono">{value}</p>
                                )
                              ) : (
                                <p className="text-xs text-destructive/70 font-medium">Não enviado</p>
                              )}
                            </div>
                          </div>
                          {filled ? (
                            <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-destructive/50 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Criado em</span>
                    <span className="font-medium text-foreground">
                      {new Date(selected.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {selected.completed_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Concluído em</span>
                      <span className="font-medium text-accent">
                        {new Date(selected.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-2 gap-2"
                    onClick={() => copyLink(selected.token, selected.id)}
                  >
                    <Copy className="w-4 h-4" />
                    {copiedId === selected.id ? 'Link Copiado!' : 'Copiar Link de Onboarding'}
                  </Button>
                  {selected.status === 'completo' && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/5"
                      onClick={() => handleResend(selected)}
                      disabled={resending}
                    >
                      {resending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Reenviando...</>
                      ) : (
                        <><RefreshCw className="w-4 h-4" /> Reenviar para API</>
                      )}
                    </Button>
                  )}
                </div>

                {/* Logs de Envio */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <ScrollText className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Log de Requisições</h3>
                  </div>
                  {logsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhuma requisição registrada.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className={`rounded-lg border p-3 text-xs space-y-1.5 ${
                            log.success
                              ? 'bg-accent/5 border-accent/20'
                              : 'bg-destructive/5 border-destructive/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </span>
                            <Badge
                              className={
                                log.success
                                  ? 'bg-accent/15 text-accent border-accent/30 text-[10px]'
                                  : 'bg-destructive/15 text-destructive border-destructive/30 text-[10px]'
                              }
                            >
                              {log.success ? 'Sucesso' : 'Falha'}
                              {log.response_status && ` (${log.response_status})`}
                            </Badge>
                          </div>
                          {log.error_message && (
                            <p className="text-destructive/80 font-mono">{log.error_message}</p>
                          )}
                          <details className="cursor-pointer">
                            <summary className="text-muted-foreground hover:text-foreground transition-colors">
                              Ver payload enviado
                            </summary>
                            <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto font-mono">
                              {JSON.stringify(log.request_payload, null, 2)}
                            </pre>
                          </details>
                          {log.response_body && (
                            <details className="cursor-pointer">
                              <summary className="text-muted-foreground hover:text-foreground transition-colors">
                                Ver resposta
                              </summary>
                              <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto font-mono">
                                {log.response_body}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Link de Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold">Nome do Cliente</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">ID do Pedido</Label>
              <Input
                placeholder="Ex: PED-12345"
                value={pedidoId}
                onChange={(e) => setPedidoId(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                O link será atrelado a este pedido. O cliente receberá o link para enviar seus documentos.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              Gerar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processo de onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              O onboarding do pedido <strong className="font-mono">{deleteTarget?.pedido_id}</strong>
              {deleteTarget?.client_name && <> ({deleteTarget.client_name})</>} será excluído permanentemente. Esta ação não pode ser desfeita.
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
