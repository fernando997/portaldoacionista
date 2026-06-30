import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { PermissionKey, resolvePermissions } from '@/lib/permissions';

export type UserRole = 'shareholder' | 'admin' | 'viewer' | 'superadmin' | 'vendedor' | 'sac' | 'suporte' | null;

export const INTERNAL_ROLES: UserRole[] = ['superadmin', 'admin', 'viewer', 'vendedor', 'sac', 'suporte'];

export interface Shareholder {
  id: string;
  user_id: string;
  name: string;
  email: string;
  group: string;
  idGrupo: string;
  idLocadora: string;
  idPedido: string;
  participationPercent: number;
  totalMotos: number;
  investedValue: number;
  status: 'Ativo' | 'Inativo';
  internalRole?: string; // definido somente para equipe interna
}

export interface PendingShareholder {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  whatsapp: string | null;
  created_at: string;
}

export interface OnboardingStatus {
  cnpj: string | null;
  cep: string | null;
  rua: string | null;
  asaas_config: { accountCreated?: boolean } | null;
  certificado_digital_url: string | null;
  senha_certificado: string | null;
  cnh_url: string | null;
  procuracao_url: string | null;
  assinatura_url: string | null;
}

const INTERNAL_DB_ROLES = ['admin', 'superadmin', 'moderator', 'vendedor', 'sac', 'suporte'];

interface AuthContextType {
  role: UserRole;
  currentShareholder: Shareholder;
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  shareholders: Shareholder[];
  pendingShareholders: PendingShareholder[];
  addShareholder: (s: Shareholder) => void;
  viewAs: (id: string) => void;
  isImpersonating: boolean;
  returnToAdmin: () => void;
  onboardingPending: boolean;
  onboardingData: OnboardingStatus | null;
  permissions: Set<PermissionKey>;
  hasPermission: (key: PermissionKey) => boolean;
}

const defaultShareholder: Shareholder = {
  id: '',
  user_id: '',
  name: '',
  email: '',
  group: 'Grupo Modo Corre',
  idGrupo: '',
  idLocadora: '',
  idPedido: '',
  participationPercent: 0,
  totalMotos: 0,
  investedValue: 0,
  status: 'Ativo',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentShareholder, setCurrentShareholder] = useState<Shareholder>(defaultShareholder);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [pendingShareholders, setPendingShareholders] = useState<PendingShareholder[]>([]);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const isImpersonatingRef = useRef(false);
  const [adminSnapshot, setAdminSnapshot] = useState<Shareholder | null>(null);
  const [onboardingPending, setOnboardingPending] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingStatus | null>(null);
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());

  const hasPermission = (key: PermissionKey): boolean => permissions.has(key);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Não recarrega dados se estiver em modo impersonação (evita reset ao renovar token)
        if (isImpersonatingRef.current) return;
        // Fetch profile and role using setTimeout to avoid deadlock
        setTimeout(async () => {
          await loadUserData(session.user.id);
          setLoading(false);
        }, 0);
      } else {
        setRole(null);
        setCurrentShareholder(defaultShareholder);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    // Fetch profile — maybeSingle evita o erro 406 quando o perfil não existe
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile) {
      setCurrentShareholder({
        id: profile.id,
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email || '',
        group: profile.group_name || 'Grupo Modo Corre',
        idGrupo: profile.id_grupo || '',
        idLocadora: profile.id_locadora || '',
        idPedido: (profile as any).id_pedido || '',
        participationPercent: Number(profile.participation_percent) || 0,
        totalMotos: profile.total_motos || 0,
        investedValue: Number(profile.invested_value) || 0,
        status: (profile.status as 'Ativo' | 'Inativo') || 'Ativo',
      });
    }

    // Fetch role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    let determinedRole: UserRole = 'shareholder';
    if (roles && roles.some(r => r.role === 'superadmin')) {
      determinedRole = 'superadmin';
    } else if (roles && roles.some(r => r.role === 'admin')) {
      determinedRole = 'admin';
    } else if (roles && roles.some(r => r.role === 'moderator')) {
      determinedRole = 'viewer';
    } else if (roles && roles.some(r => r.role === 'vendedor')) {
      determinedRole = 'vendedor';
    } else if (roles && roles.some(r => r.role === 'sac')) {
      determinedRole = 'sac';
    } else if (roles && roles.some(r => r.role === 'suporte')) {
      determinedRole = 'suporte';
    }
    setRole(determinedRole);

    // Load user permission overrides and resolve final permissions
    if (determinedRole && determinedRole !== 'shareholder') {
      let overrides: PermissionKey[] = [];
      try {
        const { data: perms } = await (supabase as any)
          .from('user_permissions')
          .select('permission')
          .eq('user_id', userId)
          .eq('granted', true);
        overrides = (perms || []).map((p: any) => p.permission as PermissionKey);
      } catch {
        // table may not exist yet
      }
      setPermissions(resolvePermissions(determinedRole, overrides));
    }

    const internalDbRoles = ['admin', 'superadmin', 'moderator', 'vendedor', 'sac', 'suporte'];

    // Check onboarding pending for shareholders
    if (!roles?.some(r => internalDbRoles.includes(r.role))) {
      try {
        const { data: inv } = await (supabase as any)
          .from('investidores')
          .select('id')
          .eq('profile_id', profile?.id)
          .maybeSingle();

        if (inv) {
          const { data: pedidos } = await (supabase as any)
            .from('pedidos')
            .select('numero, created_at')
            .eq('investidor_id', inv.id)
            .eq('tipo_investidor', 'novo');

          if (pedidos && pedidos.length > 0) {
            const buildPedNum = (numero: number, createdAt: string) => {
              const year = new Date(createdAt).getFullYear();
              return `PED-${year}-${String(numero).padStart(4, '0')}`;
            };
            const pedidoIds = pedidos.map((p: any) => buildPedNum(p.numero, p.created_at));
            const { data: onbs } = await (supabase as any)
              .from('onboarding_requests')
              .select('status, cnpj, cep, rua, asaas_config, certificado_digital_url, senha_certificado, cnh_url, procuracao_url, assinatura_url')
              .in('pedido_id', pedidoIds)
              .eq('status', 'pendente');
            const pendingOnb = (onbs ?? []).length > 0;
            setOnboardingPending(pendingOnb);
            if (pendingOnb && onbs[0]) {
              setOnboardingData(onbs[0] as OnboardingStatus);
            }
          }
        }
      } catch {
        // silently fail
      }
    }

    // Load all shareholders if internal user
    if (roles && roles.some(r => internalDbRoles.includes(r.role))) {
      const [{ data: allProfiles }, { data: allRoles }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const { data: pendingInv } = await (supabase as any)
        .from('investidores')
        .select('id, nome, cpf, email, whatsapp, created_at')
        .is('profile_id', null);
      setPendingShareholders((pendingInv ?? []) as PendingShareholder[]);

      if (allProfiles) {
        setShareholders(allProfiles.map(p => {
          const profileRoles = (allRoles || []).filter(r => r.user_id === p.user_id).map(r => r.role);
          const internalRole = profileRoles.find(r => INTERNAL_DB_ROLES.includes(r));
          return {
            id: p.id,
            user_id: p.user_id,
            name: p.name,
            email: p.email || '',
            group: p.group_name || 'Grupo Modo Corre',
            idGrupo: p.id_grupo || '',
            idLocadora: p.id_locadora || '',
            idPedido: (p as any).id_pedido || '',
            participationPercent: Number(p.participation_percent) || 0,
            totalMotos: p.total_motos || 0,
            investedValue: Number(p.invested_value) || 0,
            status: (p.status as 'Ativo' | 'Inativo') || 'Ativo',
            internalRole: internalRole,
          };
        }));
      }
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    setSession(null);
    setCurrentShareholder(defaultShareholder);
    setShareholders([]);
  };

  const addShareholder = (s: Shareholder) => setShareholders(prev => [...prev, s]);

  const viewAs = (id: string) => {
    const found = shareholders.find(s => s.id === id);
    if (found) {
      setAdminSnapshot(currentShareholder);
      setPreImpersonationRole(role);
      setPreImpersonationPermissions(permissions);
      isImpersonatingRef.current = true;
      setIsImpersonating(true);
      setCurrentShareholder(found);
      setRole('shareholder');
      setPermissions(new Set());
    }
  };

  const [preImpersonationRole, setPreImpersonationRole] = useState<UserRole>(null);
  const [preImpersonationPermissions, setPreImpersonationPermissions] = useState<Set<PermissionKey>>(new Set());

  const returnToAdmin = () => {
    if (adminSnapshot) setCurrentShareholder(adminSnapshot);
    isImpersonatingRef.current = false;
    setIsImpersonating(false);
    setAdminSnapshot(null);
    setRole(preImpersonationRole ?? 'admin');
    setPermissions(preImpersonationPermissions);
    setPreImpersonationRole(null);
    setPreImpersonationPermissions(new Set());
  };

  return (
    <AuthContext.Provider value={{ role, currentShareholder, user, session, loading, login, logout, shareholders, pendingShareholders, addShareholder, viewAs, isImpersonating, returnToAdmin, onboardingPending, onboardingData, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
