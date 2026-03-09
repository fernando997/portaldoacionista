import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Lock, Mail, KeyRound, Loader2, Shield, ChevronRight } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        {/* Deep gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,60%,12%)] via-[hsl(220,60%,18%)] to-[hsl(220,55%,24%)]" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[hsl(135,55%,42%)]/8 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[hsl(210,80%,52%)]/6 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(135,55%,42%)]/4 blur-[150px]" />
        </div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Modo Corre" className="h-20 w-auto brightness-0 invert" />
          </div>
          
          <div className="space-y-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(0,0%,100%)]/10 border border-[hsl(0,0%,100%)]/10 backdrop-blur-sm">
                <Shield className="w-3.5 h-3.5 text-[hsl(135,55%,48%)]" />
                <span className="text-xs font-medium text-[hsl(0,0%,100%)]/70 tracking-wide">Portal Seguro do Acionista</span>
              </div>
              <h1 className="font-display text-4xl xl:text-[3.25rem] font-bold leading-[1.1] text-[hsl(0,0%,98%)]">
                Seu investimento,{' '}
                <span className="text-[hsl(135,55%,48%)]">sob controle</span>
                <span className="text-[hsl(135,55%,48%)]">.</span>
              </h1>
              <p className="text-[hsl(0,0%,100%)]/50 text-base xl:text-lg max-w-lg leading-relaxed">
                Acompanhe sua participação, receitas e documentos em um só lugar. 
                Transparência e confiança para o seu patrimônio.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="group relative bg-[hsl(0,0%,100%)]/[0.06] backdrop-blur-md border border-[hsl(0,0%,100%)]/[0.08] rounded-2xl p-5 transition-all duration-300 hover:bg-[hsl(0,0%,100%)]/[0.1] hover:border-[hsl(0,0%,100%)]/[0.15]">
                <p className="text-3xl xl:text-4xl font-bold text-[hsl(0,0%,98%)] tracking-tight leading-none">R$11,6M<span className="text-[hsl(135,55%,48%)]">+</span></p>
                <p className="text-[11px] font-medium text-[hsl(0,0%,100%)]/40 mt-2 tracking-wider uppercase">Capital gerido</p>
              </div>
              <div className="group relative bg-[hsl(0,0%,100%)]/[0.06] backdrop-blur-md border border-[hsl(0,0%,100%)]/[0.08] rounded-2xl p-5 transition-all duration-300 hover:bg-[hsl(0,0%,100%)]/[0.1] hover:border-[hsl(0,0%,100%)]/[0.15]">
                <p className="text-3xl xl:text-4xl font-bold text-[hsl(0,0%,98%)] tracking-tight leading-none">1K<span className="text-[hsl(135,55%,48%)]">+</span></p>
                <p className="text-[11px] font-medium text-[hsl(0,0%,100%)]/40 mt-2 tracking-wider uppercase">Motos ativas</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-[hsl(0,0%,100%)]/30">
              © 2025 Grupo Modo Corre. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - login */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[380px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-4">
            <img src={logo} alt="Modo Corre" className="h-24 w-auto mx-auto" />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">Portal do Acionista</span>
            </div>
          </div>

          <div className="hidden lg:block space-y-3">
            <h2 className="text-3xl font-display font-bold text-foreground tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed">
              Entre com suas credenciais para acessar o portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 text-[15px] rounded-xl border-input bg-muted/50 focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <div className="relative group">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-accent" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 text-[15px] rounded-xl border-input bg-muted/50 focus:bg-background transition-colors"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-[15px] font-semibold rounded-xl gradient-accent shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Entrar no Portal
              {!loading && <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </form>

          <div className="pt-6 border-t">
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-3 h-3 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground/60">
                Conexão segura · Acesso restrito
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
