import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, Shareholder, PendingShareholder } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, Users, Pencil, Loader2, Save, Trash2, Search, Bike, DollarSign, TrendingUp, X, Clock, FileText, LayoutGrid, Table2 } from 'lucide-react';
import { toast } from 'sonner';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function nameToHue(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export default function AdminListPage() {
  const { shareholders, pendingShareholders, viewAs, role } = useAuth();
  const isViewer = role === 'viewer';
  const isSuperAdmin = role === 'superadmin';
  const onlyShareholders = shareholders.filter(s => !s.internalRole);
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Ativo' | 'Inativo' | 'Pendente'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const [editing, setEditing] = useState<Shareholder | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shareholder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePendingTarget, setDeletePendingTarget] = useState<PendingShareholder | null>(null);
  const [deletingPending, setDeletingPending] = useState(false);

  // Unique groups for filter
  const groups = useMemo(() => {
    const set = new Set(onlyShareholders.map(s => s.group).filter(Boolean));
    return Array.from(set).sort();
  }, [onlyShareholders]);

  type DisplayItem =
    | { kind: 'shareholder'; data: Shareholder }
    | { kind: 'pending'; data: PendingShareholder };

  // Filtered list
  const filtered = useMemo(() => {
    const items: DisplayItem[] = [];

    if (statusFilter !== 'Pendente') {
      onlyShareholders.forEach(s => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return;
        if (groupFilter !== 'all' && s.group !== groupFilter) return;
        if (search) {
          const q = search.toLowerCase();
          if (
            !s.name.toLowerCase().includes(q) &&
            !s.email.toLowerCase().includes(q) &&
            !s.group.toLowerCase().includes(q) &&
            !(s.idPedido && s.idPedido.toLowerCase().includes(q))
          ) return;
        }
        items.push({ kind: 'shareholder', data: s });
      });
    }

    if (statusFilter === 'all' || statusFilter === 'Pendente') {
      pendingShareholders.forEach(p => {
        if (groupFilter !== 'all') return;
        if (search) {
          const q = search.toLowerCase();
          if (
            !p.nome.toLowerCase().includes(q) &&
            !(p.cpf && p.cpf.toLowerCase().includes(q)) &&
            !(p.email && p.email.toLowerCase().includes(q))
          ) return;
        }
        items.push({ kind: 'pending', data: p });
      });
    }

    return items;
  }, [onlyShareholders, pendingShareholders, search, statusFilter, groupFilter]);

  // KPIs
  const totalAtivos = onlyShareholders.filter(s => s.status === 'Ativo').length;
  const totalMotos = onlyShareholders.reduce((acc, s) => acc + s.totalMotos, 0);
  const totalInvestido = onlyShareholders.reduce((acc, s) => acc + s.investedValue, 0);

  const hasFilters = search || statusFilter !== 'all' || groupFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setGroupFilter('all');
  };

  const openEdit = (s: Shareholder) => {
    setEditing(s);
    setForm({
      name: s.name,
      email: s.email,
      password: '',
      group_name: s.group,
      id_grupo: s.idGrupo,
      id_locadora: s.idLocadora,
      id_pedido: s.idPedido,
      status: s.status,
      participation_percent: String(s.participationPercent),
      total_motos: String(s.totalMotos),
      invested_value: String(s.investedValue),
    });
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);

    const body: Record<string, unknown> = {
      user_id: editing.user_id,
      name: form.name,
      email: form.email,
      group_name: form.group_name,
      id_grupo: form.id_grupo || null,
      id_locadora: form.id_locadora || null,
      id_pedido: form.id_pedido || null,
      status: form.status,
      participation_percent: Number(form.participation_percent) || 0,
      total_motos: Number(form.total_motos) || 0,
      invested_value: Number(form.invested_value) || 0,
    };

    if (form.password) {
      body.password = form.password;
    }

    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (data?.error) {
      toast.error(data.error);
      return;
    }
    if (!res.ok) {
      toast.error(`Erro ${res.status}: ${JSON.stringify(data)}`);
      return;
    }

    toast.success('Acionista atualizado com sucesso!');
    setEditing(null);
    window.location.reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ user_id: deleteTarget.user_id }),
    });
    const data = await res.json();
    setDeleting(false);

    if (data?.error) {
      toast.error(data.error);
      return;
    }
    if (!res.ok) {
      toast.error(`Erro ${res.status}: ${JSON.stringify(data)}`);
      return;
    }

    toast.success(`Usuário ${deleteTarget.name} excluído com sucesso.`);
    setDeleteTarget(null);
    window.location.reload();
  };

  const handleDeletePending = async () => {
    if (!deletePendingTarget) return;
    setDeletingPending(true);
    const { error } = await (supabase as any)
      .from('investidores')
      .delete()
      .eq('id', deletePendingTarget.id);
    setDeletingPending(false);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    toast.success(`Investidor ${deletePendingTarget.nome} excluído.`);
    setDeletePendingTarget(null);
    window.location.reload();
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Acionistas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie todos os investidores cadastrados</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1.5 hidden sm:flex">
          <Users className="w-3.5 h-3.5 mr-1.5" />
          {onlyShareholders.length} cadastrados
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card rounded-xl border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Total</p>
              <p className="text-lg font-bold text-foreground">{onlyShareholders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Ativos</p>
              <p className="text-lg font-bold text-foreground">{totalAtivos}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Bike className="w-4.5 h-4.5 text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Motos</p>
              <p className="text-lg font-bold text-foreground">{totalMotos}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 text-purple-500" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Investido</p>
              <p className="text-lg font-bold text-foreground">{formatBRL(totalInvestido)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4 col-span-2 lg:col-span-1" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Pendentes</p>
              <p className="text-lg font-bold text-foreground">{pendingShareholders.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl border p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, grupo ou pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-[140px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Ativo">Ativos</SelectItem>
              <SelectItem value="Inativo">Inativos</SelectItem>
              <SelectItem value="Pendente">Pendentes</SelectItem>
            </SelectContent>
          </Select>
          {groups.length > 1 && (
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Grupos</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 px-3 text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
          <div className="flex border rounded-lg overflow-hidden shrink-0 h-10">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 flex items-center justify-center transition-colors ${viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
              title="Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 flex items-center justify-center transition-colors border-l ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
              title="Tabela"
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-muted-foreground mt-2">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-card rounded-xl border p-12 text-center text-muted-foreground" style={{ boxShadow: 'var(--shadow-card)' }}>
          {hasFilters ? 'Nenhum acionista encontrado com esses filtros.' : 'Nenhum acionista cadastrado.'}
        </div>
      )}

      {/* Card View */}
      {viewMode === 'cards' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            if (item.kind === 'pending') {
              const p = item.data;
              const hue = nameToHue(p.nome);
              return (
                <div
                  key={`pending-${p.id}`}
                  className="bg-card rounded-xl border p-5 hover:border-primary/30 transition-all cursor-pointer group"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                  onClick={() => navigate(`/admin/acionista/${p.id}`)}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border"
                      style={{
                        backgroundColor: `hsl(${hue},55%,92%)`,
                        borderColor: `hsl(${hue},55%,75%)`,
                        color: `hsl(${hue},55%,35%)`,
                      }}
                    >
                      {getInitials(p.nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{p.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email || p.whatsapp || '—'}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">
                      Pendente
                    </Badge>
                  </div>
                  <div className="flex items-center justify-end gap-1 pt-3 border-t" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Detalhes" onClick={() => navigate(`/admin/acionista/${p.id}`)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                    {isSuperAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir" onClick={() => setDeletePendingTarget(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            }

            const s = item.data;
            const hue = nameToHue(s.name);
            return (
              <div
                key={s.id}
                className="bg-card rounded-xl border p-5 hover:border-primary/30 transition-all cursor-pointer group"
                style={{ boxShadow: 'var(--shadow-card)' }}
                onClick={() => navigate(`/admin/acionista/${s.id}`)}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border"
                    style={{
                      backgroundColor: `hsl(${hue},55%,92%)`,
                      borderColor: `hsl(${hue},55%,75%)`,
                      color: `hsl(${hue},55%,35%)`,
                    }}
                  >
                    {getInitials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${
                      s.status === 'Ativo'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-500 border-red-500/30'
                    }`}
                  >
                    {s.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Grupo</p>
                    <p className="text-sm font-medium text-foreground truncate">{s.group || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Motos</p>
                    <p className="text-sm font-bold text-foreground">{s.totalMotos}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Part.</p>
                    <p className="text-sm font-bold text-foreground">{s.participationPercent}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <p className="text-xs text-muted-foreground truncate">{formatBRL(s.investedValue)}</p>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Detalhes" onClick={() => navigate(`/admin/acionista/${s.id}`)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                    {!isViewer && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Editar" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-500" title="Ver como" onClick={() => { viewAs(s.id); navigate('/'); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isSuperAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir" onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && filtered.length > 0 && (
        <div className="bg-card rounded-xl border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Acionista</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Grupo</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">ID Pedido</TableHead>
                  <TableHead className="text-right font-semibold hidden sm:table-cell">Motos</TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap">Part. %</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  if (item.kind === 'pending') {
                    const p = item.data;
                    const hue = nameToHue(p.nome);
                    return (
                      <TableRow key={`pending-${p.id}`} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border"
                              style={{
                                backgroundColor: `hsl(${hue},55%,92%)`,
                                borderColor: `hsl(${hue},55%,75%)`,
                                color: `hsl(${hue},55%,35%)`,
                              }}
                            >
                              {getInitials(p.nome)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{p.nome}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.email || p.whatsapp || '—'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground hidden md:table-cell">
                          <span className="text-sm">—</span>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground hidden lg:table-cell">—</TableCell>
                        <TableCell className="text-right font-semibold text-foreground hidden sm:table-cell">—</TableCell>
                        <TableCell className="text-right font-bold text-foreground whitespace-nowrap">—</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            Pendente
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/acionista/${p.id}`)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Detalhes">
                              <FileText className="h-4 w-4" />
                            </Button>
                            {isSuperAdmin && (
                              <Button variant="ghost" size="icon" onClick={() => setDeletePendingTarget(p)} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const s = item.data;
                  const hue = nameToHue(s.name);
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border"
                            style={{
                              backgroundColor: `hsl(${hue},55%,92%)`,
                              borderColor: `hsl(${hue},55%,75%)`,
                              color: `hsl(${hue},55%,35%)`,
                            }}
                          >
                            {getInitials(s.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground hidden md:table-cell">
                        <span className="text-sm">{s.group || '—'}</span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground hidden lg:table-cell">
                        {s.idPedido || '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground hidden sm:table-cell">
                        {s.totalMotos}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground whitespace-nowrap">
                        {s.participationPercent}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            s.status === 'Ativo'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-500 border-red-500/30'
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/acionista/${s.id}`)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Detalhes">
                            <FileText className="h-4 w-4" />
                          </Button>
                          {!isViewer && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { viewAs(s.id); navigate('/'); }} className="h-8 w-8 text-muted-foreground hover:text-blue-500" title="Ver como">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isSuperAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Acionista</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nome</Label>
              <Input value={form.name || ''} onChange={(e) => update('name', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">E-mail</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => update('email', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nova Senha (deixe vazio para manter)</Label>
              <Input type="password" value={form.password || ''} onChange={(e) => update('password', e.target.value)} placeholder="••••••" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nome do Grupo</Label>
              <Input value={form.group_name || ''} onChange={(e) => update('group_name', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">ID do Grupo</Label>
              <Input value={form.id_grupo || ''} onChange={(e) => update('id_grupo', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">ID da Locadora</Label>
              <Input value={form.id_locadora || ''} onChange={(e) => update('id_locadora', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">ID do Pedido</Label>
              <Input value={form.id_pedido || ''} onChange={(e) => update('id_pedido', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Participação (%)</Label>
              <Input type="number" value={form.participation_percent || ''} onChange={(e) => update('participation_percent', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Total de Motos</Label>
              <Input type="number" value={form.total_motos || ''} onChange={(e) => update('total_motos', e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold">Valor Investido (R$)</Label>
              <Input type="number" value={form.invested_value || ''} onChange={(e) => update('invested_value', e.target.value)} className="h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação é irreversível e removerá todos os dados do usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Pending Confirmation */}
      <AlertDialog open={!!deletePendingTarget} onOpenChange={(open) => !open && setDeletePendingTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir investidor pendente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletePendingTarget?.nome}</strong>? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePending}
              disabled={deletingPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
