import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Upload, CheckCircle2, FileText, AlertCircle,
  ShieldCheck, IdCard, FileCheck, Send, Eye, EyeOff, Cloud,
  CreditCard, ExternalLink, RefreshCw, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

const PAYMENT_API = 'https://modocorreapp.com.br/api/1.1/wf/pool-consulta-parcela-rastreador';

/* ─── Telas de estado ─────────────────────────────────────────── */

function StateScreen({ icon, iconBg, iconColor, title, description }: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  title: string; description: string;
}) {
  const Icon = icon;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(210,20%,97%)] p-6">
      <img src={logo} alt="Modo Corre" className="h-36 w-auto object-contain mb-10 opacity-80" />
      <div className={`w-20 h-20 rounded-3xl ${iconBg} flex items-center justify-center mb-6 shadow-md`}>
        <Icon className={`w-9 h-9 ${iconColor}`} />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>{title}</h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  );
}

/* ─── FileUploadBox ───────────────────────────────────────────── */

function FileUploadBox({ file, savedUrl, uploading, onChange, id, accept, hint }: {
  file: File | null; savedUrl: string | null; uploading: boolean;
  onChange: (f: File | null) => void; id: string; accept: string; hint: string;
}) {
  const done = !!savedUrl;
  return (
    <div>
      <input type="file" accept={accept} id={id} className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)} />
      <label
        htmlFor={uploading ? undefined : id}
        className={cn(
          'flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer',
          uploading && 'cursor-wait opacity-60',
          done && 'border-emerald-400/50 bg-emerald-50/60',
          !done && file && 'border-blue-400/40 bg-blue-50/40',
          !done && !file && !uploading && 'border-border hover:border-accent/50 hover:bg-muted/30',
        )}
      >
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          uploading && 'bg-muted',
          done && 'bg-emerald-500/15',
          !done && file && 'bg-blue-500/10',
          !done && !file && !uploading && 'bg-muted',
        )}>
          {uploading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            : done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : file ? <Cloud className="w-5 h-5 text-blue-500" />
            : <Upload className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          {uploading
            ? <p className="text-sm font-medium text-muted-foreground">Enviando...</p>
            : done ? <>
                <p className="text-sm font-semibold text-emerald-600">Arquivo salvo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Clique para substituir</p>
              </>
            : file ? <>
                <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Aguardando envio final</p>
              </>
            : <>
                <p className="text-sm font-medium text-foreground">Clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
              </>}
        </div>
      </label>
    </div>
  );
}

/* ─── StepCard ────────────────────────────────────────────────── */

function StepCard({ step, icon: Icon, title, done, saving, children }: {
  step: number; icon: React.ElementType; title: string;
  done: boolean; saving?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300',
      done ? 'border-emerald-400/40' : 'border-border',
    )}>
      {/* Left accent */}
      <div className={cn('h-1 w-full', done ? 'bg-emerald-500' : 'bg-border')} />
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold',
            done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/8 text-primary',
          )}>
            {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Icon className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Etapa {step}</span>
            </div>
            <p className="font-semibold text-sm text-foreground leading-tight">{title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            {done && !saving && (
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Concluído
              </span>
            )}
            {!done && !saving && (
              <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Pendente
              </span>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Página principal ────────────────────────────────────────── */

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

  const [savedCertificadoUrl, setSavedCertificadoUrl] = useState<string | null>(null);
  const [savedCnhUrl, setSavedCnhUrl] = useState<string | null>(null);
  const [savedProcuracaoUrl, setSavedProcuracaoUrl] = useState<string | null>(null);

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('GERADO');
  const [paymentDescricao, setPaymentDescricao] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingCnh, setUploadingCnh] = useState(false);
  const [uploadingProc, setUploadingProc] = useState(false);
  const [savingCnpj, setSavingCnpj] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);

  const cnpjTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const senhaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatCnpj = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const fetchPaymentUrl = async (pedido: string, reqId: string) => {
    setLoadingPayment(true);
    try {
      const res = await fetch(PAYMENT_API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido }),
      });
      const data = await res.json();
      const parcela = data?.response?.parcela ?? {};
      const url = parcela?.url ?? null;
      const status = parcela?.status ?? 'GERADO';
      const descricao = parcela?.descricao ?? null;
      if (descricao) setPaymentDescricao(descricao);
      if (url) {
        setPaymentUrl(url);
        const newStatus = String(status).toUpperCase() === 'PAGO' ? 'PAGO' : 'GERADO';
        setPaymentStatus(newStatus);
        await supabase.from('onboarding_requests')
          .update({ payment_url: url, payment_status: newStatus, payment_descricao: descricao ?? null } as any)
          .eq('id', reqId);
      }
    } catch (err) {
      console.error('[payment API] erro:', err);
    } finally {
      setLoadingPayment(false);
    }
  };

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    supabase.from('onboarding_requests').select('*').eq('token', token).single()
      .then(({ data, error }) => {
        if (error || !data) { setInvalid(true); setLoading(false); return; }
        if (data.status === 'completo') { setCompleted(true); setLoading(false); return; }
        setRequestId(data.id);
        setPedidoId(data.pedido_id);
        if (data.cnpj) setCnpj(data.cnpj);
        if (data.senha_certificado) setSenhaCertificado(data.senha_certificado);
        if (data.certificado_digital_url) setSavedCertificadoUrl(data.certificado_digital_url);
        if (data.cnh_url) setSavedCnhUrl(data.cnh_url);
        if (data.procuracao_url) setSavedProcuracaoUrl(data.procuracao_url);
        if ((data as any).payment_url) {
          setPaymentUrl((data as any).payment_url);
          setPaymentStatus((data as any).payment_status ?? 'GERADO');
          if ((data as any).payment_descricao) setPaymentDescricao((data as any).payment_descricao);
        }
        setLoading(false);
        fetchPaymentUrl(data.pedido_id, data.id);
      });
  }, [token]);

  const handleVerifyPayment = async () => {
    if (!pedidoId || !requestId) return;
    setVerifyingPayment(true);
    try {
      const res = await fetch(PAYMENT_API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido: pedidoId }),
      });
      const data = await res.json();
      const status = data?.response?.parcela?.status ?? '';
      if (String(status).toUpperCase() === 'PAGO') {
        setPaymentStatus('PAGO');
        await supabase.from('onboarding_requests').update({ payment_status: 'PAGO' } as any).eq('id', requestId);
        toast.success('Pagamento confirmado!');
      } else {
        toast.info('Pagamento ainda não identificado. Tente novamente em alguns minutos.');
      }
    } catch (err: any) {
      toast.error('Erro ao verificar: ' + (err.message || ''));
    } finally {
      setVerifyingPayment(false);
    }
  };

  const cnpjDigits = cnpj.replace(/\D/g, '');
  const cnpjValido = cnpjDigits.length === 14;

  useEffect(() => {
    if (!requestId || !cnpjValido) return;
    if (cnpjTimerRef.current) clearTimeout(cnpjTimerRef.current);
    cnpjTimerRef.current = setTimeout(async () => {
      setSavingCnpj(true);
      await supabase.from('onboarding_requests').update({ cnpj }).eq('id', requestId);
      setSavingCnpj(false);
    }, 1000);
    return () => { if (cnpjTimerRef.current) clearTimeout(cnpjTimerRef.current); };
  }, [cnpj, cnpjValido, requestId]);

  useEffect(() => {
    if (!requestId || !senhaCertificado.trim()) return;
    if (senhaTimerRef.current) clearTimeout(senhaTimerRef.current);
    senhaTimerRef.current = setTimeout(async () => {
      setSavingSenha(true);
      await supabase.from('onboarding_requests').update({ senha_certificado: senhaCertificado.trim() }).eq('id', requestId);
      setSavingSenha(false);
    }, 1000);
    return () => { if (senhaTimerRef.current) clearTimeout(senhaTimerRef.current); };
  }, [senhaCertificado, requestId]);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${requestId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('onboarding-docs').upload(path, file);
    if (error) throw error;
    return supabase.storage.from('onboarding-docs').getPublicUrl(path).data.publicUrl;
  };

  const handleFileChange = async (
    file: File | null, folder: string, dbField: string,
    setSaved: (url: string | null) => void, setUploading: (v: boolean) => void,
  ) => {
    if (!file || !requestId) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, folder);
      await supabase.from('onboarding_requests').update({ [dbField]: url }).eq('id', requestId);
      setSaved(url);
      toast.success('Arquivo salvo!');
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + (err.message || ''));
    } finally {
      setUploading(false);
    }
  };

  const isPago = paymentStatus?.toUpperCase() === 'PAGO';

  const steps = [
    { id: 'cnpj',    done: cnpjValido },
    { id: 'cert',    done: !!(savedCertificadoUrl || certificadoFile) && senhaCertificado.trim().length > 0 },
    { id: 'cnh',     done: !!(savedCnhUrl || cnhFile) },
    { id: 'proc',    done: !!(savedProcuracaoUrl || procuracaoFile) },
    { id: 'payment', done: isPago },
  ];

  const progressPercent = useMemo(() => Math.round((steps.filter(s => s.done).length / 5) * 100), [
    cnpjValido, savedCertificadoUrl, certificadoFile, senhaCertificado,
    savedCnhUrl, cnhFile, savedProcuracaoUrl, procuracaoFile, isPago,
  ]);

  const allFilled = progressPercent === 100;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const updateData: Record<string, unknown> = { status: 'completo', completed_at: new Date().toISOString() };
      if (certificadoFile && !savedCertificadoUrl) updateData.certificado_digital_url = await uploadFile(certificadoFile, 'certificado');
      if (cnhFile && !savedCnhUrl) updateData.cnh_url = await uploadFile(cnhFile, 'cnh');
      if (procuracaoFile && !savedProcuracaoUrl) updateData.procuracao_url = await uploadFile(procuracaoFile, 'procuracao');

      const { data: updatedData, error } = await supabase
        .from('onboarding_requests').update(updateData).eq('id', requestId).select().single();
      if (error) throw error;

      const payload = {
        'PED': pedidoId, 'CNPJ': updatedData.cnpj, 'CD': updatedData.certificado_digital_url,
        'SENHA': updatedData.senha_certificado, 'CNH': updatedData.cnh_url, 'PROC': updatedData.procuracao_url,
      };
      const apiUrl = 'https://modocorreapp.com.br/api/1.1/wf/pool-receberonboarding';
      const curlCommand = `curl -X POST "${apiUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(payload)}'`;
      try {
        const apiRes = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const resBody = await apiRes.text().catch(() => '');
        await supabase.from('onboarding_logs').insert({
          onboarding_request_id: requestId, pedido_id: pedidoId, request_payload: payload,
          response_status: apiRes.status, response_body: `${resBody}\n\nCURL:\n${curlCommand}`,
          success: apiRes.ok, error_message: apiRes.ok ? null : `HTTP ${apiRes.status}`,
        } as any);
      } catch (bubbleErr: any) {
        await supabase.from('onboarding_logs').insert({
          onboarding_request_id: requestId, pedido_id: pedidoId, request_payload: payload,
          response_status: null, response_body: `CURL:\n${curlCommand}`,
          success: false, error_message: bubbleErr.message || 'Erro de rede',
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

  /* ── Estados especiais ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(210,20%,97%)]">
      <div className="flex flex-col items-center gap-4">
        <img src={logo} alt="Modo Corre" className="h-36 w-auto object-contain opacity-70" />
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );

  if (invalid) return (
    <StateScreen icon={AlertCircle} iconBg="bg-destructive/10" iconColor="text-destructive"
      title="Link Inválido"
      description="Este link de onboarding é inválido ou já foi utilizado.<br/>Entre em contato com sua assessoria." />
  );

  if (completed) return (
    <StateScreen icon={CheckCircle2} iconBg="bg-emerald-500/10" iconColor="text-emerald-500"
      title="Tudo pronto!"
      description="Seus documentos foram recebidos com sucesso.<br/>Entraremos em contato em breve." />
  );

  /* ── Formulário principal ── */
  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)] flex flex-col">

      {/* Header */}
      <div className="bg-gradient-to-r from-[hsl(220,60%,14%)] to-[hsl(220,60%,20%)] sticky top-0 z-10 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logo} alt="Modo Corre" className="h-[7.5rem] w-auto object-contain brightness-0 invert" />
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Pedido</p>
            <p className="text-sm font-mono font-bold text-white/90">{pedidoId}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-[hsl(135,55%,48%)] transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full px-4 pt-6 pb-14 space-y-3">

        {/* Hero */}
        <div className="text-center py-4 space-y-1">
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Cadastro do Acionista
          </h1>
          <p className="text-sm text-muted-foreground">Preencha todas as etapas para finalizar seu cadastro.</p>
        </div>

        {/* Step bubbles */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300',
                  s.done ? 'bg-emerald-500 text-white shadow-sm' : 'bg-muted text-muted-foreground',
                )}>
                  {s.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-1 rounded-full transition-all duration-500', s.done ? 'bg-emerald-400' : 'bg-border')} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            {['CNPJ', 'Certificado', 'CNH', 'Procuração', 'Pagamento'].map((label) => (
              <div key={label} className="flex-1 text-center">
                <span className="text-[9px] text-muted-foreground font-medium leading-none">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{steps.filter(s => s.done).length} de 5 etapas concluídas</span>
            <span className={cn('text-xs font-bold', progressPercent === 100 ? 'text-emerald-600' : 'text-foreground')}>{progressPercent}%</span>
          </div>
        </div>

        {/* CNPJ */}
        <StepCard step={1} icon={ShieldCheck} title="CNPJ da Empresa" done={cnpjValido} saving={savingCnpj}>
          <Input
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            maxLength={18}
            className="h-12 text-base font-mono tracking-wider"
          />
        </StepCard>

        {/* Certificado Digital */}
        <StepCard step={2} icon={FileCheck} title="Certificado Digital"
          done={!!(savedCertificadoUrl || certificadoFile) && senhaCertificado.trim().length > 0}
          saving={uploadingCert || savingSenha}>
          <FileUploadBox
            file={certificadoFile} savedUrl={savedCertificadoUrl} uploading={uploadingCert}
            id="cert-file" accept=".pfx,.p12,.cer,.crt" hint="Formatos: .pfx, .p12, .cer, .crt"
            onChange={(f) => { setCertificadoFile(f); handleFileChange(f, 'certificado', 'certificado_digital_url', setSavedCertificadoUrl, setUploadingCert); }}
          />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Senha do Certificado</Label>
              {senhaCertificado.trim() && !savingSenha && (
                <span className="text-[11px] text-emerald-600 font-medium">Salvo</span>
              )}
            </div>
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
        </StepCard>

        {/* CNH */}
        <StepCard step={3} icon={IdCard} title="CNH" done={!!(savedCnhUrl || cnhFile)} saving={uploadingCnh}>
          <FileUploadBox
            file={cnhFile} savedUrl={savedCnhUrl} uploading={uploadingCnh}
            id="cnh-file" accept="image/*,.pdf" hint="Imagem ou PDF da CNH"
            onChange={(f) => { setCnhFile(f); handleFileChange(f, 'cnh', 'cnh_url', setSavedCnhUrl, setUploadingCnh); }}
          />
        </StepCard>

        {/* Procuração */}
        <StepCard step={4} icon={FileText} title="Procuração" done={!!(savedProcuracaoUrl || procuracaoFile)} saving={uploadingProc}>
          <FileUploadBox
            file={procuracaoFile} savedUrl={savedProcuracaoUrl} uploading={uploadingProc}
            id="proc-file" accept=".pdf,.doc,.docx,image/*" hint="PDF, DOC ou imagem"
            onChange={(f) => { setProcuracaoFile(f); handleFileChange(f, 'procuracao', 'procuracao_url', setSavedProcuracaoUrl, setUploadingProc); }}
          />
        </StepCard>

        {/* Pagamento */}
        <div className={cn(
          'rounded-2xl border overflow-hidden shadow-sm transition-all duration-300',
          isPago ? 'border-emerald-400/40 bg-white' : 'border-amber-400/40 bg-white',
        )}>
          <div className={cn('h-1 w-full', isPago ? 'bg-emerald-500' : 'bg-amber-400')} />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                isPago ? 'bg-emerald-500/15' : 'bg-amber-500/15')}>
                {isPago
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <CreditCard className="w-5 h-5 text-amber-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Etapa 5</span>
                </div>
                <p className="font-semibold text-sm text-foreground leading-tight">Pagamento referente a rastreadores</p>
              </div>
              <div className="shrink-0">
                {loadingPayment
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  : isPago
                    ? <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Pago</span>
                    : <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Pendente</span>}
              </div>
            </div>

            {paymentDescricao && (
              <p className="text-sm font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border">
                {paymentDescricao}
              </p>
            )}

            {!isPago && (
              <div className="space-y-2">
                {paymentUrl ? (
                  <>
                    <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white h-11 font-semibold">
                        <ExternalLink className="w-4 h-4" />
                        Realizar Pagamento
                      </Button>
                    </a>
                    <Button variant="outline" className="w-full gap-2 h-10"
                      onClick={handleVerifyPayment} disabled={verifyingPayment}>
                      {verifyingPayment
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                        : <><RefreshCw className="w-4 h-4" /> Já paguei — verificar</>}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Após o pagamento, clique em "Já paguei — verificar" para continuar.
                    </p>
                  </>
                ) : loadingPayment ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Carregando link de pagamento...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Link de pagamento não disponível para este pedido.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!allFilled || submitting}
            className={cn(
              'w-full h-14 text-base gap-2 rounded-2xl font-semibold transition-all duration-300',
              allFilled && !submitting ? 'gradient-accent shadow-lg shadow-accent/20 hover:-translate-y-0.5' : 'opacity-50 cursor-not-allowed',
            )}
            size="lg"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Finalizando envio...</>
            ) : allFilled ? (
              <><Send className="w-5 h-5" /> Confirmar e Enviar Documentos</>
            ) : !isPago ? (
              <span className="text-sm">Realize o pagamento para liberar o envio</span>
            ) : (
              <span className="text-sm">{progressPercent}% — preencha todas as etapas</span>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
