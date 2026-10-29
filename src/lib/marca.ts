import logoModoCorre from '@/assets/logo.png';

// White label: o mesmo portal atende vários domínios. A marca sai do endereço aberto
// (logo, cores, nome, favicon) e, nos domínios de parceiro, só entram os acionistas dele.

type Logo = { src: string; inverter?: boolean }; // inverter = deixa o logo branco (brightness-0 invert)

export type Marca = {
  id: string;
  dominios: string[];            // sem "www."
  nome: string;                  // nome completo: rodapé, "alt" das imagens, fallback do grupo
  nomeCurto: string;             // usado em frases ("Extrato movimentado da sua conta pela …")
  titulo: string;                // aba do navegador
  favicon: string;
  logoFundoEscuro: Logo;         // login e menu lateral
  logoFundoClaro: string;        // cabeçalho no celular e PDF do extrato
  simbolo: Logo;                 // menu lateral recolhido
  tamanhoLogo: { login: string; loginCelular: string; menu: string; recolhido: string };
  selo: string;                  // etiqueta do login
  numeros: { val: string; suffix: string; lbl: string }[]; // vitrine do login (vazio = não mostra)
  emailSuporte: string | null;
  cores: Record<string, string>; // variáveis CSS (HSL sem "hsl()") que mudam em relação ao padrão do index.css
  acesso?: { emails: string[]; grupos: string[]; locadoras: string[] }; // só entram estes acionistas (e-mail de login, id_grupo ou id_locadora)
};

const MODO_CORRE: Marca = {
  id: 'modocorre',
  dominios: ['portalmodocorre.com.br'],
  nome: 'Grupo Modo Corre',
  nomeCurto: 'Modo Corre',
  titulo: 'Modo Corre invest',
  favicon: '/favicon.png',
  logoFundoEscuro: { src: logoModoCorre, inverter: true },
  logoFundoClaro: logoModoCorre,
  simbolo: { src: logoModoCorre, inverter: true },
  tamanhoLogo: { login: 'h-64', loginCelular: 'h-24', menu: 'h-24', recolhido: 'h-14' },
  selo: 'Portal do Licenciado',
  numeros: [
    { val: 'R$11,6M', suffix: '+', lbl: 'Capital gerido' },
    { val: '1K',      suffix: '+', lbl: 'Motos ativas' },
    { val: '100',     suffix: '%', lbl: 'Transparência' },
  ],
  emailSuporte: 'suporte@modocorreinvest.com.br',
  cores: {}, // as da Modo Corre são o padrão do index.css
};

const WISER: Marca = {
  id: 'wiser',
  dominios: ['wiserrentalsmotors.com.br'],
  nome: 'Wiser Rentals Motors',
  nomeCurto: 'Wiser',
  titulo: 'Wiser Rentals Motors · Portal do Investidor',
  favicon: '/marcas/wiser/favicon.png',
  logoFundoEscuro: { src: '/marcas/wiser/logo-fundo-escuro.png' },
  logoFundoClaro: '/marcas/wiser/logo-fundo-claro.png',
  simbolo: { src: '/marcas/wiser/simbolo.png' },
  tamanhoLogo: { login: 'h-40', loginCelular: 'h-16', menu: 'h-20', recolhido: 'w-9 h-auto' },
  selo: 'Portal do Investidor',
  numeros: [],
  emailSuporte: null,
  cores: {
    '--marca': '17 98% 50%',
    '--marca-claro': '20 100% 60%',
    '--marca-medio': '17 98% 54%',
    '--marca-escuro': '15 95% 38%',
    '--marca-gradiente': '15 95% 42%',
    '--marca-fundo-1': '30 6% 10%',
    '--marca-fundo-2': '30 5% 8%',
    '--marca-fundo-3': '30 5% 6%',
    '--marca-fundo-login': '30 6% 5%',
    '--marca-fundo-login-2': '30 5% 11%',
    '--marca-fundo-login-3': '25 8% 16%',
    '--marca-texto-menu': '30 6% 62%',
    '--marca-heroi-1': '30 6% 16%',
    '--marca-heroi-2': '30 5% 12%',
    '--marca-heroi-3': '30 5% 8%',
    '--neutro-1': '30 6% 35%',
    '--neutro-2': '30 6% 22%',
    // tema das páginas: troca o azul-marinho e o verde da Modo Corre
    '--primary': '30 6% 12%',
    '--primary-2': '30 6% 22%',
    '--foreground': '30 8% 12%',
    '--card-foreground': '30 8% 12%',
    '--popover-foreground': '30 8% 12%',
    '--secondary-foreground': '30 8% 12%',
    '--sidebar-background': '30 5% 8%',
    '--sidebar-accent': '30 5% 14%',
    '--sidebar-border': '30 5% 16%',
  },
  acesso: {
    emails: ['69683638000170@modocorreinvest.com.br'], // conta da Wiser (CNPJ 69.683.638/0001-70)
    grupos: [],
    locadoras: [],
  },
};

const MARCAS = [MODO_CORRE, WISER];
const CHAVE_TESTE = 'marca_teste';

function escolherMarca(): Marca {
  const host = window.location.hostname.toLowerCase().replace(/^www\./, '');
  const doDominio = MARCAS.find((m) => m.dominios.includes(host));
  if (doDominio) return doDominio;

  // Para testar sem domínio: localhost e prévias da Vercel aceitam ?marca=wiser (fica salvo; ?marca=modocorre volta)
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) {
    let id = new URLSearchParams(window.location.search).get('marca');
    try {
      if (id) localStorage.setItem(CHAVE_TESTE, id);
      else id = localStorage.getItem(CHAVE_TESTE);
    } catch { /* navegador sem localStorage */ }
    const teste = MARCAS.find((m) => m.id === id);
    if (teste) return teste;
  }
  return MODO_CORRE;
}

export const marca = escolherMarca();

// Aplica cores, título e favicon antes de a tela aparecer (chamado no main.tsx).
export function aplicarMarca() {
  const raiz = document.documentElement.style;
  for (const [nome, valor] of Object.entries(marca.cores)) raiz.setProperty(nome, valor);
  const destaque = marca.cores['--marca'];
  if (destaque) for (const v of ['--accent', '--ring', '--sidebar-primary', '--sidebar-ring']) raiz.setProperty(v, destaque);

  document.title = marca.titulo;
  const icone = document.createElement('link');
  icone.rel = 'icon';
  icone.type = 'image/png';
  icone.href = marca.favicon;
  document.head.appendChild(icone);
}

// No domínio de parceiro, só entram os acionistas dele (equipe interna usa o portal da Modo Corre).
export function podeEntrarNaMarca(interno: boolean, acionista: { idGrupo: string; idLocadora: string }, email: string) {
  if (!marca.acesso) return true;
  if (interno) return false;
  const { emails, grupos, locadoras } = marca.acesso;
  return (!!email && emails.includes(email.trim().toLowerCase()))
    || (!!acionista.idGrupo && grupos.includes(acionista.idGrupo))
    || (!!acionista.idLocadora && locadoras.includes(acionista.idLocadora));
}

// Quem foi barrado é deslogado; a mensagem atravessa o logout e aparece uma vez no login.
const CHAVE_AVISO = 'aviso_acesso';
export function guardarAvisoAcesso() {
  try { sessionStorage.setItem(CHAVE_AVISO, 'Este acesso não pertence a este portal.'); } catch { /* sem sessionStorage */ }
}
export function lerAvisoAcesso() {
  try {
    const aviso = sessionStorage.getItem(CHAVE_AVISO) ?? '';
    sessionStorage.removeItem(CHAVE_AVISO);
    return aviso;
  } catch {
    return '';
  }
}

// Nome do grupo que aparece para o acionista: no domínio de parceiro, nada de "Modo Corre".
export function grupoVisivel(grupo: string) {
  if (!grupo || (marca.id !== 'modocorre' && /modo\s*corre/i.test(grupo))) return marca.nome;
  return grupo;
}

export const classeLogo = (l: Logo) => (l.inverter ? 'brightness-0 invert' : '');
