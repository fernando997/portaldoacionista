import { Package, LogOut, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, OnboardingStatus } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

function calcChecklist(data: OnboardingStatus) {
  const items = [
    { label: 'CNPJ', ok: !!data.cnpj },
    { label: 'Endereco', ok: !!(data.cep && data.rua) },
    { label: 'Conta Asaas', ok: !!data.asaas_config?.accountCreated },
    { label: 'Certificado Digital', ok: !!data.certificado_digital_url },
    { label: 'Senha do Certificado', ok: !!data.senha_certificado },
    { label: 'CNH', ok: !!data.cnh_url },
    { label: 'Procuracao', ok: !!data.procuracao_url },
    { label: 'Assinatura', ok: !!data.assinatura_url },
  ];
  const done = items.filter(i => i.ok).length;
  return { items, done, total: items.length };
}

export default function OnboardingPendingScreen() {
  const { logout, onboardingData } = useAuth();

  const checklist = onboardingData ? calcChecklist(onboardingData) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <img src={logo} alt="Modo Corre" className="h-16 w-auto mb-10 opacity-80" />

      <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-6">
        <Package className="w-8 h-8 text-amber-600" />
      </div>

      <h1 className="text-xl font-bold text-foreground mb-2">Cadastro em andamento</h1>

      {checklist ? (
        <div className="w-full max-w-sm mb-8">
          <p className="text-sm text-muted-foreground text-center mb-4">
            {checklist.done} de {checklist.total} itens concluidos
          </p>
          <div className="space-y-2.5">
            {checklist.items.map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                {item.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                )}
                <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed mb-8">
          Seu cadastro ainda esta sendo processado pela equipe. Voce sera notificado por e-mail quando estiver concluido.
        </p>
      )}

      <Button variant="outline" className="gap-2" onClick={logout}>
        <LogOut className="w-4 h-4" /> Sair
      </Button>
    </div>
  );
}
