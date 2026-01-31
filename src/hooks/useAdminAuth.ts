import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isAdmin: false,
    isLoading: true,
  });

  const checkAdminRole = useCallback(async (user: User | null) => {
    if (!user) {
      setState({
        user: null,
        isAdmin: false,
        isLoading: false,
      });
      return;
    }

    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setState({
        user,
        isAdmin: !!roleData,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error checking admin role:", error);
      setState({
        user,
        isAdmin: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdminRole(session?.user ?? null);
    });

    // Then set up listener for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only handle actual state changes, not initial session
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          checkAdminRole(session?.user ?? null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [checkAdminRole]);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { error };
    }

    // Manually check admin role after sign in
    if (data.user) {
      await checkAdminRole(data.user);
    }
    
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    ...state,
    signIn,
    signOut,
  };
}
