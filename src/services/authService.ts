import { supabase } from '../lib/supabase';
import { User } from '../types/auth';

export interface AuthUser extends User {
  email: string;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Prijava nije uspela');

  const profile = await fetchUserProfile(data.user.id);
  if (!profile) throw new Error('Korisnički profil nije pronađen');
  if (profile.status !== 'active') throw new Error('Nalog je neaktivan ili suspendovan');

  return profile;
}

/**
 * Odjava korisnika.
 * 
 * Vraćen je čist i robustan poziv Supabase odjave bez blokiranja globalnih događaja,
 * čime omogućavamo stabilan SIGNED_OUT trigering u App.tsx.
 */
export async function signOut(): Promise<void> {
  console.log('🔐 authService.signOut() — start');

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ SignOut error:', error);
      throw error;
    }
    console.log('✅ SignOut uspješan — sesija obrisana');
  } catch (err) {
    console.error('❌ SignOut pao, čišćenje lokalnog skladišta:', err);
    // Fallback: ručno brisanje Supabase ključeva iz localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      console.log(`🗑️ Ručno obrisano ${keysToRemove.length} Supabase ključeva`);
    } catch (cleanupErr) {
      console.error('❌ localStorage cleanup pao:', cleanupErr);
    }
  }

  console.log('🔐 authService.signOut() — kraj');
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function fetchUserProfile(authUserId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, budget_user_id, treasury, role, status, created_at, pdf_display_name')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    username: data.username || '',
    email: data.email || '',
    budget_user_id: data.budget_user_id || '',
    treasury: data.treasury || '',
    role: data.role || 'user',
    status: data.status || 'active',
    created_at: data.created_at,
    pdf_display_name: data.pdf_display_name || undefined,
  };
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return fetchUserProfile(data.user.id);
}

export async function refreshSession(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) return null;
  return fetchUserProfile(data.session.user.id);
}