import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, ChevronDown, ChevronRight, Copy, Check, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Endpoint {
  method: 'POST';
  path: string;
  summary: string;
  description: string;
  bodyFields: { name: string; type: string; required: boolean; example: string; description: string }[];
  external?: boolean; // true = URL absoluta (não prefixar com Supabase)
  authType?: 'jwt' | 'apikey'; // default jwt
}

const endpoints: Endpoint[] = [
  {
    method: 'POST',
    path: '/functions/v1/consultar-pedido',
    summary: 'Consultar Pedido',
    description: 'Retorna todos os detalhes de um pedido: investidor, veiculo, pagamento, rastreadores, onboarding e criador.',
    authType: 'apikey',
    bodyFields: [
      { name: 'numero', type: 'string | number', required: true, example: '90', description: 'Numero do pedido (ex: 90 ou PED-2026-0090)' },
    ],
  },
  {
    method: 'POST',
    path: '/functions/v1/consultar-arquivos',
    summary: 'Consultar Arquivos por Locadora',
    description: 'Retorna todos os documentos de investidor_arquivos vinculados a uma locadora_bubble_id.',
    authType: 'apikey',
    bodyFields: [
      { name: 'locadora_bubble_id', type: 'string', required: true, example: '', description: 'ID da locadora no Bubble' },
    ],
  },
  {
    method: 'POST',
    path: '/functions/v1/confirmar-pedido',
    summary: 'Confirmar Pedido',
    description: 'Altera o status de um pedido para CONFIRMADO. Busca pelo numero do pedido. Aceita API key ou JWT.',
    authType: 'apikey',
    bodyFields: [
      { name: 'numero', type: 'string | number', required: true, example: '90', description: 'Numero do pedido (ex: 90 ou PED-2026-0090)' },
    ],
  },
  {
    method: 'POST',
    path: '/functions/v1/finalizar-pedido',
    summary: 'Finalizar Pedido',
    description: 'Altera o status de um pedido para FINALIZADO. Busca pelo numero do pedido. Aceita API key ou JWT.',
    authType: 'apikey',
    bodyFields: [
      { name: 'numero', type: 'string | number', required: true, example: '90', description: 'Numero do pedido (ex: 90 ou PED-2026-0090)' },
    ],
  },
  {
    method: 'POST',
    path: '/functions/v1/receber-veiculo',
    summary: 'Receber Veiculo na Base',
    description: 'Registra a chegada de um veiculo na base. Voucher: registra como pago. PIX: gera cobranca automatica via Asaas (R$990). Idempotente por chassi.',
    authType: 'apikey',
    bodyFields: [
      { name: 'pedido_numero', type: 'string | number', required: true, example: '93', description: 'Numero do pedido (ex: 93 ou PED-2026-0093)' },
      { name: 'chassi', type: 'string', required: true, example: '9C2KC1670PR123456', description: 'Numero do chassi do veiculo' },
      { name: 'data_recebimento', type: 'string (ISO)', required: false, example: '', description: 'Data/hora do recebimento (default: agora)' },
    ],
  },
  {
    method: 'POST',
    path: '/functions/v1/consultar-veiculos-pedido',
    summary: 'Consultar Veiculos do Pedido',
    description: 'Retorna todos os veiculos recebidos de um pedido com resumo (recebidos, pagos, pendentes, faltam receber). Aceita API key ou JWT.',
    authType: 'apikey',
    bodyFields: [
      { name: 'pedido_numero', type: 'string | number', required: true, example: '93', description: 'Numero do pedido (ex: 93 ou PED-2026-0093)' },
    ],
  },
  {
    method: 'POST',
    path: '/functions/v1/webhook-asaas-rastreador',
    summary: 'Webhook Asaas Rastreador',
    description: 'Recebe notificacoes do Asaas (PAYMENT_RECEIVED, PAYMENT_CONFIRMED) e atualiza status do veiculo e pagamento para pago. Sempre retorna 200.',
    authType: 'apikey',
    bodyFields: [
      { name: 'event', type: 'string', required: true, example: 'PAYMENT_RECEIVED', description: 'Evento do Asaas (PAYMENT_RECEIVED ou PAYMENT_CONFIRMED)' },
      { name: 'payment', type: 'object', required: true, example: '{"id":"pay_xxx","status":"RECEIVED"}', description: 'Objeto payment do Asaas com id e status' },
    ],
  },
];

export default function AdminSwaggerPage() {
  const { session } = useAuth();

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">API Explorer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Teste as rotas da API do Portal</p>
      </div>

      <div className="space-y-4">
        {endpoints.map(ep => (
          <EndpointCard key={ep.path} endpoint={ep} token={session?.access_token ?? ''} />
        ))}
      </div>
    </div>
  );
}

function EndpointCard({ endpoint, token }: { endpoint: Endpoint; token: string }) {
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    endpoint.bodyFields.forEach(f => { init[f.name] = f.example; });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: any } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const isApiKey = endpoint.authType === 'apikey';
  const API_KEY = 'sderfgy65434567uyt432wsdtyu90lkjfe32';

  function buildBody() {
    const body: Record<string, unknown> = {};
    endpoint.bodyFields.forEach(f => {
      const v = values[f.name];
      if (!v) return;
      // Try parsing as JSON object first (for nested fields like payment)
      if (v.startsWith('{') || v.startsWith('[')) {
        try { body[f.name] = JSON.parse(v); return; } catch { /* fall through */ }
      }
      body[f.name] = isNaN(Number(v)) ? v : Number(v);
    });
    return body;
  }

  function buildCurl() {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const body = buildBody();

    const url = endpoint.external ? endpoint.path : `${baseUrl}${endpoint.path}`;
    const lines = [`curl -X POST '${url}'`];
    lines.push(`  -H 'Content-Type: application/json'`);
    if (endpoint.external) {
      // no auth headers
    } else if (isApiKey) {
      lines.push(`  -H 'apikey: ${anonKey}'`);
      lines.push(`  -H 'Authorization: Bearer ${anonKey}'`);
      lines.push(`  -H 'x-api-key: ${API_KEY}'`);
    } else {
      lines.push(`  -H 'apikey: ${anonKey}'`);
      lines.push(`  -H 'Authorization: Bearer ${token}'`);
    }
    lines.push(`  -d '${JSON.stringify(body)}'`);
    return lines.join(' \\\n');
  }

  function copyCurl() {
    navigator.clipboard.writeText(buildCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  }

  async function execute() {
    setLoading(true);
    setResponse(null);
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const body = buildBody();

      const url = endpoint.external ? endpoint.path : `${baseUrl}${endpoint.path}`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (endpoint.external) {
        // no auth headers
      } else if (isApiKey) {
        headers['apikey'] = anonKey;
        headers['Authorization'] = `Bearer ${anonKey}`;
        headers['x-api-key'] = API_KEY;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
        headers['apikey'] = anonKey;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setResponse({ status: res.status, body: data });
    } catch (err: any) {
      setResponse({ status: 0, body: { error: err.message } });
    } finally {
      setLoading(false);
    }
  }

  function copyResponse() {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.body, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="bg-card rounded-xl border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
      >
        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 shrink-0">
          {endpoint.method}
        </Badge>
        <code className="text-sm font-mono text-foreground flex-1 truncate">{endpoint.path}</code>
        {isApiKey && (
          <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">
            API KEY
          </Badge>
        )}
        <span className="text-xs text-muted-foreground hidden sm:block">{endpoint.summary}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t">
          {/* Description */}
          <div className="px-5 py-3 bg-muted/10">
            <p className="text-xs text-muted-foreground">{endpoint.description}</p>
          </div>

          {/* Body fields */}
          <div className="px-5 py-4 space-y-3 border-t">
            <p className="text-xs font-bold text-foreground uppercase tracking-widest">Parametros</p>
            {endpoint.bodyFields.map(f => (
              <div key={f.name} className="flex items-start gap-3">
                <div className="w-32 shrink-0 pt-2">
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono font-semibold text-foreground">{f.name}</code>
                    {f.required && <span className="text-[9px] text-red-500 font-bold">*</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.type}</p>
                </div>
                <div className="flex-1">
                  <Input
                    className="h-9 text-sm font-mono"
                    value={values[f.name] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                    placeholder={f.example}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{f.description}</p>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <Button className="gap-2 h-9" disabled={loading} onClick={execute}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {loading ? 'Enviando...' : 'Executar'}
              </Button>
              <Button variant="outline" className="gap-2 h-9" onClick={copyCurl}>
                {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
                {copiedCurl ? 'Copiado!' : 'Copiar cURL'}
              </Button>
            </div>
          </div>

          {/* Response */}
          {response && (
            <div className="border-t">
              <div className="flex items-center justify-between px-5 py-2.5 bg-muted/10">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-foreground uppercase tracking-widest">Resposta</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold',
                      response.status >= 200 && response.status < 300
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-500 border-red-500/30'
                    )}
                  >
                    {response.status}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={copyResponse}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
              <pre className="px-5 py-4 text-xs font-mono text-foreground overflow-x-auto max-h-[500px] overflow-y-auto bg-muted/5 whitespace-pre-wrap break-words">
                {JSON.stringify(response.body, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
