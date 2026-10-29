import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Mail, KeyRound, Loader2, Shield, ChevronRight, CheckCircle2, Eye, EyeOff, AlertCircle, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { marca, classeLogo, lerAvisoAcesso } from '@/lib/marca';

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
  const [fieldError, setFieldError] = useState(lerAvisoAcesso);

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
    <div className="min-h-screen flex bg-[hsl(var(--marca-fundo-login))]">

      {/* ── Left panel — branding ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden flex-col justify-between p-12 xl:p-16">

        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--marca-fundo-2))] via-[hsl(var(--marca-fundo-login-2))] to-[hsl(var(--marca-fundo-login-3))]" />

        {/* Ambient glow blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-[700px] h-[700px] rounded-full bg-[hsl(var(--marca)/0.11)] blur-[180px] pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-120px] w-[500px] h-[500px] rounded-full bg-[hsl(210,80%,55%)]/[0.09] blur-[140px] pointer-events-none" />
        <div className="absolute top-[40%] left-[10%] w-[300px] h-[300px] rounded-full bg-[hsl(260,60%,55%)]/[0.06] blur-[100px] pointer-events-none" />

        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.045]" style={{
          backgroundImage: 'radial-gradient(hsl(0,0%,100%) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* Diagonal light ray */}
        <div className="absolute top-0 left-[35%] w-px h-full bg-gradient-to-b from-transparent via-white/[0.05] to-transparent -skew-x-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full">

          {/* Logo */}
          <img
            src={marca.logoFundoEscuro.src}
            alt={marca.nome}
            className={`${marca.tamanhoLogo.login} w-auto object-contain shrink-0 opacity-90 animate-fade-in ${classeLogo(marca.logoFundoEscuro)}`}
          />

          {/* Main copy */}
          <div className="space-y-8 animate-fade-in" style={{ animationDelay: '0.08s' }}>
            <div className="space-y-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--marca-claro))] animate-pulse" />
                <Shield className="w-3.5 h-3.5 text-[hsl(var(--marca-claro))]" />
                <span className="text-xs font-medium text-white/65 tracking-wide">{marca.selo}</span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-4xl xl:text-[3.25rem] font-bold leading-[1.08] text-white/95">
                Seu investimento,{' '}
                <span className="bg-gradient-to-r from-[hsl(var(--marca-claro))] to-[hsl(var(--marca-medio))] bg-clip-text text-transparent">
                  sob controle
                </span>.
              </h1>

              <p className="text-white/50 text-base xl:text-lg max-w-lg leading-relaxed">
                Transparência total sobre sua participação, receitas e operação — em um só lugar.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-1">
              {FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors duration-200 group"
                >
                  <div className="w-5 h-5 rounded-full bg-[hsl(var(--marca)/0.2)] flex items-center justify-center shrink-0 group-hover:bg-[hsl(var(--marca)/0.3)] transition-colors">
                    <CheckCircle2 className="w-3 h-3 text-[hsl(var(--marca-claro))]" />
                  </div>
                  <span className="text-sm text-white/60 group-hover:text-white/75 transition-colors">{f}</span>
                </li>
              ))}
            </ul>

            {/* Stats */}
            {marca.numeros.length > 0 && (
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {marca.numeros.map(({ val, suffix, lbl }) => (
                <div
                  key={lbl}
                  className="relative bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4 hover:bg-white/[0.08] hover:border-[hsl(var(--marca-medio)/0.25)] transition-all duration-300 group overflow-hidden"
                >
                  {/* Top accent on hover */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--marca-claro)/0.6)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <p className="text-2xl xl:text-3xl font-bold text-white/95 leading-none tabular-nums">
                    {val}<span className="text-[hsl(var(--marca-claro))]">{suffix}</span>
                  </p>
                  <p className="text-[10px] font-semibold text-white/35 mt-2 tracking-wider uppercase">{lbl}</p>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-white/20" />
            <p className="text-xs text-white/25">
              © {new Date().getFullYear()} {marca.nome}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10 relative"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, hsl(210,30%,98%) 0%, hsl(215,22%,92%) 100%)' }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[hsl(var(--marca))] to-transparent opacity-50" />

        {/* Subtle background mesh */}
        <div className="absolute inset-0 opacity-[0.018]" style={{
          backgroundImage: 'radial-gradient(hsl(220,60%,20%) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="w-full max-w-[400px] relative z-10 animate-scale-in" style={{ animationDelay: '0.12s' }}>

          {/* Mobile — dark logo header */}
          <div className="lg:hidden text-center mb-8 space-y-3">
            <div className="inline-flex flex-col items-center gap-3 px-8 py-5 rounded-2xl bg-[hsl(var(--marca-fundo-3))] border border-white/[0.08]">
              <img src={marca.logoFundoEscuro.src} alt={marca.nome} className={`${marca.tamanhoLogo.loginCelular} w-auto object-contain shrink-0 opacity-90 ${classeLogo(marca.logoFundoEscuro)}`} />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.1]">
                <Shield className="w-3 h-3 text-[hsl(var(--marca-claro))]" />
                <span className="text-xs font-medium text-white/60">{marca.selo}</span>
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-border/50 p-8 space-y-6 relative overflow-hidden"
            style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)' }}
          >
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[hsl(var(--marca)/0)] via-[hsl(var(--marca))] to-[hsl(var(--marca)/0)]" />

            {/* Heading */}
            <div className="space-y-1.5 pt-1">
              <h2 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Bem-vindo{' '}
                <span className="text-accent">de volta</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Entre com suas credenciais para acessar o portal.
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-foreground/80">
                  E-mail
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-200 group-focus-within:text-accent" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    autoComplete="email"
                    aria-invalid={!!fieldError}
                    aria-describedby={fieldError ? 'form-error' : undefined}
                    onChange={(e) => { setEmail(e.target.value); setFieldError(''); }}
                    className="pl-11 h-12 text-sm rounded-xl border-input bg-muted/30 focus:bg-white transition-all duration-200 aria-[invalid=true]:border-destructive"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-foreground/80">
                  Senha
                </label>
                <div className="relative group">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-200 group-focus-within:text-accent" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    autoComplete="current-password"
                    aria-invalid={!!fieldError}
                    aria-describedby={fieldError ? 'form-error' : undefined}
                    onChange={(e) => { setPassword(e.target.value); setFieldError(''); }}
                    className="pl-11 pr-11 h-12 text-sm rounded-xl border-input bg-muted/30 focus:bg-white transition-all duration-200 aria-[invalid=true]:border-destructive"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Inline error */}
              {fieldError && (
                <div
                  id="form-error"
                  role="alert"
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldError}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold rounded-xl gradient-accent shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/35 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 group mt-1"
                disabled={loading}
                aria-busy={loading}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Entrando...</>
                  : <>Entrar no Portal<ChevronRight className="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" /></>
                }
              </Button>
            </form>

            {/* Security note */}
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-muted-foreground/50">
                <Lock className="w-3 h-3" />
                <p className="text-xs">Conexão segura</p>
              </div>
              <span className="text-muted-foreground/25">·</span>
              <div className="flex items-center gap-1.5 text-muted-foreground/50">
                <Shield className="w-3 h-3" />
                <p className="text-xs">Acesso restrito</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
