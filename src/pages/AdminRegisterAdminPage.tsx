import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Users, Loader2 } from 'lucide-react';

type InternalRole = 'admin' | 'vendedor' | 'sac' | 'suporte' | 'moderator';

const roleOptions: { value: InternalRole; label: string; desc: string }[] = [
  { value: 'admin',     label: 'Admin',        desc: 'Acesso total ao painel, pode cadastrar e editar acionistas' },
  { value: 'vendedor',  label: 'Vendedor',      desc: 'Pode cadastrar acionistas e gerenciar onboarding' },
  { value: 'sac',       label: 'SAC',           desc: 'Visualiza acionistas e acompanha onboarding' },
  { value: 'suporte',   label: 'Suporte',       desc: 'Visualiza acionistas e acessa documentos' },
  { value: 'moderator', label: 'Visualizador',  desc: 'Somente leitura — não pode criar ou editar nada' },
];

export default function AdminRegisterAdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' as InternalRole | '' });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedRole = roleOptions.find(r => r.value === form.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Nome, e-mail e senha são obrigatórios');
      return;
    }
    if (!form.role) {
      toast.error('Selecione o tipo de acesso');
      return;
    }
    if (form.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        group_name: 'Equipe Interna',
        role: form.role,
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

    toast.success(`Usuário "${form.name}" (${selectedRole?.label}) cadastrado com sucesso!`);
    navigate('/admin');
  };

  return (
    <div className="page-container max-w-xl">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Administração</p>
        <h1 className="section-title">Cadastrar Equipe Interna</h1>
        <p className="text-sm text-muted-foreground -mt-3 mb-6">
          Crie um acesso para um membro da equipe interna com o nível de permissão adequado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border p-8 space-y-6 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-1 gap-5">
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-semibold">Tipo de acesso *</Label>
            <Select value={form.role} onValueChange={(v) => update('role', v)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione o tipo de acesso" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRole && (
              <p className="text-xs text-muted-foreground">{selectedRole.desc}</p>
            )}
          </div>

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
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => navigate('/admin')} className="h-11 px-6" disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" className="h-11 px-6" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
            Cadastrar
          </Button>
        </div>
      </form>
    </div>
  );
}
