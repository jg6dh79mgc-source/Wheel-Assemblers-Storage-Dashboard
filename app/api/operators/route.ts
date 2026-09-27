import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

interface OperatorRecord {
  id: string;
  username: string;
  name: string;
  role: 'OPERATOR' | 'ADMIN' | 'MAINTENANCE_TECH';
  password?: string;
  shift?: string;
  active: boolean;
  created_at: string;
}

// Global server-side persistent memory across all client requests (Desktop & Mobile)
declare global {
  var __SERVER_OPERATORS_CACHE: OperatorRecord[] | undefined;
}

function getGlobalOperators(): OperatorRecord[] {
  if (!global.__SERVER_OPERATORS_CACHE || global.__SERVER_OPERATORS_CACHE.length === 0) {
    global.__SERVER_OPERATORS_CACHE = [
      {
        id: 'admin-primary',
        username: 'admin',
        name: 'System Administrator',
        role: 'ADMIN',
        password: 'admin',
        shift: 'A',
        active: true,
        created_at: new Date().toISOString(),
      },
    ];
  }
  return global.__SERVER_OPERATORS_CACHE;
}

export async function GET() {
  const serverCache = getGlobalOperators();

  // Attempt to fetch from Supabase
  try {
    const { data, error } = await supabase.from('operators').select('*');
    if (!error && data && data.length > 0) {
      // Merge remote records into server cache
      for (const row of data) {
        const exists = serverCache.find((u) => u.username.toLowerCase() === row.username.toLowerCase());
        if (!exists) {
          serverCache.push({
            id: row.id,
            username: row.username,
            name: row.name,
            role: row.role,
            password: row.password || '',
            shift: row.shift || 'Default Shift',
            active: row.active ?? true,
            created_at: row.created_at || new Date().toISOString(),
          });
        }
      }
    }
  } catch {
    // Graceful fallback to serverCache
  }

  return NextResponse.json(
    { operators: serverCache },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, name, role, password, shift } = body;

    if (!username || !name) {
      return NextResponse.json({ error: 'Username and Name are required' }, { status: 400 });
    }

    const serverCache = getGlobalOperators();
    const cleanUser = username.trim();

    // Check duplicate
    if (serverCache.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const newOperator: OperatorRecord = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUser,
      name: name.trim(),
      role: role || 'OPERATOR',
      password: password || '',
      shift: shift || 'Default Shift',
      active: true,
      created_at: new Date().toISOString(),
    };

    serverCache.unshift(newOperator);

    // Save to Supabase operators table
    try {
      await supabase.from('operators').upsert({
        id: newOperator.id,
        username: newOperator.username,
        name: newOperator.name,
        role: newOperator.role,
        password: newOperator.password,
        shift: newOperator.shift,
        active: newOperator.active,
        created_at: newOperator.created_at,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Supabase operators write warning (operating on server memory fallback):', err);
    }

    return NextResponse.json({ operator: newOperator }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing operator id' }, { status: 400 });
    }

    const serverCache = getGlobalOperators();
    const index = serverCache.findIndex((u) => u.id === id);
    if (index !== -1) {
      serverCache.splice(index, 1);
    }

    // Delete from Supabase
    try {
      await supabase.from('operators').delete().eq('id', id);
    } catch {}

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
