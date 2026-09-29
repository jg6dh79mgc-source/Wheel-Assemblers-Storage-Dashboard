'use client';

import { supabase } from './supabaseClient';

export interface ShuttleItem {
  id: string;
  code: string;
  display_name: string;
  storeroom?: string;
  status: 'ACTIVE' | 'LOCKED_PENDING_INSPECTION' | 'FAULT' | 'MAINTENANCE';
  battery_pct: number;
  odometer_meters: number;
  lifting_cycles: number;
  charge_cycles: number;
  last_sensor_clean_at: string;
  current_lane?: string;
  current_level?: number;
  created_at?: string;
}

export const INITIAL_SHUTTLES: ShuttleItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    code: 'SHUTTLE-01',
    display_name: 'Shuttle 1 (Rim Storeroom)',
    storeroom: 'Rim Storeroom',
    status: 'LOCKED_PENDING_INSPECTION',
    battery_pct: 94,
    odometer_meters: 8840000,
    lifting_cycles: 82140,
    charge_cycles: 2450,
    last_sensor_clean_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    current_lane: 'J',
    current_level: 1,
    created_at: '2026-09-28T00:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    code: 'SHUTTLE-02',
    display_name: 'Shuttle 2 (Rim Storeroom)',
    storeroom: 'Rim Storeroom',
    status: 'ACTIVE',
    battery_pct: 82,
    odometer_meters: 9350000,
    lifting_cycles: 96800,
    charge_cycles: 2890,
    last_sensor_clean_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    current_lane: 'H',
    current_level: 0,
    created_at: '2026-09-28T00:00:00Z',
  },
];

const STORAGE_KEY = 'wheel_assemblers_shuttles_v2';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getStoredShuttles(): ShuttleItem[] {
  if (typeof window === 'undefined') return INITIAL_SHUTTLES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SHUTTLES));
      return INITIAL_SHUTTLES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SHUTTLES;
  } catch {
    return INITIAL_SHUTTLES;
  }
}

export function saveStoredShuttles(shuttles: ShuttleItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shuttles));
  } catch {}
}

export async function fetchShuttlesFromCloud(): Promise<ShuttleItem[]> {
  try {
    const res = await fetch('/api/shuttles', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.shuttles) && data.shuttles.length > 0) {
        saveStoredShuttles(data.shuttles);
        return data.shuttles;
      }
    }
  } catch {}

  // Fallback direct Supabase
  try {
    const { data, error } = await supabase.from('shuttles').select('*').order('code');
    if (!error && data && data.length > 0) {
      const merged: ShuttleItem[] = data.map((d: any, idx: number) => ({
        id: d.id,
        code: d.code,
        display_name: d.display_name || `Shuttle ${idx + 1} (Rim Storeroom)`,
        storeroom: d.storeroom || 'Rim Storeroom',
        status: d.status || 'ACTIVE',
        battery_pct: d.battery_pct ?? 90,
        odometer_meters: Number(d.odometer_meters) || 0,
        lifting_cycles: Number(d.lifting_cycles) || 0,
        charge_cycles: Number(d.charge_cycles) || 0,
        last_sensor_clean_at: d.last_sensor_clean_at || new Date().toISOString(),
        current_lane: d.current_lane || (idx === 0 ? 'J' : 'H'),
        current_level: d.current_level ?? (idx === 0 ? 1 : 0),
        created_at: d.created_at || new Date().toISOString(),
      }));
      saveStoredShuttles(merged);
      return merged;
    }
  } catch {}

  return getStoredShuttles();
}

export async function addShuttle(newShuttle: Omit<ShuttleItem, 'id'>): Promise<ShuttleItem> {
  const item: ShuttleItem = {
    ...newShuttle,
    id: generateUUID(),
  };

  const existing = getStoredShuttles();
  const updated = [...existing, item];
  saveStoredShuttles(updated);

  // Sync to API and Supabase
  try {
    await fetch('/api/shuttles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch {}

  return item;
}

export async function deleteShuttle(id: string): Promise<void> {
  const existing = getStoredShuttles();
  const updated = existing.filter((s) => s.id !== id && s.code !== id);
  saveStoredShuttles(updated);

  try {
    await fetch(`/api/shuttles?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch {}
}
