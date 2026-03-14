import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, Shareholder } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, Users, Pencil, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminListPage() {
  const { shareholders, viewAs, role } = useAuth();
  const isViewer = role === 'viewer';
  const isSuperAdmin = role === 'superadmin';
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Shareholder | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shareholder | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    // Reload page to refresh data
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

  return (
    <div className="page-container">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Administração</p>
          <h1 className="section-title mb-0">Acionistas</h1>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Users className="w-3.5 h-3.5 mr-1.5" />
          {shareholders.length} cadastrados
        </Badge>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
        <div className="overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Grupo</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">ID Pedido</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">%</TableHead>
                <TableHead className="font-semibold whitespace-nowrap">Status</TableHead>
                <TableHead className="text-right font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shareholders.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-semibold text-foreground">
                    {s.name}
                    <div className="text-xs text-muted-foreground font-normal sm:hidden">{s.group}</div>
                  </TableCell>
                  <TableCell className="text-foreground hidden sm:table-cell">{s.group}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground hidden md:table-cell">{s.idPedido || '—'}</TableCell>
                  <TableCell className="text-right font-bold text-foreground whitespace-nowrap">{s.participationPercent}%</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={s.status === 'Ativo' ? 'badge-status-active' : 'badge-status-inactive'}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!isViewer && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground px-2">
                          <Pencil className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Editar</span>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { viewAs(s.id); navigate('/'); }} className="text-muted-foreground hover:text-foreground px-2">
                        <Eye className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Ver como</span>
                      </Button>
                      {isSuperAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)} className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2">
                          <Trash2 className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Excluir</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

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
    </div>
  );
}
