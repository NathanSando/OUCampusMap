import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  /** False until the stored session has been read from SecureStore. */
  ready: boolean;
  /** Accounts need Supabase; in demo mode they're unavailable. */
  available: boolean;
  displayName: string | null;
}

const AuthContext = createContext<AuthState>({
  session: null,
  ready: false,
  available: false,
  displayName: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const displayName =
    (session?.user.user_metadata?.display_name as string | undefined) ??
    session?.user.email ??
    null;

  return (
    <AuthContext.Provider value={{ session, ready, available: !!supabase, displayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
