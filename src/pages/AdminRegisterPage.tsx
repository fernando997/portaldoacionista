import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    group_name: '',
    id_grupo: '',
    id_locadora: '',
    id_pedido: '',
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Nome, e-mail e senha são obrigatórios');
      return;
    }
    if (form.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        group_name: form.group_name.trim() || 'Grupo Modo Corre',
        id_grupo: form.id_grupo.trim() || null,
        id_locadora: form.id_locadora.trim() || null,
        id_pedido: form.id_pedido.trim() || null,
        role: 'user',
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (data?.error) {
      toast.error(data.error);
      return;
    }
    if (!res.ok) {
      toast.error(`Erro ${res.status}: ${JSON.stringify(data)}`);
      return;
    }

    toast.success(`Acionista "${form.name}" cadastrado com sucesso!`);
    navigate('/admin');
  };

  return (
    <div className="page-container max-w-2xl">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Administração</p>
        <h1 className="section-title">Cadastrar Acionista</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-8 space-y-6 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">Nome *</Label>
            <Input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Nome completo" className="h-11" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">E-mail *</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="email@exemplo.com" className="h-11" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">Senha *</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Mínimo 6 caracteres" className="h-11" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group_name" className="text-sm font-semibold">Nome do Grupo</Label>
            <Input id="group_name" value={form.group_name} onChange={(e) => update('group_name', e.target.value)} placeholder="Grupo Modo Corre" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="id_grupo" className="text-sm font-semibold">ID do Grupo</Label>
            <Input id="id_grupo" value={form.id_grupo} onChange={(e) => update('id_grupo', e.target.value)} placeholder="Ex: GRP-001" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="id_locadora" className="text-sm font-semibold">ID da Locadora</Label>
            <Input id="id_locadora" value={form.id_locadora} onChange={(e) => update('id_locadora', e.target.value)} placeholder="Ex: LOC-001" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="id_pedido" className="text-sm font-semibold">ID do Pedido</Label>
            <Input id="id_pedido" value={form.id_pedido} onChange={(e) => update('id_pedido', e.target.value)} placeholder="Ex: PED-001" className="h-11" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => navigate('/admin')} className="h-11 px-6" disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" className="h-11 px-6" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Cadastrar Acionista
          </Button>
        </div>
      </form>
    </div>
  );
}
