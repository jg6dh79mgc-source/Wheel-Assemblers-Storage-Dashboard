// Shuttle Store - Manages multi-directional shuttles dynamically across desktop and mobile
import { supabase } from './supabaseClient';

export interface ShuttleItem {
  id: string;
  code: string;
  display_name: string;
  storeroom: string;
  status: 'LOCKED_PENDING_INSPECTION' | 'ACTIVE' | 'FAULT' | 'MAINTENANCE';
  battery_pct: number;
  current_lane: string;
  current_level: number;
  odometer_meters: number;
  lifting_cycles: number;
  charge_cycles: number;
  last_sensor_clean_at: string;
  created_at?: string;
}

const DEFAULT_SHUTTLES: ShuttleItem[] = [
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
  },
];

const STORAGE_KEY = 'wheel_assemblers_shuttles_v2';

export function getStoredShuttles(): ShuttleItem[] {
  if (typeof window === 'undefined') return DEFAULT_SHUTTLES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SHUTTLES));
      return DEFAULT_SHUTTLES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SHUTTLES;
  } catch {
    return DEFAULT_SHUTTLES;
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
    // 1. Fetch from server API
    const res = await fetch('/api/shuttles');
    if (res.ok) {
      const data = await res.json();
      if (data.shuttles && data.shuttles.length > 0) {
        saveStoredShuttles(data.shuttles);
        return data.shuttles;
      }
    }
  } catch {}

  // 2. Fallback to Supabase directly
  try {
    const { data } = await supabase.from('shuttles').select('*').order('code');
    if (data && data.length > 0) {
      const merged: ShuttleItem[] = data.map((d: any, idx: number) => ({
        id: d.id,
        code: d.code,
        display_name: d.display_name || `Shuttle ${idx + 1} (Rim Storeroom)`,
        storeroom: d.storeroom || 'Rim Storeroom',
        status: d.status || 'ACTIVE',
        battery_pct: d.battery_pct ?? 90,
        odometer_meters: Number(d.odometer_meters) || 5000000,
        lifting_cycles: Number(d.lifting_cycles) || 45000,
        charge_cycles: Number(d.charge_cycles) || 1200,
        last_sensor_clean_at: d.last_sensor_clean_at || new Date().toISOString(),
        current_lane: d.current_lane || (idx === 0 ? 'J' : 'H'),
        current_level: d.current_level ?? (idx === 0 ? 1 : 0),
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
    id: `shuttle-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
  const updated = existing.filter((s) => s.id !== id);
  saveStoredShuttles(updated);

  try {
    await fetch(`/api/shuttles?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch {}
}
