import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, Upload, CheckCircle2, FileText, AlertCircle,
  ShieldCheck, IdCard, FileCheck, Send, Eye, EyeOff, Cloud,
  CreditCard, ExternalLink, RefreshCw, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

const PAYMENT_API = 'https://modocorreapp.com.br/version-test/api/1.1/wf/pool-consulta-parcela-rastreador';

export default function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [pedidoId, setPedidoId] = useState('');

  // Campos
  const [cnpj, setCnpj] = useState('');
  const [senhaCertificado, setSenhaCertificado] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [procuracaoFile, setProcuracaoFile] = useState<File | null>(null);

  // URLs já salvas
  const [savedCertificadoUrl, setSavedCertificadoUrl] = useState<string | null>(null);
  const [savedCnhUrl, setSavedCnhUrl] = useState<string | null>(null);
  const [savedProcuracaoUrl, setSavedProcuracaoUrl] = useState<string | null>(null);

  // Pagamento
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('GERADO');
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Estado de upload por campo
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadingCnh, setUploadingCnh] = useState(false);
  const [uploadingProc, setUploadingProc] = useState(false);
  const [savingCnpj, setSavingCnpj] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);

  const cnpjTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const senhaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  // Busca URL de pagamento na Bubble
  const fetchPaymentUrl = async (pedido: string, reqId: string) => {
    setLoadingPayment(true);
    try {
      const res = await fetch(PAYMENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido }),
      });
      const data = await res.json();
      const r = data?.response ?? data;
      // Tenta vários nomes de campo possíveis para a URL
      const url =
        r?.link_pagamento ?? r?.url_pagamento ?? r?.url ?? r?.link ?? r?.payment_url ?? null;
      // Tenta obter status
      const status =
        r?.status_pagamento ?? r?.status ?? r?.STATUS ?? 'GERADO';

      if (url) {
        setPaymentUrl(url);
        const isPago = String(status).toUpperCase() === 'PAGO';
        const newStatus = isPago ? 'PAGO' : 'GERADO';
        setPaymentStatus(newStatus);
        await supabase
          .from('onboarding_requests')
          .update({ payment_url: url, payment_status: newStatus } as any)
          .eq('id', reqId);
      }
    } catch {
      // silencioso — link de pagamento é carregado no background
    } finally {
      setLoadingPayment(false);
    }
  };

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    supabase
      .from('onboarding_requests')
      .select('*')
      .eq('token', token)
      .single()
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

        // Pagamento
        if ((data as any).payment_url) {
          setPaymentUrl((data as any).payment_url);
          setPaymentStatus((data as any).payment_status ?? 'GERADO');
          setLoading(false);
        } else {
          setLoading(false);
          // Busca URL em background após carregar a página
          fetchPaymentUrl(data.pedido_id, data.id);
        }
      });
  }, [token]);

  // Verificar pagamento manualmente
  const handleVerifyPayment = async () => {
    if (!pedidoId || !requestId) return;
    setVerifyingPayment(true);
    try {
      const res = await fetch(PAYMENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido: pedidoId }),
      });
      const data = await res.json();
      const r = data?.response ?? data;
      const status = r?.status_pagamento ?? r?.status ?? r?.STATUS ?? '';
      const isPago = String(status).toUpperCase() === 'PAGO';

      if (isPago) {
        setPaymentStatus('PAGO');
        await supabase
          .from('onboarding_requests')
          .update({ payment_status: 'PAGO' } as any)
          .eq('id', requestId);
        toast.success('Pagamento confirmado!');
      } else {
        toast.info('Pagamento ainda não identificado. Tente novamente em alguns minutos.');
      }
    } catch (err: any) {
      toast.error('Erro ao verificar pagamento: ' + (err.message || ''));
    } finally {
      setVerifyingPayment(false);
    }
  };

  const cnpjDigits = cnpj.replace(/\D/g, '');
  const cnpjValido = cnpjDigits.length === 14;

  // Salva CNPJ com debounce após parar de digitar
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

  // Salva senha com debounce
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
    const { data } = supabase.storage.from('onboarding-docs').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFileChange = async (
    file: File | null,
    folder: string,
    dbField: string,
    setSaved: (url: string | null) => void,
    setUploading: (v: boolean) => void,
  ) => {
    if (!file || !requestId) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, folder);
      await supabase.from('onboarding_requests').update({ [dbField]: url }).eq('id', requestId);
      setSaved(url);
      toast.success('Arquivo salvo!');
    } catch (err: any) {
      toast.error('Erro ao enviar arquivo: ' + (err.message || ''));
    } finally {
      setUploading(false);
    }
  };

  const isPago = paymentStatus?.toUpperCase() === 'PAGO';

  const progressPercent = useMemo(() => {
    let filled = 0;
    if (cnpjValido) filled++;
    if ((savedCertificadoUrl || certificadoFile) && senhaCertificado.trim()) filled++;
    if (savedCnhUrl || cnhFile) filled++;
    if (savedProcuracaoUrl || procuracaoFile) filled++;
    if (isPago) filled++;
    return Math.round((filled / 5) * 100);
  }, [cnpjValido, savedCertificadoUrl, certificadoFile, senhaCertificado, savedCnhUrl, cnhFile, savedProcuracaoUrl, procuracaoFile, isPago]);

  const allFilled = progressPercent === 100;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const updateData: Record<string, unknown> = {
        status: 'completo',
        completed_at: new Date().toISOString(),
      };

      // Upload arquivos ainda não enviados
      if (certificadoFile && !savedCertificadoUrl) {
        updateData.certificado_digital_url = await uploadFile(certificadoFile, 'certificado');
      }
      if (cnhFile && !savedCnhUrl) {
        updateData.cnh_url = await uploadFile(cnhFile, 'cnh');
      }
      if (procuracaoFile && !savedProcuracaoUrl) {
        updateData.procuracao_url = await uploadFile(procuracaoFile, 'procuracao');
      }

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
        const apiRes = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const resBody = await apiRes.text().catch(() => '');
        await supabase.from('onboarding_logs').insert({
          onboarding_request_id: requestId, pedido_id: pedidoId,
          request_payload: payload, response_status: apiRes.status,
          response_body: `${resBody}\n\nCURL:\n${curlCommand}`,
          success: apiRes.ok, error_message: apiRes.ok ? null : `HTTP ${apiRes.status}`,
        } as any);
      } catch (bubbleErr: any) {
        await supabase.from('onboarding_logs').insert({
          onboarding_request_id: requestId, pedido_id: pedidoId,
          request_payload: payload, response_status: null,
          response_body: `CURL:\n${curlCommand}`,
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
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Documentos Enviados!</h2>
            <p className="text-muted-foreground text-sm">Seus documentos foram recebidos com sucesso.<br />Entraremos em contato em breve.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const FileUploadBox = ({
    file, savedUrl, uploading, onChange, id, accept, hint,
  }: {
    file: File | null;
    savedUrl: string | null;
    uploading: boolean;
    onChange: (f: File | null) => void;
    id: string; accept: string; hint: string;
  }) => {
    const done = !!savedUrl;
    return (
      <div>
        <input
          type="file" accept={accept} id={id} className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        <label
          htmlFor={uploading ? undefined : id}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
            uploading ? 'cursor-wait opacity-70' :
            done ? 'border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-500/5 cursor-pointer' :
            file ? 'border-blue-400/50 bg-blue-50/50 dark:bg-blue-500/5 cursor-pointer' :
            'border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            uploading ? 'bg-muted' :
            done ? 'bg-emerald-500/15' :
            file ? 'bg-blue-500/10' :
            'bg-muted'
          }`}>
            {uploading ? (
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            ) : done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : file ? (
              <Cloud className="w-5 h-5 text-blue-500" />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {uploading ? (
              <p className="text-sm font-medium text-muted-foreground">Enviando arquivo...</p>
            ) : done ? (
              <>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Arquivo salvo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Clique para substituir</p>
              </>
            ) : file ? (
              <>
                <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Aguardando envio final</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
              </>
            )}
          </div>
        </label>
      </div>
    );
  };

  const sections = [
    { id: 'payment', icon: CreditCard, title: 'Pagamento da Parcela', done: isPago, saving: loadingPayment },
    { id: 'cnpj', icon: ShieldCheck, title: 'CNPJ da Empresa', done: cnpjValido, saving: savingCnpj },
    { id: 'cert', icon: FileCheck, title: 'Certificado Digital', done: !!(savedCertificadoUrl || certificadoFile) && senhaCertificado.trim().length > 0, saving: uploadingCert || savingSenha },
    { id: 'cnh', icon: IdCard, title: 'CNH', done: !!(savedCnhUrl || cnhFile), saving: uploadingCnh },
    { id: 'proc', icon: FileText, title: 'Procuração', done: !!(savedProcuracaoUrl || procuracaoFile), saving: uploadingProc },
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Top bar */}
      <div className="w-full border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logo} alt="Modo Corre" className="h-9 w-auto" />
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pedido</p>
            <p className="text-sm font-mono font-bold text-foreground">{pedidoId}</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full px-4 pt-6 pb-12 space-y-4">

        {/* Progresso */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Progresso do envio</p>
              <p className="text-sm font-bold text-primary">{progressPercent}%</p>
            </div>
            <Progress value={progressPercent} className="h-2.5 mb-3" />
            <div className="flex gap-2">
              {sections.map((s) => (
                <div
                  key={s.id}
                  className={`flex-1 h-1 rounded-full transition-all duration-500 ${s.done ? 'bg-emerald-500' : 'bg-border'}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pagamento */}
        <Card className={isPago ? 'border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-500/5' : 'border-amber-400/40 bg-amber-50/30 dark:bg-amber-500/5'}>
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPago ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                {isPago
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <CreditCard className="w-5 h-5 text-amber-600" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Pagamento da Parcela</p>
                <p className={`text-xs font-medium mt-0.5 ${isPago ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isPago ? 'Pagamento confirmado' : 'Pagamento pendente'}
                </p>
              </div>
              {loadingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>

            {!isPago && (
              <div className="space-y-2">
                {paymentUrl ? (
                  <>
                    <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                        <ExternalLink className="w-4 h-4" />
                        Realizar Pagamento
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleVerifyPayment}
                      disabled={verifyingPayment}
                    >
                      {verifyingPayment
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                        : <><RefreshCw className="w-4 h-4" /> Verificar Pagamento</>}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Após realizar o pagamento, clique em "Verificar Pagamento" para continuar.
                    </p>
                  </>
                ) : loadingPayment ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
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
          </CardContent>
        </Card>

        {/* CNPJ */}
        <Card className={cnpjValido ? 'border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-500/5' : ''}>
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cnpjValido ? 'bg-emerald-500/15' : 'bg-primary/10'}`}>
                {cnpjValido ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <ShieldCheck className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">CNPJ da Empresa</p>
              </div>
              {savingCnpj && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              {cnpjValido && !savingCnpj && <span className="text-[11px] text-emerald-600 font-medium">Salvo</span>}
            </div>
            <Input
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              maxLength={18}
              className="h-12 text-base font-mono tracking-wider"
            />
          </CardContent>
        </Card>

        {/* Certificado Digital */}
        <Card className={savedCertificadoUrl && senhaCertificado.trim() ? 'border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-500/5' : ''}>
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${savedCertificadoUrl && senhaCertificado.trim() ? 'bg-emerald-500/15' : 'bg-primary/10'}`}>
                {savedCertificadoUrl && senhaCertificado.trim() ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <FileCheck className="w-5 h-5 text-primary" />}
              </div>
              <p className="font-semibold text-sm text-foreground flex-1">Certificado Digital</p>
              {uploadingCert && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>
            <FileUploadBox
              file={certificadoFile}
              savedUrl={savedCertificadoUrl}
              uploading={uploadingCert}
              id="cert-file"
              accept=".pfx,.p12,.cer,.crt"
              hint="Formatos: .pfx, .p12, .cer, .crt"
              onChange={(f) => {
                setCertificadoFile(f);
                handleFileChange(f, 'certificado', 'certificado_digital_url', setSavedCertificadoUrl, setUploadingCert);
              }}
            />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Senha do Certificado</Label>
                {savingSenha && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                {senhaCertificado.trim() && !savingSenha && <span className="text-[11px] text-emerald-600 font-medium">Salvo</span>}
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
          </CardContent>
        </Card>

        {/* CNH */}
        <Card className={savedCnhUrl ? 'border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-500/5' : ''}>
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${savedCnhUrl ? 'bg-emerald-500/15' : 'bg-primary/10'}`}>
                {savedCnhUrl ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <IdCard className="w-5 h-5 text-primary" />}
              </div>
              <p className="font-semibold text-sm text-foreground flex-1">CNH</p>
              {uploadingCnh && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>
            <FileUploadBox
              file={cnhFile}
              savedUrl={savedCnhUrl}
              uploading={uploadingCnh}
              id="cnh-file"
              accept="image/*,.pdf"
              hint="Imagem ou PDF da CNH"
              onChange={(f) => {
                setCnhFile(f);
                handleFileChange(f, 'cnh', 'cnh_url', setSavedCnhUrl, setUploadingCnh);
              }}
            />
          </CardContent>
        </Card>

        {/* Procuração */}
        <Card className={savedProcuracaoUrl ? 'border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-500/5' : ''}>
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${savedProcuracaoUrl ? 'bg-emerald-500/15' : 'bg-primary/10'}`}>
                {savedProcuracaoUrl ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-primary" />}
              </div>
              <p className="font-semibold text-sm text-foreground flex-1">Procuração</p>
              {uploadingProc && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>
            <FileUploadBox
              file={procuracaoFile}
              savedUrl={savedProcuracaoUrl}
              uploading={uploadingProc}
              id="proc-file"
              accept=".pdf,.doc,.docx,image/*"
              hint="PDF, DOC ou imagem"
              onChange={(f) => {
                setProcuracaoFile(f);
                handleFileChange(f, 'procuracao', 'procuracao_url', setSavedProcuracaoUrl, setUploadingProc);
              }}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!allFilled || submitting}
          className="w-full h-14 text-base gap-2 rounded-xl"
          size="lg"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Finalizando envio...</>
          ) : allFilled ? (
            <><Send className="w-5 h-5" /> Confirmar e Enviar</>
          ) : !isPago ? (
            <span className="text-sm opacity-80">Realize o pagamento para continuar</span>
          ) : (
            <span className="text-sm opacity-80">{progressPercent}% completo — preencha todos os campos</span>
          )}
        </Button>
      </div>
    </div>
  );
}
