export const PERMISSION_KEYS = [
  'acionistas', 'equipe', 'cadastrar', 'cadastrar_visualizador',
  'cadastrar_admin', 'pedidos', 'onboarding', 'financeiro',
  'veiculos', 'sac', 'documentos', 'api', 'acionista_detalhe',
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  acionistas: 'Ver Acionistas',
  equipe: 'Equipe Interna',
  cadastrar: 'Cadastrar Acionista',
  cadastrar_visualizador: 'Cadastrar Visualizador',
  cadastrar_admin: 'Cadastrar Membro',
  pedidos: 'Pedidos',
  onboarding: 'Onboarding',
  financeiro: 'Cobranças / Financeiro',
  veiculos: 'Veículos Recebidos',
  sac: 'SAC',
  documentos: 'Documentos',
  api: 'API Explorer',
  acionista_detalhe: 'Detalhe do Acionista',
};

export const FULL_ACCESS_ROLES = ['superadmin', 'admin'];

export const DEFAULT_PERMISSIONS: Record<string, PermissionKey[]> = {
  viewer:   ['acionistas', 'documentos', 'acionista_detalhe'],
  vendedor: ['acionistas', 'documentos', 'pedidos', 'onboarding', 'financeiro', 'acionista_detalhe'],
  sac:      ['acionistas', 'documentos', 'onboarding', 'sac', 'veiculos', 'acionista_detalhe'],
  suporte:  ['documentos', 'sac', 'veiculos'],
};

export function resolvePermissions(role: string, overrides: PermissionKey[]): Set<PermissionKey> {
  if (FULL_ACCESS_ROLES.includes(role)) return new Set(PERMISSION_KEYS);
  const defaults = DEFAULT_PERMISSIONS[role] || [];
  return new Set([...defaults, ...overrides]);
}
