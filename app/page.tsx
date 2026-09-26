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
    const found = operators.find(
      (u) =>
        (u.username.toLowerCase() === username.trim().toLowerCase() ||
          u.employee_id.toLowerCase() === username.trim().toLowerCase()) &&
        (u.password === password || (!u.password && password === 'password123'))
    );

    if (!found) {
      setErrorMsg('Invalid credentials. Check username or employee ID.');
      setIsLoading(false);
      return;
    }

    // Save active session
    setCurrentUser(found);

    // Route based on role
    if (found.role === 'ADMIN') {
      router.push('/tv');
    } else {
      router.push('/mobile');
    }
  };

  // Quick One-Click Demo Helper
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 shadow-xl mb-1">
            <span className="font-black text-lg text-indigo-400 tracking-wider">WA</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Wheel Assemblers</h1>
          <p className="text-xs font-mono text-slate-400 tracking-wider uppercase">
            High-Bay Automated Racking System
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">System Sign-In</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter operator credentials to access digital interlock or TV monitor.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Username / Employee ID
              </label>
              <input
                type="text"
                placeholder="e.g. admin or snkosi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <span className="block text-[11px] font-mono uppercase text-slate-500 text-center">
              Quick Demo Access
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="py-1.5 px-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] font-medium text-slate-300 transition text-center"
              >
                🛠️ Admin / TV
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('OPERATOR')}
                className="py-1.5 px-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-[11px] font-medium text-slate-300 transition text-center"
              >
                📱 Mobile Operator
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center">
              Default password: <code className="text-slate-400 font-mono">password123</code>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-600 font-mono">
          Wheel Assemblers Storage Operations • V4.9
        </p>
      </div>
    </div>
  );
}
