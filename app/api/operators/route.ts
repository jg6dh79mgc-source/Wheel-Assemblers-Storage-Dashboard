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
        const existing = serverCache.find((u) => u.username.toLowerCase() === row.username.toLowerCase());
        if (!existing) {
          serverCache.push({
            id: row.id,
            username: row.username,
            name: row.name,
            role: (row.role as any) || 'OPERATOR',
            password: row.password || '',
            shift: row.shift || 'Default Shift',
            active: row.active ?? true,
            created_at: row.created_at || new Date().toISOString(),
          });
        } else {
          // Keep server cache updated with remote source of truth
          existing.name = row.name || existing.name;
          existing.role = row.role || existing.role;
          existing.password = row.password !== undefined ? row.password : existing.password;
          existing.shift = row.shift || existing.shift;
          existing.active = row.active ?? existing.active;
        }
      }
    }
  } catch (err) {
    console.warn('Supabase operators read error (operating on server memory fallback):', err);
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

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Valid username is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Valid name is required' }, { status: 400 });
    }

    const serverCache = getGlobalOperators();
    const cleanUser = username.trim();
    const validRoles = ['OPERATOR', 'ADMIN', 'MAINTENANCE_TECH'];
    const assignedRole = validRoles.includes(role) ? role : 'OPERATOR';

    // Check duplicate or update existing
    const existingIndex = serverCache.findIndex((u) => u.username.toLowerCase() === cleanUser.toLowerCase());
    if (existingIndex !== -1) {
      serverCache[existingIndex] = {
        ...serverCache[existingIndex],
        name: name.trim(),
        role: assignedRole,
        password: password !== undefined ? String(password) : serverCache[existingIndex].password,
        shift: shift ? String(shift).trim() : serverCache[existingIndex].shift,
        active: true,
      };

      try {
        const { error } = await supabase.from('operators').upsert({
          id: serverCache[existingIndex].id,
          username: serverCache[existingIndex].username,
          name: serverCache[existingIndex].name,
          role: serverCache[existingIndex].role,
          password: serverCache[existingIndex].password,
          shift: serverCache[existingIndex].shift,
          active: serverCache[existingIndex].active,
          created_at: serverCache[existingIndex].created_at,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          console.warn('Supabase operator update warning:', error.message);
        }
      } catch (err) {
        console.warn('Supabase operator update exception:', err);
      }

      return NextResponse.json({ operator: serverCache[existingIndex] }, { status: 200 });
    }

    const newOperator: OperatorRecord = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUser,
      name: name.trim(),
      role: assignedRole,
      password: password !== undefined ? String(password) : '',
      shift: shift ? String(shift).trim() : 'Default Shift',
      active: true,
      created_at: new Date().toISOString(),
    };

    serverCache.unshift(newOperator);

    // Save to Supabase operators table
    try {
      const { error } = await supabase.from('operators').upsert({
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
      if (error) {
        console.warn('Supabase operator insert warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase operator insert exception:', err);
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

    // Protect primary root admin from deletion
    if (id === 'admin-primary' || id.toLowerCase() === 'admin') {
      return NextResponse.json({ error: 'Primary Administrator account cannot be deleted' }, { status: 403 });
    }

    const serverCache = getGlobalOperators();
    const index = serverCache.findIndex((u) => u.id === id || u.username.toLowerCase() === id.toLowerCase());
    if (index !== -1) {
      serverCache.splice(index, 1);
    }

    // Delete from Supabase
    try {
      const { error } = await supabase.from('operators').delete().or(`id.eq.${id},username.eq.${id}`);
      if (error) {
        console.warn('Supabase delete warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase delete exception:', err);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
