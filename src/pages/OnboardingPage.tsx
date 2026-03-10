import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, Upload, CheckCircle2, FileText, AlertCircle,
  ShieldCheck, IdCard, FileCheck, ChevronRight, ChevronLeft, Send, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

const STEPS = [
  { id: 'cnpj', label: 'CNPJ', icon: ShieldCheck, description: 'Informe o CNPJ da sua empresa' },
  { id: 'certificado', label: 'Certificado Digital', icon: FileCheck, description: 'Envie seu certificado e a senha' },
  { id: 'cnh', label: 'CNH', icon: IdCard, description: 'Envie uma cópia da sua CNH' },
  { id: 'procuracao', label: 'Procuração', icon: FileText, description: 'Envie o arquivo de procuração' },
];

export default function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [pedidoId, setPedidoId] = useState('');
  const [step, setStep] = useState(0);

  const [cnpj, setCnpj] = useState('');
  const [senhaCertificado, setSenhaCertificado] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [procuracaoFile, setProcuracaoFile] = useState<File | null>(null);

  // CNPJ mask: 00.000.000/0000-00
  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCnpj(e.target.value));
  };

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    supabase
      .from('onboarding_requests')
      .select('*')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setInvalid(true);
        else if (data.status === 'completo') setCompleted(true);
        else {
          setRequestId(data.id);
          setPedidoId(data.pedido_id);
          // Restore previously saved data
          if (data.cnpj) setCnpj(data.cnpj);
          if (data.senha_certificado) setSenhaCertificado(data.senha_certificado);
        }
        setLoading(false);
      });
  }, [token]);

  const cnpjDigits = cnpj.replace(/\D/g, '');

  const stepValid = useMemo(() => {
    switch (step) {
      case 0: return cnpjDigits.length === 14;
      case 1: return !!certificadoFile && senhaCertificado.trim().length > 0;
      case 2: return !!cnhFile;
      case 3: return !!procuracaoFile;
      default: return false;
    }
  }, [step, cnpjDigits, certificadoFile, senhaCertificado, cnhFile, procuracaoFile]);

  const progressPercent = useMemo(() => {
    let filled = 0;
    if (cnpjDigits.length === 14) filled++;
    if (certificadoFile && senhaCertificado.trim()) filled++;
    if (cnhFile) filled++;
    if (procuracaoFile) filled++;
    return Math.round((filled / 4) * 100);
  }, [cnpjDigits, certificadoFile, senhaCertificado, cnhFile, procuracaoFile]);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${requestId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('onboarding-docs').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('onboarding-docs').getPublicUrl(path);
    return data.publicUrl;
  };

  // Save partial data on each step advance
  const saveStepData = async (nextStep: number) => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};

      // Save text fields always
      if (cnpj.replace(/\D/g, '').length === 14) updateData.cnpj = cnpj;
      if (senhaCertificado.trim()) updateData.senha_certificado = senhaCertificado.trim();

      // Upload files if present and moving past their step
      if (certificadoFile && step === 1) {
        updateData.certificado_digital_url = await uploadFile(certificadoFile, 'certificado');
      }
      if (cnhFile && step === 2) {
        updateData.cnh_url = await uploadFile(cnhFile, 'cnh');
      }
      if (procuracaoFile && step === 3) {
        updateData.procuracao_url = await uploadFile(procuracaoFile, 'procuracao');
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('onboarding_requests')
          .update(updateData)
          .eq('id', requestId);
      }

      setStep(nextStep);
      toast.success('Progresso salvo!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const updateData: Record<string, unknown> = {
        cnpj: cnpj,
        senha_certificado: senhaCertificado.trim(),
        status: 'completo',
        completed_at: new Date().toISOString(),
      };

      // Upload remaining files that haven't been uploaded yet
      if (procuracaoFile) {
        updateData.procuracao_url = await uploadFile(procuracaoFile, 'procuracao');
      }

      const { data: updatedData, error } = await supabase
        .from('onboarding_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();
      if (error) throw error;

      // Enviar dados para o Bubble e registrar log
      const payload = {
        'PED': pedidoId,
        'CNPJ': updatedData.cnpj,
        'CD': updatedData.certificado_digital_url,
        'SENHA': updatedData.senha_certificado,
        'CNH': updatedData.cnh_url,
        'PROC': updatedData.procuracao_url,
      };
      const apiUrl = 'https://modocorreapp.com.br/version-test/api/1.1/wf/pool-receberonboarding';
      const curlCommand = `curl -X POST "${apiUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(payload)}'`;
      try {
        const apiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const resBody = await apiRes.text().catch(() => '');
        await supabase.from('onboarding_logs').insert({
          onboarding_request_id: requestId,
          pedido_id: pedidoId,
          request_payload: payload,
          response_status: apiRes.status,
          response_body: `${resBody}\n\nCURL:\n${curlCommand}`,
          success: apiRes.ok,
          error_message: apiRes.ok ? null : `HTTP ${apiRes.status}`,
        } as any);
      } catch (bubbleErr: any) {
        console.error('Erro ao notificar API externa:', bubbleErr);
        await supabase.from('onboarding_logs').insert({
          onboarding_request_id: requestId,
          pedido_id: pedidoId,
          request_payload: payload,
          response_status: null,
          response_body: `CURL:\n${curlCommand}`,
          success: false,
          error_message: bubbleErr.message || 'Erro de rede',
        } as any);
      }

      setCompleted(true);
      toast.success('Documentos enviados com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar documentos');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Link Inválido</h2>
            <p className="text-muted-foreground text-sm">Este link de onboarding é inválido ou já foi utilizado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Documentos Enviados!</h2>
            <p className="text-muted-foreground text-sm">Seus documentos foram recebidos com sucesso.<br />Entraremos em contato em breve.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;
  const isLast = step === STEPS.length - 1;

  const FileUploadBox = ({
    file, setFile, id, accept, hint,
  }: { file: File | null; setFile: (f: File | null) => void; id: string; accept: string; hint: string }) => (
    <div>
      <input type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id={id} />
      <label
        htmlFor={id}
        className={`flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
          file
            ? 'border-accent/40 bg-accent/5'
            : 'border-input hover:border-primary/30 hover:bg-muted/30'
        }`}
      >
        {file ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground truncate max-w-[250px]">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Clique para alterar</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Clique para enviar</p>
              <p className="text-xs text-muted-foreground mt-1">{hint}</p>
            </div>
          </>
        )}
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Top bar */}
      <div className="w-full border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logo} alt="Modo Corre" className="h-10 w-auto" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pedido</p>
            <p className="text-sm font-mono font-bold text-foreground">{pedidoId}</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-8 pb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">
            Etapa {step + 1} de {STEPS.length}
          </p>
          <p className="text-sm font-bold text-foreground">{progressPercent}%</p>
        </div>
        <Progress value={progressPercent} className="h-2.5 mb-4" />

        {/* Step indicators */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'bg-primary'
                  : i < step
                  ? 'bg-accent'
                  : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-start justify-center px-4 pt-6 pb-8">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-8 pb-8 px-6 sm:px-10">
            {/* Step Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <StepIcon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{currentStep.label}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{currentStep.description}</p>
              </div>
            </div>

            {/* Step Forms */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">CNPJ da Empresa</Label>
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={handleCnpjChange}
                    maxLength={18}
                    className="h-12 text-base font-mono tracking-wider"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <FileUploadBox
                  file={certificadoFile}
                  setFile={setCertificadoFile}
                  id="cert-file"
                  accept=".pfx,.p12,.cer,.crt"
                  hint="Formatos: .pfx, .p12, .cer, .crt"
                />
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Senha do Certificado</Label>
                  <div className="relative">
                    <Input
                      type={showSenha ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={senhaCertificado}
                      onChange={(e) => setSenhaCertificado(e.target.value)}
                      className="h-12 text-base pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <FileUploadBox
                file={cnhFile}
                setFile={setCnhFile}
                id="cnh-file"
                accept="image/*,.pdf"
                hint="Imagem ou PDF da CNH"
              />
            )}

            {step === 3 && (
              <FileUploadBox
                file={procuracaoFile}
                setFile={setProcuracaoFile}
                id="proc-file"
                accept=".pdf,.doc,.docx,image/*"
                hint="PDF, DOC ou imagem"
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t">
              <Button
                variant="ghost"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0 || saving}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>

              {isLast ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!stepValid || submitting || saving}
                  className="gap-2 min-w-[160px]"
                  size="lg"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Enviar Documentos</>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => saveStepData(step + 1)}
                  disabled={!stepValid || saving}
                  className="gap-2"
                  size="lg"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  ) : (
                    <>Próximo <ChevronRight className="w-4 h-4" /></>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
