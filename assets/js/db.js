// Shared Supabase client + "who am I" helpers. Import from any page that needs data.
//
//   import { db, requireMember } from './db.js';
//   const me = await requireMember();          // { id, role: 'me' | 'her', nickname }
//   const { data } = await db.from('notes').select('*');

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

const JOIN_URL = new URL('../../join.html', import.meta.url).href;

export const db = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

let cached;

/** Returns the current profile, or null if this browser hasn't joined yet. */
export async function whoami() {
  if (cached) return cached;
  const { data: { session } } = await db.auth.getSession();
  if (!session) return null;
  const { data } = await db.from('profiles').select('id, role, nickname').eq('id', session.user.id).maybeSingle();
  cached = data ?? null;
  return cached;
}

/** Guard for data pages: sends strangers to join.html. */
export async function requireMember() {
  const me = await whoami();
  if (!me) {
    location.replace(JOIN_URL);
    await new Promise(() => {}); // never resolve: the page is leaving
  }
  return me;
}

/** Sign in anonymously (if needed) and claim an invite. Returns the role. */
export async function join(code) {
  let { data: { session } } = await db.auth.getSession();
  if (!session) {
    const { data, error } = await db.auth.signInAnonymously();
    if (error) throw error;
    session = data.session;
  }
  const { data: role, error } = await db.rpc('redeem_invite', { p_code: code });
  if (error) throw error;
  cached = undefined;
  return role;
}
