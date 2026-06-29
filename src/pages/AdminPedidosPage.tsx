import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ClipboardList, Plus, Package, UserCheck, ChevronRight, Search,
  Upload, Bike, MapPin, FileText, User, Check, Radio, QrCode, Ticket, Loader2,
  Users, FolderOpen, ShoppingCart, Trash2, ExternalLink, Link2, X,
  Eye, Calendar, DollarSign, CircleCheck, CircleDot, Circle, RotateCcw,
  LayoutGrid, Table2, Download, ArrowLeft, AlertTriangle,
} from 'lucide-react';
import type { Shareholder } from '@/contexts/AuthContext';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PRECO_RASTREADOR = 990;
const API_KEY = 'sderfgy65434567uyt432wsdtyu90lkjfe32';
const API_BASE = 'https://modocorreapp.com.br/api/1.1/wf';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function buildPedidoNum(numero: number, createdAt?: string) {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `PED-${year}-${String(numero).padStart(4, '0')}`;
}

const pagamentoLabels: Record<string, string> = {
  pix_recebimento: 'PIX por recebimento',
  voucher: 'Voucher à vista',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Investidor {
  id: string;
  nome: string;
  cpf: string | null;
  estado_civil: string | null;
  profissao: string | null;
  email: string | null;
  whatsapp: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  profile_id: string | null;
  frota_nome: string | null;
  frota_bubble_id: string | null;
  created_at: string;
  pedidoCount?: number;
}

interface Pedido {
  id: string;
  numero: number;
  investidor_id: string;
  fornecedor_nome: string | null;
  modelo: string | null;
  quantidade: number;
  frota_nome: string | null;
  pagamento_rastreador: string | null;
  status: string;
  observacao: string | null;
  created_at: string;
  tipo_investidor: 'novo' | 'ativo' | null;
  created_by: string | null;
}

interface PedidoComInvestidor extends Pedido {
  investidor_nome: string;
  investidor_cpf: string | null;
  investidor_email: string | null;
  created_by_name: string | null;
}

interface Arquivo {
  id: string;
  investidor_id: string;
  tipo: string;
  nome: string | null;
  file_url: string;
  created_at: string;
}

interface RastreadorPagamento {
  id: string;
  pedido_id: string;
  tipo: 'voucher_comprovante' | 'pix_veiculo';
  valor: number;
  status: 'pendente' | 'pago';
  comprovante_url: string | null;
  veiculo_index: number | null;
  observacao: string | null;
  created_at: string;
}

type FlowType = 'novo' | 'ativo' | null;
type Step = 0 | 1 | 2;
type TabType = 'dados' | 'arquivos' | 'pedidos';
type ViewMode = 'pedidos' | 'investidores';

// ─── Helpers visuais ──────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
      {children}{required && <span className="text-primary ml-0.5">*</span>}
    </label>
  );
}

function SectionTitle({ icon: Icon, children }: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-xs font-bold text-foreground uppercase tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-border ml-1" />
    </div>
  );
}

const STEPS_NOVO  = ['Tipo', 'Pré-cadastro', 'Pedido'];
const STEPS_ATIVO = ['Tipo', 'Acionista',    'Pedido'];

function Stepper({ labels, current }: { labels: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 px-6 py-4 border-b bg-muted/10 shrink-0">
      {labels.map((label, idx) => (
        <div key={idx} className="flex items-center flex-1 last:flex-none">
          <div className={cn(
            'relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-300 border-2',
            idx < current
              ? 'bg-primary border-primary text-primary-foreground shadow-sm'
              : idx === current
              ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]'
              : 'bg-background border-border text-muted-foreground',
          )}>
            {idx < current ? <Check className="w-3.5 h-3.5" /> : idx + 1}
          </div>
          <span className={cn(
            'ml-2 text-[11px] font-semibold whitespace-nowrap transition-colors',
            idx === current ? 'text-foreground' : idx < current ? 'text-primary' : 'text-muted-foreground',
          )}>
            {label}
          </span>
          {idx < labels.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-3 rounded-full transition-colors duration-300',
              idx < current ? 'bg-primary' : 'bg-border',
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'NOVO PEDIDO':        return 'bg-blue-50 text-blue-700 border-blue-300';
    case 'PEDIDO FINALIZADO':  return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    case 'CANCELADO':          return 'bg-red-50 text-red-700 border-red-300';
    default:                   return 'bg-muted text-muted-foreground border-border';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPedidosPage() {
  const { shareholders, session, role } = useAuth();
  const { toast } = useToast();

  // ── View mode ───────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('pedidos');

  // ── All pedidos (global view) ───────────────────────────────────────────
  const [allPedidos, setAllPedidos]             = useState<PedidoComInvestidor[]>([]);
  const [loadingAllPedidos, setLoadingAllPedidos] = useState(true);
  const [pedidoStatusFilter, setPedidoStatusFilter] = useState<string>('all');
  const [pedidoBusca, setPedidoBusca]           = useState('');
  const [pedidoDetalhe, setPedidoDetalhe]       = useState<PedidoComInvestidor | null>(null);
  const [rastreadorPagamentos, setRastreadorPagamentos] = useState<RastreadorPagamento[]>([]);
  const [loadingRastreador, setLoadingRastreador] = useState(false);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [pagamentoMap, setPagamentoMap] = useState<Record<string, { total: number; pago: number; pagosCount: number }>>({});
  const [rastreadorFilter, setRastreadorFilter] = useState(false);
  const [tipoInvestidorFilter, setTipoInvestidorFilter] = useState<'all' | 'novo' | 'ativo'>('all');

  type PedidosDisplayMode = 'cards' | 'tabela';
  const [pedidosDisplayMode, setPedidosDisplayMode] = useState<PedidosDisplayMode>('cards');
  const [onboardingMap, setOnboardingMap] = useState<Record<string, { status: string; hasCnpj: boolean; done: number; total: number }>>({});
  const [showRelatorioSheet, setShowRelatorioSheet] = useState(false);
  const [showDeletePedido, setShowDeletePedido] = useState(false);
  const [deletingPedido, setDeletingPedido] = useState(false);

  // ── Investidores list ─────────────────────────────────────────────────────
  const [investidores, setInvestidores]           = useState<Investidor[]>([]);
  const [loadingInvestidores, setLoadingInvestidores] = useState(true);
  const [buscaLista, setBuscaLista]               = useState('');
  const [selectedId, setSelectedId]               = useState<string | null>(null);
  const [refreshKey, setRefreshKey]               = useState(0);

  // ── Detail panel ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState<TabType>('dados');
  const [dadosForm, setDadosForm]   = useState<Partial<Investidor>>({});
  const [salvando, setSalvando]     = useState(false);

  // ── Arquivos tab ──────────────────────────────────────────────────────────
  const [arquivos, setArquivos]       = useState<Arquivo[]>([]);
  const [loadingArquivos, setLoadingArquivos] = useState(false);
  const [uploadFile, setUploadFile]   = useState<File | null>(null);
  const [uploadTipo, setUploadTipo]   = useState('rg_cnh');
  const [uploadando, setUploadando]   = useState(false);

  // ── Pedidos tab ───────────────────────────────────────────────────────────
  const [pedidosDetalhe, setPedidosDetalhe]       = useState<Pedido[]>([]);
  const [loadingPedidosDetalhe, setLoadingPedidosDetalhe] = useState(false);

  // ── Onboarding dialog (from Dados tab) ───────────────────────────────────
  const [showGerarOnboarding, setShowGerarOnboarding] = useState(false);
  const [onboardingPedidoId, setOnboardingPedidoId]   = useState('');
  const [criandoOnboarding, setCriandoOnboarding]     = useState(false);

  // ── Novo Investidor dialog ────────────────────────────────────────────────
  const [showNovoInvestidor, setShowNovoInvestidor] = useState(false);
  const [novoNome, setNovoNome]         = useState('');
  const [criandoInv, setCriandoInv]     = useState(false);

  // ── Sheet: Novo Pedido ────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [flow, setFlow]                 = useState<FlowType>(null);
  const [step, setStep]                 = useState<Step>(0);
  const [preSelectedInvId, setPreSelectedInvId] = useState<string | null>(null);
  const [confirmando, setConfirmando]   = useState(false);
  const [proximoNumeroPreview, setProximoNumeroPreview] = useState<string | null>(null);

  // Pre-cadastro form (step 1A)
  const [preCadastro, setPreCadastro] = useState({
    nome: '', cpf: '', estadoCivil: '', profissao: '',
    email: '', whatsapp: '',
    rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '',
  });
  const [rgCnhFile, setRgCnhFile] = useState<File | null>(null);

  // Acionista selecionado (step 1B)
  const [buscaAcionista, setBuscaAcionista]               = useState('');
  const [acionistaSelecionado, setAcionistaSelecionado]   = useState<Shareholder | null>(null);

  // Formulário do pedido (step 2)
  const [pedidoForm, setPedidoForm] = useState({
    fornecedor: '',
    fornecedorBubbleId: '',
    modelo: '',
    quantidade: '1',
    frota: '',
    frotaBubbleId: '',
    observacao: '',
    pagamentoRastreador: '' as 'pix_recebimento' | 'voucher' | '',
  });

  // CEP lookup
  const [buscandoCep, setBuscandoCep]     = useState(false);

  // Dropdowns da API Bubble
  const [fornecedores, setFornecedores]   = useState<{ id: string; nome: string }[]>([]);
  const [frotas, setFrotas]               = useState<{ id: string; nome: string }[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // ── CEP lookup (ViaCEP) ───────────────────────────────────────────────────

  async function buscarCep(cep: string, target: 'preCadastro' | 'dadosForm') {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const fields = {
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        };
        if (target === 'preCadastro') {
          setPreCadastro(p => ({ ...p, ...fields }));
        } else {
          setDadosForm(f => ({ ...f, ...fields }));
        }
      }
    } catch { /* silently fail */ }
    setBuscandoCep(false);
  }

  // ── Load dropdowns ────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchDropdowns() {
      setLoadingDropdowns(true);
      try {
        const body = new URLSearchParams({ apikey: API_KEY });
        const [resForn, resFrota] = await Promise.all([
          fetch(`${API_BASE}/pedido-fornecedores-motos`, { method: 'POST', body }),
          fetch(`${API_BASE}/pedido-frotas`,             { method: 'POST', body }),
        ]);
        const [jsonForn, jsonFrota] = await Promise.all([resForn.json(), resFrota.json()]);
        const fornItems: Record<string, string>[] = jsonForn?.response?.fornecedores ?? [];
        const frotaItems: Record<string, string>[] = jsonFrota?.response?.frotas ?? [];
        setFornecedores(fornItems.map(i => ({
          id: i['_id'] ?? '',
          nome: i['nome social'] ?? i['nome'] ?? '',
        })).filter(i => i.nome));
        setFrotas(frotaItems.map(i => ({
          id: i['_id'] ?? '',
          nome: i['nome'] ?? '',
        })).filter(i => i.nome));
      } catch {
        // silently fail — dropdowns will just be empty
      } finally {
        setLoadingDropdowns(false);
      }
    }
    fetchDropdowns();
  }, []);

  // ── Load investidores ─────────────────────────────────────────────────────

  useEffect(() => {
    loadInvestidores();
  }, [refreshKey]);

  async function loadInvestidores() {
    setLoadingInvestidores(true);
    const [{ data: invData }, { data: pedCounts }] = await Promise.all([
      supabase.from('investidores' as any).select('*').order('created_at', { ascending: false }),
      supabase.from('pedidos' as any).select('investidor_id'),
    ]);

    const countMap: Record<string, number> = {};
    ((pedCounts ?? []) as any[]).forEach((p: any) => {
      countMap[p.investidor_id] = (countMap[p.investidor_id] ?? 0) + 1;
    });

    const merged: Investidor[] = ((invData ?? []) as any[]).map((inv: any) => ({
      ...inv,
      pedidoCount: countMap[inv.id] ?? 0,
    }));

    setInvestidores(merged);
    setLoadingInvestidores(false);
  }

  // ── Load all pedidos (global view) ──────────────────────────────────────

  useEffect(() => {
    loadAllPedidos();
  }, [refreshKey]);

  async function loadAllPedidos() {
    setLoadingAllPedidos(true);
    let pedidosQuery = (supabase as any)
      .from('pedidos')
      .select('*, investidores!inner(nome, cpf, email)');
    if (role === 'vendedor') {
      pedidosQuery = pedidosQuery.eq('created_by', session?.user?.id);
    }
    pedidosQuery = pedidosQuery.order('created_at', { ascending: false });

    const [{ data }, { data: pagData }, { data: onbData }] = await Promise.all([
      pedidosQuery,
      (supabase as any)
        .from('pedido_rastreador_pagamentos')
        .select('pedido_id, valor, status'),
      (supabase as any)
        .from('onboarding_requests')
        .select('pedido_id, status, cnpj, cep, rua, certificado_digital_url, senha_certificado, cnh_url, procuracao_url, assinatura_url'),
    ]);

    // Build user_id → name map from shareholders (includes internal roles)
    const userNameMap: Record<string, string> = {};
    shareholders.forEach(s => { if (s.user_id) userNameMap[s.user_id] = s.name; });

    const mapped: PedidoComInvestidor[] = ((data ?? []) as any[]).map((p: any) => ({
      ...p,
      investidor_nome: p.investidores?.nome ?? '—',
      investidor_cpf: p.investidores?.cpf ?? null,
      investidor_email: p.investidores?.email ?? null,
      created_by_name: p.created_by ? (userNameMap[p.created_by] ?? null) : null,
      investidores: undefined,
    }));

    // Build pagamentoMap
    const pMap: Record<string, { total: number; pago: number; pagosCount: number }> = {};
    ((pagData ?? []) as any[]).forEach((r: any) => {
      if (!pMap[r.pedido_id]) pMap[r.pedido_id] = { total: 0, pago: 0, pagosCount: 0 };
      pMap[r.pedido_id].total += Number(r.valor);
      if (r.status === 'pago') {
        pMap[r.pedido_id].pago += Number(r.valor);
        pMap[r.pedido_id].pagosCount += 1;
      }
    });
    setPagamentoMap(pMap);

    // Build onboardingMap
    const oMap: Record<string, { status: string; hasCnpj: boolean; done: number; total: number }> = {};
    ((onbData ?? []) as any[]).forEach((o: any) => {
      oMap[o.pedido_id] = {
        status: o.status ?? 'pendente',
        hasCnpj: !!o.cnpj,
        done: [o.cnpj, o.cep && o.rua, o.certificado_digital_url, o.senha_certificado, o.cnh_url, o.procuracao_url, o.assinatura_url].filter(Boolean).length,
        total: 7,
      };
    });
    setOnboardingMap(oMap);

    setAllPedidos(mapped);
    setLoadingAllPedidos(false);
  }

  // ── Load detail data on selection ─────────────────────────────────────────

  const selectedInvestidor = investidores.find(i => i.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    const inv = investidores.find(i => i.id === selectedId);
    if (inv) setDadosForm({ ...inv });
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || activeTab !== 'arquivos') return;
    loadArquivos(selectedId);
  }, [selectedId, activeTab]);

  useEffect(() => {
    if (!selectedId || activeTab !== 'pedidos') return;
    loadPedidosDetalhe(selectedId);
  }, [selectedId, activeTab]);

  async function loadArquivos(investidorId: string) {
    setLoadingArquivos(true);
    const { data } = await supabase
      .from('investidor_arquivos' as any)
      .select('*')
      .eq('investidor_id', investidorId)
      .order('created_at', { ascending: false });
    setArquivos((data ?? []) as any[]);
    setLoadingArquivos(false);
  }

  async function loadPedidosDetalhe(investidorId: string) {
    setLoadingPedidosDetalhe(true);
    const { data } = await supabase
      .from('pedidos' as any)
      .select('*')
      .eq('investidor_id', investidorId)
      .order('created_at', { ascending: false });
    setPedidosDetalhe((data ?? []) as any[]);
    setLoadingPedidosDetalhe(false);
  }

  // ── Load rastreador pagamentos when detail opens ─────────────────────────

  useEffect(() => {
    if (!pedidoDetalhe) { setRastreadorPagamentos([]); return; }
    loadRastreadorPagamentos(pedidoDetalhe.id);
  }, [pedidoDetalhe?.id]);

  async function loadRastreadorPagamentos(pedidoId: string) {
    setLoadingRastreador(true);
    const { data } = await (supabase as any)
      .from('pedido_rastreador_pagamentos')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('veiculo_index', { ascending: true });
    setRastreadorPagamentos((data ?? []) as RastreadorPagamento[]);
    setLoadingRastreador(false);
  }

  async function handleUploadVoucherComprovante(pedido: PedidoComInvestidor, file: File) {
    setUploadingComprovante(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${pedido.investidor_id}/rastreador/${pedido.id}/voucher_${Date.now()}.${ext}`;
      const { error: storageErr } = await supabase.storage.from('investidor-docs').upload(path, file);
      if (storageErr) throw storageErr;
      const { data: { publicUrl } } = supabase.storage.from('investidor-docs').getPublicUrl(path);
      const { error } = await (supabase as any).from('pedido_rastreador_pagamentos').insert({
        pedido_id: pedido.id,
        tipo: 'voucher_comprovante',
        valor: pedido.quantidade * PRECO_RASTREADOR,
        status: 'pendente',
        comprovante_url: publicUrl,
        created_by: session?.user?.id,
      });
      if (error) throw error;
      toast({ title: 'Comprovante enviado!' });
      loadRastreadorPagamentos(pedido.id);
      loadAllPedidos();
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingComprovante(false);
    }
  }

  async function handleUploadPixComprovante(pedido: PedidoComInvestidor, veiculoIndex: number, file: File) {
    setUploadingComprovante(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${pedido.investidor_id}/rastreador/${pedido.id}/pix_${veiculoIndex}_${Date.now()}.${ext}`;
      const { error: storageErr } = await supabase.storage.from('investidor-docs').upload(path, file);
      if (storageErr) throw storageErr;
      const { data: { publicUrl } } = supabase.storage.from('investidor-docs').getPublicUrl(path);

      // Check for existing record
      const { data: existing } = await (supabase as any)
        .from('pedido_rastreador_pagamentos')
        .select('id')
        .eq('pedido_id', pedido.id)
        .eq('tipo', 'pix_veiculo')
        .eq('veiculo_index', veiculoIndex)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any).from('pedido_rastreador_pagamentos')
          .update({ comprovante_url: publicUrl, status: 'pendente' })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('pedido_rastreador_pagamentos').insert({
          pedido_id: pedido.id,
          tipo: 'pix_veiculo',
          valor: PRECO_RASTREADOR,
          status: 'pendente',
          comprovante_url: publicUrl,
          veiculo_index: veiculoIndex,
          created_by: session?.user?.id,
        });
        if (error) throw error;
      }
      toast({ title: `Comprovante veiculo ${veiculoIndex} enviado!` });
      loadRastreadorPagamentos(pedido.id);
      loadAllPedidos();
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingComprovante(false);
    }
  }

  async function marcarComoPago(pagamentoId: string) {
    const { error } = await (supabase as any).from('pedido_rastreador_pagamentos')
      .update({ status: 'pago' })
      .eq('id', pagamentoId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marcado como pago!' });
    if (pedidoDetalhe) loadRastreadorPagamentos(pedidoDetalhe.id);
    loadAllPedidos();
  }

  async function marcarComoPendente(pagamentoId: string) {
    const { error } = await (supabase as any).from('pedido_rastreador_pagamentos')
      .update({ status: 'pendente' })
      .eq('id', pagamentoId);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Revertido para pendente.' });
    if (pedidoDetalhe) loadRastreadorPagamentos(pedidoDetalhe.id);
    loadAllPedidos();
  }

  // ── Sheet helpers ─────────────────────────────────────────────────────────

  function resetSheet() {
    setFlow(null); setStep(0); setPreSelectedInvId(null);
    setPreCadastro({ nome: '', cpf: '', estadoCivil: '', profissao: '', email: '', whatsapp: '', rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' });
    setRgCnhFile(null); setBuscaAcionista(''); setAcionistaSelecionado(null);
    setPedidoForm({ fornecedor: '', fornecedorBubbleId: '', modelo: '', quantidade: '1', frota: '', frotaBubbleId: '', observacao: '', pagamentoRastreador: '' });
  }

  function openSheet() { resetSheet(); setSheetOpen(true); }

  function openSheetForInvestidor(id: string) {
    resetSheet();
    setPreSelectedInvId(id);
    const inv = investidores.find(i => i.id === id);
    if (inv?.frota_nome) {
      setPedidoForm(p => ({ ...p, frota: inv.frota_nome!, frotaBubbleId: inv.frota_bubble_id! }));
    }
    setStep(2);
    setSheetOpen(true);
    fetchProximoNumero();
  }

  function closeSheet() { setSheetOpen(false); resetSheet(); setProximoNumeroPreview(null); }

  async function fetchProximoNumero() {
    try {
      const bubbleRes = await fetch(`${API_BASE}/pedido-ultimo-pedido`, {
        method: 'POST',
        body: new URLSearchParams({ apikey: API_KEY }),
      });
      const bubbleJson = await bubbleRes.json();
      const ultimoBubble = Number(bubbleJson?.response?.pedidos) || 0;

      const { data: ultimoLocal } = await (supabase as any)
        .from('pedidos')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle();
      const ultimoLocalNum = Number(ultimoLocal?.numero) || 0;

      const proximo = Math.max(ultimoBubble, ultimoLocalNum) + 1;
      setProximoNumeroPreview(buildPedidoNum(proximo));
    } catch {
      setProximoNumeroPreview(null);
    }
  }

  // ── Open pedido detail from investor tab ────────────────────────────────

  function openPedidoDetalheFromInvestor(pedido: Pedido) {
    const inv = investidores.find(i => i.id === pedido.investidor_id);
    const creator = pedido.created_by ? shareholders.find(s => s.user_id === pedido.created_by) : null;
    setPedidoDetalhe({
      ...pedido,
      investidor_nome: inv?.nome ?? '—',
      investidor_cpf: inv?.cpf ?? null,
      investidor_email: inv?.email ?? null,
      created_by_name: creator?.name ?? null,
    });
  }

  // ── Confirm pedido ────────────────────────────────────────────────────────

  async function confirmarPedido() {
    setConfirmando(true);
    try {
      let investidorId: string;

      if (preSelectedInvId) {
        // Opened from the Pedidos tab — investidor already exists
        investidorId = preSelectedInvId;
      } else if (flow === 'novo') {
        const { data: inv, error } = await (supabase as any)
          .from('investidores')
          .insert({
            nome:         preCadastro.nome,
            cpf:          preCadastro.cpf         || null,
            estado_civil: preCadastro.estadoCivil || null,
            profissao:    preCadastro.profissao    || null,
            email:        preCadastro.email        || null,
            whatsapp:     preCadastro.whatsapp     || null,
            rua:          preCadastro.rua          || null,
            numero:       preCadastro.numero       || null,
            bairro:       preCadastro.bairro       || null,
            cidade:       preCadastro.cidade       || null,
            estado:       preCadastro.estado       || null,
            cep:          preCadastro.cep          || null,
            created_by:   session?.user?.id,
          })
          .select('id')
          .single();
        if (error) throw error;
        investidorId = inv.id;
      } else {
        // flow === 'ativo': find or create investidor linked to profile
        const profileId = acionistaSelecionado!.id;
        const { data: existing } = await (supabase as any)
          .from('investidores')
          .select('id')
          .eq('profile_id', profileId)
          .maybeSingle();
        if (existing) {
          investidorId = existing.id;
        } else {
          const { data: inv, error } = await (supabase as any)
            .from('investidores')
            .insert({
              nome:       acionistaSelecionado!.name,
              email:      acionistaSelecionado!.email || null,
              profile_id: profileId,
              created_by: session?.user?.id,
            })
            .select('id')
            .single();
          if (error) throw error;
          investidorId = inv.id;
        }
      }

      // Buscar ultimo numero do Bubble para continuar a sequencia
      let proximoNumero: number | undefined;
      try {
        const bubbleRes = await fetch(`${API_BASE}/pedido-ultimo-pedido`, {
          method: 'POST',
          body: new URLSearchParams({ apikey: API_KEY }),
        });
        const bubbleJson = await bubbleRes.json();
        const ultimoBubble = Number(bubbleJson?.response?.pedidos) || 0;

        // Buscar ultimo numero local
        const { data: ultimoLocal } = await (supabase as any)
          .from('pedidos')
          .select('numero')
          .order('numero', { ascending: false })
          .limit(1)
          .maybeSingle();
        const ultimoLocalNum = Number(ultimoLocal?.numero) || 0;

        proximoNumero = Math.max(ultimoBubble, ultimoLocalNum) + 1;
      } catch {
        // Se falhar, deixa o banco gerar automaticamente
      }

      // ── Bubble integration ──
      let pedidoBubbleId: string | null = null;
      let locadoraBubbleId: string | null = null;

      if (flow === 'novo' && !preSelectedInvId) {
        // Novo investidor: criar locadora PF no Bubble
        const locRes = await fetch(
          'https://modocorreapp.com.br/version-test/api/1.1/wf/pedido-locadora-pf',
          { method: 'POST', body: new URLSearchParams({ apikey: API_KEY, nome: preCadastro.nome, Frota: pedidoForm.frotaBubbleId }) }
        );
        const locJson = await locRes.json();
        locadoraBubbleId = locJson?.response?.locadora_bubble;
        if (!locadoraBubbleId) throw new Error('Erro ao cadastrar locadora no sistema. Tente novamente.');

        // Salvar locadora_bubble_id no investidor
        await (supabase as any).from('investidores').update({ locadora_bubble_id: locadoraBubbleId }).eq('id', investidorId);
      } else {
        // Acionista ativo: buscar locadora_bubble_id existente
        const { data: invData } = await (supabase as any)
          .from('investidores')
          .select('locadora_bubble_id')
          .eq('id', investidorId)
          .single();
        locadoraBubbleId = invData?.locadora_bubble_id || null;
      }

      // Criar pedido no Bubble (se tiver locadora)
      if (locadoraBubbleId) {
        const pedBubbleRes = await fetch(
          'https://modocorreapp.com.br/version-test/api/1.1/wf/pedido-criar-pedido',
          { method: 'POST', body: new URLSearchParams({
            apikey: API_KEY,
            numero: String(proximoNumero),
            fornecedor: pedidoForm.fornecedorBubbleId,
            quantidade: pedidoForm.quantidade,
            frota: pedidoForm.frotaBubbleId,
            observacao: pedidoForm.observacao || '',
            locadora: locadoraBubbleId,
          })}
        );
        const pedBubbleJson = await pedBubbleRes.json();
        if (pedBubbleJson?.status !== 'success') throw new Error('Erro ao registrar pedido no sistema. Tente novamente.');
        pedidoBubbleId = pedBubbleJson?.response?.pedido_bubble || null;
      }

      // Insert pedido
      const insertData: Record<string, unknown> = {
        investidor_id:        investidorId,
        fornecedor_nome:      pedidoForm.fornecedor    || null,
        modelo:               pedidoForm.modelo        || null,
        quantidade:           Number(pedidoForm.quantidade) || 1,
        frota_nome:           pedidoForm.frota         || null,
        pagamento_rastreador: pedidoForm.pagamentoRastreador || null,
        observacao:           pedidoForm.observacao    || null,
        status:               'NOVO PEDIDO',
        created_by:           session?.user?.id,
        tipo_investidor:      preSelectedInvId ? 'ativo' : (flow === 'novo' ? 'novo' : 'ativo'),
        fornecedor_bubble_id: pedidoForm.fornecedorBubbleId || null,
        frota_bubble_id:      pedidoForm.frotaBubbleId || null,
        pedido_bubble_id:     pedidoBubbleId,
      };
      if (proximoNumero) insertData.numero = proximoNumero;

      const { data: pedido, error: pedidoError } = await (supabase as any)
        .from('pedidos')
        .insert(insertData)
        .select('numero')
        .single();
      if (pedidoError) throw pedidoError;

      const pedidoNumStr = buildPedidoNum(pedido.numero);

      // Salvar frota no investidor
      if (pedidoForm.frota && pedidoForm.frotaBubbleId) {
        await (supabase as any).from('investidores')
          .update({ frota_nome: pedidoForm.frota, frota_bubble_id: pedidoForm.frotaBubbleId })
          .eq('id', investidorId);
      }

      // Upload RG/CNH if present (novo flow only)
      if (flow === 'novo' && rgCnhFile) {
        const ext  = rgCnhFile.name.split('.').pop() ?? 'bin';
        const path = `${investidorId}/rg_cnh/${Date.now()}.${ext}`;
        const { error: storageErr } = await supabase.storage
          .from('investidor-docs')
          .upload(path, rgCnhFile);
        if (!storageErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('investidor-docs')
            .getPublicUrl(path);
          await (supabase as any).from('investidor_arquivos').insert({
            investidor_id: investidorId,
            tipo:          'rg_cnh',
            nome:          rgCnhFile.name,
            file_url:      publicUrl,
            created_by:    session?.user?.id,
          });
        }
      }

      // Onboarding só para primeiro investimento (novo investidor)
      if (flow === 'novo' && !preSelectedInvId) {
        await (supabase as any).from('onboarding_requests').insert({
          pedido_id:     pedidoNumStr,
          cliente:       preCadastro.nome || null,
          created_by:    session?.user?.id,
          investidor_id: investidorId,
        });
      }

      closeSheet();
      setRefreshKey(k => k + 1);
      if (selectedId) {
        loadPedidosDetalhe(selectedId);
      }
      toast({
        title: 'Pedido registrado!',
        description: flow === 'novo' && !preSelectedInvId
          ? `${pedidoNumStr} criado com link de onboarding.`
          : `${pedidoNumStr} criado com sucesso.`,
      });
    } catch (err: any) {
      toast({ title: 'Erro ao criar pedido', description: err.message, variant: 'destructive' });
    } finally {
      setConfirmando(false);
    }
  }

  // ── Save investidor dados ─────────────────────────────────────────────────

  async function salvarDados() {
    if (!selectedId) return;
    setSalvando(true);
    const { error } = await (supabase as any)
      .from('investidores')
      .update({
        nome:         dadosForm.nome         ?? '',
        cpf:          dadosForm.cpf          ?? null,
        estado_civil: dadosForm.estado_civil ?? null,
        profissao:    dadosForm.profissao    ?? null,
        email:        dadosForm.email        ?? null,
        whatsapp:     dadosForm.whatsapp     ?? null,
        rua:          dadosForm.rua          ?? null,
        numero:       dadosForm.numero       ?? null,
        bairro:       dadosForm.bairro       ?? null,
        cidade:       dadosForm.cidade       ?? null,
        estado:       dadosForm.estado       ?? null,
        cep:          dadosForm.cep          ?? null,
        profile_id:   dadosForm.profile_id   ?? null,
      })
      .eq('id', selectedId);
    setSalvando(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Dados salvos!' });
      setRefreshKey(k => k + 1);
    }
  }

  // ── Upload arquivo ────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!uploadFile || !selectedId) return;
    setUploadando(true);
    const ext  = uploadFile.name.split('.').pop() ?? 'bin';
    const path = `${selectedId}/${uploadTipo}/${Date.now()}.${ext}`;
    const { error: storageErr } = await supabase.storage
      .from('investidor-docs')
      .upload(path, uploadFile);
    if (storageErr) {
      toast({ title: 'Erro no upload', description: storageErr.message, variant: 'destructive' });
      setUploadando(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('investidor-docs').getPublicUrl(path);
    const { error } = await (supabase as any).from('investidor_arquivos').insert({
      investidor_id: selectedId,
      tipo:          uploadTipo,
      nome:          uploadFile.name,
      file_url:      publicUrl,
      created_by:    session?.user?.id,
    });
    setUploadando(false);
    if (error) {
      toast({ title: 'Erro ao salvar arquivo', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Arquivo enviado!' });
      setUploadFile(null);
      loadArquivos(selectedId);
    }
  }

  async function handleDeleteArquivo(id: string) {
    await (supabase as any).from('investidor_arquivos').delete().eq('id', id);
    if (selectedId) loadArquivos(selectedId);
    toast({ title: 'Arquivo removido.' });
  }

  // ── Criar novo investidor (dialog) ────────────────────────────────────────

  async function criarInvestidor() {
    if (!novoNome.trim()) return;
    setCriandoInv(true);
    const { data, error } = await (supabase as any)
      .from('investidores')
      .insert({ nome: novoNome.trim(), created_by: session?.user?.id })
      .select('id')
      .single();
    setCriandoInv(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Investidor criado!' });
    setNovoNome(''); setShowNovoInvestidor(false);
    setRefreshKey(k => k + 1);
    setSelectedId(data.id);
    setActiveTab('dados');
  }

  // ── Gerar onboarding (dialog) ─────────────────────────────────────────────

  async function gerarOnboarding() {
    if (!onboardingPedidoId.trim()) return;
    setCriandoOnboarding(true);
    const { error } = await (supabase as any).from('onboarding_requests').insert({
      pedido_id:     onboardingPedidoId.trim(),
      cliente:       selectedInvestidor?.nome || null,
      created_by:    session?.user?.id,
      investidor_id: selectedId,
    });
    setCriandoOnboarding(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Link de onboarding criado!', description: onboardingPedidoId });
    setOnboardingPedidoId(''); setShowGerarOnboarding(false);
  }

  // ── Excluir pedido (apenas NOVO PEDIDO) ─────────────────────────────────

  async function excluirPedido() {
    if (!pedidoDetalhe || pedidoDetalhe.status !== 'NOVO PEDIDO') return;
    setDeletingPedido(true);
    try {
      // Excluir pedido no Bubble primeiro
      await fetch('https://modocorreapp.com.br/version-test/api/1.1/wf/pedido-excluir', {
        method: 'POST',
        body: new URLSearchParams({ apikey: API_KEY, numero: String(pedidoDetalhe.numero) }),
      });

      // Remover onboarding_requests vinculado (pelo pedido_id formatado)
      const pedidoNum = buildPedidoNum(pedidoDetalhe.numero, pedidoDetalhe.created_at);
      await (supabase as any).from('onboarding_requests').delete().eq('pedido_id', pedidoNum);

      // Remover rastreador pagamentos vinculados
      await (supabase as any).from('pedido_rastreador_pagamentos').delete().eq('pedido_id', pedidoDetalhe.id);

      // Remover o pedido
      const { error } = await (supabase as any).from('pedidos').delete().eq('id', pedidoDetalhe.id);
      if (error) throw error;

      toast({ title: 'Pedido excluído com sucesso!' });
      setPedidoDetalhe(null);
      setShowDeletePedido(false);
      setRefreshKey(k => k + 1);
      loadAllPedidos();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingPedido(false);
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const investidoresFiltrados = investidores.filter(inv => {
    const q = buscaLista.toLowerCase();
    return (
      inv.nome.toLowerCase().includes(q) ||
      (inv.cpf ?? '').includes(q) ||
      (inv.email ?? '').toLowerCase().includes(q)
    );
  });

  const allPedidosFiltrados = allPedidos.filter(p => {
    if (pedidoStatusFilter !== 'all' && p.status !== pedidoStatusFilter) return false;
    if (tipoInvestidorFilter !== 'all' && p.tipo_investidor !== tipoInvestidorFilter) return false;
    if (rastreadorFilter) {
      const info = pagamentoMap[p.id];
      const expected = p.quantidade * PRECO_RASTREADOR;
      if (info && info.pago >= expected) return false; // fully paid, hide
    }
    if (pedidoBusca) {
      const q = pedidoBusca.toLowerCase();
      return (
        buildPedidoNum(p.numero, p.created_at).toLowerCase().includes(q) ||
        p.investidor_nome.toLowerCase().includes(q) ||
        (p.fornecedor_nome ?? '').toLowerCase().includes(q) ||
        (p.modelo ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const kpiAReceber = allPedidos.reduce((sum, p) => {
    const expected = p.quantidade * PRECO_RASTREADOR;
    const pago = pagamentoMap[p.id]?.pago ?? 0;
    return sum + Math.max(0, expected - pago);
  }, 0);

  const kpis = {
    total: allPedidos.length,
    novos: allPedidos.filter(p => p.status === 'NOVO PEDIDO').length,
    finalizados: allPedidos.filter(p => p.status === 'PEDIDO FINALIZADO').length,
    cancelados: allPedidos.filter(p => p.status === 'CANCELADO').length,
  };

  function getRastreadorBadge(pedidoId: string, qtd: number) {
    const info = pagamentoMap[pedidoId];
    const expected = qtd * PRECO_RASTREADOR;
    if (!info) return { label: '\u2014', style: 'text-gray-400' };
    if (info.pago >= expected) return { label: 'Pago', style: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (info.pago > 0) return { label: 'Parcial', style: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Pendente', style: 'text-red-700 bg-red-50 border-red-200' };
  }

  const qtdNum            = Number(pedidoForm.quantidade) || 0;
  const totalRastreadores = qtdNum * PRECO_RASTREADOR;
  const stepLabels        = flow === 'ativo' ? STEPS_ATIVO : STEPS_NOVO;

  const investidorComFrota = (() => {
    if (preSelectedInvId) {
      const inv = investidores.find(i => i.id === preSelectedInvId);
      return !!inv?.frota_nome;
    }
    if (acionistaSelecionado) {
      const inv = investidores.find(i => i.profile_id === acionistaSelecionado.id);
      return !!inv?.frota_nome;
    }
    return false;
  })();
  const acionistaLabel    =
    preSelectedInvId
      ? (selectedInvestidor?.nome ?? investidores.find(i => i.id === preSelectedInvId)?.nome ?? 'Investidor')
      : flow === 'novo'
      ? preCadastro.nome
      : (acionistaSelecionado?.name ?? '');
  const pedidoValido = pedidoForm.fornecedor && pedidoForm.modelo && qtdNum > 0 && pedidoForm.frota && pedidoForm.pagamentoRastreador;

  const acionistasFiltrados = shareholders.filter(s =>
    s.name.toLowerCase().includes(buscaAcionista.toLowerCase()) ||
    s.email.toLowerCase().includes(buscaAcionista.toLowerCase()),
  );

  const sheetMeta = preSelectedInvId
    ? { title: 'Novo Pedido', sub: `Investidor: ${acionistaLabel}` }
    : step === 0
    ? { title: 'Novo Pedido', sub: 'Escolha o tipo para começar' }
    : flow === 'novo' && step === 1
    ? { title: 'Primeiro Investimento', sub: 'Pré-cadastro do novo investidor' }
    : flow === 'ativo' && step === 1
    ? { title: 'Acionista Ativo', sub: 'Selecione o acionista vinculado' }
    : { title: 'Detalhes do Pedido', sub: `Investidor: ${acionistaLabel}` };

  // ─── ApiSelect ─────────────────────────────────────────────────────────────

  function ApiSelect({ value, onChange, options, placeholder, disabled }: {
    value: string;
    onChange: (nome: string, id: string) => void;
    options: { id: string; nome: string }[];
    placeholder: string;
    disabled?: boolean;
  }) {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={e => {
            const nome = e.target.value;
            const opt = options.find(o => o.nome === nome);
            onChange(nome, opt?.id ?? '');
          }}
          disabled={disabled || loadingDropdowns}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10 disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-8"
        >
          <option value="">{loadingDropdowns ? 'Carregando...' : placeholder}</option>
          {options.map(o => <option key={o.id || o.nome} value={o.nome}>{o.nome}</option>)}
        </select>
        {loadingDropdowns
          ? <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin pointer-events-none" />
          : <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground rotate-90 pointer-events-none" />
        }
      </div>
    );
  }

  // ─── Sheet Step 0 — escolha de tipo ────────────────────────────────────────

  const renderStep0 = () => (
    <div className="flex-1 flex flex-col gap-4 p-6">
      <p className="text-sm text-muted-foreground">Selecione o tipo de investimento para iniciar o fluxo correto:</p>

      <button
        onClick={() => { setFlow('novo'); setStep(1); }}
        className="group relative flex items-center gap-5 rounded-2xl border-2 border-border bg-gradient-to-br from-blue-50/50 to-background p-5 text-left hover:border-blue-400/60 hover:shadow-md hover:shadow-blue-500/10 transition-all duration-200"
      >
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
          <Package className="w-7 h-7 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-foreground">Primeiro Investimento</p>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">
            Para quem ainda não é acionista — realiza o pré-cadastro e abre o pedido em seguida.
          </p>
          <span className="inline-flex items-center mt-2 text-[11px] font-semibold text-blue-600 gap-1">
            Preencher pré-cadastro <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </button>

      <button
        onClick={() => { setFlow('ativo'); setStep(1); }}
        className="group relative flex items-center gap-5 rounded-2xl border-2 border-border bg-gradient-to-br from-emerald-50/50 to-background p-5 text-left hover:border-emerald-400/60 hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-200"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
          <UserCheck className="w-7 h-7 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-foreground">Acionista Ativo</p>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">
            Para investidores já registrados no sistema — selecione da lista e prossiga.
          </p>
          <span className="inline-flex items-center mt-2 text-[11px] font-semibold text-emerald-600 gap-1">
            Selecionar acionista <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </button>
    </div>
  );

  // ─── Sheet Step 1A — pré-cadastro ──────────────────────────────────────────

  const renderStep1Novo = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="space-y-3">
        <SectionTitle icon={User}>Dados pessoais</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FieldLabel required>Nome completo</FieldLabel>
            <Input value={preCadastro.nome} onChange={e => setPreCadastro(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
          </div>
          <div>
            <FieldLabel required>CPF</FieldLabel>
            <Input value={preCadastro.cpf} onChange={e => setPreCadastro(p => ({ ...p, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" maxLength={14} />
          </div>
          <div>
            <FieldLabel required>Estado civil</FieldLabel>
            <select
              value={preCadastro.estadoCivil}
              onChange={e => setPreCadastro(p => ({ ...p, estadoCivil: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
            >
              <option value="">Selecionar</option>
              {['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União Estável'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel required>Profissão</FieldLabel>
            <Input value={preCadastro.profissao} onChange={e => setPreCadastro(p => ({ ...p, profissao: e.target.value }))} placeholder="Profissão" />
          </div>
          <div>
            <FieldLabel required>WhatsApp</FieldLabel>
            <Input value={preCadastro.whatsapp} onChange={e => setPreCadastro(p => ({ ...p, whatsapp: formatPhone(e.target.value) }))} placeholder="(00) 00000-0000" maxLength={15} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle icon={MapPin}>Endereço</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FieldLabel required>CEP</FieldLabel>
            <div className="relative">
              <Input
                value={preCadastro.cep}
                onChange={e => {
                  const v = e.target.value;
                  setPreCadastro(p => ({ ...p, cep: v }));
                  if (v.replace(/\D/g, '').length === 8) buscarCep(v, 'preCadastro');
                }}
                placeholder="00000-000"
                maxLength={9}
              />
              {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="col-span-2">
            <FieldLabel required>Rua</FieldLabel>
            <Input value={preCadastro.rua} onChange={e => setPreCadastro(p => ({ ...p, rua: e.target.value }))} placeholder="Nome da rua" />
          </div>
          <div>
            <FieldLabel required>Número</FieldLabel>
            <Input value={preCadastro.numero} onChange={e => setPreCadastro(p => ({ ...p, numero: e.target.value }))} placeholder="123" />
          </div>
          <div>
            <FieldLabel required>Bairro</FieldLabel>
            <Input value={preCadastro.bairro} onChange={e => setPreCadastro(p => ({ ...p, bairro: e.target.value }))} placeholder="Bairro" />
          </div>
          <div>
            <FieldLabel required>Cidade</FieldLabel>
            <Input value={preCadastro.cidade} onChange={e => setPreCadastro(p => ({ ...p, cidade: e.target.value }))} placeholder="Cidade" />
          </div>
          <div>
            <FieldLabel required>Estado</FieldLabel>
            <Input value={preCadastro.estado} onChange={e => setPreCadastro(p => ({ ...p, estado: e.target.value }))} placeholder="UF" maxLength={2} />
          </div>
        </div>
      </div>

      <div className="pt-2 pb-1">
        <Button
          className="w-full h-11 text-sm font-semibold gap-2"
          disabled={!preCadastro.nome.trim() || !preCadastro.cpf.trim() || !preCadastro.estadoCivil || !preCadastro.profissao.trim() || !preCadastro.whatsapp.trim() || !preCadastro.cep.trim() || !preCadastro.rua.trim() || !preCadastro.numero.trim() || !preCadastro.bairro.trim() || !preCadastro.cidade.trim() || !preCadastro.estado.trim()}
          onClick={() => { setStep(2); fetchProximoNumero(); }}
        >
          Continuar para o Pedido <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ─── Sheet Step 1B — selecionar acionista ──────────────────────────────────

  const renderStep1Ativo = () => (
    <div className="flex-1 flex flex-col gap-4 p-6 overflow-hidden">
      <p className="text-sm text-muted-foreground shrink-0">Busque e selecione o acionista para vincular ao pedido:</p>
      <div className="relative shrink-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input className="pl-10 h-10" placeholder="Buscar por nome ou e-mail..." value={buscaAcionista} onChange={e => setBuscaAcionista(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
        {acionistasFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Search className="w-8 h-8 opacity-20" />
            <p className="text-sm">Nenhum acionista encontrado.</p>
          </div>
        ) : (
          acionistasFiltrados.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setAcionistaSelecionado(s);
                const inv = investidores.find(i => i.profile_id === s.id);
                if (inv?.frota_nome) {
                  setPedidoForm(p => ({ ...p, frota: inv.frota_nome!, frotaBubbleId: inv.frota_bubble_id! }));
                }
                setStep(2);
                fetchProximoNumero();
              }}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-border bg-card px-4 py-3.5 text-left hover:bg-muted/30 hover:border-primary/40 hover:shadow-sm transition-all duration-150 group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <span className="text-xs font-bold text-primary">
                  {s.name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{s.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={cn(
                  'text-[10px] font-semibold',
                  s.status === 'Ativo'
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-400/40'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {s.status}
                </Badge>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  // ─── Sheet Step 2 — formulário do pedido ───────────────────────────────────

  const renderStep2 = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Resumo do investidor + número do pedido */}
      <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Investidor vinculado</p>
          <p className="text-sm font-semibold text-foreground truncate">{acionistaLabel || '—'}</p>
        </div>
        {proximoNumeroPreview && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 font-mono text-xs shrink-0">
            {proximoNumeroPreview}
          </Badge>
        )}
      </div>

      {/* Veículo */}
      <div className="space-y-3">
        <SectionTitle icon={Bike}>Veículo</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>Fornecedor</FieldLabel>
            <ApiSelect value={pedidoForm.fornecedor} onChange={(nome, id) => setPedidoForm(p => ({ ...p, fornecedor: nome, fornecedorBubbleId: id }))} options={fornecedores} placeholder="Selecionar fornecedor" />
          </div>
          <div>
            <FieldLabel required>Modelo da moto</FieldLabel>
            <select
              value={pedidoForm.modelo}
              onChange={e => setPedidoForm(p => ({ ...p, modelo: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
            >
              <option value="">Selecionar modelo</option>
              <option value="START">START</option>
              <option value="FAN">FAN</option>
            </select>
          </div>
          <div>
            <FieldLabel required>Quantidade</FieldLabel>
            <Input type="number" min="1" value={pedidoForm.quantidade} onChange={e => setPedidoForm(p => ({ ...p, quantidade: e.target.value }))} className="h-10" />
          </div>
          <div>
            <FieldLabel required>Selecione a Frota responsavel</FieldLabel>
            <ApiSelect value={pedidoForm.frota} onChange={(nome, id) => setPedidoForm(p => ({ ...p, frota: nome, frotaBubbleId: id }))} options={frotas} placeholder="Selecionar frota" disabled={investidorComFrota} />
          </div>
        </div>
      </div>

      {/* Rastreadores */}
      <div className="space-y-3">
        <SectionTitle icon={Radio}>Rastreadores GPS</SectionTitle>
        <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border px-4 py-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{qtdNum}</span> rastreador{qtdNum !== 1 ? 'es' : ''} × {formatBRL(PRECO_RASTREADOR)}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-base font-bold text-foreground">{formatBRL(totalRastreadores)}</p>
          </div>
        </div>
        <FieldLabel required>Forma de pagamento</FieldLabel>
        <div className="grid grid-cols-1 gap-3">
          {(['pix_recebimento', 'voucher'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setPedidoForm(p => ({ ...p, pagamentoRastreador: opt }))}
              className={cn(
                'flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150',
                pedidoForm.pagamentoRastreador === opt
                  ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20',
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                pedidoForm.pagamentoRastreador === opt ? 'bg-primary/15 border border-primary/30' : 'bg-muted/50 border border-border',
              )}>
                {opt === 'pix_recebimento'
                  ? <QrCode className={cn('w-5 h-5', pedidoForm.pagamentoRastreador === opt ? 'text-primary' : 'text-muted-foreground')} />
                  : <Ticket className={cn('w-5 h-5', pedidoForm.pagamentoRastreador === opt ? 'text-primary' : 'text-muted-foreground')} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-foreground">
                    {opt === 'pix_recebimento' ? 'PIX por recebimento' : 'Voucher à vista'}
                  </p>
                  {pedidoForm.pagamentoRastreador === opt && (
                    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  {opt === 'pix_recebimento'
                    ? <>Cobrado individualmente por moto — <span className="font-semibold text-foreground">{formatBRL(PRECO_RASTREADOR)}</span> a cada veículo recebido na base.</>
                    : <>Voucher no valor total de <span className="font-bold text-foreground">{formatBRL(totalRastreadores)}</span>, pago integralmente antes da entrega.</>
                  }
                </p>
                <span className={cn(
                  'inline-block mt-1.5 text-[10px] font-bold rounded-full px-2 py-0.5',
                  opt === 'pix_recebimento'
                    ? 'text-emerald-600 bg-emerald-50 border border-emerald-200'
                    : 'text-blue-600 bg-blue-50 border border-blue-200',
                )}>
                  {opt === 'pix_recebimento' ? 'Parcelado por entrega' : 'Pagamento único'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Observação */}
      <div className="space-y-3">
        <SectionTitle icon={FileText}>Observações</SectionTitle>
        <textarea
          value={pedidoForm.observacao}
          onChange={e => setPedidoForm(p => ({ ...p, observacao: e.target.value }))}
          rows={3}
          placeholder="Informações adicionais sobre o pedido..."
          className="w-full rounded-xl border border-input bg-muted/10 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Ações */}
      <div className="pb-2 flex gap-3">
        {!preSelectedInvId && (
          <Button variant="outline" className="flex-none h-11 px-5" onClick={() => setStep(1)}>
            ← Voltar
          </Button>
        )}
        <Button
          className="flex-1 h-11 text-sm font-semibold gap-2"
          disabled={!pedidoValido || confirmando}
          onClick={confirmarPedido}
        >
          {confirmando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {confirmando ? 'Registrando...' : 'Confirmar Pedido'}
        </Button>
      </div>
    </div>
  );

  // ─── Tab: Dados ────────────────────────────────────────────────────────────

  const renderTabDados = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="space-y-3">
        <SectionTitle icon={User}>Dados pessoais</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FieldLabel required>Nome completo</FieldLabel>
            <Input value={dadosForm.nome ?? ''} onChange={e => setDadosForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
          </div>
          <div>
            <FieldLabel>CPF</FieldLabel>
            <Input value={dadosForm.cpf ?? ''} onChange={e => setDadosForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
          </div>
          <div>
            <FieldLabel>Estado civil</FieldLabel>
            <select
              value={dadosForm.estado_civil ?? ''}
              onChange={e => setDadosForm(f => ({ ...f, estado_civil: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
            >
              <option value="">Selecionar</option>
              {['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União Estável'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Profissão</FieldLabel>
            <Input value={dadosForm.profissao ?? ''} onChange={e => setDadosForm(f => ({ ...f, profissao: e.target.value }))} placeholder="Profissão" />
          </div>
          <div>
            <FieldLabel>WhatsApp</FieldLabel>
            <Input value={dadosForm.whatsapp ?? ''} onChange={e => setDadosForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(00) 00000-0000" />
          </div>
          <div className="col-span-2">
            <FieldLabel>E-mail</FieldLabel>
            <Input type="email" value={dadosForm.email ?? ''} onChange={e => setDadosForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle icon={MapPin}>Endereço</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FieldLabel>CEP</FieldLabel>
            <div className="relative">
              <Input
                value={dadosForm.cep ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  setDadosForm(f => ({ ...f, cep: v }));
                  if (v.replace(/\D/g, '').length === 8) buscarCep(v, 'dadosForm');
                }}
                placeholder="00000-000"
                maxLength={9}
              />
              {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="col-span-2">
            <FieldLabel>Rua</FieldLabel>
            <Input value={dadosForm.rua ?? ''} onChange={e => setDadosForm(f => ({ ...f, rua: e.target.value }))} placeholder="Nome da rua" />
          </div>
          <div>
            <FieldLabel>Número</FieldLabel>
            <Input value={dadosForm.numero ?? ''} onChange={e => setDadosForm(f => ({ ...f, numero: e.target.value }))} placeholder="123" />
          </div>
          <div>
            <FieldLabel>Bairro</FieldLabel>
            <Input value={dadosForm.bairro ?? ''} onChange={e => setDadosForm(f => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
          </div>
          <div>
            <FieldLabel>Cidade</FieldLabel>
            <Input value={dadosForm.cidade ?? ''} onChange={e => setDadosForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Cidade" />
          </div>
          <div>
            <FieldLabel>Estado</FieldLabel>
            <Input value={dadosForm.estado ?? ''} onChange={e => setDadosForm(f => ({ ...f, estado: e.target.value }))} placeholder="UF" maxLength={2} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle icon={Users}>Vínculo com Acionista</SectionTitle>
        <div>
          <FieldLabel>Vincular ao acionista (opcional)</FieldLabel>
          <select
            value={dadosForm.profile_id ?? ''}
            onChange={e => setDadosForm(f => ({ ...f, profile_id: e.target.value || null }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
          >
            <option value="">Sem vínculo</option>
            {shareholders.map(s => (
              <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
            ))}
          </select>
          {dadosForm.profile_id && (() => {
            const linked = shareholders.find(s => s.id === dadosForm.profile_id);
            return linked ? (
              <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-medium">
                Vinculado — {linked.name}
              </p>
            ) : null;
          })()}
        </div>
      </div>

      <div className="flex gap-3 pb-2">
        <Button
          className="flex-1 h-11 font-semibold gap-2"
          disabled={!dadosForm.nome?.trim() || salvando}
          onClick={salvarDados}
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {salvando ? 'Salvando...' : 'Salvar dados'}
        </Button>
        <Button
          variant="outline"
          className="h-11 px-4 gap-2 text-primary border-primary/30 hover:bg-primary/5"
          onClick={() => {
            setOnboardingPedidoId(`INV-${new Date().getFullYear()}-${selectedId?.slice(0, 6).toUpperCase()}`);
            setShowGerarOnboarding(true);
          }}
        >
          <Link2 className="w-4 h-4" />
          Gerar onboarding
        </Button>
      </div>
    </div>
  );

  // ─── Tab: Arquivos ─────────────────────────────────────────────────────────

  const tipoLabels: Record<string, string> = {
    rg_cnh: 'RG / CNH',
    comprovante_residencia: 'Comprovante de Residência',
    outro: 'Outro',
  };

  const renderTabArquivos = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Upload */}
      <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 space-y-3">
        <p className="text-xs font-bold text-foreground uppercase tracking-widest">Enviar documento</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Tipo</FieldLabel>
            <select
              value={uploadTipo}
              onChange={e => setUploadTipo(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
            >
              <option value="rg_cnh">RG / CNH</option>
              <option value="comprovante_residencia">Comprovante de Residência</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <FieldLabel>Arquivo</FieldLabel>
            <label className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 h-10 text-sm hover:bg-muted/20 transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate text-muted-foreground">{uploadFile ? uploadFile.name : 'Selecionar...'}</span>
              <input type="file" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} accept="image/*,.pdf" />
            </label>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2"
          disabled={!uploadFile || uploadando}
          onClick={handleUpload}
        >
          {uploadando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploadando ? 'Enviando...' : 'Enviar arquivo'}
        </Button>
      </div>

      {/* Lista de arquivos */}
      {loadingArquivos ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : arquivos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <FolderOpen className="w-10 h-10 opacity-20" />
          <p className="text-sm">Nenhum documento enviado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {arquivos.map(arq => (
            <div key={arq.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{arq.nome ?? 'Documento'}</p>
                <p className="text-xs text-muted-foreground">{tipoLabels[arq.tipo] ?? arq.tipo}</p>
              </div>
              <a href={arq.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8 px-2">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive/60 hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                onClick={() => handleDeleteArquivo(arq.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Tab: Pedidos (investidor detail) ─────────────────────────────────────

  const renderTabPedidos = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pedidos do investidor</p>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => openSheetForInvestidor(selectedId!)}>
          <Plus className="w-3.5 h-3.5" /> Novo Pedido
        </Button>
      </div>

      {loadingPedidosDetalhe ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : pedidosDetalhe.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <ShoppingCart className="w-10 h-10 opacity-20" />
          <p className="text-sm">Nenhum pedido registrado.</p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openSheetForInvestidor(selectedId!)}>
            <Plus className="w-3.5 h-3.5" /> Registrar primeiro pedido
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {['Nº', 'Fornecedor', 'Modelo', 'Qtd', 'Rastreador', 'Status', 'Data'].map((h, i) => (
                  <th key={h} className={cn(
                    'px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap',
                    i === 3 ? 'text-center' : 'text-left',
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidosDetalhe.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => openPedidoDetalheFromInvestor(p)}
                  className={cn(
                    'border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer',
                    i % 2 === 0 ? 'bg-background' : 'bg-muted/5',
                  )}
                >
                  <td className="px-3 py-3 font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {buildPedidoNum(p.numero, p.created_at)}
                  </td>
                  <td className="px-3 py-3 font-medium text-foreground">{p.fornecedor_nome ?? '—'}</td>
                  <td className="px-3 py-3 text-muted-foreground">{p.modelo ?? '—'}</td>
                  <td className="px-3 py-3 text-center font-bold">{p.quantidade}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {p.pagamento_rastreador ? pagamentoLabels[p.pagamento_rastreador] ?? p.pagamento_rastreador : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('inline-flex items-center text-[11px] font-bold border rounded-full px-2.5 py-0.5 whitespace-nowrap', getStatusStyle(p.status))}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ─── Global Pedidos View ──────────────────────────────────────────────────

  const renderGlobalPedidos = () => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 px-6 pt-5 pb-4 shrink-0">
        {[
          { label: 'Total', value: String(kpis.total), color: 'text-foreground', bg: 'bg-muted/30', borderColor: 'border-border' },
          { label: 'Novos', value: String(kpis.novos), color: 'text-blue-700', bg: 'bg-blue-50', borderColor: 'border-blue-200' },
          { label: 'Finalizados', value: String(kpis.finalizados), color: 'text-emerald-700', bg: 'bg-emerald-50', borderColor: 'border-emerald-200' },
          { label: 'Cancelados', value: String(kpis.cancelados), color: 'text-red-700', bg: 'bg-red-50', borderColor: 'border-red-200' },
          { label: 'A Receber', value: formatBRL(kpiAReceber), color: 'text-orange-700', bg: 'bg-orange-50', borderColor: 'border-orange-200' },
        ].map(kpi => (
          <div key={kpi.label} className={cn('rounded-xl border p-4', kpi.bg, kpi.borderColor)}>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
            <p className={cn('text-2xl font-bold mt-1', kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 px-6 pb-4 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Buscar pedido, investidor..."
            value={pedidoBusca}
            onChange={e => setPedidoBusca(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'NOVO PEDIDO', label: 'Novos' },
            { value: 'PEDIDO FINALIZADO', label: 'Finalizados' },
            { value: 'CANCELADO', label: 'Cancelados' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setPedidoStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                pedidoStatusFilter === f.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-2 border-l pl-3 border-border">
          {([
            { value: 'all' as const, label: 'Todos', icon: null },
            { value: 'novo' as const, label: 'Novo Investidor', icon: Package },
            { value: 'ativo' as const, label: 'Acionista Ativo', icon: UserCheck },
          ]).map(f => (
            <button
              key={f.value}
              onClick={() => setTipoInvestidorFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1',
                tipoInvestidorFilter === f.value
                  ? f.value === 'novo'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : f.value === 'ativo'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {f.icon && <f.icon className="w-3 h-3" />}
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRastreadorFilter(f => !f)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ml-2 border',
            rastreadorFilter
              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground',
          )}
        >
          <DollarSign className="w-3 h-3 inline-block mr-1 -mt-0.5" />
          Rastreador Pendente
        </button>

        <div className="flex-1" />

        {/* Display mode toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={() => setPedidosDisplayMode('cards')}
            className={cn(
              'p-1.5 transition-colors',
              pedidosDisplayMode === 'cards'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPedidosDisplayMode('tabela')}
            className={cn(
              'p-1.5 transition-colors',
              pedidosDisplayMode === 'tabela'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground',
            )}
          >
            <Table2 className="w-4 h-4" />
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-orange-700 border-orange-300 hover:bg-orange-50"
          onClick={() => setShowRelatorioSheet(true)}
        >
          <DollarSign className="w-3.5 h-3.5" />
          A Receber
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loadingAllPedidos ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : allPedidosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 opacity-20" />
            <p className="text-sm">{pedidoBusca || pedidoStatusFilter !== 'all' ? 'Nenhum pedido encontrado.' : 'Nenhum pedido registrado.'}</p>
          </div>
        ) : pedidosDisplayMode === 'cards' ? (
          /* ── Cards view ── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {allPedidosFiltrados.map(p => {
              const pedidoNum = buildPedidoNum(p.numero, p.created_at);
              const info = pagamentoMap[p.id];
              const expected = p.quantidade * PRECO_RASTREADOR;
              const pago = info?.pago ?? 0;
              const pagosCount = info?.pagosCount ?? 0;
              const saldo = Math.max(0, expected - pago);
              const onbData = p.tipo_investidor === 'novo' ? onboardingMap[pedidoNum] : undefined;
              const onbStatus = onbData?.status;

              const isVoucher = p.pagamento_rastreador === 'voucher';

              return (
                <div
                  key={p.id}
                  onClick={() => setPedidoDetalhe(p)}
                  className={cn(
                    'rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer space-y-3',
                    isVoucher
                      ? 'border-blue-200 bg-gradient-to-br from-blue-50/60 to-card hover:border-blue-400/50'
                      : 'border-border bg-card hover:border-primary/30',
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">{pedidoNum}</span>
                    <div className="flex items-center gap-1.5">
                      {/* Pagamento badge */}
                      {isVoucher ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-300 whitespace-nowrap">
                          <Ticket className="w-3 h-3" />
                          Voucher
                        </span>
                      ) : p.pagamento_rastreador === 'pix_recebimento' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                          <QrCode className="w-3 h-3" />
                          PIX/Receb.
                        </span>
                      ) : null}
                      <span className={cn('inline-flex items-center text-[10px] font-bold border rounded-full px-2 py-0.5 whitespace-nowrap', getStatusStyle(p.status))}>
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {/* Investidor + tipo tag */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{p.investidor_nome}</p>
                    {p.tipo_investidor === 'novo' && (
                      <span className="inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap shrink-0">
                        Novo Investidor
                      </span>
                    )}
                    {p.tipo_investidor === 'ativo' && (
                      <span className="inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                        Acionista Ativo
                      </span>
                    )}
                  </div>

                  {/* Info veiculo */}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{p.modelo ?? '—'} | Fornec: {p.fornecedor_nome ?? '—'}</p>
                    <p>{p.quantidade} moto{p.quantidade !== 1 ? 's' : ''}{p.frota_nome ? ` | Frota: ${p.frota_nome}` : ''}</p>
                  </div>

                  {/* Criado por */}
                  {p.created_by_name && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <UserCheck className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Vendedor:</span>
                      <span className="font-semibold text-foreground">{p.created_by_name}</span>
                    </div>
                  )}

                  {/* Onboarding (only for novo) */}
                  {p.tipo_investidor === 'novo' && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Onboarding:</span>
                      {onbStatus === 'pendente' ? (
                        <span className="inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200">Pendente</span>
                      ) : onbStatus ? (
                        <span className="inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">Concluido</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  )}

                  {/* Rastreador — voucher: single block / pix: progress bar */}
                  {isVoucher ? (
                    <div className="rounded-lg bg-blue-50/80 border border-blue-200 px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-600 font-semibold">Voucher a vista</span>
                        <span className="font-bold text-foreground">{formatBRL(expected)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Status:</span>
                        {pago >= expected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <CircleCheck className="w-3 h-3" /> Pago
                          </span>
                        ) : pago > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <CircleDot className="w-3 h-3" /> Parcial ({formatBRL(pago)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
                            <Circle className="w-3 h-3" /> Pendente
                          </span>
                        )}
                      </div>
                      {saldo > 0 && (
                        <div className="flex items-center justify-between text-xs pt-0.5 border-t border-blue-200/60">
                          <span className="text-muted-foreground">A receber:</span>
                          <span className="font-bold text-orange-600">{formatBRL(saldo)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Rastreador:</span>
                        <span className="font-semibold text-foreground">{pagosCount}/{p.quantidade} pagos</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={cn(
                            'h-1.5 rounded-full transition-all',
                            pagosCount >= p.quantidade ? 'bg-emerald-500' : pagosCount > 0 ? 'bg-amber-500' : 'bg-gray-300',
                          )}
                          style={{ width: `${Math.min(100, (pagosCount / Math.max(1, p.quantidade)) * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">A receber:</span>
                        <span className={cn('font-bold', saldo > 0 ? 'text-orange-600' : 'text-emerald-600')}>
                          {formatBRL(saldo)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bottom tags */}
                  {(() => {
                    const tags: { label: string; style: string }[] = [];
                    const badge = getRastreadorBadge(p.id, p.quantidade);
                    if (badge.label === 'Pendente') tags.push({ label: 'Rastreador Pendente', style: 'text-red-700 bg-red-50 border-red-200' });
                    if (badge.label === 'Parcial') tags.push({ label: 'Rastreador Parcial', style: 'text-amber-700 bg-amber-50 border-amber-200' });
                    if (p.tipo_investidor === 'novo' && onbStatus === 'pendente') tags.push({ label: 'Onboarding Pendente', style: 'text-amber-700 bg-amber-50 border-amber-200' });
                    if (onbData && !onbData.hasCnpj) tags.push({ label: 'Preencha o CNPJ', style: 'text-red-700 bg-red-50 border-red-200' });
                    if (tags.length === 0) return null;
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {tags.map(t => (
                          <span key={t.label} className={cn('inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 border', t.style)}>
                            {t.label}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table view ── */
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {['Nº', 'Investidor', 'Vendedor', 'Fornecedor', 'Modelo', 'Qtd', 'Rastreador', 'Pgt.', 'Status', 'Data'].map((h, i) => (
                    <th key={h} className={cn(
                      'px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap',
                      i === 4 ? 'text-center' : 'text-left',
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPedidosFiltrados.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => setPedidoDetalhe(p)}
                    className={cn(
                      'border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer',
                      i % 2 === 0 ? 'bg-background' : 'bg-muted/5',
                    )}
                  >
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {buildPedidoNum(p.numero, p.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-foreground truncate max-w-[180px]">{p.investidor_nome}</p>
                      {(() => {
                        const tOnb = p.tipo_investidor === 'novo' ? onboardingMap[buildPedidoNum(p.numero, p.created_at)] : undefined;
                        return tOnb && !tOnb.hasCnpj ? (
                          <span className="inline-flex items-center text-[10px] font-bold rounded-full px-2 py-0.5 border text-red-700 bg-red-50 border-red-200 mt-0.5">Preencha o CNPJ</span>
                        ) : null;
                      })()}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs truncate max-w-[120px]">{p.created_by_name ?? '—'}</td>
                    <td className="px-3 py-3 text-foreground">{p.fornecedor_nome ?? '—'}</td>
                    <td className="px-3 py-3 text-muted-foreground">{p.modelo ?? '—'}</td>
                    <td className="px-3 py-3 text-center font-bold">{p.quantidade}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {p.pagamento_rastreador ? pagamentoLabels[p.pagamento_rastreador] ?? p.pagamento_rastreador : '\u2014'}
                    </td>
                    <td className="px-3 py-3">
                      {(() => {
                        const badge = getRastreadorBadge(p.id, p.quantidade);
                        return badge.label === '\u2014'
                          ? <span className="text-gray-400 text-xs">{badge.label}</span>
                          : <span className={cn('inline-flex items-center text-[11px] font-bold border rounded-full px-2.5 py-0.5 whitespace-nowrap', badge.style)}>{badge.label}</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center text-[11px] font-bold border rounded-full px-2.5 py-0.5 whitespace-nowrap', getStatusStyle(p.status))}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Pedido Detail Sheet ──────────────────────────────────────────────────

  const renderPedidoDetalheFullPage = () => {
    if (!pedidoDetalhe) return null;
    const p = pedidoDetalhe;
    const qtd = p.quantidade;
    const totalRast = qtd * PRECO_RASTREADOR;
    const pedidoNum = buildPedidoNum(p.numero, p.created_at);
    const initials = p.investidor_nome.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const info = pagamentoMap[p.id];
    const pago = info?.pago ?? 0;
    const saldo = Math.max(0, totalRast - pago);
    const pagosCount = info?.pagosCount ?? 0;

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/10">
        {/* ── Hero Header ── */}
        <div className="relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(var(--primary)/.06),transparent_70%)] pointer-events-none" />
          <div className="relative px-8 py-5">
            {/* Top row: voltar + data */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setPedidoDetalhe(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Voltar aos pedidos</span>
              </button>
              <div className="flex items-center gap-3">
                {p.status === 'NOVO PEDIDO' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 gap-1.5"
                    onClick={() => setShowDeletePedido(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Excluir</span>
                  </Button>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {' '}
                  {new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Main hero row */}
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">{buildPedidoNum(p.numero, p.created_at)}</h2>
                  <span className={cn('inline-flex items-center text-[11px] font-bold border rounded-full px-2.5 py-0.5 whitespace-nowrap', getStatusStyle(p.status))}>
                    {p.status}
                  </span>
                  {p.tipo_investidor === 'novo' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                      <Package className="w-3 h-3" /> Novo Investidor
                    </span>
                  )}
                  {p.tipo_investidor === 'ativo' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                      <UserCheck className="w-3 h-3" /> Acionista Ativo
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{p.investidor_nome}</span>
                  {p.investidor_cpf && <span className="ml-3 text-xs">{p.investidor_cpf}</span>}
                  {p.investidor_email && <span className="ml-3 text-xs">{p.investidor_email}</span>}
                </p>
                {p.created_by_name && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Criado por <span className="font-semibold text-foreground">{p.created_by_name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-4 gap-3 mt-5">
              <div className="rounded-xl bg-background/80 backdrop-blur-sm border border-border/60 px-4 py-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quantidade</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{qtd} <span className="text-xs font-normal text-muted-foreground">moto{qtd !== 1 ? 's' : ''}</span></p>
              </div>
              <div className="rounded-xl bg-background/80 backdrop-blur-sm border border-border/60 px-4 py-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Rastreadores</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{formatBRL(totalRast)}</p>
              </div>
              <div className={cn('rounded-xl border px-4 py-3', saldo > 0 ? 'bg-orange-50/80 border-orange-200/60' : 'bg-emerald-50/80 border-emerald-200/60')}>
                <p className={cn('text-[10px] font-bold uppercase tracking-widest', saldo > 0 ? 'text-orange-600' : 'text-emerald-600')}>A Receber</p>
                <p className={cn('text-lg font-bold mt-0.5', saldo > 0 ? 'text-orange-700' : 'text-emerald-700')}>{formatBRL(saldo)}</p>
              </div>
              <div className="rounded-xl bg-background/80 backdrop-blur-sm border border-border/60 px-4 py-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pagamento</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {p.pagamento_rastreador === 'voucher' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700"><Ticket className="w-3.5 h-3.5" /> Voucher</span>
                  ) : p.pagamento_rastreador === 'pix_recebimento' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-700"><QrCode className="w-3.5 h-3.5" /> PIX/Receb.</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Nao definido</span>
                  )}
                  {p.pagamento_rastreador === 'pix_recebimento' && (
                    <span className="text-xs text-muted-foreground ml-1">({pagosCount}/{qtd})</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="h-px bg-border" />
        </div>

        {/* ── Content layout ── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8 max-w-3xl">

            {/* Onboarding card resumo */}
            {p.tipo_investidor === 'novo' && onboardingMap[pedidoNum] && (
              <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-bold">Onboarding</span>
                  </div>
                  <Badge className={cn(
                    'text-[11px]',
                    onboardingMap[pedidoNum].status === 'concluido'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}>
                    {onboardingMap[pedidoNum].status === 'concluido' ? 'Concluido' : 'Pendente'}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', onboardingMap[pedidoNum].done >= onboardingMap[pedidoNum].total ? 'bg-emerald-400' : 'bg-amber-400')}
                      style={{ width: `${Math.round((onboardingMap[pedidoNum].done / onboardingMap[pedidoNum].total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{onboardingMap[pedidoNum].done}/{onboardingMap[pedidoNum].total}</p>
                </div>
                <Link to={`/admin/onboarding?pedido=${pedidoNum}`}>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Ver Onboarding
                  </Button>
                </Link>
              </div>
            )}

            {/* Veiculo + Fornecedor — grid compacto */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Bike className="w-4 h-4" /> Veiculo
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: 'Fornecedor', value: p.fornecedor_nome },
                    { label: 'Modelo', value: p.modelo },
                    { label: 'Quantidade', value: `${p.quantidade} unidade${p.quantidade !== 1 ? 's' : ''}` },
                    { label: 'Frota', value: p.frota_nome },
                  ] as const).map(item => (
                    <div key={item.label} className="rounded-xl bg-background border border-border/60 p-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1 truncate">{item.value ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagamento Rastreadores */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Pagamento Rastreadores
                </h3>
                {loadingRastreador ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : p.pagamento_rastreador === 'voucher' ? (
                  /* ── Voucher ── */
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-background overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-blue-200/60 bg-blue-50/40">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-blue-800">Voucher a vista</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{formatBRL(totalRast)}</span>
                    </div>
                    <div className="p-5">
                      {(() => {
                        const voucher = rastreadorPagamentos.find(r => r.tipo === 'voucher_comprovante');
                        if (!voucher) {
                          return (
                            <label className={cn(
                              'flex items-center gap-4 cursor-pointer rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/30 px-5 py-4 hover:bg-blue-50/60 hover:border-blue-400 transition-all group',
                              uploadingComprovante && 'opacity-50 pointer-events-none',
                            )}>
                              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                                {uploadingComprovante
                                  ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                  : <Upload className="w-5 h-5 text-blue-600" />}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">Enviar comprovante de pagamento</p>
                                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG ou PDF — clique para selecionar</p>
                              </div>
                              <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadVoucherComprovante(p, file);
                                e.target.value = '';
                              }} />
                            </label>
                          );
                        }
                        return (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">Comprovante enviado</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={cn(
                                    'inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-0.5 border',
                                    voucher.status === 'pago'
                                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                      : 'text-amber-700 bg-amber-50 border-amber-200',
                                  )}>
                                    {voucher.status === 'pago' ? <CircleCheck className="w-3 h-3" /> : <CircleDot className="w-3 h-3" />}
                                    {voucher.status === 'pago' ? 'Pago' : 'Pendente'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {voucher.comprovante_url && (
                                <a href={voucher.comprovante_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                                    <Eye className="w-3.5 h-3.5" /> Ver
                                  </Button>
                                </a>
                              )}
                              {voucher.status === 'pendente' ? (
                                <Button size="sm" className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => marcarComoPago(voucher.id)}>
                                  <Check className="w-3.5 h-3.5" /> Marcar Pago
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => marcarComoPendente(voucher.id)}>
                                  <RotateCcw className="w-3.5 h-3.5" /> Reverter
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : p.pagamento_rastreador === 'pix_recebimento' ? (
                  /* ── PIX por recebimento ── */
                  <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-background overflow-hidden">
                    {/* Header com progresso */}
                    {(() => {
                      const pagos = rastreadorPagamentos.filter(r => r.status === 'pago').length;
                      const totalPago = rastreadorPagamentos.reduce((s, r) => s + (r.status === 'pago' ? Number(r.valor) : 0), 0);
                      const pct = Math.min(100, (pagos / qtd) * 100);
                      return (
                        <div className="px-5 py-4 border-b border-violet-200/60 bg-violet-50/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <QrCode className="w-4 h-4 text-violet-600" />
                              <span className="text-sm font-bold text-violet-800">PIX por recebimento</span>
                            </div>
                            <span className="text-sm font-bold text-foreground">{pagos}/{qtd} pagos</span>
                          </div>
                          <div className="w-full bg-violet-100 rounded-full h-2.5">
                            <div
                              className={cn('h-2.5 rounded-full transition-all', pagos >= qtd ? 'bg-emerald-500' : 'bg-violet-500')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Recebido: <span className="font-bold text-foreground">{formatBRL(totalPago)}</span></span>
                            <span>Total: <span className="font-bold text-foreground">{formatBRL(totalRast)}</span></span>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Lista de veiculos */}
                    <div className="divide-y divide-violet-100">
                      {Array.from({ length: qtd }, (_, i) => i + 1).map(idx => {
                        const pag = rastreadorPagamentos.find(r => r.tipo === 'pix_veiculo' && r.veiculo_index === idx);
                        return (
                          <div key={idx} className="flex items-center gap-4 px-5 py-3 hover:bg-violet-50/30 transition-colors">
                            {pag?.status === 'pago' ? (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <CircleCheck className="w-4 h-4 text-emerald-600" />
                              </div>
                            ) : pag?.comprovante_url ? (
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                <CircleDot className="w-4 h-4 text-amber-600" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                <Circle className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-foreground">Veiculo {idx}</span>
                              <p className="text-xs text-muted-foreground">
                                {pag?.status === 'pago' ? 'Pagamento confirmado' : pag?.comprovante_url ? 'Comprovante enviado — aguardando confirmacao' : `Pendente — ${formatBRL(PRECO_RASTREADOR)}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {pag?.comprovante_url && (
                                <a href={pag.comprovante_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1">
                                    <Eye className="w-3 h-3" /> Ver
                                  </Button>
                                </a>
                              )}
                              {pag?.status === 'pago' ? (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1 text-muted-foreground" onClick={() => marcarComoPendente(pag.id)}>
                                  <RotateCcw className="w-3 h-3" /> Reverter
                                </Button>
                              ) : pag?.comprovante_url ? (
                                <Button size="sm" className="h-7 px-3 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => marcarComoPago(pag.id)}>
                                  <Check className="w-3 h-3" /> Confirmar
                                </Button>
                              ) : (
                                <label className={cn(
                                  'inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-violet-300 bg-violet-50 px-3 h-7 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 transition-colors',
                                  uploadingComprovante && 'opacity-50 pointer-events-none',
                                )}>
                                  <Upload className="w-3 h-3" /> Upload
                                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadPixComprovante(p, idx, file);
                                    e.target.value = '';
                                  }} />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-background p-5">
                    <p className="text-sm text-muted-foreground">Forma de pagamento nao definida.</p>
                  </div>
                )}
              </div>

              {/* Observacoes */}
              {p.observacao && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Observacoes
                  </h3>
                  <div className="rounded-2xl bg-background border border-border/60 p-5">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{p.observacao}</p>
                  </div>
                </div>
              )}

          </div>
          </div>

        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie pedidos e investidores</p>
        </div>
        <Button onClick={openSheet} className="gap-2 h-10 px-4 font-semibold shadow-sm">
          <Plus className="w-4 h-4" /> Novo Pedido
        </Button>
      </div>

      {/* ── View Mode Toggle ── */}
      <div className="flex items-center gap-1.5 px-6 py-3 border-b shrink-0 bg-muted/10">
        {([
          { id: 'pedidos' as ViewMode, label: 'Pedidos', icon: ShoppingCart },
          { id: 'investidores' as ViewMode, label: 'Investidores', icon: Users },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              viewMode === id
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {viewMode === 'pedidos' ? (
        pedidoDetalhe ? renderPedidoDetalheFullPage() : renderGlobalPedidos()
      ) : (
        /* ── Split layout (investidores) ── */
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left panel — lista ── */}
          <div className="w-72 flex flex-col border-r shrink-0 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Buscar..."
                  value={buscaLista}
                  onChange={e => setBuscaLista(e.target.value)}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loadingInvestidores ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : investidoresFiltrados.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground px-4 text-center">
                  <Users className="w-8 h-8 opacity-20" />
                  <p className="text-sm">{buscaLista ? 'Nenhum resultado.' : 'Nenhum investidor cadastrado.'}</p>
                </div>
              ) : (
                investidoresFiltrados.map(inv => (
                  <button
                    key={inv.id}
                    onClick={() => { setSelectedId(inv.id); setActiveTab('dados'); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 hover:bg-muted/30 transition-colors group',
                      selectedId === inv.id && 'bg-primary/5 border-l-2 border-l-primary',
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">
                        {inv.nome.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{inv.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {inv.cpf ? inv.cpf : (inv.email ?? 'Sem contato')}
                      </p>
                    </div>
                    {(inv.pedidoCount ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] shrink-0 font-semibold">
                        {inv.pedidoCount}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Add investidor */}
            <div className="p-3 border-t shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => setShowNovoInvestidor(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Novo Investidor
              </Button>
            </div>
          </div>

          {/* ── Right panel — detalhes ── */}
          {!selectedInvestidor ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <ClipboardList className="w-12 h-12 opacity-20" />
              <p className="text-sm">Selecione um investidor para ver os detalhes.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Detail header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b shrink-0">
                <div>
                  <p className="font-bold text-foreground">{selectedInvestidor.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedInvestidor.cpf ?? selectedInvestidor.email ?? 'Sem contato'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-8 w-8 p-0"
                  onClick={() => setSelectedId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex border-b shrink-0 px-6">
                {([
                  { id: 'dados',    label: 'Dados',    icon: User },
                  { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
                  { id: 'pedidos',  label: 'Pedidos',  icon: ShoppingCart },
                ] as { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[]).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px',
                      activeTab === id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    {id === 'pedidos' && (selectedInvestidor.pedidoCount ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] ml-1 font-semibold">
                        {selectedInvestidor.pedidoCount}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {activeTab === 'dados'    && renderTabDados()}
                {activeTab === 'arquivos' && renderTabArquivos()}
                {activeTab === 'pedidos'  && renderTabPedidos()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sheet: Novo Pedido ── */}
      <Sheet open={sheetOpen} onOpenChange={open => { if (!open) closeSheet(); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="relative flex items-center gap-4 px-6 pt-6 pb-5 border-b shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div className="relative flex-1 min-w-0">
              <SheetTitle className="text-base font-bold text-foreground leading-tight">
                {sheetMeta.title}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{sheetMeta.sub}</p>
            </div>
          </div>

          {!preSelectedInvId && step > 0 && <Stepper labels={stepLabels} current={step} />}

          {!preSelectedInvId && step === 0 && renderStep0()}
          {!preSelectedInvId && step === 1 && flow === 'novo'  && renderStep1Novo()}
          {!preSelectedInvId && step === 1 && flow === 'ativo' && renderStep1Ativo()}
          {(preSelectedInvId || step === 2) && renderStep2()}
        </SheetContent>
      </Sheet>

      {/* ── Dialog: Novo Investidor ── */}
      <Dialog open={showNovoInvestidor} onOpenChange={setShowNovoInvestidor}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Investidor</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <FieldLabel required>Nome completo</FieldLabel>
            <Input
              placeholder="Nome do investidor"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && criarInvestidor()}
              className="h-11"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoInvestidor(false)}>Cancelar</Button>
            <Button onClick={criarInvestidor} disabled={!novoNome.trim() || criandoInv}>
              {criandoInv ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Gerar Onboarding ── */}
      <Dialog open={showGerarOnboarding} onOpenChange={setShowGerarOnboarding}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerar Link de Onboarding</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <FieldLabel>Cliente</FieldLabel>
            <Input value={selectedInvestidor?.nome ?? ''} disabled className="h-10 opacity-70" />
            <FieldLabel required>ID do Pedido</FieldLabel>
            <Input
              placeholder="Ex: PED-2026-0001"
              value={onboardingPedidoId}
              onChange={e => setOnboardingPedidoId(e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">O link será vinculado a este ID de pedido.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGerarOnboarding(false)}>Cancelar</Button>
            <Button onClick={gerarOnboarding} disabled={!onboardingPedidoId.trim() || criandoOnboarding}>
              {criandoOnboarding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              Gerar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar exclusão de pedido ── */}
      <Dialog open={showDeletePedido} onOpenChange={setShowDeletePedido}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Excluir Pedido
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Tem certeza que deseja excluir o pedido <span className="font-bold text-foreground">{pedidoDetalhe ? buildPedidoNum(pedidoDetalhe.numero, pedidoDetalhe.created_at) : ''}</span>?
            Esta acao nao pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePedido(false)} disabled={deletingPedido}>Cancelar</Button>
            <Button variant="destructive" onClick={excluirPedido} disabled={deletingPedido}>
              {deletingPedido ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sheet: Relatório A Receber ── */}
      {(() => {
        const pedidosComSaldo = allPedidos.map(p => {
          const expected = p.quantidade * PRECO_RASTREADOR;
          const pago = pagamentoMap[p.id]?.pago ?? 0;
          const saldo = Math.max(0, expected - pago);
          return { ...p, expected, pago, saldo };
        });
        const totalEsperado = pedidosComSaldo.reduce((s, p) => s + p.expected, 0);
        const totalRecebido = pedidosComSaldo.reduce((s, p) => s + p.pago, 0);
        const totalPendente = pedidosComSaldo.reduce((s, p) => s + p.saldo, 0);
        const pedidosPendentes = pedidosComSaldo.filter(p => p.saldo > 0);

        function exportarCSV() {
          const BOM = '\uFEFF';
          const sep = ';';
          const header = ['Pedido', 'Investidor', 'Qtd', 'Esperado', 'Pago', 'Saldo'].join(sep);
          const rows = pedidosPendentes.map(p => [
            buildPedidoNum(p.numero, p.created_at),
            `"${p.investidor_nome}"`,
            p.quantidade,
            p.expected.toFixed(2).replace('.', ','),
            p.pago.toFixed(2).replace('.', ','),
            p.saldo.toFixed(2).replace('.', ','),
          ].join(sep));
          const totalRow = ['TOTAL', '', '', totalEsperado.toFixed(2).replace('.', ','), totalRecebido.toFixed(2).replace('.', ','), totalPendente.toFixed(2).replace('.', ',')].join(sep);
          const csv = BOM + [header, ...rows, '', totalRow].join('\r\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `relatorio-a-receber-${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }

        const pedidosVoucher = pedidosPendentes.filter(p => p.pagamento_rastreador === 'voucher');
        const pedidosPix = pedidosPendentes.filter(p => p.pagamento_rastreador === 'pix_recebimento');
        const pedidosOutros = pedidosPendentes.filter(p => p.pagamento_rastreador !== 'voucher' && p.pagamento_rastreador !== 'pix_recebimento');
        const totalVoucherPendente = pedidosVoucher.reduce((s, p) => s + p.saldo, 0);
        const totalPixPendente = pedidosPix.reduce((s, p) => s + p.saldo, 0);
        const percentRecebido = totalEsperado > 0 ? Math.round((totalRecebido / totalEsperado) * 100) : 0;

        return (
          <Sheet open={showRelatorioSheet} onOpenChange={setShowRelatorioSheet}>
            <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0 gap-0">
              <div className="relative flex items-center gap-4 px-6 pt-6 pb-5 border-b shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />
                <div className="relative w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <div className="relative flex-1 min-w-0">
                  <SheetTitle className="text-base font-bold text-foreground leading-tight">
                    Rastreadores A Receber
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Resumo financeiro — {pedidosPendentes.length} pedido{pedidosPendentes.length !== 1 ? 's' : ''} com saldo pendente
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* KPIs principais */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Esperado</p>
                    <p className="text-xl font-bold text-foreground mt-1">{formatBRL(totalEsperado)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{allPedidos.length} pedidos</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Recebido</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{formatBRL(totalRecebido)}</p>
                    <p className="text-[10px] text-emerald-600 mt-1">{percentRecebido}% do total</p>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Saldo Pendente</p>
                    <p className="text-xl font-bold text-orange-700 mt-1">{formatBRL(totalPendente)}</p>
                    <p className="text-[10px] text-orange-600 mt-1">{pedidosPendentes.length} pendentes</p>
                  </div>
                </div>

                {/* Barra de progresso geral */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso de recebimento</span>
                    <span className="font-bold text-foreground">{percentRecebido}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${percentRecebido}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown por tipo */}
                {(pedidosVoucher.length > 0 || pedidosPix.length > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Ticket className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Voucher</p>
                        <p className="text-sm font-bold text-blue-700">{formatBRL(totalVoucherPendente)}</p>
                        <p className="text-[10px] text-muted-foreground">{pedidosVoucher.length} pedido{pedidosVoucher.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <QrCode className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">PIX/Receb.</p>
                        <p className="text-sm font-bold text-violet-700">{formatBRL(totalPixPendente)}</p>
                        <p className="text-[10px] text-muted-foreground">{pedidosPix.length} pedido{pedidosPix.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabela detalhada */}
                {pedidosPendentes.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                    <CircleCheck className="w-10 h-10 opacity-20" />
                    <p className="text-sm">Nenhum saldo pendente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Detalhamento por pedido</p>
                    <div className="rounded-xl border overflow-x-auto">
                      <table className="w-full text-sm min-w-[640px]">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            {['Pedido', 'Investidor', 'Tipo', 'Qtd', 'Esperado', 'Pago', 'Saldo'].map(h => (
                              <th key={h} className="px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-left">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pedidosPendentes.map((p, i) => {
                            const isVoucher = p.pagamento_rastreador === 'voucher';
                            const progressPct = p.expected > 0 ? Math.round((p.pago / p.expected) * 100) : 0;
                            return (
                              <tr
                                key={p.id}
                                onClick={() => { setShowRelatorioSheet(false); setPedidoDetalhe(p); }}
                                className={cn(
                                  'border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer',
                                  i % 2 === 0 ? 'bg-background' : 'bg-muted/5',
                                )}
                              >
                                <td className="px-3 py-3 font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                  {buildPedidoNum(p.numero, p.created_at)}
                                </td>
                                <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap max-w-[180px] truncate">{p.investidor_nome}</td>
                                <td className="px-3 py-3">
                                  {isVoucher ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-300 whitespace-nowrap">
                                      <Ticket className="w-2.5 h-2.5" /> Voucher
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                                      <QrCode className="w-2.5 h-2.5" /> PIX
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center font-bold">{p.quantidade}</td>
                                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{formatBRL(p.expected)}</td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <span className="text-emerald-700 font-semibold">{formatBRL(p.pago)}</span>
                                  <span className="text-[10px] text-muted-foreground ml-1">({progressPct}%)</span>
                                </td>
                                <td className="px-3 py-3 text-orange-700 font-bold whitespace-nowrap">{formatBRL(p.saldo)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border bg-muted/20">
                            <td colSpan={4} className="px-3 py-3 text-xs font-bold text-foreground uppercase">Total</td>
                            <td className="px-3 py-3 font-bold text-foreground whitespace-nowrap">{formatBRL(totalEsperado)}</td>
                            <td className="px-3 py-3 font-bold text-emerald-700 whitespace-nowrap">{formatBRL(totalRecebido)}</td>
                            <td className="px-3 py-3 font-bold text-orange-700 whitespace-nowrap">{formatBRL(totalPendente)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t shrink-0">
                <Button className="w-full gap-2" onClick={exportarCSV}>
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        );
      })()}
    </div>
  );
}
