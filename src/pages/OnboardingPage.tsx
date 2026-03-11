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
  ShieldCheck, IdCard, FileCheck, Send, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

export default function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [pedidoId, setPedidoId] = useState('');

  const [cnpj, setCnpj] = useState('');
  const [senhaCertificado, setSenhaCertificado] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [procuracaoFile, setProcuracaoFile] = useState<File | null>(null);

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
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
          if (data.cnpj) setCnpj(data.cnpj);
          if (data.senha_certificado) setSenhaCertificado(data.senha_certificado);
        }
        setLoading(false);
      });
  }, [token]);

  const cnpjDigits = cnpj.replace(/\D/g, '');

  const progressPercent = useMemo(() => {
    let filled = 0;
    if (cnpjDigits.length === 14) filled++;
    if (certificadoFile && senhaCertificado.trim()) filled++;
    if (cnhFile) filled++;
    if (procuracaoFile) filled++;
    return Math.round((filled / 4) * 100);
  }, [cnpjDigits, certificadoFile, senhaCertificado, cnhFile, procuracaoFile]);

  const allFilled = progressPercent === 100;

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${requestId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('onboarding-docs').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('onboarding-docs').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const updateData: Record<string, unknown> = {
        cnpj,
        senha_certificado: senhaCertificado.trim(),
        status: 'completo',
        completed_at: new Date().toISOString(),
      };

      if (certificadoFile) updateData.certificado_digital_url = await uploadFile(certificadoFile, 'certificado');
      if (cnhFile) updateData.cnh_url = await uploadFile(cnhFile, 'cnh');
      if (procuracaoFile) updateData.procuracao_url = await uploadFile(procuracaoFile, 'procuracao');

      const { data: updatedData, error } = await supabase
        .from('onboarding_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();
      if (error) throw error;

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

  const FileUploadBox = ({
    file, setFile, id, accept, hint,
  }: { file: File | null; setFile: (f: File | null) => void; id: string; accept: string; hint: string }) => (
    <div>
      <input type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id={id} />
      <label
        htmlFor={id}
        className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
          file ? 'border-accent/40 bg-accent/5' : 'border-input hover:border-primary/30 hover:bg-muted/30'
        }`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${file ? 'bg-accent/15' : 'bg-muted'}`}>
          {file ? <CheckCircle2 className="w-5 h-5 text-accent" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          {file ? (
            <>
              <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Clique para alterar</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Clique para enviar</p>
              <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
            </>
          )}
        </div>
      </label>
    </div>
  );

  const SectionCard = ({ icon: Icon, title, done, children }: { icon: any; title: string; done: boolean; children: React.ReactNode }) => (
    <div className={`rounded-2xl border p-5 space-y-4 transition-colors ${done ? 'border-accent/30 bg-accent/5' : 'bg-card'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-accent/15' : 'bg-primary/10'}`}>
          {done ? <CheckCircle2 className="w-5 h-5 text-accent" /> : <Icon className="w-5 h-5 text-primary" />}
        </div>
        <p className="font-semibold text-foreground">{title}</p>
        {done && <span className="ml-auto text-xs font-medium text-accent">Preenchido</span>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Top bar */}
      <div className="w-full border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logo} alt="Modo Corre" className="h-10 w-auto" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Pedido</p>
            <p className="text-sm font-mono font-bold text-foreground">{pedidoId}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 pt-6 pb-10 space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground font-medium">Progresso do envio</p>
            <p className="font-bold text-foreground">{progressPercent}%</p>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* CNPJ */}
        <SectionCard icon={ShieldCheck} title="CNPJ da Empresa" done={cnpjDigits.length === 14}>
          <Input
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            maxLength={18}
            className="h-12 text-base font-mono tracking-wider"
          />
        </SectionCard>

        {/* Certificado Digital */}
        <SectionCard icon={FileCheck} title="Certificado Digital" done={!!certificadoFile && senhaCertificado.trim().length > 0}>
          <FileUploadBox
            file={certificadoFile}
            setFile={setCertificadoFile}
            id="cert-file"
            accept=".pfx,.p12,.cer,.crt"
            hint="Formatos: .pfx, .p12, .cer, .crt"
          />
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Senha do Certificado</Label>
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
        </SectionCard>

        {/* CNH */}
        <SectionCard icon={IdCard} title="CNH" done={!!cnhFile}>
          <FileUploadBox
            file={cnhFile}
            setFile={setCnhFile}
            id="cnh-file"
            accept="image/*,.pdf"
            hint="Imagem ou PDF da CNH"
          />
        </SectionCard>

        {/* Procuração */}
        <SectionCard icon={FileText} title="Procuração" done={!!procuracaoFile}>
          <FileUploadBox
            file={procuracaoFile}
            setFile={setProcuracaoFile}
            id="proc-file"
            accept=".pdf,.doc,.docx,image/*"
            hint="PDF, DOC ou imagem"
          />
        </SectionCard>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!allFilled || submitting}
          className="w-full h-14 text-base gap-2"
          size="lg"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Enviando documentos...</>
          ) : (
            <><Send className="w-5 h-5" /> {allFilled ? 'Enviar Documentos' : `Preencha todos os campos (${progressPercent}%)`}</>
          )}
        </Button>
      </div>
    </div>
  );
}
