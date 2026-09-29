import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabaseClient';
import { ShuttleItem } from '@/lib/shuttleStore';

export const dynamic = 'force-dynamic';

declare global {
  var __SERVER_SHUTTLES_CACHE: ShuttleItem[] | undefined;
}

const DEFAULT_SERVER_SHUTTLES: ShuttleItem[] = [
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
    created_at: new Date().toISOString(),
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
    created_at: new Date().toISOString(),
  },
];

function getServerShuttles(): ShuttleItem[] {
  if (!global.__SERVER_SHUTTLES_CACHE || global.__SERVER_SHUTTLES_CACHE.length === 0) {
    global.__SERVER_SHUTTLES_CACHE = [...DEFAULT_SERVER_SHUTTLES];
  }
  return global.__SERVER_SHUTTLES_CACHE;
}

export async function GET() {
  const serverCache = getServerShuttles();

  try {
    const { data, error } = await supabase.from('shuttles').select('*').order('code');
    if (!error && data && data.length > 0) {
      for (const row of data) {
        const exists = serverCache.find((s) => s.id === row.id || s.code === row.code);
        if (!exists) {
          serverCache.push({
            id: row.id,
            code: row.code,
            display_name: row.display_name || row.code,
            storeroom: row.storeroom || 'Rim Storeroom',
            status: row.status || 'ACTIVE',
            battery_pct: row.battery_pct ?? 90,
            odometer_meters: Number(row.odometer_meters) || 0,
            lifting_cycles: Number(row.lifting_cycles) || 0,
            charge_cycles: Number(row.charge_cycles) || 0,
            last_sensor_clean_at: row.last_sensor_clean_at || new Date().toISOString(),
            current_lane: row.current_lane || 'J',
            current_level: row.current_level ?? 1,
            created_at: row.created_at || new Date().toISOString(),
          });
        } else {
          exists.status = row.status || exists.status;
          exists.battery_pct = row.battery_pct ?? exists.battery_pct;
          exists.odometer_meters = Number(row.odometer_meters) || exists.odometer_meters;
          exists.lifting_cycles = Number(row.lifting_cycles) || exists.lifting_cycles;
          exists.charge_cycles = Number(row.charge_cycles) || exists.charge_cycles;
          exists.last_sensor_clean_at = row.last_sensor_clean_at || exists.last_sensor_clean_at;
        }
      }
    }
  } catch (err) {
    console.warn('Supabase shuttles read error:', err);
  }

  return NextResponse.json(
    { shuttles: serverCache },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      code,
      display_name,
      storeroom,
      status,
      battery_pct,
      current_lane,
      current_level,
      odometer_meters,
      lifting_cycles,
      charge_cycles,
    } = body;

    if (!code || !display_name) {
      return NextResponse.json({ error: 'Shuttle Code and Display Name are required' }, { status: 400 });
    }

    const serverCache = getServerShuttles();
    const cleanCode = code.trim().toUpperCase();

    // Ensure valid UUID for PostgreSQL
    const validUuid =
      body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)
        ? body.id
        : crypto.randomUUID();

    const newShuttle: ShuttleItem = {
      id: validUuid,
      code: cleanCode,
      display_name: display_name.trim(),
      storeroom: storeroom || 'Rim Storeroom',
      status: status || 'ACTIVE',
      battery_pct: typeof battery_pct === 'number' ? Math.min(100, Math.max(0, battery_pct)) : 100,
      current_lane: current_lane || 'K',
      current_level: typeof current_level === 'number' ? current_level : 0,
      odometer_meters: typeof odometer_meters === 'number' ? Math.max(0, odometer_meters) : 0,
      lifting_cycles: typeof lifting_cycles === 'number' ? Math.max(0, lifting_cycles) : 0,
      charge_cycles: typeof charge_cycles === 'number' ? Math.max(0, charge_cycles) : 0,
      last_sensor_clean_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    serverCache.push(newShuttle);

    // Save to Supabase shuttles table
    try {
      const { error } = await supabase.from('shuttles').upsert({
        id: newShuttle.id,
        code: newShuttle.code,
        display_name: newShuttle.display_name,
        status: newShuttle.status,
        battery_pct: newShuttle.battery_pct,
        current_bay: `Bay ${newShuttle.current_lane}-0${newShuttle.current_level}`,
        odometer_meters: newShuttle.odometer_meters,
        lifting_cycles: newShuttle.lifting_cycles,
        charge_cycles: newShuttle.charge_cycles,
        last_sensor_clean_at: newShuttle.last_sensor_clean_at,
      });
      if (error) {
        console.warn('Supabase shuttle upsert warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase shuttles write exception:', err);
    }

    return NextResponse.json({ shuttle: newShuttle }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing shuttle id' }, { status: 400 });
    }

    const serverCache = getServerShuttles();
    const index = serverCache.findIndex((s) => s.id === id || s.code === id);
    if (index !== -1) {
      serverCache.splice(index, 1);
    }

    try {
      const { error } = await supabase.from('shuttles').delete().or(`id.eq.${id},code.eq.${id}`);
      if (error) {
        console.warn('Supabase shuttle delete warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase shuttle delete exception:', err);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
