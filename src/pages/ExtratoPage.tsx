import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Receipt, FileSpreadsheet, FileText, ArrowUpDown } from 'lucide-react';
import logo from '@/assets/logo.png';
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

const CREDIT_TYPES = new Set([
  'CREDIT', 'PAYMENT_RECEIVED', 'RECEIVED', 'TRANSFER_RECEIVED',
  'INVOICE', 'REFUND_RECEIVED', 'PIX_TRANSACTION_DEBIT_REFUND',
]);
const DEBIT_TYPES = new Set([
  'DEBIT', 'PAYMENT_FEE', 'FEE', 'TRANSFER', 'BILL_PAYMENT',
  'SUBSCRIPTION_FEE', 'CHARGEBACK', 'REFUND', 'ANTICIPATED_PAYMENT_FEE',
]);

function isCredit(type: string): boolean {
  const t = type?.toUpperCase();
  if (CREDIT_TYPES.has(t)) return true;
  if (DEBIT_TYPES.has(t)) return false;
  return t?.includes('RECEIV') || t?.includes('RECEB') || false;
}

const typeLabel: Record<string, string> = {
  CREDIT: 'Recebimento',
  DEBIT: 'Saída',
  PAYMENT_RECEIVED: 'Recebimento',
  RECEIVED: 'Recebimento',
  TRANSFER_RECEIVED: 'Transf. Recebida',
  PAYMENT_FEE: 'Taxa',
  FEE: 'Taxa',
  TRANSFER: 'Transferência',
  BILL_PAYMENT: 'Pagamento',
  SUBSCRIPTION_FEE: 'Taxa Assinatura',
  CHARGEBACK: 'Estorno',
  REFUND: 'Reembolso',
  REFUND_RECEIVED: 'Reembolso Recebido',
  PIX_TRANSACTION_DEBIT_REFUND: 'Extorno Pix',
  ANTICIPATED_PAYMENT_FEE: 'Taxa Antecipação',
};

const statusLabel: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'Confirmado', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  PENDING:   { label: 'Pendente',   className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  CANCELLED: { label: 'Cancelado',  className: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

function today() { return new Date().toISOString().slice(0, 10); }
function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function ExtratoPage() {
  const { currentShareholder, session } = useAuth();

  const [startDate, setStartDate]     = useState(firstDayOfMonth());
  const [finishDate, setFinishDate]   = useState(today());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [offset, setOffset]           = useState(0);
  const [pageSize, setPageSize]       = useState(20);
  const [loading, setLoading]         = useState(false);
  const [searched, setSearched]       = useState(false);
  const [tipoFiltro, setTipoFiltro]   = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [sortOrder, setSortOrder]     = useState<'desc' | 'asc'>('desc');

  const totalPages  = Math.ceil(totalCount / pageSize);
  const currentPage = Math.floor(offset / pageSize) + 1;

  const fetchExtrato = useCallback(async (newOffset = 0, newPageSize = pageSize, newOrder = sortOrder) => {
    if (!currentShareholder.idLocadora) {
      toast.error('Nenhuma locadora associada ao seu perfil.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-extrato', {
        body: { locadora: currentShareholder.idLocadora, startDate, finishDate, offset: newOffset, limit: newPageSize, order: newOrder },
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-user-token': session?.access_token ?? '',
        },
      });

      if (error) {
        let msg = error.message || 'Erro ao buscar extrato';
        try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch {}
        toast.error(msg);
        return;
      }
      if (data?.error) { toast.error(data.error); return; }

      setTransactions(data.data ?? []);
      setTotalCount(data.totalCount ?? 0);
      setOffset(newOffset);
      setSearched(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar extrato');
    } finally {
      setLoading(false);
    }
  }, [currentShareholder.idLocadora, startDate, finishDate, session, pageSize, sortOrder]);

  const totalCreditos = transactions.filter(t =>  isCredit(t.type)).reduce((s, t) => s + t.value, 0);
  const totalDebitos  = transactions.filter(t => !isCredit(t.type)).reduce((s, t) => s + t.value, 0);
  const saldo = totalCreditos - totalDebitos;

  const filteredTransactions = transactions
    .filter(t => {
      if (tipoFiltro === 'receita') return  isCredit(t.type);
      if (tipoFiltro === 'despesa') return !isCredit(t.type);
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortOrder === 'asc' ? diff : -diff;
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

  async function downloadPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });

    // Logo — carrega via HTMLImageElement + canvas para maior compatibilidade
    const logoY = 6;
    try {
      const imgData = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = logo;
      });
      doc.addImage(imgData, 'PNG', 14, logoY, 38, 12);
    } catch {}

    // Dados da conta Asaas
    let account: any = null;
    try {
      const { data: accData, error: accErr } = await supabase.functions.invoke('get-asaas-account', {
        body: { locadora: currentShareholder.idLocadora },
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-user-token': session?.access_token ?? '',
        },
      });
      if (!accErr && accData) {
        // A edge function retorna { data: <objeto Asaas> }
        account = accData?.data ?? accData ?? null;
        console.log('[get-asaas-account] resposta:', JSON.stringify(accData));
      }
    } catch (e) {
      console.warn('[get-asaas-account] erro:', e);
    }

    const pageW = doc.internal.pageSize.getWidth();

    // Cabeçalho — título à esquerda (ao lado da logo)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Extrato movimentado da sua conta pela Modo Corre', 58, 11);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(finishDate + 'T00:00:00').toLocaleDateString('pt-BR')}`,
      58, 17,
    );

    // Dados da empresa (canto direito)
    if (account) {
      const formatCnpj = (v: string) =>
        v?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') ?? v;

      const city    = account.city?.name ?? account.province ?? '';
      const state   = account.city?.state ?? '';
      const lines   = [
        account.company ?? account.name ?? '',
        account.cpfCnpj ? `CNPJ: ${formatCnpj(account.cpfCnpj)}` : '',
        [city, state].filter(Boolean).join(' - '),
      ].filter(Boolean);

      doc.setFontSize(8);
      lines.forEach((line, i) => {
        doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
        doc.text(line, pageW - 14, logoY + i * 4.5, { align: 'right' });
      });
    }

    // Linha separadora
    const startY = 22;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, startY, pageW - 14, startY);

    autoTable(doc, {
      startY: startY + 2,
      head: [['Data', 'Descrição', 'Tipo', 'Valor', 'Saldo']],
      body: rows.map(r => [r.Data, r.Descrição, r.Tipo, r.Valor, r.Saldo]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 80, 40] },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
    });

    doc.save(`extrato_${startDate}_${finishDate}.pdf`);
  }

  return (
    <div className="page-container">

      {/* Header */}
      <div className="animate-fade-in flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Financeiro</p>
          <h1 className="section-title mb-0 text-xl sm:text-2xl leading-tight">
            Extrato movimentado da sua conta pela Modo Corre
          </h1>
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
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label className="text-sm font-semibold">Data inicial</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label className="text-sm font-semibold">Data final</Label>
              <Input type="date" value={finishDate} onChange={e => setFinishDate(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label className="text-sm font-semibold">Tipo</Label>
              <Select value={tipoFiltro} onValueChange={(v: any) => setTipoFiltro(v)}>
                <SelectTrigger className="h-10 min-w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="receita">Só Receitas</SelectItem>
                  <SelectItem value="despesa">Só Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label className="text-sm font-semibold">Ordenar</Label>
              <Select value={sortOrder} onValueChange={(v: any) => { setSortOrder(v); }}>
                <SelectTrigger className="h-10 min-w-[160px]">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Mais recente primeiro</SelectItem>
                  <SelectItem value="asc">Mais antigo primeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1 sm:self-end">
              <Button
                onClick={() => fetchExtrato(0, pageSize, sortOrder)}
                disabled={loading || !startDate || !finishDate}
                className="gap-2 h-10 w-full sm:w-auto"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {searched && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{fmt(totalCreditos)}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Créditos</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{fmt(totalDebitos)}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Débitos</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${saldo >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
              <Minus className={`w-5 h-5 ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(saldo)}</p>
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
              {/* Tabela com scroll horizontal no mobile */}
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold whitespace-nowrap">Data</TableHead>
                      <TableHead className="font-semibold">Descrição</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap hidden sm:table-cell">Tipo</TableHead>
                      <TableHead className="font-semibold text-right whitespace-nowrap">Valor</TableHead>
                      <TableHead className="font-semibold text-right whitespace-nowrap hidden md:table-cell">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map(t => (
                      <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          <div className="max-w-[220px] sm:max-w-xs md:max-w-sm break-words leading-snug">{t.description || '—'}</div>
                          {/* Tipo em linha extra no mobile */}
                          <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                            {isCredit(t.type)
                              ? <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                              : <TrendingDown className="w-3 h-3 text-red-500 shrink-0" />}
                            <span className={`text-[11px] font-medium ${isCredit(t.type) ? 'text-emerald-600' : 'text-red-600'}`}>
                              {typeLabel[t.type?.toUpperCase()] ?? t.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            {isCredit(t.type)
                              ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                              : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                            <span className={`text-xs font-semibold ${isCredit(t.type) ? 'text-emerald-600' : 'text-red-600'}`}>
                              {typeLabel[t.type?.toUpperCase()] ?? t.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold text-sm whitespace-nowrap ${isCredit(t.type) ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isCredit(t.type) ? '+' : '-'}{fmt(Math.abs(t.value))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground whitespace-nowrap hidden md:table-cell">
                          {t.balance != null ? fmt(t.balance) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t bg-muted/20 gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-xs text-muted-foreground">
                    {totalCount} transações · Pág. {currentPage}/{totalPages}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Exibir</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={v => { const n = Number(v); setPageSize(n); fetchExtrato(0, n); }}
                    >
                      <SelectTrigger className="h-7 w-[64px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(n => (
                          <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">por pág.</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => fetchExtrato(offset - pageSize)}
                    disabled={offset === 0 || loading}
                    className="gap-1 flex-1 sm:flex-none"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronLeft className="w-4 h-4" />}
                    Anterior
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => fetchExtrato(offset + pageSize)}
                    disabled={offset + pageSize >= totalCount || loading}
                    className="gap-1 flex-1 sm:flex-none"
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
          <p className="font-medium text-center">Selecione o período e clique em Buscar</p>
        </div>
      )}
    </div>
  );
}
