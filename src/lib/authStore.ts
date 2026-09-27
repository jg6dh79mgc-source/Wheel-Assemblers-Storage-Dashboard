'use client';

import { Operator } from '@/types';
import { supabase } from './supabaseClient';

const STORAGE_KEY_USERS = 'wa_operators_db_v4';
const STORAGE_KEY_CURRENT = 'wa_current_user_v4';

export const DEFAULT_ADMIN: Operator & { password?: string } = {
  id: 'admin-primary',
  username: 'admin',
  name: 'System Administrator',
  role: 'ADMIN',
  password: 'admin',
  shift: 'A',
  active: true,
  created_at: new Date().toISOString(),
};

// Initial in-memory cache
let inMemoryOperators: (Operator & { password?: string })[] = [DEFAULT_ADMIN];

export function getStoredOperators(): (Operator & { password?: string })[] {
  if (typeof window === 'undefined') return inMemoryOperators;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOperators = parsed;
        return parsed;
      }
    }
  } catch {}
  return inMemoryOperators;
}

// Fetch operators from central Supabase / Server backend (shared across all devices)
export async function syncOperatorsFromCloud(): Promise<(Operator & { password?: string })[]> {
  let cloudOps: (Operator & { password?: string })[] = [];

  // 1. Try Next.js server endpoint (which bridges Supabase & cross-device session)
  try {
    const res = await fetch('/api/operators', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.operators) && data.operators.length > 0) {
        cloudOps = data.operators;
      }
    }
  } catch {}

  // 2. Direct Supabase query as fallback
  if (cloudOps.length === 0) {
    try {
      const { data, error } = await supabase.from('operators').select('*');
      if (!error && data && data.length > 0) {
        cloudOps = data.map((row: any) => ({
          id: row.id,
          username: row.username,
          name: row.name,
          role: row.role,
          password: row.password || '',
          shift: row.shift || 'Default Shift',
          active: row.active ?? true,
          created_at: row.created_at || new Date().toISOString(),
        }));
      }
    } catch {}
  }

  if (cloudOps.length > 0) {
    inMemoryOperators = cloudOps;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(cloudOps));
      } catch {}
    }
    return cloudOps;
  }

  return getStoredOperators();
}

export function saveOperator(newOp: {
  username: string;
  name: string;
  role: 'OPERATOR' | 'ADMIN' | 'MAINTENANCE_TECH';
  shift?: string;
  password?: string;
}): Operator {
  const current = getStoredOperators();
  const operator: Operator & { password?: string } = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    username: newOp.username.trim(),
    password: newOp.password || '',
    name: newOp.name.trim(),
    role: newOp.role,
    shift: newOp.shift || 'Default Shift',
    active: true,
    created_at: new Date().toISOString(),
  };

  const updated = [operator, ...current.filter((u) => u.username.toLowerCase() !== operator.username.toLowerCase())];
  inMemoryOperators = updated;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
    } catch {}
  }

  // Push to server / Supabase in background
  if (typeof window !== 'undefined') {
    fetch('/api/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOp),
    }).catch(() => {});
  }

  return operator;
}

export function deleteStoredOperator(idOrUsername: string): boolean {
  try {
    const current = getStoredOperators();
    const updated = current.filter(
      (u) => u.id !== idOrUsername && u.username.toLowerCase() !== idOrUsername.toLowerCase()
    );
    inMemoryOperators = updated;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
      } catch {}

      // Delete from cloud
      fetch(`/api/operators?id=${encodeURIComponent(idOrUsername)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

export function getCurrentUser(): Operator | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: Operator | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY_CURRENT);
    } else {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(user));
    }
  } catch {}
}
