import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Mail, KeyRound, Loader2, Shield, ChevronRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const FEATURES = [
  'Acompanhe receitas e despesas em tempo real',
  'Visualize sua frota e taxa de ocupação',
  'Acesse contratos e documentos a qualquer hora',
];

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError('');
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) {
      setFieldError('E-mail ou senha incorretos.');
      toast({ title: 'Erro ao entrar', description: error, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex bg-[hsl(220,60%,6%)]">

      {/* ── Left panel — branding ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,60%,10%)] via-[hsl(220,60%,14%)] to-[hsl(220,55%,20%)]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[hsl(135,55%,42%)]/10 blur-[140px]" />
        <div className="absolute bottom-0 left-[-100px] w-[400px] h-[400px] rounded-full bg-[hsl(210,80%,52%)]/8 blur-[120px]" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        <div className="relative z-10 flex flex-col justify-between h-full">
          {/* Logo */}
          <img src={logo} alt="Modo Corre" className="h-16 w-auto object-contain shrink-0 brightness-0 invert opacity-90 animate-fade-in" />

          {/* Main copy */}
          <div className="space-y-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm">
                <Shield className="w-3.5 h-3.5 text-[hsl(135,55%,48%)]" />
                <span className="text-xs font-medium text-white/60 tracking-wide">Portal Seguro do Acionista</span>
              </div>
              <h1 className="font-display text-4xl xl:text-[3.25rem] font-bold leading-[1.1] text-white/95">
                Seu investimento,{' '}
                <span className="text-[hsl(135,55%,52%)]">sob controle</span>.
              </h1>
              <p className="text-white/45 text-base xl:text-lg max-w-lg leading-relaxed">
                Transparência total sobre sua participação, receitas e operação — em um só lugar.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(135,55%,48%)] mt-0.5 shrink-0" />
                  <span className="text-sm text-white/55">{f}</span>
                </li>
              ))}
            </ul>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { val: 'R$11,6M+', lbl: 'Capital gerido' },
                { val: '1K+',      lbl: 'Motos ativas' },
                { val: '100%',     lbl: 'Transparência' },
              ].map(({ val, lbl }) => (
                <div key={lbl} className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 hover:bg-white/[0.09] transition-colors">
                  <p className="text-2xl xl:text-3xl font-bold text-white/95 leading-none">
                    {val.replace('+', '')}<span className="text-[hsl(135,55%,52%)]">{val.includes('+') ? '+' : ''}</span>
                  </p>
                  <p className="text-[10px] font-medium text-white/35 mt-2 tracking-wider uppercase">{lbl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/25 relative z-10">
            © {new Date().getFullYear()} Grupo Modo Corre. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative bg-[hsl(210,20%,97%)]">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[hsl(135,55%,42%)] to-transparent opacity-40" />

        <div className="w-full max-w-[400px] animate-fade-in" style={{ animationDelay: '0.15s' }}>

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8 space-y-3">
            <img src={logo} alt="Modo Corre" className="h-20 w-auto object-contain shrink-0 mx-auto" />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">Portal do Acionista</span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-elevated border border-border/60 p-8 space-y-6">
            {/* Heading */}
            <div className="space-y-1.5">
              <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
                Bem-vindo de volta
              </h2>
              <p className="text-sm text-muted-foreground">
                Entre com suas credenciais para acessar o portal.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldError(''); }}
                    className="pl-11 h-11 text-sm rounded-xl border-input bg-muted/40 focus:bg-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Senha</label>
                <div className="relative group">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldError(''); }}
                    className="pl-11 pr-11 h-11 text-sm rounded-xl border-input bg-muted/40 focus:bg-white transition-colors"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Inline error */}
              {fieldError && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-destructive inline-block" />
                  {fieldError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold rounded-xl gradient-accent shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5 transition-all duration-200 group mt-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Entrar no Portal
                {!loading && <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />}
              </Button>
            </form>

            {/* Security note */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t">
              <Lock className="w-3 h-3 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground/50">Conexão segura · Acesso restrito</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
