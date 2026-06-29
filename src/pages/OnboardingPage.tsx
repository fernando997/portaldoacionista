import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Upload, CheckCircle2, FileText, AlertCircle,
  ShieldCheck, IdCard, FileCheck, Send, Eye, EyeOff, Cloud,
  CreditCard, ExternalLink, RefreshCw, Clock, Mail, Landmark,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
                <p className="text-xs text-muted-foreground mt-0.5">Enviando arquivo...</p>
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
  const [clienteNome, setClienteNome] = useState('');

  const [currentStep, setCurrentStep] = useState(0);

  const [cnpj, setCnpj] = useState('');
  const [senhaCertificado, setSenhaCertificado] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [procuracaoFile, setProcuracaoFile] = useState<File | null>(null);

  const [savedCertificadoUrl, setSavedCertificadoUrl] = useState<string | null>(null);
  const [savedCnhUrl, setSavedCnhUrl] = useState<string | null>(null);
  const [savedProcuracaoUrl, setSavedProcuracaoUrl] = useState<string | null>(null);

  // Endereco
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);

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

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [creatingEmail, setCreatingEmail] = useState(false);
  const [emailCriado, setEmailCriado] = useState<string | null>(null);

  // Conta Asaas
  const [asaasPixAuto, setAsaasPixAuto] = useState(true);
  const [asaasWebhookVencimento, setAsaasWebhookVencimento] = useState(true);
  const [asaasWebhookPagamento, setAsaasWebhookPagamento] = useState(true);
  const [asaasWebhookTransferencia, setAsaasWebhookTransferencia] = useState(true);
  const [asaasConfirmado, setAsaasConfirmado] = useState(false);
  const [savingAsaas, setSavingAsaas] = useState(false);

  const cnpjTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const senhaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enderecoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftKey = token ? `ob_draft_${token}` : null;

  // Persiste CNPJ e senha no localStorage sempre que mudam
  useEffect(() => {
    if (!draftKey || loading) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ cnpj, senhaCertificado }));
    } catch {}
  }, [cnpj, senhaCertificado, draftKey, loading]);

  const formatCnpj = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  async function buscarCep(cepValue: string) {
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setRua(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
      }
    } catch {}
    setBuscandoCep(false);
  }

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
        if ((data as any).cliente) setClienteNome((data as any).cliente);
        if (data.certificado_digital_url) setSavedCertificadoUrl(data.certificado_digital_url);
        if (data.cnh_url) setSavedCnhUrl(data.cnh_url);
        if (data.procuracao_url) setSavedProcuracaoUrl(data.procuracao_url);
        if ((data as any).payment_url) {
          setPaymentUrl((data as any).payment_url);
          setPaymentStatus((data as any).payment_status ?? 'GERADO');
          if ((data as any).payment_descricao) setPaymentDescricao((data as any).payment_descricao);
        }

        // Email criado — se já existe, iniciar no passo 2 (Asaas)
        if ((data as any).email_corporativo) {
          setEmailCriado((data as any).email_corporativo);
          setCurrentStep(1);
        }

        // Asaas config — restaurar checkboxes e estado de confirmação
        if ((data as any).asaas_config) {
          const cfg = (data as any).asaas_config;
          if (cfg.pixAuto !== undefined) setAsaasPixAuto(cfg.pixAuto);
          if (cfg.webhookVencido !== undefined) setAsaasWebhookVencimento(cfg.webhookVencido);
          if (cfg.webhookPagamento !== undefined) setAsaasWebhookPagamento(cfg.webhookPagamento);
          if (cfg.webhookTransferencia !== undefined) setAsaasWebhookTransferencia(cfg.webhookTransferencia);
          setAsaasConfirmado(true);
        }

        // Endereco
        if ((data as any).cep) setCep((data as any).cep);
        if ((data as any).rua) setRua((data as any).rua);
        if ((data as any).numero) setNumeroCasa((data as any).numero);
        if ((data as any).complemento) setComplemento((data as any).complemento);
        if ((data as any).bairro) setBairro((data as any).bairro);
        if ((data as any).cidade) setCidade((data as any).cidade);
        if ((data as any).estado) setEstado((data as any).estado);

        // Carrega CNPJ e senha: DB tem prioridade, localStorage é fallback
        const dKey = `ob_draft_${token}`;
        let draftCnpj = '';
        let draftSenha = '';
        try {
          const raw = localStorage.getItem(dKey);
          if (raw) { const d = JSON.parse(raw); draftCnpj = d.cnpj || ''; draftSenha = d.senhaCertificado || ''; }
        } catch {}
        setCnpj(data.cnpj || draftCnpj);
        setSenhaCertificado(data.senha_certificado || draftSenha);

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

  // Auto-save CNPJ
  useEffect(() => {
    if (!requestId || !cnpj.trim()) return;
    if (cnpjTimerRef.current) clearTimeout(cnpjTimerRef.current);
    cnpjTimerRef.current = setTimeout(async () => {
      setSavingCnpj(true);
      const { error } = await supabase.from('onboarding_requests').update({ cnpj }).eq('id', requestId);
      if (error) toast.error('Erro ao salvar CNPJ: ' + error.message);
      setSavingCnpj(false);
    }, 1000);
    return () => { if (cnpjTimerRef.current) clearTimeout(cnpjTimerRef.current); };
  }, [cnpj, requestId]);

  // Auto-save senha
  useEffect(() => {
    if (!requestId || !senhaCertificado.trim()) return;
    if (senhaTimerRef.current) clearTimeout(senhaTimerRef.current);
    senhaTimerRef.current = setTimeout(async () => {
      setSavingSenha(true);
      const { error } = await supabase.from('onboarding_requests').update({ senha_certificado: senhaCertificado.trim() }).eq('id', requestId);
      if (error) toast.error('Erro ao salvar senha: ' + error.message);
      setSavingSenha(false);
    }, 1000);
    return () => { if (senhaTimerRef.current) clearTimeout(senhaTimerRef.current); };
  }, [senhaCertificado, requestId]);

  // Auto-save endereco
  useEffect(() => {
    if (!requestId) return;
    if (!cep && !rua && !numeroCasa && !complemento && !bairro && !cidade && !estado) return;
    if (enderecoTimerRef.current) clearTimeout(enderecoTimerRef.current);
    enderecoTimerRef.current = setTimeout(async () => {
      await supabase.from('onboarding_requests')
        .update({ cep, rua, numero: numeroCasa, complemento, bairro, cidade, estado } as any)
        .eq('id', requestId);
    }, 1000);
    return () => { if (enderecoTimerRef.current) clearTimeout(enderecoTimerRef.current); };
  }, [cep, rua, numeroCasa, complemento, bairro, cidade, estado, requestId]);

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
      const { error: dbError } = await supabase
        .from('onboarding_requests')
        .update({ [dbField]: url })
        .eq('id', requestId);
      if (dbError) throw dbError;
      setSaved(url);
      toast.success('Arquivo salvo!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || ''));
    } finally {
      setUploading(false);
    }
  };

  const handleCreateEmail = async () => {
    setCreatingEmail(true);
    const digits = cnpj.replace(/\D/g, '');
    const fallbackEmail = `${digits}@modocorreinvest.com.br`;

    // Monta URL da Edge Function via fetch direto (para controle total da resposta)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dmcsfceqxffajewahjgj.supabase.co';
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const fnUrl = `${supabaseUrl}/functions/v1/criar-email-cpanel`;
    const payload = { cnpj };

    // Loga curl equivalente para debug
    console.log(`[criar-email] curl -X POST "${fnUrl}" -H "Content-Type: application/json" -H "Authorization: Bearer ${supabaseKey}" -d '${JSON.stringify(payload)}'`);

    try {
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      console.log('[criar-email] response:', res.status, body);

      if (!res.ok || body.error) {
        const msg = body.error || `HTTP ${res.status}`;
        // Se o email já existe no cPanel, tratar como sucesso
        if (msg.includes('already') || msg.includes('já exist')) {
          const email = body.email || fallbackEmail;
          setEmailCriado(email);
          await supabase.from('onboarding_requests')
            .update({ email_corporativo: email } as any)
            .eq('id', requestId);
          toast.info(`E-mail já existia: ${email}`);
          setShowEmailDialog(false);
          setCurrentStep(1);
          return;
        }
        throw new Error(msg);
      }

      const email = body.email || fallbackEmail;
      setEmailCriado(email);

      await supabase.from('onboarding_requests')
        .update({ email_corporativo: email } as any)
        .eq('id', requestId);

      toast.success(`E-mail criado: ${email}`);
      setShowEmailDialog(false);
      setCurrentStep(1);
    } catch (err: any) {
      console.error('[handleCreateEmail]', err);
      toast.error('Erro ao criar e-mail: ' + (err.message || ''));
    } finally {
      setCreatingEmail(false);
    }
  };

  const isPago = paymentStatus?.toUpperCase() === 'PAGO';

  const steps = [
    { id: 'dados',   done: cnpjValido && cep.replace(/\D/g, '').length === 8 && rua.trim() !== '' && cidade.trim() !== '' },
    { id: 'asaas',   done: asaasConfirmado },
    { id: 'cert',    done: !!(savedCertificadoUrl || certificadoFile) && senhaCertificado.trim().length > 0 },
    { id: 'cnh',     done: !!(savedCnhUrl || cnhFile) },
    { id: 'proc',    done: !!(savedProcuracaoUrl || procuracaoFile) },
    { id: 'payment', done: isPago },
  ];

  const stepLabels = ['Dados', 'Conta Asaas', 'Certificado', 'CNH', 'Procuração', 'Pagamento'];
  const stepIcons = [ShieldCheck, Landmark, FileCheck, IdCard, FileText, CreditCard];

  const progressPercent = useMemo(() => Math.round((steps.filter(s => s.done).length / 6) * 100), [
    cnpjValido, cep, rua, cidade, emailCriado, asaasConfirmado, savedCertificadoUrl, certificadoFile, senhaCertificado,
    savedCnhUrl, cnhFile, savedProcuracaoUrl, procuracaoFile, isPago,
  ]);

  const docsFilled = steps.slice(0, 5).every(s => s.done);

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

  /* ── Render helpers por etapa ── */

  function renderStepDados() {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-semibold">CNPJ da Empresa</Label>
          <Input
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            maxLength={18}
            className="h-12 text-base font-mono tracking-wider mt-1.5"
          />
          {savingCnpj && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</p>}
        </div>

        {emailCriado && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-600 font-medium">E-mail corporativo criado</p>
              <p className="text-sm font-mono font-semibold text-emerald-700 truncate">{emailCriado}</p>
            </div>
          </div>
        )}

        {cnpjValido && (
          <>
            <div>
              <Label className="text-sm font-semibold">CEP</Label>
              <div className="relative mt-1.5">
                <Input
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                      .replace(/^(\d{5})(\d)/, '$1-$2');
                    setCep(v);
                    if (v.replace(/\D/g, '').length === 8) buscarCep(v);
                  }}
                  maxLength={9}
                  className="h-12 text-base font-mono tracking-wider"
                />
                {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
            </div>

            {(rua || cidade) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-sm font-semibold">Rua</Label>
                  <Input value={rua} onChange={(e) => setRua(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Numero</Label>
                  <Input value={numeroCasa} onChange={(e) => setNumeroCasa(e.target.value)} placeholder="123" className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Complemento</Label>
                  <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, sala..." className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Bairro</Label>
                  <Input value={bairro} onChange={(e) => setBairro(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Cidade</Label>
                  <Input value={cidade} onChange={(e) => setCidade(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Estado</Label>
                  <Input value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} placeholder="UF" className="mt-1.5" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function renderStepAsaas() {
    const cnpjFormatado = cnpj || cnpj.replace(/\D/g, '');
    const enderecoCompleto = [rua, numeroCasa, complemento, bairro, cidade, estado ? `${estado}` : '', cep]
      .filter(Boolean).join(', ');

    return (
      <div className="space-y-4">
        <div className="bg-muted/40 rounded-xl border border-border p-4 space-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CNPJ</p>
            <p className="text-sm font-mono font-semibold text-foreground">{cnpjFormatado}</p>
          </div>
          {emailCriado && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">E-mail Corporativo</p>
              <p className="text-sm font-mono font-semibold text-foreground">{emailCriado}</p>
            </div>
          )}
          {enderecoCompleto && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Endereço</p>
              <p className="text-sm text-foreground">{enderecoCompleto}</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Configurações da Conta</p>
          <div className="space-y-2.5">
            <label className={cn('flex items-center gap-2.5', asaasConfirmado ? 'cursor-default opacity-70' : 'cursor-pointer')}>
              <Checkbox checked={asaasWebhookVencimento} onCheckedChange={(v) => setAsaasWebhookVencimento(!!v)} disabled={asaasConfirmado} />
              <span className="text-sm text-foreground">Ativar webhook de vencimento</span>
            </label>
            <label className={cn('flex items-center gap-2.5', asaasConfirmado ? 'cursor-default opacity-70' : 'cursor-pointer')}>
              <Checkbox checked={asaasWebhookPagamento} onCheckedChange={(v) => setAsaasWebhookPagamento(!!v)} disabled={asaasConfirmado} />
              <span className="text-sm text-foreground">Ativar webhook de pagamento</span>
            </label>
            <label className={cn('flex items-center gap-2.5', asaasConfirmado ? 'cursor-default opacity-70' : 'cursor-pointer')}>
              <Checkbox checked={asaasWebhookTransferencia} onCheckedChange={(v) => setAsaasWebhookTransferencia(!!v)} disabled={asaasConfirmado} />
              <span className="text-sm text-foreground">Ativar webhook de transferência concluída</span>
            </label>
          </div>
        </div>

        {asaasConfirmado ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-sm font-semibold text-emerald-700">Configurações confirmadas</p>
          </div>
        ) : (
          <Button
            onClick={async () => {
              setSavingAsaas(true);
              const config = {
                pixAuto: asaasPixAuto,
                webhookVencido: asaasWebhookVencimento,
                webhookPagamento: asaasWebhookPagamento,
                webhookTransferencia: asaasWebhookTransferencia,
              };
              const { error } = await supabase.from('onboarding_requests')
                .update({ asaas_config: config } as any)
                .eq('id', requestId);
              if (error) {
                toast.error('Erro ao salvar configurações: ' + error.message);
              } else {
                setAsaasConfirmado(true);
                toast.success('Configurações da conta Asaas confirmadas!');
              }
              setSavingAsaas(false);
            }}
            disabled={savingAsaas}
            className="w-full h-11 rounded-xl font-semibold gradient-accent shadow-lg shadow-accent/20 gap-2"
          >
            {savingAsaas ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <><Landmark className="w-4 h-4" /> Confirmar e Criar Conta</>
            )}
          </Button>
        )}
      </div>
    );
  }

  function renderStepCertificado() {
    return (
      <div className="space-y-4">
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
      </div>
    );
  }

  function renderStepCnh() {
    return (
      <FileUploadBox
        file={cnhFile} savedUrl={savedCnhUrl} uploading={uploadingCnh}
        id="cnh-file" accept="image/*,.pdf" hint="Imagem ou PDF da CNH"
        onChange={(f) => { setCnhFile(f); handleFileChange(f, 'cnh', 'cnh_url', setSavedCnhUrl, setUploadingCnh); }}
      />
    );
  }

  function renderStepProcuracao() {
    return (
      <FileUploadBox
        file={procuracaoFile} savedUrl={savedProcuracaoUrl} uploading={uploadingProc}
        id="proc-file" accept=".pdf,.doc,.docx,image/*" hint="PDF, DOC ou imagem"
        onChange={(f) => { setProcuracaoFile(f); handleFileChange(f, 'procuracao', 'procuracao_url', setSavedProcuracaoUrl, setUploadingProc); }}
      />
    );
  }

  function renderStepPagamento() {
    return (
      <div className="space-y-4">
        {paymentDescricao && (
          <p className="text-sm font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border">
            {paymentDescricao}
          </p>
        )}

        {isPago ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <p className="text-sm font-semibold text-emerald-700">Pagamento confirmado!</p>
          </div>
        ) : (
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
    );
  }

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

  const CurrentStepIcon = stepIcons[currentStep];

  /* ── Formulário principal ── */
  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)] flex flex-col">

      {/* Header */}
      <div className="bg-gradient-to-r from-[hsl(220,60%,14%)] to-[hsl(220,60%,20%)] sticky top-0 z-10 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={logo} alt="Modo Corre" className="h-[7.5rem] w-auto object-contain brightness-0 invert" />
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Pedido</p>
            <p className="text-sm font-bold text-white/90">{clienteNome || pedidoId}</p>
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
                <button
                  type="button"
                  onClick={() => {
                    if (i === 0 && emailCriado) return;
                    setCurrentStep(i);
                  }}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300',
                    s.done ? 'bg-emerald-500 text-white shadow-sm' :
                    i === currentStep ? 'bg-primary text-white shadow-md ring-2 ring-primary/30 scale-110' :
                    'bg-muted text-muted-foreground',
                  )}
                >
                  {s.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </button>
                {i < steps.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-1 rounded-full transition-all duration-500', s.done ? 'bg-emerald-400' : 'bg-border')} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex-1 text-center">
                <span className={cn(
                  'text-[9px] font-medium leading-none',
                  i === currentStep ? 'text-primary font-bold' : 'text-muted-foreground',
                )}>{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{steps.filter(s => s.done).length} de 6 etapas concluídas</span>
            <span className={cn('text-xs font-bold', progressPercent === 100 ? 'text-emerald-600' : 'text-foreground')}>{progressPercent}%</span>
          </div>
        </div>

        {/* Current step card */}
        <div className={cn(
          'bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300',
          steps[currentStep].done ? 'border-emerald-400/40' : 'border-border',
        )}>
          <div className={cn('h-1 w-full', steps[currentStep].done ? 'bg-emerald-500' : 'bg-border')} />
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold',
                steps[currentStep].done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/8 text-primary',
              )}>
                {steps[currentStep].done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <CurrentStepIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Etapa {currentStep + 1}</span>
                </div>
                <p className="font-semibold text-sm text-foreground leading-tight">
                  {currentStep === 0 && 'Dados da Empresa'}
                  {currentStep === 1 && 'Conta Asaas'}
                  {currentStep === 2 && 'Certificado Digital'}
                  {currentStep === 3 && 'CNH'}
                  {currentStep === 4 && 'Procuração'}
                  {currentStep === 5 && 'Pagamento referente a rastreadores'}
                </p>
              </div>
              <div className="shrink-0">
                {steps[currentStep].done ? (
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Concluído
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Pendente
                  </span>
                )}
              </div>
            </div>

            {/* Step content */}
            {currentStep === 0 && renderStepDados()}
            {currentStep === 1 && renderStepAsaas()}
            {currentStep === 2 && renderStepCertificado()}
            {currentStep === 3 && renderStepCnh()}
            {currentStep === 4 && renderStepProcuracao()}
            {currentStep === 5 && renderStepPagamento()}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {currentStep > 0 && !(currentStep === 1 && emailCriado) && (
            <Button variant="outline" onClick={() => setCurrentStep(s => s - 1)} className="h-12 px-6 rounded-xl">
              Voltar
            </Button>
          )}
          {currentStep < 5 ? (
            <Button
              onClick={() => {
                if (currentStep === 0 && !emailCriado) {
                  setShowEmailDialog(true);
                } else {
                  setCurrentStep(s => s + 1);
                }
              }}
              disabled={!steps[currentStep].done}
              className={cn(
                'flex-1 h-12 rounded-xl font-semibold transition-all duration-300',
                steps[currentStep].done ? 'gradient-accent shadow-lg shadow-accent/20' : 'opacity-50',
              )}
            >
              {currentStep === 0 ? 'Salvar e Avançar' : 'Avançar'}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!docsFilled || submitting}
              className={cn(
                'flex-1 h-14 text-base gap-2 rounded-2xl font-semibold transition-all duration-300',
                docsFilled && !submitting ? 'gradient-accent shadow-lg shadow-accent/20 hover:-translate-y-0.5' : 'opacity-50 cursor-not-allowed',
              )}
              size="lg"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Finalizando envio...</>
              ) : (
                <><Send className="w-5 h-5" /> Confirmar e Enviar</>
              )}
            </Button>
          )}
        </div>

      </div>

      {/* Dialog de confirmacao de criacao de email */}
      <AlertDialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Criacao de E-mail Corporativo
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                Ao confirmar, sera criado um e-mail corporativo para sua empresa:
              </span>
              <span className="block font-mono font-semibold text-foreground bg-muted px-3 py-2 rounded-lg text-sm">
                {cnpj.replace(/\D/g, '')}@modocorreinvest.com.br
              </span>
              <span className="block text-xs text-muted-foreground">
                Este e-mail sera utilizado para comunicacoes referentes ao seu cadastro.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creatingEmail}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateEmail} disabled={creatingEmail}>
              {creatingEmail ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Criando...</>
              ) : (
                'Confirmar e Criar E-mail'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
