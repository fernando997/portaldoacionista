import { useState, useEffect } from 'react';
import { useAuth, Shareholder } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Shield, Pencil, Loader2, Save, Trash2, Users2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PERMISSION_KEYS, PERMISSION_LABELS, FULL_ACCESS_ROLES, DEFAULT_PERMISSIONS, PermissionKey } from '@/lib/permissions';

const roleLabels: Record<string, { label: string; color: string }> = {
  superadmin: { label: 'Super Admin', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  admin:      { label: 'Admin',       color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  vendedor:   { label: 'Vendedor',    color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  sac:        { label: 'SAC',         color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  suporte:    { label: 'Suporte',     color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  moderator:  { label: 'Visualizador',color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
};

export default function AdminEquipePage() {
  const { shareholders, role } = useAuth();
  const isSuperAdmin = role === 'superadmin';

  const equipe = shareholders.filter(s => s.internalRole);

  const [editing, setEditing] = useState<Shareholder | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shareholder | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Permissions dialog state
  const [permTarget, setPermTarget] = useState<Shareholder | null>(null);
  const [permOverrides, setPermOverrides] = useState<Set<PermissionKey>>(new Set());
  const [permSaving, setPermSaving] = useState(false);
  const [permLoading, setPermLoading] = useState(false);

  const dbRoleForInternal = (internalRole: string): string => {
    if (internalRole === 'moderator') return 'viewer';
    return internalRole;
  };

  const openPermissions = async (s: Shareholder) => {
    setPermTarget(s);
    setPermLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('user_permissions')
        .select('permission')
        .eq('user_id', s.user_id)
        .eq('granted', true);
      setPermOverrides(new Set((data || []).map((p: any) => p.permission as PermissionKey)));
    } catch {
      setPermOverrides(new Set());
    }
    setPermLoading(false);
  };

  const handlePermSave = async () => {
    if (!permTarget) return;
    setPermSaving(true);

    const mappedRole = dbRoleForInternal(permTarget.internalRole!);
    const defaults = DEFAULT_PERMISSIONS[mappedRole] || [];
    // Only save overrides that aren't already in default permissions
    const extras = [...permOverrides].filter(p => !defaults.includes(p));

    // Delete existing overrides, then insert new ones
    await (supabase as any)
      .from('user_permissions')
      .delete()
      .eq('user_id', permTarget.user_id);

    if (extras.length > 0) {
      await (supabase as any)
        .from('user_permissions')
        .insert(extras.map(p => ({ user_id: permTarget.user_id, permission: p, granted: true })));
    }

    setPermSaving(false);
    setPermTarget(null);
    toast.success('Permissões atualizadas!');
  };

  const openEdit = (s: Shareholder) => {
    setEditing(s);
    setForm({ name: s.name, email: s.email, password: '' });
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);

    const body: Record<string, unknown> = {
      user_id: editing.user_id,
      name: form.name,
      email: form.email,
    };
    if (form.password) body.password = form.password;

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

    if (data?.error) { toast.error(data.error); return; }
    if (!res.ok) { toast.error(`Erro ${res.status}`); return; }

    toast.success('Membro atualizado com sucesso!');
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

    if (data?.error) { toast.error(data.error); return; }
    if (!res.ok) { toast.error(`Erro ${res.status}`); return; }

    toast.success(`${deleteTarget.name} removido da equipe.`);
    setDeleteTarget(null);
    window.location.reload();
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Administração</p>
          <h1 className="section-title mb-0">Equipe Interna</h1>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Users2 className="w-3.5 h-3.5 mr-1.5" />
          {equipe.length} membros
        </Badge>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
        <div className="overflow-x-auto">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">E-mail</TableHead>
                <TableHead className="font-semibold">Acesso</TableHead>
                <TableHead className="text-right font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipe.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    Nenhum membro da equipe cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {equipe.map((s) => {
                const cfg = roleLabels[s.internalRole!] ?? { label: s.internalRole!, color: 'bg-muted text-muted-foreground' };
                return (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-foreground">
                      {s.name}
                      <div className="text-xs text-muted-foreground font-normal sm:hidden">{s.email}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{s.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                        <Shield className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isSuperAdmin && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openPermissions(s)} className="text-muted-foreground hover:text-foreground px-2">
                              <KeyRound className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Permissões</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground px-2">
                              <Pencil className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Editar</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)} className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2">
                              <Trash2 className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Remover</span>
                            </Button>
                          </>
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

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Membro da Equipe</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong> da equipe? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions dialog */}
      <Dialog open={!!permTarget} onOpenChange={(open) => !open && setPermTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Permissões — {permTarget?.name}
            </DialogTitle>
          </DialogHeader>
          {permLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : permTarget && FULL_ACCESS_ROLES.includes(dbRoleForInternal(permTarget.internalRole!)) ? (
            <div className="py-6 text-center text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 text-primary/50" />
              <p className="font-semibold text-foreground">Acesso total</p>
              <p className="text-sm mt-1">Administradores têm acesso a todas as funcionalidades.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 py-4 max-h-[400px] overflow-y-auto">
              {PERMISSION_KEYS.map(key => {
                const mappedRole = dbRoleForInternal(permTarget?.internalRole || '');
                const defaults = DEFAULT_PERMISSIONS[mappedRole] || [];
                const isDefault = defaults.includes(key);
                const isChecked = isDefault || permOverrides.has(key);
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={isDefault}
                      onCheckedChange={(checked) => {
                        const next = new Set(permOverrides);
                        if (checked) next.add(key);
                        else next.delete(key);
                        setPermOverrides(next);
                      }}
                    />
                    <span className="flex-1 text-sm font-medium">{PERMISSION_LABELS[key]}</span>
                    {isDefault && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">padrão do cargo</Badge>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermTarget(null)} disabled={permSaving}>Cancelar</Button>
            {permTarget && !FULL_ACCESS_ROLES.includes(dbRoleForInternal(permTarget.internalRole!)) && (
              <Button onClick={handlePermSave} disabled={permSaving}>
                {permSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
