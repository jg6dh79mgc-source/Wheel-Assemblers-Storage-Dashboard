'use client';

import React, { useState, useEffect } from 'react';
import { Operator } from '@/types';
import { getStoredOperators, saveOperator } from '@/lib/authStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function OperatorManagementModal({ isOpen, onClose }: Props) {
  const [operators, setOperators] = useState<(Operator & { password?: string })[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    employee_id: '',
    role: 'OPERATOR' as 'OPERATOR' | 'ADMIN' | 'MAINTENANCE_TECH',
    shift: 'Shift 1 (06:00 - 14:00)' as any,
    password: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOperators(getStoredOperators());
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.employee_id) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    // Check username duplication
    if (operators.some((o) => o.username.toLowerCase() === formData.username.toLowerCase().trim())) {
      setMessage({ type: 'error', text: `Username "${formData.username}" is already assigned.` });
      return;
    }

    const created = saveOperator(formData);
    setOperators(getStoredOperators());
    setMessage({ type: 'success', text: `Operator ${created.name} (${created.employee_id}) added successfully.` });
    setFormData({
      name: '',
      username: '',
      employee_id: '',
      role: 'OPERATOR',
      shift: 'Shift 1 (06:00 - 14:00)',
      password: '',
    });
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Admin Control</span>
            </div>
            <h2 className="text-base font-bold text-white">Operator & Access Management</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-semibold transition"
          >
            ✕
          </button>
        </div>

        {/* Notification message */}
        {message && (
          <div
            className={`px-6 py-2.5 text-xs font-medium border-b ${
              message.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/80 border-rose-800/80 text-rose-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-mono">
              Total Authorized Personnel: <strong className="text-white">{operators.length}</strong>
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              {showAddForm ? '✕ Cancel' : '+ Add New Operator'}
            </button>
          </div>

          {/* Add Operator Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-4 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-3">
              <h3 className="font-bold text-slate-200 text-sm">Register New Warehouse Operator</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Thabo Khumalo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Employee ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. WA-OP-115"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Login Username *</label>
                  <input
                    type="text"
                    placeholder="e.g. tkhumalo"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Default: password123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                  >
                    <option value="OPERATOR">Floor Operator (FR-7.2-04)</option>
                    <option value="ADMIN">Lead Admin / Supervisor</option>
                    <option value="MAINTENANCE_TECH">Maintenance Technician</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Operating Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                  >
                    <option value="Shift 1 (06:00 - 14:00)">Shift 1 (06:00 - 14:00)</option>
                    <option value="Shift 2 (14:00 - 22:00)">Shift 2 (14:00 - 22:00)</option>
                    <option value="Shift 3 (22:00 - 06:00)">Shift 3 (22:00 - 06:00)</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition"
                >
                  Save & Authorize Operator
                </button>
              </div>
            </form>
          )}

          {/* Operator Table */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">ID / User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Shift</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {operators.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{op.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      <div>{op.employee_id}</div>
                      <div className="text-[10px] text-slate-500 font-mono">@{op.username}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          op.role === 'ADMIN'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                            : op.role === 'MAINTENANCE_TECH'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                        }`}
                      >
                        {op.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{op.shift}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>Synced with Local & Supabase Auth</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
