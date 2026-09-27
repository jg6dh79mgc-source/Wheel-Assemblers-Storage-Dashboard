'use client';

import React, { useState, useEffect } from 'react';
import { getStoredOperators, saveOperator, deleteStoredOperator, getCurrentUser, syncOperatorsFromCloud } from '@/lib/authStore';
import { supabase } from '@/lib/supabaseClient';
import { Operator } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function OperatorManagementModal({ isOpen, onClose }: Props) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<Operator | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: 'OPERATOR' as 'OPERATOR' | 'ADMIN' | 'MAINTENANCE_TECH',
    password: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOperators(getStoredOperators());
      setCurrentUser(getCurrentUser());
      setShowAddForm(false);
      setMessage(null);

      syncOperatorsFromCloud().then((ops) => {
        if (ops && ops.length > 0) {
          setOperators(ops);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    const current = getStoredOperators();
    if (current.some((op) => op.username.toLowerCase() === formData.username.toLowerCase())) {
      setMessage({ type: 'error', text: 'An operator with this username already exists.' });
      return;
    }

    const created = saveOperator(formData);
    setOperators(getStoredOperators());
    setMessage({ type: 'success', text: `Operator ${created.name} (@${created.username}) authorized successfully.` });
    setFormData({
      name: '',
      username: '',
      role: 'OPERATOR',
      password: '',
    });
    setShowAddForm(false);
  };

  const handleDeleteOperator = async (op: Operator) => {
    if (currentUser && currentUser.username.toLowerCase() === op.username.toLowerCase()) {
      setMessage({ type: 'error', text: 'Action prohibited: You cannot delete your own active Admin account.' });
      return;
    }

    const confirmed = window.confirm(`Permanently remove operator "${op.name}" (@${op.username}) from access?`);
    if (!confirmed) return;

    deleteStoredOperator(op.id);

    try {
      if (supabase) {
        await supabase.from('operators').delete().eq('id', op.id);
      }
    } catch {
      // Continue even if remote Supabase record was not found
    }

    setOperators(getStoredOperators());
    setMessage({ type: 'success', text: `Operator ${op.name} (@${op.username}) has been removed.` });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 select-none font-sans">
      <div className="bg-white border border-slate-300 sm:rounded w-full max-w-2xl h-full sm:h-auto sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        {/* Header - Single Close Button */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-[#0a192f] text-white">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">ADMIN ACCESS</span>
            <h2 className="text-sm sm:text-base font-bold text-white font-mono">Operator & Access Management</h2>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-sm bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 text-xs font-mono transition"
          >
            Close
          </button>
        </div>

        {/* Notification message */}
        {message && (
          <div
            className={`px-4 sm:px-6 py-2 text-xs font-medium border-b ${
              message.type === 'success'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-xs bg-slate-50">
          {/* Action Bar */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600 font-mono text-xs">
              Authorized Personnel: <strong className="text-slate-900">{operators.length}</strong>
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white font-medium transition text-xs shadow-sm"
            >
              {showAddForm ? 'Cancel' : '+ Add Operator'}
            </button>
          </div>

          {/* Add Operator Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg border border-slate-300 space-y-3 shadow-sm">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Register New Warehouse Operator</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Thabo Khumalo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Login Username *</label>
                  <input
                    type="text"
                    placeholder="e.g. tkhumalo"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Password</label>
                  <input
                    type="password"
                    placeholder="Set private password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">System Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  >
                    <option value="OPERATOR">Floor Operator (FR-7.2-04)</option>
                    <option value="MAINTENANCE_TECH">Maintenance Technician</option>
                    <option value="ADMIN">Lead Admin / Supervisor</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0a192f] hover:bg-[#172554] text-white rounded font-mono text-xs font-bold transition"
                >
                  Save & Authorize User
                </button>
              </div>
            </form>
          )}

          {/* Operator Table with Delete Option */}
          <div className="bg-white rounded border border-slate-300 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs min-w-[460px]">
              <thead className="bg-slate-100 text-slate-700 font-mono border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {operators.map((op) => {
                  const isCurrent = currentUser && currentUser.username.toLowerCase() === op.username.toLowerCase();
                  return (
                    <tr key={op.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {op.name}
                        {isCurrent && <span className="ml-1.5 text-[9px] font-mono text-blue-900 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">You</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        <div>@{op.username}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-900 border border-blue-200">
                          {op.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Active
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteOperator(op)}
                          disabled={isCurrent}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition border ${
                            isCurrent
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
                          }`}
                          title={isCurrent ? 'Cannot delete current logged-in user' : `Delete operator ${op.username}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer (No duplicate Close button) */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs text-slate-500 font-mono">
          <span className="text-[11px]">Local & Database Auth Synchronized</span>
          <span className="text-[11px] text-slate-400">Total Personnel: {operators.length}</span>
        </div>
      </div>
    </div>
  );
}
