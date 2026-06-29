import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Package, Search, Loader2, ArrowLeft, Check, Upload, Eye,
  Building2, DollarSign, ExternalLink, X, Copy,
  CircleCheck, CircleDot, Circle, RotateCcw, RefreshCw, FileText, FolderOpen, Landmark,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OnboardingData {
  id: string;
  pedido_id: string;
  token: string;
  cnpj: string | null;
  senha_certificado: string | null;
  certificado_digital_url: string | null;
  cnh_url: string | null;
  procuracao_url: string | null;
  assinatura_url: string | null;
  comprovante_taxa_url: string | null;
  status: string;
  cliente: string | null;
  payment_url: string | null;
  payment_status: string | null;
  payment_descricao: string | null;
  asaas_config: {
    pixAuto: boolean; webhookVencido: boolean; webhookPagamento: boolean; webhookTransferencia: boolean;
    accountCreated?: boolean; accountId?: string; pixCreated?: boolean; webhooksCreated?: string[]; errors?: string[]; createdAt?: string;
  } | null;
  razao_social: string | null;
  email_corporativo: string | null;
  created_at: string;
  completed_at: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function calcProgress(o: OnboardingData) {
  const items = [
    { label: 'CNPJ', ok: !!o.cnpj },
    { label: 'Endereco', ok: !!(o.cep && o.rua) },
    { label: 'Conta Asaas', ok: !!o.asaas_config?.accountCreated },
    { label: 'Certificado', ok: !!o.certificado_digital_url },
    { label: 'Senha Cert.', ok: !!o.senha_certificado },
    { label: 'CNH', ok: !!o.cnh_url },
    { label: 'Procuracao', ok: !!o.procuracao_url },
    { label: 'Assinatura', ok: !!o.assinatura_url },
  ];
  const done = items.filter(i => i.ok).length;
  return { items, done, total: 8, pct: Math.round((done / 8) * 100) };
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
      {children}{required && <span className="text-primary ml-0.5">*</span>}
    </label>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminOnboardingPage() {
  const { toast } = useToast();
  const { session, role } = useAuth();
  const [searchParams] = useSearchParams();

  // ── List state ─────────────────────────────────────────────────────────────
  const [allOnboardings, setAllOnboardings] = useState<OnboardingData[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'concluido'>('all');
  const [busca, setBusca] = useState('');

  // ── Detail state ───────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onboardingDetalhe, setOnboardingDetalhe] = useState<OnboardingData | null>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [updatingOnboarding, setUpdatingOnboarding] = useState(false);

  // ── Editable fields ────────────────────────────────────────────────────────
  const [editRazaoSocial, setEditRazaoSocial] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editSenhaCert, setEditSenhaCert] = useState('');
  const [savingOnboardingField, setSavingOnboardingField] = useState(false);
  const [uploadingOnboardingDoc, setUploadingOnboardingDoc] = useState<string | null>(null);
  const [stagedOnboardingFiles, setStagedOnboardingFiles] = useState<Record<string, File>>({});
  const [showCnpjConfirm, setShowCnpjConfirm] = useState(false);
  const [creatingShareholderFromCnpj, setCreatingShareholderFromCnpj] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Asaas config
  const [asaasPixAuto, setAsaasPixAuto] = useState(true);
  const [asaasWebhookVencimento, setAsaasWebhookVencimento] = useState(true);
  const [asaasWebhookPagamento, setAsaasWebhookPagamento] = useState(true);
  const [asaasWebhookTransferencia, setAsaasWebhookTransferencia] = useState(true);
  const [asaasConfirmado, setAsaasConfirmado] = useState(false);
  const [savingAsaas, setSavingAsaas] = useState(false);

  // Address editing
  const [editCep, setEditCep] = useState('');
  const [editRua, setEditRua] = useState('');
  const [editNumero, setEditNumero] = useState('');
  const [editComplemento, setEditComplemento] = useState('');
  const [editBairro, setEditBairro] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);

  // ── Load list ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadList();
  }, []);

  // ── Deep linking via URL params ────────────────────────────────────────────

  useEffect(() => {
    const pedidoParam = searchParams.get('pedido');
    if (pedidoParam && allOnboardings.length > 0) {
      const found = allOnboardings.find(o => o.pedido_id === pedidoParam);
      if (found) {
        setSelectedId(found.id);
      }
    }
  }, [searchParams, allOnboardings]);

  async function loadList() {
    setLoadingList(true);
    let query = (supabase as any)
      .from('onboarding_requests')
      .select('*');
    if (role === 'vendedor') {
      query = query.eq('created_by', session?.user?.id);
    }
    const { data } = await query.order('created_at', { ascending: false });
    setAllOnboardings((data ?? []) as OnboardingData[]);
    setLoadingList(false);
  }

  // ── Load detail ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedId) {
      setOnboardingDetalhe(null);
      setStagedOnboardingFiles({});
      return;
    }
    loadOnboardingDetalhe(selectedId);
  }, [selectedId]);

  async function loadOnboardingDetalhe(id: string) {
    setLoadingOnboarding(true);
    setStagedOnboardingFiles({});
    const { data } = await (supabase as any)
      .from('onboarding_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setOnboardingDetalhe(data as OnboardingData | null);
    setLoadingOnboarding(false);
  }

  // ── Sync edit fields when detail loads ─────────────────────────────────────

  useEffect(() => {
    if (onboardingDetalhe) {
      setEditRazaoSocial(onboardingDetalhe.razao_social ?? '');
      setEditCnpj(onboardingDetalhe.cnpj ?? '');
      setEditSenhaCert(onboardingDetalhe.senha_certificado ?? '');
      setEditCep(onboardingDetalhe.cep ?? '');
      setEditRua(onboardingDetalhe.rua ?? '');
      setEditNumero(onboardingDetalhe.numero ?? '');
      setEditComplemento(onboardingDetalhe.complemento ?? '');
      setEditBairro(onboardingDetalhe.bairro ?? '');
      setEditCidade(onboardingDetalhe.cidade ?? '');
      setEditEstado(onboardingDetalhe.estado ?? '');
      // Asaas config
      if (onboardingDetalhe.asaas_config) {
        const cfg = onboardingDetalhe.asaas_config;
        setAsaasPixAuto(cfg.pixAuto ?? true);
        setAsaasWebhookVencimento(cfg.webhookVencido ?? true);
        setAsaasWebhookPagamento(cfg.webhookPagamento ?? true);
        setAsaasWebhookTransferencia(cfg.webhookTransferencia ?? true);
        setAsaasConfirmado(cfg.accountCreated === true);
      } else {
        setAsaasPixAuto(true);
        setAsaasWebhookVencimento(true);
        setAsaasWebhookPagamento(true);
        setAsaasWebhookTransferencia(true);
        setAsaasConfirmado(false);
      }

      // Auto-detect step from saved data
      if (onboardingDetalhe.cnpj && onboardingDetalhe.cep && onboardingDetalhe.rua && onboardingDetalhe.asaas_config?.accountCreated) {
        setCurrentStep(3);
      } else if (onboardingDetalhe.cnpj && onboardingDetalhe.cep && onboardingDetalhe.rua) {
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    }
  }, [onboardingDetalhe?.id]);

  // ── CEP lookup ─────────────────────────────────────────────────────────────

  async function buscarCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEditRua(data.logradouro || '');
        setEditBairro(data.bairro || '');
        setEditCidade(data.localidade || '');
        setEditEstado(data.uf || '');
      }
    } catch { /* silently fail */ }
    setBuscandoCep(false);
  }

  // ── Save field ─────────────────────────────────────────────────────────────

  async function saveOnboardingField(field: 'cnpj' | 'senha_certificado', value: string) {
    if (!onboardingDetalhe) return;
    setSavingOnboardingField(true);
    const { error } = await (supabase as any)
      .from('onboarding_requests')
      .update({ [field]: value })
      .eq('id', onboardingDetalhe.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Salvo!' });
      setOnboardingDetalhe(prev => prev ? { ...prev, [field]: value } : null);
      // Also update list item
      setAllOnboardings(prev => prev.map(o => o.id === onboardingDetalhe.id ? { ...o, [field]: value } : o));
    }
    setSavingOnboardingField(false);
  }

  // ── Save address ───────────────────────────────────────────────────────────

  async function saveOnboardingAddress() {
    if (!onboardingDetalhe) return;
    setSavingOnboardingField(true);
    const addr = { cep: editCep, rua: editRua, numero: editNumero,
      complemento: editComplemento, bairro: editBairro, cidade: editCidade, estado: editEstado };
    const { error } = await (supabase as any)
      .from('onboarding_requests').update(addr).eq('id', onboardingDetalhe.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Endereco salvo!' });
      setOnboardingDetalhe(prev => prev ? { ...prev, ...addr } : null);
      setAllOnboardings(prev => prev.map(o => o.id === onboardingDetalhe.id ? { ...o, ...addr } : o));
    }
    setSavingOnboardingField(false);
  }

  // ── Update status ──────────────────────────────────────────────────────────

  async function updateOnboardingStatus(newStatus: string) {
    if (!onboardingDetalhe) return;
    setUpdatingOnboarding(true);
    const updateData: any = { status: newStatus };
    if (newStatus === 'concluido') updateData.completed_at = new Date().toISOString();
    const { error } = await (supabase as any)
      .from('onboarding_requests')
      .update(updateData)
      .eq('id', onboardingDetalhe.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      // Atualizar status do profile: Ativo ao concluir, Pendente ao reverter
      const numStr = onboardingDetalhe.pedido_id.split('-').pop();
      const { data: pedido } = await (supabase as any)
        .from('pedidos').select('investidor_id').eq('numero', parseInt(numStr!)).maybeSingle();
      if (pedido) {
        const { data: inv } = await (supabase as any)
          .from('investidores').select('profile_id, locadora_bubble_id').eq('id', pedido.investidor_id).maybeSingle();
        if (inv?.profile_id) {
          const profileUpdate: any = { status: newStatus === 'concluido' ? 'Ativo' : 'Pendente' };
          if (newStatus === 'concluido' && onboardingDetalhe.razao_social) {
            profileUpdate.name = onboardingDetalhe.razao_social;
          }
          await supabase.from('profiles')
            .update(profileUpdate)
            .eq('id', inv.profile_id);
        }
        // Ativar locadora no Bubble ao concluir
        if (newStatus === 'concluido' && inv?.locadora_bubble_id) {
          try {
            await fetch('https://modocorreapp.com.br/version-test/api/1.1/wf/at-locadora-ativo', {
              method: 'POST',
              body: new URLSearchParams({
                apikey: 'sderfgy65434567uyt432wsdtyu90lkjfe32',
                locadora: inv.locadora_bubble_id,
              }),
            });
          } catch {
            // Não bloqueia o fluxo se falhar
          }
        }
      }

      toast({ title: newStatus === 'concluido' ? 'Onboarding concluido!' : `Status: ${newStatus}` });
      setOnboardingDetalhe(prev => prev ? { ...prev, status: newStatus, ...(newStatus === 'concluido' ? { completed_at: new Date().toISOString() } : {}) } : null);
      setAllOnboardings(prev => prev.map(o => o.id === onboardingDetalhe.id ? { ...o, status: newStatus } : o));
    }
    setUpdatingOnboarding(false);
  }

  // ── Upload doc ─────────────────────────────────────────────────────────────

  async function uploadOnboardingDoc(file: File, folder: string, dbField: 'certificado_digital_url' | 'cnh_url' | 'procuracao_url' | 'assinatura_url' | 'comprovante_taxa_url') {
    if (!onboardingDetalhe) return;
    setUploadingOnboardingDoc(dbField);
    try {
      const ext = file.name.split('.').pop();
      const path = `${onboardingDetalhe.id}/${folder}/${Date.now()}.${ext}`;
      const { error: upErr } = await (supabase as any).storage.from('onboarding-docs').upload(path, file);
      if (upErr) throw upErr;
      const url = (supabase as any).storage.from('onboarding-docs').getPublicUrl(path).data.publicUrl;
      const { error: dbErr } = await (supabase as any).from('onboarding_requests').update({ [dbField]: url }).eq('id', onboardingDetalhe.id);
      if (dbErr) throw dbErr;
      setOnboardingDetalhe(prev => prev ? { ...prev, [dbField]: url } : null);
      setAllOnboardings(prev => prev.map(o => o.id === onboardingDetalhe.id ? { ...o, [dbField]: url } : o));
      toast({ title: 'Documento enviado!' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingOnboardingDoc(null);
    }
  }

  // ── CNPJ confirm ───────────────────────────────────────────────────────────

  async function criarEmailCpanel(cnpj: string): Promise<string> {
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-email-cpanel`;
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ cnpj }),
    });
    const body = await res.json();
    const digits = cnpj.replace(/\D/g, '');
    const fallbackEmail = `${digits}@modocorreinvest.com.br`;
    if (!res.ok || body.error) {
      // Se o email já existe no cPanel, tratar como sucesso
      if (body.error && (body.error.includes('already') || body.error.includes('já exist'))) {
        return body.email || fallbackEmail;
      }
      throw new Error(body.error || `Erro HTTP ${res.status}`);
    }
    return body.email || fallbackEmail;
  }

  async function handleCnpjConfirm() {
    if (!onboardingDetalhe) return;
    setCreatingShareholderFromCnpj(true);
    try {
      // 1. Salvar CNPJ + endereco
      const updates = {
        razao_social: editRazaoSocial,
        cnpj: editCnpj,
        cep: editCep, rua: editRua, numero: editNumero,
        complemento: editComplemento, bairro: editBairro, cidade: editCidade, estado: editEstado,
      };
      const { error: saveErr } = await (supabase as any)
        .from('onboarding_requests')
        .update(updates)
        .eq('id', onboardingDetalhe.id);
      if (saveErr) throw saveErr;

      setOnboardingDetalhe(prev => prev ? { ...prev, ...updates } : null);
      setAllOnboardings(prev => prev.map(o => o.id === onboardingDetalhe.id ? { ...o, ...updates } : o));

      // 2. Buscar investidor via pedido
      const numStr = onboardingDetalhe.pedido_id.split('-').pop();
      const { data: pedido } = await (supabase as any)
        .from('pedidos')
        .select('id, investidor_id')
        .eq('numero', parseInt(numStr!))
        .maybeSingle();

      if (!pedido) throw new Error('Pedido nao encontrado');

      const { data: inv } = await (supabase as any)
        .from('investidores')
        .select('id, nome')
        .eq('id', pedido.investidor_id)
        .single();
      if (!inv) throw new Error('Investidor nao encontrado');

      // 3. Criar email no cPanel
      const email = await criarEmailCpanel(editCnpj);

      // 3.1 Salvar email_corporativo no onboarding_requests
      await (supabase as any)
        .from('onboarding_requests')
        .update({ email_corporativo: email })
        .eq('id', onboardingDetalhe.id);
      setOnboardingDetalhe(prev => prev ? { ...prev, email_corporativo: email } : null);
      setAllOnboardings(prev => prev.map(o => o.id === onboardingDetalhe.id ? { ...o, email_corporativo: email } : o));

      // 4. Criar auth user + profile
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ email, password: 'Modo@corre1', name: inv.nome, role: 'user' }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || `Erro ${res.status}`);

      // 5. Buscar profile criado
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', result.user_id)
        .single();
      if (!profile) throw new Error('Profile nao encontrado');

      // 6. Linkar profile_id no investidor
      await (supabase as any)
        .from('investidores')
        .update({ profile_id: profile.id })
        .eq('id', inv.id);

      // 7. Marcar profile como Pendente (fica Ativo somente ao concluir onboarding)
      await supabase
        .from('profiles')
        .update({ status: 'Pendente' })
        .eq('id', profile.id);

      toast({ title: 'Dados salvos!', description: `Email criado: ${email}` });
      setCurrentStep(2);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingShareholderFromCnpj(false);
      setShowCnpjConfirm(false);
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = allOnboardings.filter(o => {
    if (statusFilter !== 'all' && (o.status ?? 'pendente') !== statusFilter) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        (o.cliente ?? '').toLowerCase().includes(q) ||
        o.pedido_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  if (selectedId) {
    return renderDetail();
  }
  return renderList();

  // ─── List View ─────────────────────────────────────────────────────────────

  function renderList() {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h1 className="text-xl font-bold text-foreground">Onboarding</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie o onboarding de novos investidores</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0 bg-muted/10">
          {([
            { id: 'all' as const, label: 'Todos' },
            { id: 'pendente' as const, label: 'Pendente' },
            { id: 'concluido' as const, label: 'Concluido' },
          ]).map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                statusFilter === f.id
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Buscar cliente ou pedido..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingList ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-sm">{busca || statusFilter !== 'all' ? 'Nenhum resultado.' : 'Nenhum onboarding cadastrado.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(o => {
                const prog = calcProgress(o);
                const status = o.status ?? 'pendente';
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className="text-left rounded-2xl border border-border bg-background p-5 space-y-3 hover:border-primary/30 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{o.cliente ?? 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{o.pedido_id}</p>
                      </div>
                      <Badge className={cn(
                        'text-[11px]',
                        status === 'concluido'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200',
                      )}>
                        {status === 'concluido' ? 'Concluido' : 'Pendente'}
                      </Badge>
                    </div>
                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', prog.pct >= 100 ? 'bg-emerald-400' : 'bg-amber-400')}
                          style={{ width: `${prog.pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{prog.done}/{prog.total} ({prog.pct}%)</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Detail View ───────────────────────────────────────────────────────────

  function renderDetail() {
    const o = onboardingDetalhe;
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {/* Hero header */}
        <div className="relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/8 via-amber-500/4 to-transparent pointer-events-none" />
          <div className="relative px-8 py-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Voltar</span>
              </button>
              {o && (
                <span className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
            {o && (
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center shrink-0">
                  <Package className="w-7 h-7 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">{o.cliente ?? 'Sem nome'}</h2>
                    <Badge className={cn(
                      'text-[11px]',
                      (o.status ?? 'pendente') === 'concluido'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200',
                    )}>
                      {(o.status ?? 'pendente') === 'concluido' ? 'Concluido' : 'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{o.pedido_id}</p>
                </div>
              </div>
            )}
          </div>
          <div className="h-px bg-border" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loadingOnboarding ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !o ? (
            <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-sm">Onboarding nao encontrado.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-8 space-y-8">
              {/* Progress card */}
              {renderProgressCard()}

              {/* Stepper */}
              {renderStepper()}

              {/* Step content */}
              {currentStep === 1 && renderSectionDados()}
              {currentStep === 2 && (
                <>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-4" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Dados
                  </Button>
                  {renderSectionAsaas()}
                </>
              )}
              {currentStep === 3 && (
                <>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground mb-4" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Conta Asaas
                  </Button>
                  {renderSectionDocumentos()}
                  <div className="mt-6">{renderSectionPagamento()}</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* AlertDialog: Confirmar CNPJ */}
        <AlertDialog open={showCnpjConfirm} onOpenChange={setShowCnpjConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar dados</AlertDialogTitle>
              <AlertDialogDescription>
                Ao confirmar, serao salvos o CNPJ e endereco do investidor.
                Sera criado automaticamente um e-mail corporativo e uma conta Asaas para este investidor.
                Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={creatingShareholderFromCnpj}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCnpjConfirm} disabled={creatingShareholderFromCnpj}>
                {creatingShareholderFromCnpj && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── Progress Card ─────────────────────────────────────────────────────────

  function renderProgressCard() {
    if (!onboardingDetalhe) return null;
    const { items, done, total, pct } = calcProgress(onboardingDetalhe);
    const isComplete = done >= total;

    return (
      <div className={cn(
        'rounded-2xl border-2 overflow-hidden',
        isComplete ? 'border-emerald-300 bg-emerald-50/30' : 'border-amber-300 bg-amber-50/30',
      )}>
        <div className={cn('px-5 py-4 flex items-center justify-between', isComplete ? 'bg-emerald-50/60' : 'bg-amber-50/60')}>
          <div>
            <p className={cn('text-2xl font-black', isComplete ? 'text-emerald-700' : 'text-amber-700')}>{pct}%</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{done} de {total} etapas concluidas</p>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 border',
            onboardingDetalhe.status === 'concluido'
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-amber-700 bg-amber-50 border-amber-200',
          )}>
            {onboardingDetalhe.status === 'concluido' ? <CircleCheck className="w-3 h-3" /> : <CircleDot className="w-3 h-3" />}
            {onboardingDetalhe.status === 'concluido' ? 'Concluido' : 'Pendente'}
          </span>
        </div>
        {/* Progress bar */}
        <div className="px-5 pt-3 pb-1">
          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', isComplete ? 'bg-emerald-400' : 'bg-amber-400')} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {/* Checklist grid */}
        <div className="px-5 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.ok ? (
                <CircleCheck className={cn('w-3.5 h-3.5 shrink-0', isComplete ? 'text-emerald-500' : 'text-amber-500')} />
              ) : (
                <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              )}
              <span className={cn('text-xs', item.ok ? 'text-foreground font-medium' : 'text-muted-foreground')}>{item.label}</span>
            </div>
          ))}
        </div>
        {/* Concluir/Reverter */}
        <div className="px-5 pb-4">
          {onboardingDetalhe.status !== 'concluido' ? (
            <Button className="w-full h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50" disabled={updatingOnboarding || !isComplete} onClick={() => updateOnboardingStatus('concluido')} title={!isComplete ? 'Preencha todos os itens antes de concluir' : ''}>
              {updatingOnboarding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Marcar Concluido
            </Button>
          ) : (
            <Button variant="outline" className="w-full h-9 text-xs gap-1.5" disabled={updatingOnboarding} onClick={() => updateOnboardingStatus('pendente')}>
              {updatingOnboarding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Reverter
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Stepper ─────────────────────────────────────────────────────────────────

  function renderStepper() {
    if (!onboardingDetalhe) return null;
    const step1Complete = !!(onboardingDetalhe.cnpj && onboardingDetalhe.cep && onboardingDetalhe.rua);
    const step2Complete = asaasConfirmado;

    const stepperItems = [
      { step: 1 as const, label: 'Dados', complete: step1Complete, canClick: true },
      { step: 2 as const, label: 'Conta Asaas', complete: step2Complete, canClick: step1Complete },
      { step: 3 as const, label: 'Documentos', complete: false, canClick: step1Complete && step2Complete },
    ];

    return (
      <div className="flex items-center gap-2 px-2">
        {stepperItems.map((item, i) => (
          <div key={item.step} className="flex items-center gap-2 flex-1">
            <div
              className={cn('flex items-center gap-2', item.canClick ? 'cursor-pointer' : 'cursor-not-allowed')}
              onClick={() => item.canClick && setCurrentStep(item.step)}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors shrink-0',
                currentStep === item.step
                  ? 'border-primary bg-primary text-white'
                  : item.complete
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-300 bg-gray-50 text-gray-400'
              )}>
                {item.complete && currentStep !== item.step ? <Check className="w-4 h-4" /> : item.step}
              </div>
              <span className={cn('text-sm font-semibold whitespace-nowrap', currentStep === item.step ? 'text-foreground' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </div>
            {i < stepperItems.length - 1 && (
              <div className={cn('flex-1 h-0.5 rounded-full ml-2', item.complete ? 'bg-emerald-400' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ─── Section: Dados da Empresa ──────────────────────────────────────────────

  function renderSectionDados() {
    if (!onboardingDetalhe) return null;
    const cnpjOk = editCnpj.replace(/\D/g, '').length === 14;
    const cepOk = editCep.replace(/\D/g, '').length === 8;

    return (
      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        {/* Section header */}
        <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Dados da Empresa</p>
            <p className="text-[11px] text-muted-foreground">CNPJ e endereco</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Razao Social */}
          <div>
            <FieldLabel required>Razao Social</FieldLabel>
            <Input
              className="h-9 text-sm"
              value={editRazaoSocial}
              onChange={e => setEditRazaoSocial(e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>

          {/* CNPJ */}
          <div>
            <FieldLabel required>CNPJ</FieldLabel>
            <Input
              className="h-9 text-sm"
              value={editCnpj}
              onChange={e => setEditCnpj(formatCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
            />
            {onboardingDetalhe.cnpj && (
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                <CircleCheck className="w-3 h-3" /> CNPJ salvo
              </p>
            )}
          </div>

          {/* CEP */}
          <div>
            <FieldLabel required>CEP</FieldLabel>
            <div className="relative">
              <Input
                className="h-9 text-sm"
                value={editCep}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setEditCep(v);
                  if (v.length === 8) buscarCep(v);
                }}
                placeholder="00000-000"
              />
              {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Address grid — sempre visivel */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldLabel>Rua</FieldLabel>
              <Input className="h-9 text-sm" value={editRua} onChange={e => setEditRua(e.target.value)} placeholder="Logradouro" />
            </div>
            <div>
              <FieldLabel>Numero</FieldLabel>
              <Input className="h-9 text-sm" value={editNumero} onChange={e => setEditNumero(e.target.value)} placeholder="N." />
            </div>
            <div>
              <FieldLabel>Complemento</FieldLabel>
              <Input className="h-9 text-sm" value={editComplemento} onChange={e => setEditComplemento(e.target.value)} placeholder="Apto, sala..." />
            </div>
            <div>
              <FieldLabel>Bairro</FieldLabel>
              <Input className="h-9 text-sm" value={editBairro} onChange={e => setEditBairro(e.target.value)} placeholder="Bairro" />
            </div>
            <div>
              <FieldLabel>Cidade</FieldLabel>
              <Input className="h-9 text-sm" value={editCidade} onChange={e => setEditCidade(e.target.value)} placeholder="Cidade" />
            </div>
            <div>
              <FieldLabel>Estado</FieldLabel>
              <Input className="h-9 text-sm" value={editEstado} onChange={e => setEditEstado(e.target.value)} placeholder="UF" maxLength={2} />
            </div>
          </div>

          {onboardingDetalhe.cnpj && onboardingDetalhe.cep && onboardingDetalhe.rua ? (
            <Button
              className="w-full h-10 text-sm gap-2 bg-primary hover:bg-primary/90 mt-2"
              disabled={!editRazaoSocial.trim() || !cnpjOk || !cepOk || !editRua.trim() || !editCidade.trim()}
              onClick={() => setCurrentStep(2)}
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              Avancar
            </Button>
          ) : (
            <Button
              className="w-full h-10 text-sm gap-2 bg-primary hover:bg-primary/90 mt-2"
              disabled={!editRazaoSocial.trim() || !cnpjOk || !cepOk || !editRua.trim() || !editCidade.trim() || savingOnboardingField || creatingShareholderFromCnpj}
              onClick={() => setShowCnpjConfirm(true)}
            >
              {(savingOnboardingField || creatingShareholderFromCnpj) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar e Avancar
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Section: Conta Asaas ─────────────────────────────────────────────────

  function renderSectionAsaas() {
    if (!onboardingDetalhe) return null;

    return (
      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Landmark className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Conta Asaas</p>
            <p className="text-[11px] text-muted-foreground">Configuracoes da conta de pagamentos</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumo dados */}
          <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CNPJ</p>
              <p className="text-sm font-mono font-semibold text-foreground">{onboardingDetalhe.cnpj}</p>
            </div>
            {onboardingDetalhe.email_corporativo && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">E-mail Corporativo</p>
                <p className="text-sm font-mono font-semibold text-foreground">{onboardingDetalhe.email_corporativo}</p>
              </div>
            )}
            {onboardingDetalhe.rua && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Endereco</p>
                <p className="text-sm text-foreground">
                  {[onboardingDetalhe.rua, onboardingDetalhe.numero, onboardingDetalhe.complemento, onboardingDetalhe.bairro, onboardingDetalhe.cidade, onboardingDetalhe.estado, onboardingDetalhe.cep].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Configuracoes da Conta</p>
            <div className="space-y-2.5">
              <label className={cn('flex items-center gap-2.5', asaasConfirmado ? 'cursor-default opacity-70' : 'cursor-pointer')}>
                <Checkbox checked={asaasWebhookVencimento} onCheckedChange={(v) => setAsaasWebhookVencimento(!!v)} disabled={asaasConfirmado} />
                <span className="text-sm text-foreground">Ativar webhook de vencimento</span>
              </label>
              <label className={cn('flex items-center gap-2.5', asaasConfirmado ? 'cursor-default opacity-70' : 'cursor-pointer')}>
                <Checkbox checked={asaasWebhookPagamento} onCheckedChange={(v) => setAsaasWebhookPagamento(!!v)} disabled={asaasConfirmado} />
                <span className="text-sm text-foreground">Ativar webhook de pagamento</span>
              </label>
              <label className={cn('flex items-center gap-2.5', asaasConfirmado ? 'cursor-default opacity-70' : 'cursor-pointer')}>
                <Checkbox checked={asaasWebhookTransferencia} onCheckedChange={(v) => setAsaasWebhookTransferencia(!!v)} disabled={asaasConfirmado} />
                <span className="text-sm text-foreground">Ativar webhook de transferencia concluida</span>
              </label>
            </div>
          </div>

          {asaasConfirmado ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">Conta Asaas criada com sucesso</p>
              </div>
              {onboardingDetalhe.asaas_config?.accountId && (
                <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">Account ID</span>
                    <p className="font-mono text-foreground">{onboardingDetalhe.asaas_config.accountId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">PIX</span>
                    <p className="text-foreground">{onboardingDetalhe.asaas_config.pixCreated ? 'Criado' : 'Nao solicitado'}</p>
                  </div>
                  {(onboardingDetalhe.asaas_config.webhooksCreated?.length ?? 0) > 0 && (
                    <div>
                      <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">Webhooks</span>
                      <p className="text-foreground">{onboardingDetalhe.asaas_config.webhooksCreated!.join(', ')}</p>
                    </div>
                  )}
                  {(onboardingDetalhe.asaas_config.errors?.length ?? 0) > 0 && (
                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
                      <span className="text-amber-700 font-semibold text-[10px] uppercase tracking-wider">Erros parciais</span>
                      {onboardingDetalhe.asaas_config.errors!.map((e, i) => (
                        <p key={i} className="text-amber-800 text-xs">{e}</p>
                      ))}
                      {onboardingDetalhe.asaas_config.errors!.some(e => e.startsWith('Bubble:')) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                          disabled={savingAsaas}
                          onClick={async () => {
                            setSavingAsaas(true);
                            try {
                              const { data: retryData, error: retryErr } = await supabase.functions.invoke('criar-conta-asaas', {
                                body: { onboarding_request_id: onboardingDetalhe.id, retry_bubble: true },
                              });
                              if (retryErr) {
                                let errMsg = retryErr.message;
                                try { const b = retryData ?? (await (retryErr as any).context?.json?.()); if (b?.error) errMsg = b.error; } catch {}
                                toast({ title: 'Erro ao reenviar Bubble', description: errMsg, variant: 'destructive' });
                              } else if (retryData?.error) {
                                toast({ title: 'Erro ao reenviar Bubble', description: retryData.error, variant: 'destructive' });
                              } else {
                                toast({ title: 'Sucesso!', description: retryData.message });
                                const { data: updated } = await (supabase as any).from('onboarding_requests').select('*').eq('id', onboardingDetalhe.id).maybeSingle();
                                if (updated) {
                                  setOnboardingDetalhe(updated as OnboardingData);
                                  setAllOnboardings(prev => prev.map(o => o.id === updated.id ? updated as OnboardingData : o));
                                }
                              }
                            } catch (err: any) {
                              toast({ title: 'Erro', description: err.message, variant: 'destructive' });
                            }
                            setSavingAsaas(false);
                          }}
                        >
                          {savingAsaas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Reenviar registro Bubble
                        </Button>
                      )}
                    </div>
                  )}
                  {onboardingDetalhe.asaas_config.createdAt && (
                    <div>
                      <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">Criado em</span>
                      <p className="text-foreground">{new Date(onboardingDetalhe.asaas_config.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              className="w-full h-10 text-sm gap-2 bg-primary hover:bg-primary/90"
              disabled={savingAsaas}
              onClick={async () => {
                setSavingAsaas(true);
                try {
                  // First save checkbox config to DB
                  const config = {
                    pixAuto: asaasPixAuto,
                    webhookVencido: asaasWebhookVencimento,
                    webhookPagamento: asaasWebhookPagamento,
                    webhookTransferencia: asaasWebhookTransferencia,
                  };
                  await (supabase as any).from('onboarding_requests')
                    .update({ asaas_config: config })
                    .eq('id', onboardingDetalhe.id);

                  // Call Edge Function to create Asaas account
                  const { data: fnData, error: fnError } = await supabase.functions.invoke('criar-conta-asaas', {
                    body: { onboarding_request_id: onboardingDetalhe.id },
                  });

                  if (fnError) {
                    // supabase.functions.invoke wraps non-2xx as FunctionsHttpError
                    // The real error body is in fnError.context.json() or fnData
                    let errMsg = fnError.message;
                    try {
                      const errBody = fnData ?? (await (fnError as any).context?.json?.());
                      if (errBody?.error) errMsg = errBody.error;
                    } catch {}
                    toast({ title: 'Erro ao criar conta Asaas', description: errMsg, variant: 'destructive' });
                  } else if (fnData?.error) {
                    toast({ title: 'Erro ao criar conta Asaas', description: fnData.error, variant: 'destructive' });
                  } else {
                    // Reload to get updated asaas_config from DB
                    const { data: updated } = await (supabase as any).from('onboarding_requests')
                      .select('*').eq('id', onboardingDetalhe.id).maybeSingle();
                    if (updated) {
                      setOnboardingDetalhe(updated as OnboardingData);
                      setAllOnboardings(prev => prev.map(o => o.id === updated.id ? updated as OnboardingData : o));
                    }
                    setAsaasConfirmado(true);
                    const msgs = [`Conta criada: ${fnData.accountId}`];
                    if (fnData.pixCreated) msgs.push('PIX ativado');
                    if (fnData.webhooksCreated?.length) msgs.push(`Webhooks: ${fnData.webhooksCreated.join(', ')}`);
                    if (fnData.errors?.length) msgs.push(`Erros parciais: ${fnData.errors.join('; ')}`);
                    toast({ title: 'Conta Asaas criada!', description: msgs.join(' | ') });
                    setCurrentStep(3);
                  }
                } catch (err: any) {
                  toast({ title: 'Erro', description: err.message, variant: 'destructive' });
                }
                setSavingAsaas(false);
              }}
            >
              {savingAsaas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Criar Conta e Avancar
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Section: Documentos ──────────────────────────────────────────────────

  function renderSectionDocumentos() {
    if (!onboardingDetalhe) return null;

    return (
      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        {/* Section header */}
        <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FolderOpen className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Documentos</p>
            <p className="text-[11px] text-muted-foreground">Certificado, CNH, procuracao e assinatura</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {/* Acesso ao Webmail */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30 p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">📧 Acesso ao E-mail Corporativo</p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Acesse o portal do webmail para configurar o e-mail comercial do acionista:
            </p>
            <div className="flex flex-col gap-1.5 mt-1">
              {onboardingDetalhe.email_corporativo && (
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <span className="font-semibold">E-mail:</span>{' '}
                  <span className="font-mono select-all">{onboardingDetalhe.email_corporativo}</span>
                </p>
              )}
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <span className="font-semibold">Senha:</span>{' '}
                <span className="font-mono select-all">Modo@corre1</span>
              </p>
            </div>
            <a
              href="https://srv242.prodns.com.br:2096/cpsess3723969150/webmail"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir Webmail
            </a>
          </div>

          {/* Certificado Digital */}
          {renderDocCard('Certificado Digital', onboardingDetalhe.certificado_digital_url, 'certificado_digital_url', 'certificado', '.pfx,.p12,.cer,.crt')}

          {/* Senha do Certificado */}
          <div className="rounded-xl border p-4 space-y-2.5">
            <div className="flex items-center gap-2.5">
              {onboardingDetalhe.senha_certificado ? (
                <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 shrink-0" />
              )}
              <span className="text-sm font-medium text-foreground">Senha Cert.</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="h-9 text-sm flex-1"
                value={editSenhaCert}
                onChange={e => setEditSenhaCert(e.target.value)}
                placeholder="Senha do certificado"
              />
              <Button
                size="sm"
                className={cn('h-9 w-9 p-0 shrink-0 transition-colors', editSenhaCert !== (onboardingDetalhe.senha_certificado ?? '') ? 'bg-primary hover:bg-primary/90' : '')}
                disabled={savingOnboardingField || editSenhaCert === (onboardingDetalhe.senha_certificado ?? '')}
                onClick={() => saveOnboardingField('senha_certificado', editSenhaCert)}
              >
                {savingOnboardingField ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* CNH, Procuracao, Assinatura */}
          {renderDocCard('CNH', onboardingDetalhe.cnh_url, 'cnh_url', 'cnh', 'image/*,.pdf')}
          {renderDocCard('Procuracao', onboardingDetalhe.procuracao_url, 'procuracao_url', 'procuracao', '.pdf,.doc,.docx,image/*')}
          {renderDocCard('Assinatura', onboardingDetalhe.assinatura_url, 'assinatura_url', 'assinatura', '.png,.jpg,.jpeg')}
        </div>
      </div>
    );
  }

  // ─── Section: Pagamento ───────────────────────────────────────────────────

  function renderSectionPagamento() {
    if (!onboardingDetalhe) return null;

    return (
      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        {/* Section header */}
        <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Taxa de Adesao</p>
            <p className="text-[11px] text-muted-foreground">Comprovante de pagamento da taxa de adesao</p>
          </div>
        </div>

        <div className="p-5">
          {renderDocCard('Comprovante Taxa de Adesao', onboardingDetalhe.comprovante_taxa_url, 'comprovante_taxa_url', 'comprovante-taxa', '.pdf,.png,.jpg,.jpeg')}
        </div>
      </div>
    );
  }

  // ─── Doc Card ──────────────────────────────────────────────────────────────

  function renderDocCard(label: string, url: string | null, field: 'certificado_digital_url' | 'cnh_url' | 'procuracao_url' | 'assinatura_url' | 'comprovante_taxa_url', folder: string, accept: string) {
    const staged = stagedOnboardingFiles[field];
    return (
      <div className="rounded-xl border p-4 space-y-2.5">
        <div className="flex items-center gap-2.5">
          {url ? (
            <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!staged && url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1">
                <Eye className="w-3 h-3" /> Ver
              </Button>
            </a>
          )}
          {!staged && (
            <label className={cn(
              'inline-flex items-center gap-1 cursor-pointer rounded-lg border px-2.5 h-7 text-[11px] font-semibold transition-colors',
              uploadingOnboardingDoc === field && 'opacity-50 pointer-events-none',
              url ? 'border-border text-muted-foreground hover:bg-muted/50' : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10',
            )}>
              <Upload className="w-3 h-3" />
              {url ? 'Trocar' : 'Upload'}
              <input type="file" className="hidden" accept={accept} onChange={e => {
                const file = e.target.files?.[0];
                if (file) setStagedOnboardingFiles(prev => ({ ...prev, [field]: file }));
                e.target.value = '';
              }} />
            </label>
          )}
        </div>
        {staged && (
          <div className="bg-muted/30 rounded-lg p-2.5 flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground truncate flex-1">{staged.name}</span>
            <Button
              size="sm"
              className="h-7 px-2.5 text-[11px] gap-1 bg-primary hover:bg-primary/90"
              disabled={uploadingOnboardingDoc === field}
              onClick={() => {
                uploadOnboardingDoc(staged, folder, field);
                setStagedOnboardingFiles(prev => { const n = { ...prev }; delete n[field]; return n; });
              }}
            >
              {uploadingOnboardingDoc === field ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Confirmar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setStagedOnboardingFiles(prev => { const n = { ...prev }; delete n[field]; return n; })}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }
}
