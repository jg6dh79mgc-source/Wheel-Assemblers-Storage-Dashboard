'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredOperators, setCurrentUser } from '@/lib/authStore';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const operators = getStoredOperators();
    const cleanUser = username.trim().toLowerCase();

    // Check credentials
    const found = operators.find(
      (u) =>
        (u.username.toLowerCase() === cleanUser || u.employee_id.toLowerCase() === cleanUser) &&
        u.password === password
    );

    if (!found) {
      setErrorMsg('Invalid username or password.');
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

  const handleQuickLogin = (role: 'ADMIN' | 'OPERATOR') => {
    const operators = getStoredOperators();
    const user = operators.find((u) => u.role === role) || operators[0];
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
      router.push('/tv');
    } else {
      router.push('/mobile');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-sm space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center h-11 w-11 rounded-lg bg-blue-700 shadow-md mb-1 font-black text-white text-base">
            WA
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">Wheel Assemblers</h1>
          <p className="text-xs text-slate-400 font-mono">High-Bay Shuttle Operations</p>
        </div>

        {/* Login Box */}
        <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-700 pb-2">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">System Sign-In</h2>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">Username</label>
              <input
                type="text"
                placeholder="ADMIN or Operator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center justify-center"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Preset Account Helper */}
          <div className="pt-3 border-t border-slate-700 space-y-2">
            <span className="block text-[10px] font-mono uppercase text-slate-400 text-center">
              Configured Accounts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsername('ADMIN');
                  setPassword('WheelAssemblers2026');
                }}
                className="py-1.5 px-2 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-300 transition text-center"
              >
                Use ADMIN
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('Operator');
                  setPassword('Maintenance');
                }}
                className="py-1.5 px-2 bg-[#0f172a] hover:bg-slate-800 border border-slate-700 rounded text-[11px] text-slate-300 transition text-center"
              >
                Use Operator
              </button>
            </div>
            <div className="text-[10px] text-slate-400 font-mono text-center space-y-0.5 pt-1">
              <div>Admin: <span className="text-slate-200">ADMIN</span> / <span className="text-slate-200">WheelAssemblers2026</span></div>
              <div>Operator: <span className="text-slate-200">Operator</span> / <span className="text-slate-200">Maintenance</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
