'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { syncOperatorsFromCloud, saveOperator, setCurrentUser, getStoredOperators } from '@/lib/authStore';

export default function LoginPage() {
  const router = useRouter();

  // Sign-in fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync latest cloud credentials immediately on load (bridges Desktop and Mobile)
  useEffect(() => {
    syncOperatorsFromCloud().catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const cleanUser = username.trim().toLowerCase();

    // 1. Fetch latest operators from Supabase / cloud server
    let cloudOps = await syncOperatorsFromCloud();
    if (!cloudOps || cloudOps.length === 0) {
      cloudOps = getStoredOperators();
    }

    // 2. Verify credentials
    let found = cloudOps.find(
      (u) =>
        u.username.toLowerCase() === cleanUser &&
        (u.password === password || (!u.password && password === 'admin'))
    );

    // 3. Default fallback administrator
    if (!found && cleanUser === 'admin' && (password === 'admin' || password === 'admin123')) {
      found = {
        id: 'admin-primary',
        username: 'admin',
        password: password,
        name: 'System Administrator',
        role: 'ADMIN' as const,
        shift: 'A',
        active: true,
        created_at: new Date().toISOString(),
      };
      saveOperator(found);
    }

    if (!found) {
      setErrorMsg('Invalid username or password. Access restricted to authorized personnel.');
      setIsLoading(false);
      return;
    }

    setCurrentUser(found);

    if (found.role === 'ADMIN') {
      router.push('/tv');
    } else {
      router.push('/mobile');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-sm space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-sm bg-[#0a192f] border border-slate-700 mb-1 font-bold text-white text-sm font-mono">
            WA
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight font-mono uppercase">Wheel Assemblers</h1>
          <p className="text-[11px] text-slate-500 font-mono">Automated Deep-Lane Storage System</p>
        </div>

        {/* Authentication Card */}
        <div className="bg-white border border-slate-300 rounded p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-200 pb-2.5">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              System Sign-In
            </h2>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Username</label>
              <input
                type="text"
                placeholder="Enter authorized username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#0a192f] hover:bg-[#172554] text-white rounded text-xs font-mono font-bold uppercase transition"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="text-center text-[10px] font-mono text-slate-500">
          Wheel Assemblers Plant Security • Authorized Access Only
        </div>
      </div>
    </div>
  );
}
