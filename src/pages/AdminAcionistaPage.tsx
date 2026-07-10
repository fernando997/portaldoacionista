import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User, MapPin, FolderOpen, FileText, Upload, Trash2, ExternalLink,
  ArrowLeft, Loader2, Check, Save, Eye, EyeOff,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Investidor {
  id: string;
  nome: string;
  cpf: string | null;
  estado_civil: string | null;
  profissao: string | null;
  email: string | null;
  whatsapp: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  locadora_bubble_id: string | null;
  frota_nome: string | null;
  frota_bubble_id: string | null;
  profile_id: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  group_name: string | null;
  status: string | null;
  participation_percent: number | null;
  total_motos: number | null;
  invested_value: number | null;
}

interface Arquivo {
  id: string;
  investidor_id: string;
  tipo: string;
  nome: string | null;
  file_url: string;
  created_at: string;
  locadora_bubble_id?: string | null;
  senha_certificado?: string | null;
}

interface OnboardingDoc {
  pedidoNum: string;
  razao_social: string | null;
  cnpj: string | null;
  email_corporativo: string | null;
  senha_certificado: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  certificado_digital_url: string | null;
  cnh_url: string | null;
  procuracao_url: string | null;
  assinatura_url: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
      {children}{required && <span className="text-primary ml-0.5">*</span>}
    </label>
  );
}

function SectionTitle({ icon: Icon, children }: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-xs font-bold text-foreground uppercase tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-border ml-1" />
    </div>
  );
}

function SenhaCertificadoField({ value }: { value: string | null }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <FieldLabel>Senha Certificado Digital</FieldLabel>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-medium px-3 py-2 rounded-md bg-muted/30 border border-input">
          {value ? (visible ? value : '••••••••') : 'Nao informado'}
        </p>
        {value && (
          <Button variant="ghost" size="sm" className="h-8 px-2 shrink-0" onClick={() => setVisible(v => !v)}>
            {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

function SenhaCertificadoInline({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span className="text-xs text-muted-foreground">Senha:</span>
      <span className="text-xs font-mono font-medium text-foreground">{visible ? value : '••••••••'}</span>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setVisible(v => !v)}
      >
        {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </button>
    </div>
  );
}

const tipoLabels: Record<string, string> = {
  rg_cnh: 'RG / CNH',
  comprovante_residencia: 'Comprovante de Residencia',
  precontrato: 'Pré Contrato',
  contrato: 'Contrato',
  cnpj: 'CNPJ',
  certificado_digital: 'Certificado Digital',
  cnh: 'CNH',
  procuracao: 'Procuração',
  outro: 'Outro',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminAcionistaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [investidor, setInvestidor] = useState<Investidor | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'documentos'>('dados');

  // Dados form
  const [dadosForm, setDadosForm] = useState<Record<string, string | null>>({});
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Documentos
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loadingArquivos, setLoadingArquivos] = useState(false);
  const [uploadTipo, setUploadTipo] = useState('rg_cnh');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSenha, setUploadSenha] = useState('');
  const [uploadando, setUploadando] = useState(false);
  const [onboardingDocs, setOnboardingDocs] = useState<OnboardingDoc[]>([]);

  // ── Load data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);

    // Try as profile first
    const { data: prof } = await (supabase as any)
      .from('profiles')
      .select('id, name, email, group_name, status, participation_percent, total_motos, invested_value')
      .eq('id', id)
      .maybeSingle();

    if (prof) {
      setProfile(prof);
      setProfileForm({
        group_name: prof.group_name ?? '',
        status: prof.status ?? 'Ativo',
        participation_percent: String(prof.participation_percent ?? 0),
        total_motos: String(prof.total_motos ?? 0),
        invested_value: String(prof.invested_value ?? 0),
      });

      // Look for linked investidor
      let { data: inv } = await (supabase as any)
        .from('investidores')
        .select('*')
        .eq('profile_id', prof.id)
        .maybeSingle();

      // Auto-create if missing
      if (!inv) {
        const { data: newInv } = await (supabase as any)
          .from('investidores')
          .insert({
            nome: prof.name,
            email: prof.email,
            profile_id: prof.id,
            created_by: session?.user?.id,
          })
          .select()
          .single();
        inv = newInv;
      }

      if (inv) {
        setInvestidor(inv);
        setDadosForm({
          nome: inv.nome, cpf: inv.cpf, estado_civil: inv.estado_civil,
          profissao: inv.profissao, whatsapp: inv.whatsapp, email: inv.email,
          rua: inv.rua, numero: inv.numero, bairro: inv.bairro,
          cidade: inv.cidade, estado: inv.estado, cep: inv.cep,
          locadora_bubble_id: inv.locadora_bubble_id,
          frota_nome: inv.frota_nome,
          frota_bubble_id: inv.frota_bubble_id,
        });
        loadArquivos(inv.id);
        loadOnboardingDocs(inv.id, prof.id, inv.nome);
      }
    } else {
      // Try as investidor (pending shareholder)
      const { data: inv } = await (supabase as any)
        .from('investidores')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (inv) {
        setInvestidor(inv);
        setDadosForm({
          nome: inv.nome, cpf: inv.cpf, estado_civil: inv.estado_civil,
          profissao: inv.profissao, whatsapp: inv.whatsapp, email: inv.email,
          rua: inv.rua, numero: inv.numero, bairro: inv.bairro,
          cidade: inv.cidade, estado: inv.estado, cep: inv.cep,
          locadora_bubble_id: inv.locadora_bubble_id,
          frota_nome: inv.frota_nome,
          frota_bubble_id: inv.frota_bubble_id,
        });
        loadArquivos(inv.id);
        loadOnboardingDocs(inv.id, inv.profile_id, inv.nome);

        // If investidor has profile_id, load profile
        if (inv.profile_id) {
          const { data: linkedProf } = await (supabase as any)
            .from('profiles')
            .select('id, name, email, group_name, status, participation_percent, total_motos, invested_value')
            .eq('id', inv.profile_id)
            .maybeSingle();
          if (linkedProf) {
            setProfile(linkedProf);
            setProfileForm({
              group_name: linkedProf.group_name ?? '',
              status: linkedProf.status ?? 'Ativo',
              participation_percent: String(linkedProf.participation_percent ?? 0),
              total_motos: String(linkedProf.total_motos ?? 0),
              invested_value: String(linkedProf.invested_value ?? 0),
            });
          }
        }
      }
    }

    setLoading(false);
  }

  async function loadArquivos(invId: string) {
    setLoadingArquivos(true);
    const { data } = await (supabase as any)
      .from('investidor_arquivos')
      .select('*')
      .eq('investidor_id', invId)
      .order('created_at', { ascending: false });
    setArquivos(data ?? []);
    setLoadingArquivos(false);
  }

  async function loadOnboardingDocs(invId: string, profileId?: string | null, invNome?: string | null) {
    const docs: OnboardingDoc[] = [];
    const seenPedidos = new Set<string>();
    const onbFields = 'pedido_id, razao_social, cnpj, email_corporativo, senha_certificado, cep, rua, numero, complemento, bairro, cidade, estado, certificado_digital_url, cnh_url, procuracao_url, assinatura_url';

    const addOnb = (onb: any) => {
      if (!seenPedidos.has(onb.pedido_id)) {
        docs.push({ pedidoNum: onb.pedido_id, ...onb });
        seenPedidos.add(onb.pedido_id);
      }
    };

    // 1) Via tabela pedidos → onboarding_requests
    const { data: pedidos } = await (supabase as any)
      .from('pedidos')
      .select('id, numero, created_at')
      .eq('investidor_id', invId)
      .order('created_at', { ascending: false });

    if (pedidos && pedidos.length > 0) {
      for (const ped of pedidos) {
        const year = new Date(ped.created_at).getFullYear();
        const pedNum = `PED-${year}-${String(ped.numero).padStart(4, '0')}`;
        const { data: onb } = await (supabase as any)
          .from('onboarding_requests')
          .select(onbFields)
          .eq('pedido_id', pedNum)
          .maybeSingle();
        if (onb) addOnb(onb);
      }
    }

    // 2) Via onboarding_requests.investidor_id (link direto)
    const { data: directByInv } = await (supabase as any)
      .from('onboarding_requests')
      .select(onbFields)
      .eq('investidor_id', invId)
      .order('created_at', { ascending: false });

    if (directByInv) {
      for (const onb of directByInv) addOnb(onb);
    }

    // 3) Fallback: buscar pelo nome do investidor (campo cliente)
    if (docs.length === 0 && invNome) {
      const { data: byCliente } = await (supabase as any)
        .from('onboarding_requests')
        .select(onbFields)
        .eq('cliente', invNome)
        .order('created_at', { ascending: false });

      if (byCliente) {
        for (const onb of byCliente) addOnb(onb);
      }
    }

    // 4) Fallback: buscar pelo created_by (profile_id)
    if (profileId && docs.length === 0) {
      const { data: byCreator } = await (supabase as any)
        .from('onboarding_requests')
        .select(onbFields)
        .eq('created_by', profileId)
        .order('created_at', { ascending: false });

      if (byCreator) {
        for (const onb of byCreator) addOnb(onb);
      }
    }

    setOnboardingDocs(docs);
  }

  // ── CEP lookup ────────────────────────────────────────────────────────────

  async function buscarCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setDadosForm(f => ({
          ...f,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }));
      }
    } catch { /* ignore */ }
    setBuscandoCep(false);
  }

  // ── Save investidor data ──────────────────────────────────────────────────

  async function salvarDados() {
    if (!investidor) return;
    setSalvando(true);

    // Update investidor
    const { error } = await (supabase as any)
      .from('investidores')
      .update({
        nome:         dadosForm.nome         ?? '',
        cpf:          dadosForm.cpf          ?? null,
        estado_civil: dadosForm.estado_civil ?? null,
        profissao:    dadosForm.profissao    ?? null,
        email:        dadosForm.email        ?? null,
        whatsapp:     dadosForm.whatsapp     ?? null,
        rua:          dadosForm.rua          ?? null,
        numero:       dadosForm.numero       ?? null,
        bairro:       dadosForm.bairro       ?? null,
        cidade:       dadosForm.cidade       ?? null,
        estado:       dadosForm.estado       ?? null,
        cep:          dadosForm.cep          ?? null,
        locadora_bubble_id: dadosForm.locadora_bubble_id || null,
      })
      .eq('id', investidor.id);

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      setSalvando(false);
      return;
    }

    // Update profile if exists
    if (profile) {
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          user_id: profile.id,
          group_name: profileForm.group_name,
          status: profileForm.status,
          participation_percent: Number(profileForm.participation_percent) || 0,
          total_motos: Number(profileForm.total_motos) || 0,
          invested_value: Number(profileForm.invested_value) || 0,
        }),
      });
    }

    toast.success('Dados salvos!');
    setSalvando(false);
  }

  // ── Upload / Delete arquivo ───────────────────────────────────────────────

  async function handleUpload() {
    if (!uploadFile || !investidor) return;
    if (uploadTipo === 'certificado_digital' && !uploadSenha.trim()) {
      toast.error('A senha do certificado digital é obrigatória.');
      return;
    }
    setUploadando(true);
    const ext  = uploadFile.name.split('.').pop() ?? 'bin';
    const path = `${investidor.id}/${uploadTipo}/${Date.now()}.${ext}`;
    const { error: storageErr } = await supabase.storage
      .from('investidor-docs')
      .upload(path, uploadFile);
    if (storageErr) {
      toast.error('Erro no upload: ' + storageErr.message);
      setUploadando(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('investidor-docs').getPublicUrl(path);
    const { error } = await (supabase as any).from('investidor_arquivos').insert({
      investidor_id: investidor.id,
      tipo:          uploadTipo,
      nome:          uploadFile.name,
      file_url:      publicUrl,
      created_by:    session?.user?.id,
      locadora_bubble_id: investidor.locadora_bubble_id ?? null,
      senha_certificado: uploadTipo === 'certificado_digital' ? uploadSenha.trim() : null,
    });
    setUploadando(false);
    if (error) {
      toast.error('Erro ao salvar arquivo: ' + error.message);
    } else {
      toast.success('Arquivo enviado!');
      setUploadFile(null);
      setUploadSenha('');
      loadArquivos(investidor.id);
    }
  }

  async function handleDeleteArquivo(arqId: string) {
    await (supabase as any).from('investidor_arquivos').delete().eq('id', arqId);
    if (investidor) loadArquivos(investidor.id);
    toast.success('Arquivo removido.');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!investidor) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" className="gap-2 mb-4" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <p className="text-muted-foreground">Acionista nao encontrado.</p>
      </div>
    );
  }

  const displayName = profile?.name || investidor.nome || 'Sem nome';
  const displayStatus = profile?.status || 'Pendente';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{displayName}</h1>
          <p className="text-sm text-muted-foreground truncate">{investidor.email || profile?.email || ''}</p>
        </div>
        <Badge
          variant="outline"
          className={
            displayStatus === 'Ativo'
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              : displayStatus === 'Inativo'
              ? 'bg-red-500/10 text-red-500 border-red-500/30'
              : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
          }
        >
          {displayStatus}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {(['dados', 'documentos'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'dados' ? 'Dados' : 'Documentos'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dados' && (
        <div className="space-y-6">
          {/* Dados pessoais */}
          <div className="bg-card rounded-xl border p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <SectionTitle icon={User}>Dados pessoais</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <FieldLabel required>Nome completo</FieldLabel>
                <Input value={dadosForm.nome ?? ''} onChange={e => setDadosForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div>
                <FieldLabel>CPF</FieldLabel>
                <Input value={dadosForm.cpf ?? ''} onChange={e => setDadosForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
              </div>
              <div>
                <FieldLabel>Estado civil</FieldLabel>
                <select
                  value={dadosForm.estado_civil ?? ''}
                  onChange={e => setDadosForm(f => ({ ...f, estado_civil: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
                >
                  <option value="">Selecionar</option>
                  {['Solteiro', 'Casado', 'Divorciado', 'Viuvo', 'Uniao Estavel'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Profissao</FieldLabel>
                <Input value={dadosForm.profissao ?? ''} onChange={e => setDadosForm(f => ({ ...f, profissao: e.target.value }))} placeholder="Profissao" />
              </div>
              <div>
                <FieldLabel>WhatsApp</FieldLabel>
                <Input value={dadosForm.whatsapp ?? ''} onChange={e => setDadosForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>E-mail</FieldLabel>
                <Input type="email" value={dadosForm.email ?? ''} onChange={e => setDadosForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>ID Locadora (Bubble)</FieldLabel>
                <Input className="font-mono" value={dadosForm.locadora_bubble_id ?? ''} onChange={e => setDadosForm(f => ({ ...f, locadora_bubble_id: e.target.value }))} placeholder="ID da locadora no Bubble" />
              </div>
              <div>
                <FieldLabel>Frota</FieldLabel>
                <Input value={dadosForm.frota_nome ?? ''} disabled className="disabled:opacity-70 disabled:cursor-default" />
              </div>
              <div>
                <FieldLabel>Frota Unique ID</FieldLabel>
                <Input value={dadosForm.frota_bubble_id ?? ''} disabled className="font-mono disabled:opacity-70 disabled:cursor-default" />
              </div>
            </div>
          </div>

          {/* Endereco */}
          <div className="bg-card rounded-xl border p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <SectionTitle icon={MapPin}>Endereco</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <FieldLabel>CEP</FieldLabel>
                <div className="relative">
                  <Input
                    value={dadosForm.cep ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      setDadosForm(f => ({ ...f, cep: v }));
                      if (v.replace(/\D/g, '').length === 8) buscarCep(v);
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Rua</FieldLabel>
                <Input value={dadosForm.rua ?? ''} onChange={e => setDadosForm(f => ({ ...f, rua: e.target.value }))} placeholder="Nome da rua" />
              </div>
              <div>
                <FieldLabel>Numero</FieldLabel>
                <Input value={dadosForm.numero ?? ''} onChange={e => setDadosForm(f => ({ ...f, numero: e.target.value }))} placeholder="123" />
              </div>
              <div>
                <FieldLabel>Bairro</FieldLabel>
                <Input value={dadosForm.bairro ?? ''} onChange={e => setDadosForm(f => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
              </div>
              <div>
                <FieldLabel>Cidade</FieldLabel>
                <Input value={dadosForm.cidade ?? ''} onChange={e => setDadosForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Cidade" />
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <Input value={dadosForm.estado ?? ''} onChange={e => setDadosForm(f => ({ ...f, estado: e.target.value }))} placeholder="UF" maxLength={2} />
              </div>
            </div>
          </div>

          {/* Dados do Onboarding (CNPJ, Email corporativo, Senha certificado, Endereço) */}
          {onboardingDocs.length > 0 && (
            <div className="bg-card rounded-xl border p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
              <SectionTitle icon={FileText}>Dados da Empresa (Onboarding)</SectionTitle>
              {onboardingDocs.map(doc => (
                <div key={doc.pedidoNum} className="space-y-3">
                  {onboardingDocs.length > 1 && (
                    <p className="text-xs font-bold text-foreground/70 uppercase tracking-wide">{doc.pedidoNum}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <FieldLabel>Razao Social</FieldLabel>
                      <p className="text-sm font-medium px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.razao_social || 'Nao informado'}</p>
                    </div>
                    <div>
                      <FieldLabel>CNPJ</FieldLabel>
                      <p className="text-sm font-medium px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.cnpj || 'Nao informado'}</p>
                    </div>
                    <div>
                      <FieldLabel>E-mail Corporativo</FieldLabel>
                      <p className="text-sm font-medium px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.email_corporativo || 'Nao informado'}</p>
                    </div>
                    <SenhaCertificadoField value={doc.senha_certificado} />
                  </div>
                  <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wide mt-2">Endereço do CNPJ</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>CEP</FieldLabel>
                      <p className="text-sm px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.cep || 'Nao informado'}</p>
                    </div>
                    <div>
                      <FieldLabel>Rua</FieldLabel>
                      <p className="text-sm px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.rua || 'Nao informado'}</p>
                    </div>
                    <div>
                      <FieldLabel>Número</FieldLabel>
                      <p className="text-sm px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.numero || 'Nao informado'}</p>
                    </div>
                    {doc.complemento && (
                      <div>
                        <FieldLabel>Complemento</FieldLabel>
                        <p className="text-sm px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.complemento}</p>
                      </div>
                    )}
                    <div>
                      <FieldLabel>Bairro</FieldLabel>
                      <p className="text-sm px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.bairro || 'Nao informado'}</p>
                    </div>
                    <div>
                      <FieldLabel>Cidade</FieldLabel>
                      <p className="text-sm px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.cidade || 'Nao informado'}</p>
                    </div>
                    <div>
                      <FieldLabel>Estado</FieldLabel>
                      <p className="text-sm px-3 py-2 rounded-md bg-muted/30 border border-input">{doc.estado || 'Nao informado'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Profile data (if linked) */}
          {profile && (
            <div className="bg-card rounded-xl border p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
              <SectionTitle icon={User}>Dados do Portal</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Grupo</FieldLabel>
                  <Input value={profileForm.group_name ?? ''} onChange={e => setProfileForm(f => ({ ...f, group_name: e.target.value }))} placeholder="Nome do grupo" />
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <select
                    value={profileForm.status}
                    onChange={e => setProfileForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Participacao (%)</FieldLabel>
                  <Input type="number" value={profileForm.participation_percent ?? ''} onChange={e => setProfileForm(f => ({ ...f, participation_percent: e.target.value }))} />
                </div>
                <div>
                  <FieldLabel>Total de Motos</FieldLabel>
                  <Input type="number" value={profileForm.total_motos ?? ''} onChange={e => setProfileForm(f => ({ ...f, total_motos: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Valor Investido (R$)</FieldLabel>
                  <Input type="number" value={profileForm.invested_value ?? ''} onChange={e => setProfileForm(f => ({ ...f, invested_value: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <Button
            className="w-full h-11 font-semibold gap-2"
            disabled={!dadosForm.nome || salvando}
            onClick={salvarDados}
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? 'Salvando...' : 'Salvar dados'}
          </Button>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-6">
          {/* Upload */}
          <div className="bg-card rounded-xl border p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <SectionTitle icon={Upload}>Enviar documento</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Tipo</FieldLabel>
                <select
                  value={uploadTipo}
                  onChange={e => { setUploadTipo(e.target.value); setUploadSenha(''); }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-10"
                >
                  <option value="rg_cnh">RG / CNH</option>
                  <option value="comprovante_residencia">Comprovante de Residencia</option>
                  <option value="precontrato">Pré Contrato</option>
                  <option value="contrato">Contrato</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="certificado_digital">Certificado Digital</option>
                  <option value="cnh">CNH</option>
                  <option value="procuracao">Procuração</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <FieldLabel>Arquivo</FieldLabel>
                <label className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 h-10 text-sm hover:bg-muted/20 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-muted-foreground">{uploadFile ? uploadFile.name : 'Selecionar...'}</span>
                  <input type="file" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} accept="image/*,.pdf,.pfx,.p12" />
                </label>
              </div>
            </div>
            {uploadTipo === 'certificado_digital' && (
              <div>
                <FieldLabel required>Senha do certificado</FieldLabel>
                <Input
                  type="text"
                  value={uploadSenha}
                  onChange={e => setUploadSenha(e.target.value)}
                  placeholder="Digite a senha do certificado digital"
                />
              </div>
            )}
            <Button
              size="sm"
              className="gap-2"
              disabled={!uploadFile || uploadando || (uploadTipo === 'certificado_digital' && !uploadSenha.trim())}
              onClick={handleUpload}
            >
              {uploadando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploadando ? 'Enviando...' : 'Enviar arquivo'}
            </Button>
          </div>

          {/* Documentos do investidor (inclui onboarding) */}
          <div className="bg-card rounded-xl border p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <SectionTitle icon={FolderOpen}>Documentos do investidor</SectionTitle>
            {loadingArquivos ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : arquivos.length === 0 && onboardingDocs.every(d => !d.certificado_digital_url && !d.cnh_url && !d.procuracao_url && !d.assinatura_url) ? (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <FolderOpen className="w-10 h-10 opacity-20" />
                <p className="text-sm">Nenhum documento enviado ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {arquivos.map(arq => (
                  <div key={arq.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 px-4 py-3">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{arq.nome ?? 'Documento'}</p>
                      <p className="text-xs text-muted-foreground">{tipoLabels[arq.tipo] ?? arq.tipo}</p>
                      {arq.senha_certificado && (
                        <SenhaCertificadoInline value={arq.senha_certificado} />
                      )}
                    </div>
                    <a href={arq.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteArquivo(arq.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {/* Documentos do onboarding integrados */}
                {onboardingDocs.flatMap(doc =>
                  [
                    { label: 'Certificado Digital', url: doc.certificado_digital_url, pedido: doc.pedidoNum },
                    { label: 'CNH', url: doc.cnh_url, pedido: doc.pedidoNum },
                    { label: 'Procuracao', url: doc.procuracao_url, pedido: doc.pedidoNum },
                    { label: 'Assinatura', url: doc.assinatura_url, pedido: doc.pedidoNum },
                  ].filter(d => d.url)
                ).map(d => (
                  <div key={`${d.pedido}-${d.label}`} className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 px-4 py-3">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.label}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/5 text-primary border-primary/20">Onboarding</Badge>
                        <span className="text-xs text-muted-foreground">{d.pedido}</span>
                      </div>
                    </div>
                    <a href={d.url!} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
