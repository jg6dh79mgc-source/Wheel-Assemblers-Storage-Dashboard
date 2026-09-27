'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredOperators, saveOperator, setCurrentUser } from '@/lib/authStore';

export default function LoginPage() {
  const router = useRouter();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [hasExistingAccounts, setHasExistingAccounts] = useState<boolean>(true);

  // Sign-in fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<'ADMIN' | 'OPERATOR' | 'MAINTENANCE_TECH'>('ADMIN');
  const [regShift, setRegShift] = useState<'Shift 1 (06:00 - 14:00)' | 'Shift 2 (14:00 - 22:00)' | 'Shift 3 (22:00 - 06:00)'>('Shift 1 (06:00 - 14:00)');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const existing = getStoredOperators();
    if (existing.length === 0) {
      setHasExistingAccounts(false);
      setMode('register');
      setRegRole('ADMIN');
    } else {
      setHasExistingAccounts(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const operators = getStoredOperators();
    const cleanUser = username.trim().toLowerCase();

    // Check credentials
    const found = operators.find(
      (u) =>
        u.username.toLowerCase() === cleanUser &&
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

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regUsername.trim() || !regPassword || !regName.trim()) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const existing = getStoredOperators();
    const cleanUser = regUsername.trim().toLowerCase();
    if (existing.some((u) => u.username.toLowerCase() === cleanUser)) {
      setErrorMsg(`Username "${regUsername}" is already in use.`);
      return;
    }

    const created = saveOperator({
      username: regUsername.trim(),
      password: regPassword,
      name: regName.trim(),
      role: regRole,
      shift: regShift,
    });

    setCurrentUser(created);
    setHasExistingAccounts(true);

    if (created.role === 'ADMIN') {
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
          <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              {mode === 'login' ? 'System Sign-In' : hasExistingAccounts ? 'Create Account' : 'Initial Setup'}
            </h2>
            {hasExistingAccounts && (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setSuccessMsg('');
                  setMode(mode === 'login' ? 'register' : 'login');
                }}
                className="text-xs font-mono text-blue-900 hover:underline transition font-semibold"
              >
                {mode === 'login' ? 'Register Account' : 'Back to Sign-In'}
              </button>
            )}
          </div>

          {!hasExistingAccounts && mode === 'register' && (
            <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-xs">
              No accounts registered. Please set up the primary Administrator account.
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium">
              {successMsg}
            </div>
          )}

          {mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Username</label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
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
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
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
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Username</label>
                <input
                  type="text"
                  placeholder="e.g. jdoe"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">System Role</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 transition"
                  >
                    <option value="ADMIN">Administrator (Manager)</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="MAINTENANCE_TECH">Maintenance Tech</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Shift</label>
                  <select
                    value={regShift}
                    onChange={(e) => setRegShift(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 transition"
                  >
                    <option value="Shift 1 (06:00 - 14:00)">Shift 1 (Morning)</option>
                    <option value="Shift 2 (14:00 - 22:00)">Shift 2 (Afternoon)</option>
                    <option value="Shift 3 (22:00 - 06:00)">Shift 3 (Night)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#0a192f] hover:bg-[#172554] text-white rounded text-xs font-mono font-bold uppercase transition mt-1"
              >
                Create Account & Sign In
              </button>
            </form>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center text-[10px] font-mono text-slate-500">
          Wheel Assemblers Plant Security • Authorized Access Only
        </div>
      </div>
    </div>
  );
}