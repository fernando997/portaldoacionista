import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Receipt, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transaction {
  id: string;
  date: string;
  value: number;
  type: string;
  description: string;
  status: string;
  balance?: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Tipos que representam entrada (verde)
const CREDIT_TYPES = new Set([
  'CREDIT', 'PAYMENT_RECEIVED', 'RECEIVED', 'TRANSFER_RECEIVED',
  'INVOICE', 'REFUND_RECEIVED',
]);

// Tipos que representam saída (vermelho)
const DEBIT_TYPES = new Set([
  'DEBIT', 'PAYMENT_FEE', 'FEE', 'TRANSFER', 'BILL_PAYMENT',
  'SUBSCRIPTION_FEE', 'CHARGEBACK', 'REFUND', 'ANTICIPATED_PAYMENT_FEE',
]);

function isCredit(type: string): boolean {
  const t = type?.toUpperCase();
  if (CREDIT_TYPES.has(t)) return true;
  if (DEBIT_TYPES.has(t)) return false;
  // fallback: se contém "RECEIV" ou "RECEB" é entrada
  return t?.includes('RECEIV') || t?.includes('RECEB') || false;
}

const typeLabel: Record<string, string> = {
  CREDIT: 'Recebimento',
  DEBIT: 'Saída',
  PAYMENT_RECEIVED: 'Recebimento',
  RECEIVED: 'Recebimento',
  TRANSFER_RECEIVED: 'Transferência Recebida',
  PAYMENT_FEE: 'Taxa',
  FEE: 'Taxa',
  TRANSFER: 'Transferência',
  BILL_PAYMENT: 'Pagamento',
  SUBSCRIPTION_FEE: 'Taxa Assinatura',
  CHARGEBACK: 'Estorno',
  REFUND: 'Reembolso',
  REFUND_RECEIVED: 'Reembolso Recebido',
  ANTICIPATED_PAYMENT_FEE: 'Taxa Antecipação',
};

const statusLabel: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'Confirmado', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  PENDING:   { label: 'Pendente',   className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  CANCELLED: { label: 'Cancelado',  className: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}
function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function ExtratoPage() {
  const { currentShareholder, session } = useAuth();

  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [finishDate, setFinishDate] = useState(today());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'receita' | 'despesa'>('todos');

  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = Math.floor(offset / pageSize) + 1;

  const fetchExtrato = useCallback(async (newOffset = 0, newPageSize = pageSize) => {
    if (!currentShareholder.idLocadora) {
      toast.error('Nenhuma locadora associada ao seu perfil.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-extrato', {
        body: {
          locadora: currentShareholder.idLocadora,
          startDate,
          finishDate,
          offset: newOffset,
          limit: newPageSize,
        },
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-user-token': session?.access_token ?? '',
        },
      });

      if (error) {
        let msg = error.message || 'Erro ao buscar extrato';
        try {
          const ctx = await (error as any).context?.json?.();
          console.error('[get-extrato] debug:', JSON.stringify(ctx));
          if (ctx?.error) msg = ctx.error;
        } catch {}
        toast.error(msg);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setTransactions(data.data ?? []);
      setTotalCount(data.totalCount ?? 0);
      setOffset(newOffset);
      setSearched(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar extrato');
    } finally {
      setLoading(false);
    }
  }, [currentShareholder.idLocadora, startDate, finishDate, session, pageSize]);

  const totalCreditos = transactions.filter(t => isCredit(t.type)).reduce((s, t) => s + t.value, 0);
  const totalDebitos = transactions.filter(t => !isCredit(t.type)).reduce((s, t) => s + t.value, 0);
  const saldo = totalCreditos - totalDebitos;

  const filteredTransactions = transactions.filter(t => {
    if (tipoFiltro === 'receita') return isCredit(t.type);
    if (tipoFiltro === 'despesa') return !isCredit(t.type);
    return true;
  });

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const rows = filteredTransactions.map(t => ({
    Data: new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR'),
    Descrição: t.description || '',
    Tipo: typeLabel[t.type?.toUpperCase()] ?? t.type,
    Status: statusLabel[t.status]?.label ?? t.status,
    Valor: (isCredit(t.type) ? '+' : '-') + fmt(Math.abs(t.value)),
    Saldo: t.balance != null ? fmt(t.balance) : '',
  }));

  function downloadXLS() {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato');
    XLSX.writeFile(wb, `extrato_${startDate}_${finishDate}.xlsx`);
  }

  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(13);
    doc.text('Extrato movimentado da sua conta pela Modo Corre', 14, 14);
    doc.setFontSize(9);
    doc.text(`Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(finishDate + 'T00:00:00').toLocaleDateString('pt-BR')}`, 14, 21);
    autoTable(doc, {
      startY: 26,
      head: [['Data', 'Descrição', 'Tipo', 'Status', 'Valor', 'Saldo']],
      body: rows.map(r => [r.Data, r.Descrição, r.Tipo, r.Status, r.Valor, r.Saldo]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 80, 40] },
    });
    doc.save(`extrato_${startDate}_${finishDate}.pdf`);
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-fade-in flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Financeiro</p>
          <h1 className="section-title mb-0">Extrato movimentado da sua conta pela Modo Corre</h1>
        </div>
        {searched && transactions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadXLS}>
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              XLS
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadPDF}>
              <FileText className="w-4 h-4 text-red-500" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.05s', opacity: 0 }}>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label className="text-sm font-semibold">Data inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label className="text-sm font-semibold">Data final</Label>
              <Input
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label className="text-sm font-semibold">Tipo</Label>
              <Select value={tipoFiltro} onValueChange={(v: any) => setTipoFiltro(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="receita">Só Receitas</SelectItem>
                  <SelectItem value="despesa">Só Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => fetchExtrato(0)}
              disabled={loading || !startDate || !finishDate}
              className="gap-2 h-10"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs — só após busca */}
      {searched && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <div className="bg-card rounded-xl border p-5 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{fmt(totalCreditos)}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Créditos</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-5 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{fmt(totalDebitos)}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Débitos</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-5 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${saldo >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
              <Minus className={`w-5 h-5 ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(saldo)}</p>
              <p className="text-xs text-muted-foreground font-medium">Movimento do mês</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {searched && (
        <div className="bg-card rounded-xl border overflow-hidden animate-fade-in relative" style={{ boxShadow: 'var(--shadow-card)' }}>
          {loading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Carregando...
              </div>
            </div>
          )}
          {filteredTransactions.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Receipt className="w-10 h-10 opacity-30" />
              <p className="font-medium">Nenhuma transação no período</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Valor</TableHead>
                    <TableHead className="font-semibold text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm text-foreground max-w-[260px] truncate">
                        {t.description || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {isCredit(t.type)
                            ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                          <span className={`text-xs font-semibold ${isCredit(t.type) ? 'text-emerald-600' : 'text-red-600'}`}>
                            {typeLabel[t.type?.toUpperCase()] ?? t.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${statusLabel[t.status]?.className ?? 'text-muted-foreground'}`}
                        >
                          {statusLabel[t.status]?.label ?? t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold text-sm ${isCredit(t.type) ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isCredit(t.type) ? '+' : '-'}{fmt(Math.abs(t.value))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {t.balance != null ? fmt(t.balance) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginação */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    {totalCount} transações · Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Exibir</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        const newSize = Number(v);
                        setPageSize(newSize);
                        fetchExtrato(0, newSize);
                      }}
                    >
                      <SelectTrigger className="h-7 w-[70px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(n => (
                          <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">por página</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchExtrato(offset - pageSize)}
                    disabled={offset === 0 || loading}
                    className="gap-1"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronLeft className="w-4 h-4" />}
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchExtrato(offset + pageSize)}
                    disabled={offset + pageSize >= totalCount || loading}
                    className="gap-1"
                  >
                    Próxima
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Estado inicial */}
      {!searched && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground animate-fade-in">
          <Receipt className="w-12 h-12 opacity-20" />
          <p className="font-medium">Selecione o período e clique em Buscar</p>
        </div>
      )}
    </div>
  );
}
