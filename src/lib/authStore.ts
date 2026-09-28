// Dynamic Operator Authentication and Storage
// Bridges local browser persistence, server memory cache, and Supabase cloud database
import { supabase } from './supabaseClient';
import { Operator } from '@/types';

export type { Operator };

const STORAGE_KEY_USERS = 'wheel_assemblers_operators_v3';
const STORAGE_KEY_CURRENT = 'wheel_assemblers_current_operator_v3';

// Default system credentials
export const DEFAULT_OPERATORS: (Operator & { password?: string })[] = [
  {
    id: 'admin-primary',
    username: 'admin',
    name: 'System Administrator',
    role: 'ADMIN',
    password: 'admin',
    shift: 'A',
    active: true,
    created_at: '2026-09-28T00:00:00.000Z',
  },
];

let inMemoryOperators: (Operator & { password?: string })[] = [...DEFAULT_OPERATORS];

export function getStoredOperators(): (Operator & { password?: string })[] {
  if (typeof window === 'undefined') {
    return inMemoryOperators;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_OPERATORS));
      return DEFAULT_OPERATORS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OPERATORS;
  } catch {
    return DEFAULT_OPERATORS;
  }
}

// Bidirectional sync: NEVER wipe local credentials on server redeploy!
// Merges cloud operators with local storage, and pushes any local operators back to the new server instance.
export async function syncOperatorsFromCloud(): Promise<(Operator & { password?: string })[]> {
  const localUsers = getStoredOperators();
  let cloudOps: (Operator & { password?: string })[] = [];

  // 1. Try Next.js server endpoint
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

  // 3. Bidirectional merge: combine cloud and local users without loss
  const mergedMap = new Map<string, Operator & { password?: string }>();

  // Add default admin first
  DEFAULT_OPERATORS.forEach((u) => mergedMap.set(u.username.toLowerCase(), u));

  // Add cloud users
  cloudOps.forEach((u) => mergedMap.set(u.username.toLowerCase(), u));

  // Add local users (preserves users created before a push/redeploy)
  const localOnlyUsers: (Operator & { password?: string })[] = [];
  localUsers.forEach((u) => {
    const key = u.username.toLowerCase();
    if (!mergedMap.has(key)) {
      mergedMap.set(key, u);
      localOnlyUsers.push(u);
    } else {
      // If server doesn't have password or details, keep local
      const existing = mergedMap.get(key)!;
      if (!existing.password && u.password) {
        existing.password = u.password;
      }
    }
  });

  const finalUsers = Array.from(mergedMap.values());
  inMemoryOperators = finalUsers;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(finalUsers));
    } catch {}

    // Reseed server if any local users were missing from fresh container
    if (localOnlyUsers.length > 0) {
      localOnlyUsers.forEach((user) => {
        fetch('/api/operators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        }).catch(() => {});
      });
    }
  }

  return finalUsers;
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

  // Push to server / Supabase
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
