'use client';

import { Operator } from '@/types';

export const DEFAULT_OPERATORS: (Operator & { password?: string })[] = [
  {
    id: 'user-admin-01',
    username: 'admin',
    password: 'password123',
    name: 'Industrial Systems Lead',
    employee_id: 'WA-ENG-01',
    role: 'ADMIN',
    shift: 'Shift 1 (06:00 - 14:00)',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-op-01',
    username: 'snkosi',
    password: 'password123',
    name: 'Sipho Nkosi',
    employee_id: 'WA-OP-104',
    role: 'OPERATOR',
    shift: 'Shift 1 (06:00 - 14:00)',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-op-02',
    username: 'jmarais',
    password: 'password123',
    name: 'Johan Marais',
    employee_id: 'WA-OP-108',
    role: 'OPERATOR',
    shift: 'Shift 2 (14:00 - 22:00)',
    active: true,
    created_at: new Date().toISOString(),
  },
];

const STORAGE_KEY_USERS = 'wa_operators_db_v1';
const STORAGE_KEY_CURRENT = 'wa_current_user_v1';

export function getStoredOperators(): (Operator & { password?: string })[] {
  if (typeof window === 'undefined') return DEFAULT_OPERATORS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_OPERATORS));
      return DEFAULT_OPERATORS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_OPERATORS;
  }
}

export function saveOperator(newOp: {
  username: string;
  name: string;
  employee_id: string;
  role: 'OPERATOR' | 'ADMIN' | 'MAINTENANCE_TECH';
  shift: 'Shift 1 (06:00 - 14:00)' | 'Shift 2 (14:00 - 22:00)' | 'Shift 3 (22:00 - 06:00)';
  password?: string;
}): Operator {
  const current = getStoredOperators();
  const operator: Operator & { password?: string } = {
    id: `op-${Date.now()}`,
    username: newOp.username.trim().toLowerCase(),
    password: newOp.password || 'password123',
    name: newOp.name.trim(),
    employee_id: newOp.employee_id.trim().toUpperCase(),
    role: newOp.role,
    shift: newOp.shift,
    active: true,
    created_at: new Date().toISOString(),
  };

  const updated = [operator, ...current];
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
