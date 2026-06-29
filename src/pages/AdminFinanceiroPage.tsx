import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  DollarSign, Plus, Search, Upload, Loader2, X, Check,
  CircleCheck, Circle, Ban, FileText, User, Calendar, Eye, Download,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Constantes ──────────────────────────────────────────────────────────────

const PRECO_RASTREADOR = 990;

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Investidor {
  id: string;
  nome: string;
}

interface Cobranca {
  id: string;
  investidor_id: string;
  tipo: 'rastreador_manual' | 'despesa';
  descricao: string | null;
  quantidade: number | null;
  valor: number;
  status: 'pendente' | 'pago' | 'cancelado';
  comprovante_url: string | null;
  data_pagamento: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
  baixa_by: string | null;
  investidor_nome?: string;
}

interface RelatorioItem {
  investidor_nome: string;
  origem: 'rastreador_pedido' | 'rastreador_manual' | 'despesa';
  descricao: string;
  valor: number;
  data: string;
}

function origemLabel(origem: RelatorioItem['origem']) {
  if (origem === 'rastreador_pedido') return 'Rastreador (Pedido)';
  if (origem === 'rastreador_manual') return 'Rastreador Manual';
  return 'Despesa Manual';
}

function origemBadge(origem: RelatorioItem['origem']) {
  if (origem === 'rastreador_pedido')
    return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Rastreador (Pedido)</Badge>;
  if (origem === 'rastreador_manual')
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30">Rastreador Manual</Badge>;
  return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30">Despesa Manual</Badge>;
}

function gerarPDF(items: RelatorioItem[]) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Relatório A Receber', 14, 20);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString('pt-BR'), 14, 28);

  const totalRastreadorPedido = items.filter(i => i.origem === 'rastreador_pedido').reduce((s, i) => s + i.valor, 0);
  const totalRastreadorManual = items.filter(i => i.origem === 'rastreador_manual').reduce((s, i) => s + i.valor, 0);
  const totalDespesa = items.filter(i => i.origem === 'despesa').reduce((s, i) => s + i.valor, 0);
  const totalGeral = items.reduce((s, i) => s + i.valor, 0);

  autoTable(doc, {
    startY: 35,
    head: [['Investidor', 'Origem', 'Descrição', 'Valor', 'Data']],
    body: items.map(i => [
      i.investidor_nome,
      origemLabel(i.origem),
      i.descricao,
      formatBRL(i.valor),
      new Date(i.data).toLocaleDateString('pt-BR'),
    ]),
    foot: [
      ['', '', 'Rastreador (Pedido)', formatBRL(totalRastreadorPedido), ''],
      ['', '', 'Rastreador Manual', formatBRL(totalRastreadorManual), ''],
      ['', '', 'Despesa Manual', formatBRL(totalDespesa), ''],
      ['', '', 'TOTAL GERAL', formatBRL(totalGeral), ''],
    ],
  });

  doc.save(`relatorio-a-receber-${Date.now()}.pdf`);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminFinanceiroPage() {
  const { session, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'cobrancas' | 'relatorio'>('cobrancas');
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [investidores, setInvestidores] = useState<Investidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'rastreador_manual' | 'despesa'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'pago' | 'cancelado'>('todos');

  // Relatório A Receber
  const [relatorioItems, setRelatorioItems] = useState<RelatorioItem[]>([]);
  const [relatorioLoading, setRelatorioLoading] = useState(false);
  const [relatorioFilterOrigem, setRelatorioFilterOrigem] = useState<'todos' | 'rastreador_pedido' | 'rastreador_manual' | 'despesa'>('todos');

  // Sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailSheet, setDetailSheet] = useState<Cobranca | null>(null);

  // Form states (nova cobrança)
  const [formTipo, setFormTipo] = useState<'rastreador_manual' | 'despesa'>('rastreador_manual');
  const [formInvestidorId, setFormInvestidorId] = useState('');
  const [formInvestidorSearch, setFormInvestidorSearch] = useState('');
  const [formQtd, setFormQtd] = useState(1);
  const [formValor, setFormValor] = useState(PRECO_RASTREADOR);
  const [formDescricao, setFormDescricao] = useState('');
  const [formObs, setFormObs] = useState('');
  const [creating, setCreating] = useState(false);

  // Baixa states
  const [uploading, setUploading] = useState(false);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load data ───────────────────────────────────────────────────────────

  async function loadCobrancas() {
    let query = (supabase as any)
      .from('cobrancas_manuais')
      .select('*');
    if (role === 'vendedor') {
      query = query.eq('created_by', session?.user?.id);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar cobranças');
      setLoading(false);
      return;
    }

    // Load investidor names
    const investidorIds = [...new Set((data as Cobranca[]).map(c => c.investidor_id))];
    let investidorMap: Record<string, string> = {};
    if (investidorIds.length > 0) {
      const { data: invData } = await (supabase as any)
        .from('investidores')
        .select('id, nome')
        .in('id', investidorIds);
      if (invData) {
        for (const inv of invData) investidorMap[inv.id] = inv.nome;
      }
    }

    setCobrancas((data as Cobranca[]).map(c => ({
      ...c,
      investidor_nome: investidorMap[c.investidor_id] || 'Desconhecido',
    })));
    setLoading(false);
  }

  async function loadInvestidores() {
    const { data } = await (supabase as any)
      .from('investidores')
      .select('id, nome')
      .order('nome');
    if (data) setInvestidores(data);
  }

  async function loadRelatorio() {
    setRelatorioLoading(true);
    const items: RelatorioItem[] = [];

    // Query 1 — Rastreadores de pedido (pendentes)
    const { data: rastreadores } = await (supabase as any)
      .from('pedido_rastreador_pagamentos')
      .select('id, pedido_id, tipo, valor, veiculo_index, created_at')
      .eq('status', 'pendente');

    if (rastreadores && rastreadores.length > 0) {
      const pedidoIds = [...new Set(rastreadores.map((r: any) => r.pedido_id))];
      let pedidosQuery = (supabase as any)
        .from('pedidos')
        .select('id, investidor_id, numero')
        .in('id', pedidoIds);
      if (role === 'vendedor') {
        pedidosQuery = pedidosQuery.eq('created_by', session?.user?.id);
      }
      const { data: pedidos } = await pedidosQuery;

      const investidorIds = [...new Set((pedidos || []).map((p: any) => p.investidor_id))];
      let invMap: Record<string, string> = {};
      if (investidorIds.length > 0) {
        const { data: invData } = await (supabase as any)
          .from('investidores')
          .select('id, nome')
          .in('id', investidorIds);
        if (invData) for (const inv of invData) invMap[inv.id] = inv.nome;
      }

      const pedidoMap: Record<string, { investidor_id: string; numero: string }> = {};
      if (pedidos) for (const p of pedidos) pedidoMap[p.id] = { investidor_id: p.investidor_id, numero: p.numero };

      for (const r of rastreadores) {
        const pedido = pedidoMap[r.pedido_id];
        items.push({
          investidor_nome: pedido ? (invMap[pedido.investidor_id] || 'Desconhecido') : 'Desconhecido',
          origem: 'rastreador_pedido',
          descricao: `Rastreador ${r.tipo || ''} — Pedido #${pedido?.numero || r.pedido_id}${r.veiculo_index != null ? ` (veículo ${r.veiculo_index + 1})` : ''}`,
          valor: Number(r.valor),
          data: r.created_at,
        });
      }
    }

    // Query 2 — Cobranças manuais rastreador_manual (pendentes)
    let cmRastreadorQuery = (supabase as any)
      .from('cobrancas_manuais')
      .select('*')
      .eq('tipo', 'rastreador_manual')
      .eq('status', 'pendente');
    if (role === 'vendedor') {
      cmRastreadorQuery = cmRastreadorQuery.eq('created_by', session?.user?.id);
    }
    const { data: cmRastreador } = await cmRastreadorQuery;

    if (cmRastreador && cmRastreador.length > 0) {
      const ids = [...new Set(cmRastreador.map((c: any) => c.investidor_id))];
      let invMap2: Record<string, string> = {};
      const { data: invData2 } = await (supabase as any).from('investidores').select('id, nome').in('id', ids);
      if (invData2) for (const inv of invData2) invMap2[inv.id] = inv.nome;

      for (const c of cmRastreador) {
        items.push({
          investidor_nome: invMap2[c.investidor_id] || 'Desconhecido',
          origem: 'rastreador_manual',
          descricao: c.descricao || 'Rastreador manual',
          valor: Number(c.valor),
          data: c.created_at,
        });
      }
    }

    // Query 3 — Cobranças manuais despesa (pendentes)
    let cmDespesaQuery = (supabase as any)
      .from('cobrancas_manuais')
      .select('*')
      .eq('tipo', 'despesa')
      .eq('status', 'pendente');
    if (role === 'vendedor') {
      cmDespesaQuery = cmDespesaQuery.eq('created_by', session?.user?.id);
    }
    const { data: cmDespesa } = await cmDespesaQuery;

    if (cmDespesa && cmDespesa.length > 0) {
      const ids = [...new Set(cmDespesa.map((c: any) => c.investidor_id))];
      let invMap3: Record<string, string> = {};
      const { data: invData3 } = await (supabase as any).from('investidores').select('id, nome').in('id', ids);
      if (invData3) for (const inv of invData3) invMap3[inv.id] = inv.nome;

      for (const c of cmDespesa) {
        items.push({
          investidor_nome: invMap3[c.investidor_id] || 'Desconhecido',
          origem: 'despesa',
          descricao: c.descricao || 'Despesa',
          valor: Number(c.valor),
          data: c.created_at,
        });
      }
    }

    setRelatorioItems(items);
    setRelatorioLoading(false);
  }

  useEffect(() => {
    loadCobrancas();
    loadInvestidores();
  }, []);

  useEffect(() => {
    if (activeTab === 'relatorio') loadRelatorio();
  }, [activeTab]);

  // ─── KPIs ────────────────────────────────────────────────────────────────

  const pendentes = cobrancas.filter(c => c.status === 'pendente');
  const pagos = cobrancas.filter(c => c.status === 'pago');
  const totalReceber = pendentes.reduce((s, c) => s + Number(c.valor), 0);
  const totalRecebido = pagos.reduce((s, c) => s + Number(c.valor), 0);

  // ─── Relatório KPIs ─────────────────────────────────────────────────────
  const relRastreadorPedido = relatorioItems.filter(i => i.origem === 'rastreador_pedido');
  const relRastreadorManual = relatorioItems.filter(i => i.origem === 'rastreador_manual');
  const relDespesa = relatorioItems.filter(i => i.origem === 'despesa');
  const relTotalRastreadorPedido = relRastreadorPedido.reduce((s, i) => s + i.valor, 0);
  const relTotalRastreadorManual = relRastreadorManual.reduce((s, i) => s + i.valor, 0);
  const relTotalDespesa = relDespesa.reduce((s, i) => s + i.valor, 0);
  const relTotalGeral = relTotalRastreadorPedido + relTotalRastreadorManual + relTotalDespesa;

  const relatorioFiltered = relatorioFilterOrigem === 'todos'
    ? relatorioItems
    : relatorioItems.filter(i => i.origem === relatorioFilterOrigem);

  // ─── Filtered list ───────────────────────────────────────────────────────

  const filtered = cobrancas.filter(c => {
    if (filterTipo !== 'todos' && c.tipo !== filterTipo) return false;
    if (filterStatus !== 'todos' && c.status !== filterStatus) return false;
    if (search) {
      const term = search.toLowerCase();
      const nome = (c.investidor_nome || '').toLowerCase();
      const desc = (c.descricao || '').toLowerCase();
      if (!nome.includes(term) && !desc.includes(term)) return false;
    }
    return true;
  });

  // ─── Create cobrança ─────────────────────────────────────────────────────

  async function handleCreate() {
    if (!formInvestidorId) {
      toast.error('Selecione um investidor');
      return;
    }
    const valor = formTipo === 'rastreador_manual' ? formValor : formValor;
    if (valor <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    setCreating(true);
    const payload: any = {
      investidor_id: formInvestidorId,
      tipo: formTipo,
      valor,
      created_by: session?.user?.id,
    };
    if (formTipo === 'rastreador_manual') {
      payload.quantidade = formQtd;
      payload.descricao = `${formQtd} rastreador${formQtd !== 1 ? 'es' : ''} (manual)`;
    } else {
      payload.descricao = formDescricao;
    }
    if (formObs) payload.observacao = formObs;

    const { error } = await (supabase as any).from('cobrancas_manuais').insert(payload);
    setCreating(false);

    if (error) {
      toast.error('Erro ao criar cobrança');
      return;
    }

    toast.success('Cobrança criada com sucesso');
    setSheetOpen(false);
    resetForm();
    loadCobrancas();
  }

  function resetForm() {
    setFormTipo('rastreador_manual');
    setFormInvestidorId('');
    setFormInvestidorSearch('');
    setFormQtd(1);
    setFormValor(PRECO_RASTREADOR);
    setFormDescricao('');
    setFormObs('');
  }

  // ─── Dar baixa ───────────────────────────────────────────────────────────

  async function handleBaixa() {
    if (!detailSheet || !comprovanteFile) return;
    setUploading(true);

    const ext = comprovanteFile.name.split('.').pop();
    const path = `${detailSheet.investidor_id}/cobrancas/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('investidor-docs')
      .upload(path, comprovanteFile);

    if (upErr) {
      toast.error('Erro ao enviar comprovante');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('investidor-docs').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error } = await (supabase as any)
      .from('cobrancas_manuais')
      .update({
        status: 'pago',
        comprovante_url: publicUrl,
        data_pagamento: new Date().toISOString(),
        baixa_by: session?.user?.id,
      })
      .eq('id', detailSheet.id);

    setUploading(false);
    if (error) {
      toast.error('Erro ao confirmar pagamento');
      return;
    }

    toast.success('Pagamento confirmado');
    setDetailSheet(null);
    setComprovanteFile(null);
    loadCobrancas();
  }

  async function handleCancelar() {
    if (!detailSheet) return;
    const { error } = await (supabase as any)
      .from('cobrancas_manuais')
      .update({ status: 'cancelado' })
      .eq('id', detailSheet.id);

    if (error) {
      toast.error('Erro ao cancelar cobrança');
      return;
    }
    toast.success('Cobrança cancelada');
    setDetailSheet(null);
    loadCobrancas();
  }

  // ─── Investidor picker (filtered) ─────────────────────────────────────────

  const filteredInvestidores = investidores.filter(i =>
    i.nome.toLowerCase().includes(formInvestidorSearch.toLowerCase())
  );

  // ─── Status badge helper ──────────────────────────────────────────────────

  function statusBadge(status: string) {
    if (status === 'pendente') return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Pendente</Badge>;
    if (status === 'pago') return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Pago</Badge>;
    return <Badge className="bg-red-500/15 text-red-500 border-red-500/30">Cancelado</Badge>;
  }

  function tipoBadge(tipo: string) {
    if (tipo === 'rastreador_manual') return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30">Rastreador Manual</Badge>;
    return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30">Despesa Manual</Badge>;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Cobranças manuais para investidores</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        <button
          onClick={() => setActiveTab('cobrancas')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'cobrancas'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Cobranças
        </button>
        <button
          onClick={() => setActiveTab('relatorio')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'relatorio'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Relatório A Receber
        </button>
      </div>

      {/* ─── Tab: Relatório A Receber ─────────────────────────────────────── */}
      {activeTab === 'relatorio' && (
        relatorioLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rastreadores Pedido</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{formatBRL(relTotalRastreadorPedido)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{relRastreadorPedido.length} pendente{relRastreadorPedido.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rastreadores Manuais</p>
                <p className="text-xl font-bold text-yellow-600 mt-1">{formatBRL(relTotalRastreadorManual)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{relRastreadorManual.length} pendente{relRastreadorManual.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Despesas</p>
                <p className="text-xl font-bold text-purple-600 mt-1">{formatBRL(relTotalDespesa)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{relDespesa.length} pendente{relDespesa.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-xl border bg-card p-4 border-primary/30">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total A Receber</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatBRL(relTotalGeral)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{relatorioItems.length} item{relatorioItems.length !== 1 ? 'ns' : ''}</p>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <select
                value={relatorioFilterOrigem}
                onChange={e => setRelatorioFilterOrigem(e.target.value as any)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todas as origens</option>
                <option value="rastreador_pedido">Rastreador Pedido</option>
                <option value="rastreador_manual">Rastreador Manual</option>
                <option value="despesa">Despesa</option>
              </select>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => gerarPDF(relatorioFiltered)}
                disabled={relatorioFiltered.length === 0}
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </Button>
            </div>

            {/* Table */}
            {relatorioFiltered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma pendência encontrada</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Investidor</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Origem</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Descrição</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Valor</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioFiltered.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{item.investidor_nome}</td>
                          <td className="px-4 py-3">{origemBadge(item.origem)}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{item.descricao}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatBRL(item.valor)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 font-bold">
                        <td className="px-4 py-3" colSpan={3}>Total</td>
                        <td className="px-4 py-3 text-right">{formatBRL(relatorioFiltered.reduce((s, i) => s + i.valor, 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ─── Tab: Cobranças ────────────────────────────────────────────────── */}
      {activeTab === 'cobrancas' && (<>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">A Receber</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatBRL(totalReceber)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Recebido</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatBRL(totalRecebido)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pendentes</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{pendentes.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pagas</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{pagos.length}</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por investidor ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="todos">Todos os tipos</option>
            <option value="rastreador_manual">Rastreador Manual</option>
            <option value="despesa">Despesa</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <Button onClick={() => { resetForm(); setSheetOpen(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nova Cobrança
          </Button>
        </div>
      </div>

      {/* Cobrança list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma cobrança encontrada</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => { setDetailSheet(c); setComprovanteFile(null); }}
              className="rounded-xl border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{c.investidor_nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.descricao || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tipoBadge(c.tipo)}
                  {statusBadge(c.status)}
                  <span className="font-bold text-sm text-foreground">{formatBRL(Number(c.valor))}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </>)}

      {/* Sheet: Nova Cobrança */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold mb-6">
            <Plus className="w-5 h-5 text-primary" />
            Nova Cobrança Manual
          </SheetTitle>

          <div className="space-y-5">
            {/* Tipo */}
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-2 uppercase tracking-wide">Tipo</label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setFormTipo('rastreador_manual'); setFormValor(formQtd * PRECO_RASTREADOR); }}
                  className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    formTipo === 'rastreador_manual'
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  Rastreador Manual
                </button>
                <button
                  onClick={() => { setFormTipo('despesa'); setFormValor(0); }}
                  className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    formTipo === 'despesa'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  Despesa
                </button>
              </div>
            </div>

            {/* Investidor */}
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                Investidor <span className="text-primary">*</span>
              </label>
              <Input
                placeholder="Buscar investidor..."
                value={formInvestidorSearch}
                onChange={e => { setFormInvestidorSearch(e.target.value); setFormInvestidorId(''); }}
              />
              {formInvestidorId ? (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {investidores.find(i => i.id === formInvestidorId)?.nome}
                  </span>
                  <button onClick={() => { setFormInvestidorId(''); setFormInvestidorSearch(''); }} className="ml-auto">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : formInvestidorSearch.length >= 2 ? (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border bg-popover">
                  {filteredInvestidores.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Nenhum resultado</p>
                  ) : (
                    filteredInvestidores.slice(0, 10).map(inv => (
                      <button
                        key={inv.id}
                        onClick={() => { setFormInvestidorId(inv.id); setFormInvestidorSearch(inv.nome); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      >
                        {inv.nome}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {/* Rastreador: quantidade + valor */}
            {formTipo === 'rastreador_manual' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">Quantidade</label>
                  <Input
                    type="number"
                    min={1}
                    value={formQtd}
                    onChange={e => {
                      const q = Math.max(1, Number(e.target.value));
                      setFormQtd(q);
                      setFormValor(q * PRECO_RASTREADOR);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                    Valor Total ({formQtd} x {formatBRL(PRECO_RASTREADOR)})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formValor}
                    onChange={e => setFormValor(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {/* Despesa: descrição + valor */}
            {formTipo === 'despesa' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                    Descrição <span className="text-primary">*</span>
                  </label>
                  <Input
                    placeholder="Descrição da despesa..."
                    value={formDescricao}
                    onChange={e => setFormDescricao(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                    Valor (R$) <span className="text-primary">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formValor}
                    onChange={e => setFormValor(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {/* Observação */}
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">Observação</label>
              <Input
                placeholder="Observação (opcional)..."
                value={formObs}
                onChange={e => setFormObs(e.target.value)}
              />
            </div>

            {/* Submit */}
            <Button
              className="w-full"
              disabled={creating || !formInvestidorId || formValor <= 0 || (formTipo === 'despesa' && !formDescricao)}
              onClick={handleCreate}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Cobrança
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet: Detalhe */}
      <Sheet open={!!detailSheet} onOpenChange={open => { if (!open) setDetailSheet(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailSheet && (
            <>
              <SheetTitle className="flex items-center gap-2 text-lg font-bold mb-6">
                <FileText className="w-5 h-5 text-primary" />
                Detalhe da Cobrança
              </SheetTitle>

              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {tipoBadge(detailSheet.tipo)}
                  {statusBadge(detailSheet.status)}
                </div>

                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{detailSheet.investidor_nome}</span>
                  </div>
                  {detailSheet.descricao && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{detailSheet.descricao}</span>
                    </div>
                  )}
                  {detailSheet.quantidade && (
                    <div className="text-sm text-muted-foreground">
                      Quantidade: <span className="font-medium text-foreground">{detailSheet.quantidade}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-lg font-bold">{formatBRL(Number(detailSheet.valor))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Criada em {new Date(detailSheet.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {detailSheet.observacao && (
                    <p className="text-sm text-muted-foreground italic">{detailSheet.observacao}</p>
                  )}
                </div>

                {/* Pago: exibir comprovante */}
                {detailSheet.status === 'pago' && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                    <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                      <CircleCheck className="w-4 h-4" />
                      Pagamento confirmado
                    </p>
                    {detailSheet.data_pagamento && (
                      <p className="text-xs text-muted-foreground">
                        Em {new Date(detailSheet.data_pagamento).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {detailSheet.comprovante_url && (
                      <a
                        href={detailSheet.comprovante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <Eye className="w-4 h-4" />
                        Ver comprovante
                      </a>
                    )}
                  </div>
                )}

                {/* Cancelado */}
                {detailSheet.status === 'cancelado' && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                    <p className="text-sm font-semibold text-red-500 flex items-center gap-1.5">
                      <Ban className="w-4 h-4" />
                      Cobrança cancelada
                    </p>
                  </div>
                )}

                {/* Pendente: dar baixa */}
                {detailSheet.status === 'pendente' && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                        Comprovante de pagamento <span className="text-primary">*</span>
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={e => setComprovanteFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      />
                    </div>

                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={!comprovanteFile || uploading}
                      onClick={handleBaixa}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Confirmar Pagamento
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full text-red-500 border-red-500/30 hover:bg-red-500/10"
                      onClick={handleCancelar}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Cancelar Cobrança
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
