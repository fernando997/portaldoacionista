import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Truck, Search, Loader2, Copy, ExternalLink,
  Calendar, Hash, Car, DollarSign, CircleCheck, HandCoins,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VeiculoRecebido {
  id: string;
  pedido_id: string;
  chassi: string;
  data_recebimento: string;
  status: 'recebido' | 'cobranca_gerada' | 'pago';
  asaas_payment_id: string | null;
  asaas_payment_url: string | null;
  asaas_customer_id: string | null;
  valor_cobranca: number | null;
  created_at: string;
  // enriched
  pedido_numero?: string;
  investidor_nome?: string;
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminVeiculosRecebidosPage() {
  const [veiculos, setVeiculos] = useState<VeiculoRecebido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'recebido' | 'cobranca_gerada' | 'pago'>('todos');
  const [detailSheet, setDetailSheet] = useState<VeiculoRecebido | null>(null);
  const [baixaObs, setBaixaObs] = useState('');
  const [baixaLoading, setBaixaLoading] = useState(false);

  // ─── Load data ───────────────────────────────────────────────────────────

  async function loadVeiculos() {
    const { data, error } = await (supabase as any)
      .from('veiculos_recebidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar veículos recebidos');
      setLoading(false);
      return;
    }

    const items = data as VeiculoRecebido[];
    if (items.length === 0) {
      setVeiculos([]);
      setLoading(false);
      return;
    }

    // Enrich with pedidos
    const pedidoIds = [...new Set(items.map(v => v.pedido_id))];
    const { data: pedidos } = await (supabase as any)
      .from('pedidos')
      .select('id, numero, investidor_id')
      .in('id', pedidoIds);

    const pedidoMap: Record<string, { numero: string; investidor_id: string }> = {};
    if (pedidos) for (const p of pedidos) pedidoMap[p.id] = { numero: p.numero, investidor_id: p.investidor_id };

    // Enrich with investidores
    const investidorIds = [...new Set((pedidos || []).map((p: any) => p.investidor_id))];
    let invMap: Record<string, string> = {};
    if (investidorIds.length > 0) {
      const { data: invData } = await (supabase as any)
        .from('investidores')
        .select('id, nome')
        .in('id', investidorIds);
      if (invData) for (const inv of invData) invMap[inv.id] = inv.nome;
    }

    setVeiculos(items.map(v => ({
      ...v,
      pedido_numero: pedidoMap[v.pedido_id]?.numero || '—',
      investidor_nome: invMap[pedidoMap[v.pedido_id]?.investidor_id] || 'Desconhecido',
    })));
    setLoading(false);
  }

  useEffect(() => {
    loadVeiculos();
  }, []);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-veiculos-recebidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'veiculos_recebidos' }, () => loadVeiculos())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── KPIs ────────────────────────────────────────────────────────────────

  const totalRecebidos = veiculos.length;
  const cobrancaGerada = veiculos.filter(v => v.status === 'cobranca_gerada');
  const pagos = veiculos.filter(v => v.status === 'pago');
  const voucher = veiculos.filter(v => v.status === 'recebido');

  // ─── Filtered list ───────────────────────────────────────────────────────

  const filtered = veiculos.filter(v => {
    if (filterStatus !== 'todos' && v.status !== filterStatus) return false;
    if (search) {
      const term = search.toLowerCase();
      const nome = (v.investidor_nome || '').toLowerCase();
      const chassi = (v.chassi || '').toLowerCase();
      const pedido = (v.pedido_numero || '').toLowerCase();
      if (!nome.includes(term) && !chassi.includes(term) && !pedido.includes(term)) return false;
    }
    return true;
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function statusBadge(status: string) {
    if (status === 'recebido') return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Recebido</Badge>;
    if (status === 'cobranca_gerada') return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Aguardando Pgto</Badge>;
    return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Pago</Badge>;
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    } catch {
      toast.error('Erro ao copiar link');
    }
  }

  async function handleBaixaManual() {
    if (!detailSheet) return;
    setBaixaLoading(true);

    // 1. Atualizar veiculos_recebidos → pago
    const { error } = await (supabase as any)
      .from('veiculos_recebidos')
      .update({ status: 'pago' })
      .eq('id', detailSheet.id);

    if (error) {
      toast.error('Erro ao dar baixa');
      setBaixaLoading(false);
      return;
    }

    // 2. Atualizar pedido_rastreador_pagamentos vinculado → pago
    await (supabase as any)
      .from('pedido_rastreador_pagamentos')
      .update({ status: 'pago' })
      .eq('veiculo_recebido_id', detailSheet.id)
      .eq('status', 'pendente');

    toast.success('Baixa manual realizada');
    setBaixaLoading(false);
    setBaixaObs('');
    setDetailSheet(null);
    loadVeiculos();
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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" />
          Veículos Recebidos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Recepção de veículos e links de pagamento</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Recebidos</p>
          <p className="text-xl font-bold text-foreground mt-1">{totalRecebidos}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Aguardando Pgto</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{cobrancaGerada.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pagos</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{pagos.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Sem Cobrança</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{voucher.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por investidor, chassi ou pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todos os status</option>
          <option value="recebido">Recebido</option>
          <option value="cobranca_gerada">Aguardando Pgto</option>
          <option value="pago">Pago</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum veículo encontrado</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Pedido</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Investidor</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Chassi</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Recebimento</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Valor</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Link Pgto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr
                    key={v.id}
                    onClick={() => setDetailSheet(v)}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium">#{v.pedido_numero}</td>
                    <td className="px-4 py-3">{v.investidor_nome}</td>
                    <td className="px-4 py-3 font-mono text-xs">{v.chassi}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(v.data_recebimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">{statusBadge(v.status)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {v.valor_cobranca ? formatBRL(Number(v.valor_cobranca)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {v.asaas_payment_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs"
                          onClick={e => { e.stopPropagation(); copyLink(v.asaas_payment_url!); }}
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sheet: Detalhe */}
      <Sheet open={!!detailSheet} onOpenChange={open => { if (!open) setDetailSheet(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailSheet && (
            <>
              <SheetTitle className="flex items-center gap-2 text-lg font-bold mb-6">
                <Car className="w-5 h-5 text-primary" />
                Detalhe do Veículo
              </SheetTitle>

              <div className="space-y-4">
                <div className="flex gap-2">
                  {statusBadge(detailSheet.status)}
                </div>

                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Pedido <span className="font-medium">#{detailSheet.pedido_numero}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Investidor: <span className="font-medium">{detailSheet.investidor_nome}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{detailSheet.chassi}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Recebido em {new Date(detailSheet.data_recebimento).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {detailSheet.valor_cobranca && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-lg font-bold">{formatBRL(Number(detailSheet.valor_cobranca))}</span>
                    </div>
                  )}
                </div>

                {/* Link de pagamento */}
                {detailSheet.asaas_payment_url && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Link de Pagamento</p>
                    <p className="text-xs text-muted-foreground break-all">{detailSheet.asaas_payment_url}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => copyLink(detailSheet.asaas_payment_url!)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        asChild
                      >
                        <a href={detailSheet.asaas_payment_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Baixa manual — para status recebido ou cobranca_gerada */}
                {(detailSheet.status === 'recebido' || detailSheet.status === 'cobranca_gerada') && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                    <p className="text-sm font-semibold text-amber-600 flex items-center gap-1.5">
                      <HandCoins className="w-4 h-4" />
                      Baixa Manual
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Use quando o pagamento for em dinheiro, transferência direta ou outro meio fora do Asaas.
                    </p>
                    <Input
                      placeholder="Observação (opcional)..."
                      value={baixaObs}
                      onChange={e => setBaixaObs(e.target.value)}
                    />
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      disabled={baixaLoading}
                      onClick={handleBaixaManual}
                    >
                      {baixaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleCheck className="w-4 h-4" />}
                      Confirmar Pagamento Manual
                    </Button>
                  </div>
                )}

                {/* Status pago */}
                {detailSheet.status === 'pago' && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                      <CircleCheck className="w-4 h-4" />
                      Pagamento confirmado
                    </p>
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
