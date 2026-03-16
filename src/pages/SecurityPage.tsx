import { useState } from 'react';
import { User, Mail, Users, BarChart2, KeyRound, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-muted-foreground/60" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function SecurityPage() {
  const { currentShareholder } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const initials = currentShareholder.name
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({ title: 'Senhas não conferem', description: 'A nova senha e a confirmação devem ser iguais.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Senha muito curta', description: 'A nova senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Verify current password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentShareholder.email,
        password: currentPassword,
      });

      if (signInError) {
        toast({ title: 'Senha atual incorreta', description: 'Verifique sua senha atual e tente novamente.', variant: 'destructive' });
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

      if (updateError) {
        toast({ title: 'Erro ao atualizar senha', description: updateError.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Senha alterada com sucesso!', description: 'Sua senha foi atualizada.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="animate-fade-in">
        <p className="text-sm font-medium text-muted-foreground">Conta</p>
        <h1 className="section-title">Minha Conta</h1>
      </div>

      {/* Profile card */}
      <div
        className="bg-card rounded-xl border p-6 animate-fade-in"
        style={{ animationDelay: '0.05s', opacity: 0, boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(135,55%,45%)] to-[hsl(135,65%,30%)] flex items-center justify-center shadow-lg shadow-[hsl(135,55%,42%)]/20 shrink-0">
            <span className="text-lg font-bold text-white">{initials}</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground leading-tight">{currentShareholder.name}</p>
            <p className="text-sm text-muted-foreground">{currentShareholder.email}</p>
          </div>
          <div className="ml-auto">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              currentShareholder.status === 'Ativo'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {currentShareholder.status}
            </span>
          </div>
        </div>

        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Informações
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <InfoRow icon={User} label="Nome completo" value={currentShareholder.name || '—'} />
          <InfoRow icon={Mail} label="E-mail" value={currentShareholder.email || '—'} />
          <InfoRow icon={Users} label="Grupo" value={currentShareholder.group || '—'} />
          <InfoRow icon={BarChart2} label="Participação" value={`${currentShareholder.participationPercent}%`} />
          <InfoRow icon={ShieldCheck} label="Status" value={currentShareholder.status} />
        </div>
      </div>

      {/* Password change */}
      <div
        className="bg-card rounded-xl border p-6 space-y-5 animate-fade-in"
        style={{ animationDelay: '0.1s', opacity: 0, boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <KeyRound className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Alterar Senha</h2>
            <p className="text-xs text-muted-foreground">Escolha uma senha segura com pelo menos 6 caracteres.</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Current password */}
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-xs font-medium text-muted-foreground">
              Senha atual
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-medium text-muted-foreground">
              Nova senha
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">
              Confirmar nova senha
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
