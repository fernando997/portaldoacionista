import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'shareholder' | 'admin' | 'viewer' | 'superadmin' | null;

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
}

interface AuthContextType {
  role: UserRole;
  currentShareholder: Shareholder;
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  shareholders: Shareholder[];
  addShareholder: (s: Shareholder) => void;
  viewAs: (id: string) => void;
  isImpersonating: boolean;
  returnToAdmin: () => void;
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
  const [isImpersonating, setIsImpersonating] = useState(false);
  const isImpersonatingRef = useRef(false);
  const [adminSnapshot, setAdminSnapshot] = useState<Shareholder | null>(null);

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

    if (roles && roles.some(r => r.role === 'superadmin')) {
      setRole('superadmin');
    } else if (roles && roles.some(r => r.role === 'admin')) {
      setRole('admin');
    } else if (roles && roles.some(r => r.role === 'moderator')) {
      setRole('viewer');
    } else {
      setRole('shareholder');
    }

    // Load all shareholders if admin, superadmin or viewer
    if (roles && (roles.some(r => r.role === 'admin') || roles.some(r => r.role === 'superadmin') || roles.some(r => r.role === 'moderator'))) {
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*');

      if (allProfiles) {
        setShareholders(allProfiles.map(p => ({
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
        })));
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
      isImpersonatingRef.current = true;
      setIsImpersonating(true);
      setCurrentShareholder(found);
      setRole('shareholder');
    }
  };

  const [preImpersonationRole, setPreImpersonationRole] = useState<UserRole>(null);

  const returnToAdmin = () => {
    if (adminSnapshot) setCurrentShareholder(adminSnapshot);
    isImpersonatingRef.current = false;
    setIsImpersonating(false);
    setAdminSnapshot(null);
    setRole(preImpersonationRole ?? 'admin');
    setPreImpersonationRole(null);
  };

  return (
    <AuthContext.Provider value={{ role, currentShareholder, user, session, loading, login, logout, shareholders, addShareholder, viewAs, isImpersonating, returnToAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
