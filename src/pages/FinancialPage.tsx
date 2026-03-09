import { mockPayments, mockChartData, mockInstallments } from '@/data/mockData';
import { DollarSign, Clock, CheckCircle, AlertTriangle, Eye, CalendarDays, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

function FinStatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent?: boolean }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${accent ? 'gradient-accent' : 'bg-muted'}`}>
          <Icon className={`h-5 w-5 ${accent ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="stat-label">{label}</p>
        <p className={`stat-value ${accent ? 'text-accent' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

const statusMap: Record<string, { className: string; icon: any }> = {
  'Pago': { className: 'badge-status-active', icon: CheckCircle },
  'Previsto': { className: 'badge-status-reserve', icon: Clock },
  'Retido': { className: 'badge-status-inactive', icon: AlertTriangle },
  'Pendente': { className: 'badge-status-reserve', icon: Clock },
  'Vencida': { className: 'badge-status-inactive', icon: AlertTriangle },
};

export default function FinancialPage() {
  const paid = mockPayments.filter(p => p.status === 'Pago');
  const totalPaid = paid.reduce((s, p) => s + p.valor, 0);
  const pending = mockPayments.filter(p => p.status === 'Previsto');
  const totalPending = pending.reduce((s, p) => s + p.valor, 0);

  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Financeiro</p>
        <h1 className="section-title">Visão Financeira</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <FinStatCard label="Dividendos Pagos" value={`R$ ${totalPaid.toLocaleString('pt-BR')}`} icon={CheckCircle} />
        <FinStatCard label="Dividendos a Pagar" value={`R$ ${totalPending.toLocaleString('pt-BR')}`} icon={Clock} />
        <FinStatCard label="Total Recebido" value={`R$ ${totalPaid.toLocaleString('pt-BR')}`} icon={DollarSign} accent />
        <FinStatCard label="Próximo Repasse" value="05/01/2025" icon={CalendarDays} />
      </div>

      <div className="bg-card rounded-xl border p-6 animate-fade-in" style={{ animationDelay: '0.15s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">Linha do Tempo de Pagamentos</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(40 76% 55%)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(40 76% 55%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip 
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(220 13% 91%)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
              />
              <Area type="monotone" dataKey="valor" stroke="hsl(40 76% 55%)" strokeWidth={2.5} fill="url(#colorValor)" dot={{ fill: 'hsl(40 76% 55%)', r: 4, strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
        <div className="p-5 border-b">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Histórico de Repasses</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Data</TableHead>
              <TableHead className="text-right font-semibold">Valor</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPayments.map((p, i) => {
              const cfg = statusMap[p.status];
              return (
                <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-foreground">{new Date(p.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-right font-semibold text-foreground">R$ {p.valor.toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cfg.className}>
                      <cfg.icon className="mr-1.5 h-3 w-3" />
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === 'Pago' && (
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <Eye className="h-4 w-4 mr-1.5" /> Comprovante
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden animate-fade-in" style={{ animationDelay: '0.25s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
        <div className="p-5 border-b">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Parcelamento da Taxa de Adesão</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Parcela</TableHead>
              <TableHead className="font-semibold">Vencimento</TableHead>
              <TableHead className="font-semibold">Descrição</TableHead>
              <TableHead className="text-right font-semibold">Valor</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Pagamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockInstallments.map((inst, i) => {
              const cfg = statusMap[inst.status];
              return (
                <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-foreground font-medium">{inst.parcela}</TableCell>
                  <TableCell className="text-foreground">{new Date(inst.vencimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-foreground">{inst.descricao}</TableCell>
                  <TableCell className="text-right font-semibold text-foreground">R$ {inst.valor.toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cfg.className}>
                      <cfg.icon className="mr-1.5 h-3 w-3" />
                      {inst.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {inst.status !== 'Pago' && (
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
                        <a href={inst.linkPagamento} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1.5" /> Pagar
                        </a>
                      </Button>
                    )}
                    {inst.status === 'Pago' && (
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <Eye className="h-4 w-4 mr-1.5" /> Comprovante
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
