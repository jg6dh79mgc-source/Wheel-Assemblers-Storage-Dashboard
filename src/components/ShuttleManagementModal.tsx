'use client';

import React, { useState } from 'react';
import { ShuttleItem, addShuttle, deleteShuttle } from '@/lib/shuttleStore';

interface ShuttleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shuttles: ShuttleItem[];
  onShuttlesUpdated: () => void;
}

export default function ShuttleManagementModal({
  isOpen,
  onClose,
  shuttles,
  onShuttlesUpdated,
}: ShuttleManagementModalProps) {
  const [code, setCode] = useState(`SHUTTLE-0${shuttles.length + 1}`);
  const [displayName, setDisplayName] = useState(`Shuttle ${shuttles.length + 1} (Rim Storeroom)`);
  const [storeroom, setStoreroom] = useState('Rim Storeroom');
  const [lane, setLane] = useState('K');
  const [level, setLevel] = useState(0);
  const [batteryPct, setBatteryPct] = useState(100);
  const [status, setStatus] = useState<'ACTIVE' | 'LOCKED_PENDING_INSPECTION' | 'MAINTENANCE' | 'FAULT'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !displayName.trim()) {
      setErrorMsg('Shuttle Code and Name are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await addShuttle({
        code: code.trim().toUpperCase(),
        display_name: displayName.trim(),
        storeroom,
        status,
        battery_pct: Number(batteryPct) || 100,
        current_lane: lane,
        current_level: Number(level) || 0,
        odometer_meters: 0,
        lifting_cycles: 0,
        charge_cycles: 0,
        last_sensor_clean_at: new Date().toISOString(),
      });

      onShuttlesUpdated();
      // Reset form
      const nextNum = shuttles.length + 2;
      setCode(`SHUTTLE-0${nextNum}`);
      setDisplayName(`Shuttle ${nextNum} (Rim Storeroom)`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add shuttle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, shuttleCode: string) => {
    if (confirm(`Confirm decommissioning of ${shuttleCode}?`)) {
      await deleteShuttle(id);
      onShuttlesUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded shadow-2xl w-full max-w-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#0a192f] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300 block">
              FLEET CONFIGURATION
            </span>
            <h2 className="text-sm font-bold font-mono">Automated Shuttle Fleet Management</h2>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 font-mono text-xs transition"
          >
            Close
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 max-h-[80vh] overflow-y-auto font-sans">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-900 text-xs rounded font-medium">
              {errorMsg}
            </div>
          )}

          {/* Active Fleet List */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
              <span className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                Commissioned Fleet ({shuttles.length} Units)
              </span>
              <span className="text-[10px] font-mono text-slate-500">Rim & Tyre Storeroom Assets</span>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded overflow-hidden">
              {shuttles.map((s, idx) => (
                <div
                  key={s.id}
                  className="p-3 bg-white hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0a192f] bg-slate-100 border border-slate-300 px-1.5 py-0.2 rounded text-[11px]">
                        {s.code}
                      </span>
                      <span className="font-semibold text-slate-900">{s.display_name}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-blue-50 text-blue-900 border-blue-300'
                            : s.status === 'LOCKED_PENDING_INSPECTION'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-red-50 text-red-900 border-red-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600 flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                      <span>Storeroom: <strong className="text-slate-800">{s.storeroom || 'Rim Storeroom'}</strong></span>
                      <span>Assigned Bay: <strong className="text-slate-800">Bay {s.current_lane} (L{s.current_level})</strong></span>
                      <span>Battery: <strong className="text-slate-800">{s.battery_pct}%</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {idx >= 2 ? (
                      <button
                        onClick={() => handleDelete(s.id, s.code)}
                        className="px-2.5 py-1 text-[11px] font-mono text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded transition font-bold"
                      >
                        Decommission
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Primary Unit
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commission New Shuttle Form */}
          <div className="bg-slate-50 border border-slate-300 rounded p-4 space-y-3.5">
            <div className="border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                + Commission New Automated Shuttle
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Deploy additional multi-directional shuttle into the racking system
              </p>
            </div>

            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">
                    Shuttle Code *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SHUTTLE-03"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Shuttle 3 (Rim Storeroom)"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">
                    Storeroom Facility
                  </label>
                  <select
                    value={storeroom}
                    onChange={(e) => setStoreroom(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                  >
                    <option value="Rim Storeroom">Rim Storeroom (Operational)</option>
                    <option value="Tyre Storeroom">Tyre Storeroom (Inactive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="LOCKED_PENDING_INSPECTION">LOCKED_PENDING_INSPECTION</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="FAULT">FAULT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">
                    Assigned Rack Lane & Level
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={lane}
                      onChange={(e) => setLane(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900 font-mono"
                    >
                      <option value="L">Bay L</option>
                      <option value="K">Bay K</option>
                      <option value="J">Bay J</option>
                      <option value="I">Bay I</option>
                      <option value="H">Bay H</option>
                      <option value="G">Bay G</option>
                    </select>

                    <select
                      value={level}
                      onChange={(e) => setLevel(Number(e.target.value))}
                      className="bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900 font-mono"
                    >
                      <option value={0}>Level 0</option>
                      <option value={1}>Level 1</option>
                      <option value={2}>Level 2</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">
                    Initial Battery % ({batteryPct}%)
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={batteryPct}
                    onChange={(e) => setBatteryPct(Number(e.target.value))}
                    className="w-full mt-1 accent-[#0a192f]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0a192f] hover:bg-[#172554] text-white rounded font-mono text-xs font-bold uppercase transition"
                >
                  {isSubmitting ? 'Registering...' : 'Commission Shuttle Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
