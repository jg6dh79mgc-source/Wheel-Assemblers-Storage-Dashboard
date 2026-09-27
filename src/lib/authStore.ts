'use client';

import { Operator } from '@/types';

// No preconfigured accounts: users register their own secure credentials
export const DEFAULT_OPERATORS: (Operator & { password?: string })[] = [];

const STORAGE_KEY_USERS = 'wa_operators_db_v3';
const STORAGE_KEY_CURRENT = 'wa_current_user_v3';

export function getStoredOperators(): (Operator & { password?: string })[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
  }
  return operator;
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
  if (!user) {
    localStorage.removeItem(STORAGE_KEY_CURRENT);
  } else {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(user));
  }
}
