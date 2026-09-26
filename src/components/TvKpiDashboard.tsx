'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUser, setCurrentUser } from '@/lib/authStore';
import OperatorManagementModal from './OperatorManagementModal';

interface ShuttleData {
  id: string;
  code: string;
  display_name: string;
  status: 'LOCKED_PENDING_INSPECTION' | 'ACTIVE' | 'FAULT' | 'MAINTENANCE';
  battery_pct: number;
  odometer_meters: number;
  lifting_cycles: number;
  charge_cycles: number;
  last_sensor_clean_at: string;
  last_inspection_passed?: boolean;
  current_bay?: string;
  lane_position?: number; // 1 to 29
}

// Reusable Circular / Pie Donut Gauge
function DonutGauge({
  value,
  max,
  label,
  sublabel,
  unit = '',
  warningThreshold = 90,
  dangerThreshold = 100,
}: {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  unit?: string;
  warningThreshold?: number;
  dangerThreshold?: number;
}) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  let strokeColor = '#10b981'; // emerald
  if (pct >= dangerThreshold) strokeColor = '#f43f5e'; // rose
  else if (pct >= warningThreshold) strokeColor = '#f59e0b'; // amber

  return (
    <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
      <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 88 88">
          {/* Background circle */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="7"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            stroke={strokeColor}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
          <span className="text-base font-black text-white">{pct}%</span>
          <span className="text-[9px] text-slate-400 uppercase">Used</span>
        </div>
      </div>
      <div className="text-xs font-semibold text-slate-200">{label}</div>
      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
        {sublabel} {unit}
      </div>
    </div>
  );
}

export default function TvKpiDashboard() {
  const router = useRouter();
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MAINTENANCE' | 'OEE'>('OVERVIEW');

  // Shuttle telemetry
  const [shuttles, setShuttles] = useState<ShuttleData[]>([
    {
      id: '1',
      code: 'SHUTTLE-01',
      display_name: 'Shuttle 1 (Rim Storeroom)',
      status: 'LOCKED_PENDING_INSPECTION',
      battery_pct: 94,
      odometer_meters: 8840200,
      lifting_cycles: 89400,
      charge_cycles: 2410,
      last_sensor_clean_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      last_inspection_passed: false,
      current_bay: 'Lane 3',
      lane_position: 14,
    },
    {
      id: '2',
      code: 'SHUTTLE-02',
      display_name: 'Shuttle 2 (Tyre Storeroom)',
      status: 'ACTIVE',
      battery_pct: 82,
      odometer_meters: 9350400,
      lifting_cycles: 96800,
      charge_cycles: 2890,
      last_sensor_clean_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      last_inspection_passed: true,
      current_bay: 'Lane 2',
      lane_position: 21,
    },
  ]);

  // Selected deep-lane inspector
  const [selectedLane, setSelectedLane] = useState<{ zone: 'TYRE' | 'RIM'; lane: number } | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Supabase real-time listener
  useEffect(() => {
    async function loadLiveData() {
      try {
        const { data } = await supabase.from('shuttles').select('*').order('code');
        if (data && data.length > 0) {
          setShuttles((prev) =>
            data.map((item: any, idx: number) => ({
              ...prev[idx],
              ...item,
            }))
          );
        }
      } catch (err) {
        console.warn('Supabase local fallback active:', err);
      }
    }
    loadLiveData();

    const channel = supabase
      .channel('tv-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shuttles' }, (payload: any) => {
        const newRecord = payload?.new as ShuttleData | undefined;
        if (newRecord && newRecord.id) {
          setShuttles((prev) =>
            prev.map((s) => (s.id === newRecord.id ? { ...s, ...newRecord } : s))
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSignOut = () => {
    setCurrentUser(null);
    router.push('/');
  };

  const hasInspectionAlert = shuttles.some(
    (s) => s.status === 'LOCKED_PENDING_INSPECTION' || s.last_inspection_passed === false
  );

  const hasPmAlert = shuttles.some((s) => {
    const daysSinceSensorClean =
      (Date.now() - new Date(s.last_sensor_clean_at).getTime()) / 86400000;
    return (
      s.odometer_meters >= 9000000 ||
      s.lifting_cycles >= 95000 ||
      s.charge_cycles >= 2700 ||
      daysSinceSensorClean >= 7.0
    );
  });

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. TOP HEADER */}
      <header className="bg-[#0b101d] border-b border-slate-800/80 px-6 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-sm text-white">
            WA
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Wheel Assemblers</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                WCS v5.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400">High-Bay Deep-Lane Storage Dashboard</div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-[#070a12] p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              activeTab === 'OVERVIEW'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Storage & Flow
          </button>
          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              activeTab === 'MAINTENANCE'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Maintenance Gauges
          </button>
          <button
            onClick={() => setActiveTab('OEE')}
            className={`px-3 py-1.5 rounded-lg transition font-medium ${
              activeTab === 'OEE'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OEE & Takt
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOperatorModalOpen(true)}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
          >
            👤 Operators
          </button>

          <Link
            href="/mobile"
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/50 transition"
          >
            📱 Mobile
          </Link>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="text-right font-mono text-xs">
            <span className="text-slate-200 font-bold">{currentTime || '08:00:00'}</span>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs text-slate-500 hover:text-slate-300 ml-1"
            title="Sign Out"
          >
            ✕
          </button>
        </div>
      </header>

      {/* 2. COMPACT ALERT STRIP */}
      {(hasInspectionAlert || hasPmAlert) && (
        <div className="px-6 pt-2.5 space-y-1">
          {hasInspectionAlert && (
            <div className="bg-rose-950/40 border border-rose-500/30 px-3.5 py-1.5 rounded-lg flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-mono text-[11px] text-rose-400 font-bold uppercase">Interlock:</span>
                <span>Shuttle 1 pending morning inspection signoff (FR-7.2-04).</span>
              </div>
              <Link href="/mobile" className="text-[11px] text-rose-300 underline">
                Sign Off →
              </Link>
            </div>
          )}
          {hasPmAlert && (
            <div className="bg-amber-950/30 border border-amber-500/30 px-3.5 py-1.5 rounded-lg flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="font-mono text-[11px] text-amber-400 font-bold uppercase">Service Due:</span>
                <span>Shuttle 2 sensor cleaning & wheel threshold warning.</span>
              </div>
              <button onClick={() => setActiveTab('MAINTENANCE')} className="text-[11px] text-amber-300 underline">
                View Gauges →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. MAIN CONTENT */}
      <main className="flex-1 p-5 space-y-4">
        {/* TAB 1: STORAGE & FLOW (WITH REVISED ENGINEERING STOREROOM LAYOUT) */}
        {activeTab === 'OVERVIEW' && (
          <>
            {/* Top Row: Shuttle Vitals & Buffer */}
            <div className="grid grid-cols-4 gap-3">
              {/* Shuttle 1 */}
              <div className="bg-[#0b101d] border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Shuttle 1 (Rim Store)</span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-medium ${
                      shuttles[0].status === 'ACTIVE'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {shuttles[0].status === 'LOCKED_PENDING_INSPECTION' ? 'LOCKED' : shuttles[0].status}
                  </span>
                </div>
                <div className="my-2">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Battery</span>
                    <span className="text-slate-200 font-bold">{shuttles[0].battery_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${shuttles[0].battery_pct}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>Pos: <strong className="text-slate-300">{shuttles[0].current_bay}</strong></span>
                  <span>Depth: <strong className="text-cyan-400">Pos {shuttles[0].lane_position} / 29</strong></span>
                </div>
              </div>

              {/* Shuttle 2 */}
              <div className="bg-[#0b101d] border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Shuttle 2 (Tyre Store)</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {shuttles[1].status}
                  </span>
                </div>
                <div className="my-2">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Battery</span>
                    <span className="text-slate-200 font-bold">{shuttles[1].battery_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${shuttles[1].battery_pct}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>Pos: <strong className="text-slate-300">{shuttles[1].current_bay}</strong></span>
                  <span>Depth: <strong className="text-amber-400">Pos {shuttles[1].lane_position} / 29</strong></span>
                </div>
              </div>

              {/* Throughput */}
              <div className="bg-[#0b101d] border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                <div className="text-xs font-semibold text-white">Pallet Throughput Today</div>
                <div className="grid grid-cols-2 gap-2 my-1">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Inbound</span>
                    <span className="text-lg font-bold font-mono text-slate-100">148</span>
                    <span className="text-[10px] text-emerald-400 block font-mono">Pallets</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Outbound</span>
                    <span className="text-lg font-bold font-mono text-slate-100">112</span>
                    <span className="text-[10px] text-indigo-400 block font-mono">Pallets</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
                  <span>Target: 280</span>
                  <span className="text-emerald-400 font-semibold">92.8% Pace</span>
                </div>
              </div>

              {/* Buffer */}
              <div className="bg-[#0b101d] border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                <div className="text-xs font-semibold text-white">Usable Assembly Buffer</div>
                <div className="grid grid-cols-2 gap-2 my-1">
                  <div className="bg-[#070a12] p-1.5 rounded border border-slate-800">
                    <span className="text-[10px] font-mono text-amber-400 block font-semibold">Tyres</span>
                    <span className="text-base font-bold font-mono text-white">4.2 <span className="text-xs font-normal text-slate-400">Days</span></span>
                  </div>
                  <div className="bg-[#070a12] p-1.5 rounded border border-slate-800">
                    <span className="text-[10px] font-mono text-cyan-400 block font-semibold">Rims</span>
                    <span className="text-base font-bold font-mono text-white">5.1 <span className="text-xs font-normal text-slate-400">Days</span></span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
                  <span>Min Limit: 3.0d</span>
                  <span className="text-emerald-400 font-semibold font-mono">Status: Optimal</span>
                </div>
              </div>
            </div>

            {/* FULLY AUTOMATED HIGH-DENSITY DEEP-LANE STORAGE VISUALIZER */}
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    High-Density Deep-Lane Shuttle Storage Layout
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Multi-Directional Shuttle Channels • 29 Pallets Deep per Lane (36.15m Frame Length)
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/80" />
                    <span className="text-slate-300">Tyre Unit (400kg)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500/80" />
                    <span className="text-slate-300">Rim Unit (400kg)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-800 border border-slate-700" />
                    <span className="text-slate-500">Available Slot</span>
                  </div>
                </div>
              </div>

              {/* ZONE A: TYRE STOREROOM (ALLOCATED "ABOVE") */}
              <div className="bg-[#070a12] p-3 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span className="font-bold text-amber-300 uppercase tracking-wide">
                      Zone A: Tyre Storeroom (High-Density Shuttle Racking)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-slate-800">
                      Allocated Installation
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Capacity: <strong className="text-white">348 Pallets</strong> (6 Lanes × 2 Levels × 29 Deep)
                  </div>
                </div>

                {/* Tyre Deep-Lanes Grid */}
                <div className="space-y-1.5 pt-1">
                  {[1, 2, 3].map((laneNum) => (
                    <div key={`tyre-lane-${laneNum}`} className="flex items-center gap-2">
                      <span className="w-16 text-[10px] font-mono text-amber-400 font-semibold shrink-0">
                        Lane T{laneNum}
                      </span>
                      <div className="flex items-center gap-0.5 flex-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 overflow-x-auto">
                        <span className="text-[9px] font-mono text-slate-500 px-1 shrink-0">Infeed</span>
                        {Array.from({ length: 29 }, (_, i) => {
                          const pos = i + 1;
                          const isOccupied = (pos + laneNum) % 3 !== 0;
                          const isShuttle = shuttles[1]?.lane_position === pos && laneNum === 2;

                          return (
                            <div
                              key={pos}
                              title={`Tyre Lane T${laneNum} - Depth Position ${pos} of 29`}
                              className={`h-5 flex-1 min-w-[14px] rounded-sm flex items-center justify-center text-[8px] font-mono transition ${
                                isShuttle
                                  ? 'bg-amber-400 text-black font-black ring-2 ring-white animate-pulse'
                                  : isOccupied
                                  ? 'bg-amber-500/30 border border-amber-500/50 text-amber-200'
                                  : 'bg-slate-900 border border-slate-800/80 text-slate-700'
                              }`}
                            >
                              {isShuttle ? '🤖' : pos}
                            </div>
                          );
                        })}
                        <span className="text-[9px] font-mono text-slate-500 px-1 shrink-0">Outfeed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TRANSVERSE TRANSFER CORRIDOR */}
              <div className="h-4 flex items-center justify-between px-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest border-y border-dashed border-slate-800">
                <span>◀ Infeed / Loading Bay A (36,150mm Length)</span>
                <span className="text-indigo-400 font-bold">Multi-Directional Shuttle Transfer Runway</span>
                <span>Outfeed / Unloading Bay B ▶</span>
              </div>

              {/* ZONE B: RIM STOREROOM (AS DRAWN ON CAD BLUEPRINT - 464 PALLET CAPACITY) */}
              <div className="bg-[#070a12] p-3 rounded-xl border border-cyan-500/30 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span className="font-bold text-cyan-300 uppercase tracking-wide">
                      Zone B: Rim Storeroom (Drawing 202501939-01-02-00-L-01-C)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-slate-800">
                      Total Capacity: 464 Pallets
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Occupancy: <strong className="text-emerald-400 font-mono">384 / 464 (82.7%)</strong> • 29 Pallets Deep
                  </div>
                </div>

                {/* Rim Deep-Lanes Grid (Lanes 1 to 6 / Section CC & DD) */}
                <div className="space-y-1.5 pt-1">
                  {[1, 2, 5, 6].map((laneNum) => (
                    <div key={`rim-lane-${laneNum}`} className="flex items-center gap-2">
                      <span className="w-16 text-[10px] font-mono text-cyan-400 font-semibold shrink-0">
                        Lane {laneNum}
                      </span>
                      <div className="flex items-center gap-0.5 flex-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 overflow-x-auto">
                        <span className="text-[9px] font-mono text-slate-500 px-1 shrink-0">Infeed</span>
                        {Array.from({ length: 29 }, (_, i) => {
                          const pos = i + 1;
                          const isOccupied = (pos * laneNum + 2) % 4 !== 0;
                          const isShuttle = shuttles[0]?.lane_position === pos && laneNum === 2;

                          return (
                            <div
                              key={pos}
                              title={`Rim Storeroom Lane ${laneNum} - Depth Position ${pos} of 29`}
                              className={`h-5 flex-1 min-w-[14px] rounded-sm flex items-center justify-center text-[8px] font-mono transition ${
                                isShuttle
                                  ? 'bg-cyan-400 text-black font-black ring-2 ring-white animate-pulse'
                                  : isOccupied
                                  ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-200'
                                  : 'bg-slate-900 border border-slate-800/80 text-slate-700'
                              }`}
                            >
                              {isShuttle ? '🤖' : pos}
                            </div>
                          );
                        })}
                        <span className="text-[9px] font-mono text-slate-500 px-1 shrink-0">Outfeed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: MAINTENANCE PIE & DONUT GAUGES */}
        {activeTab === 'MAINTENANCE' && (
          <div className="space-y-4">
            {/* Shuttle 1 Gauges */}
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Shuttle 1 Health Gauges (Rim Storeroom)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">SHUTTLE-01</span>
                </div>
                <span className="text-xs font-mono text-slate-400">Usage-Based RCM Telemetry</span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <DonutGauge
                  value={shuttles[0].odometer_meters}
                  max={10000000}
                  label="Wheel Life"
                  sublabel="8,840 / 10,000"
                  unit="km"
                  warningThreshold={90}
                />
                <DonutGauge
                  value={shuttles[0].lifting_cycles}
                  max={100000}
                  label="Lifting Mechanism"
                  sublabel="89.4k / 100k"
                  unit="cycles"
                  warningThreshold={95}
                />
                <DonutGauge
                  value={shuttles[0].charge_cycles}
                  max={3000}
                  label="Battery Cycles"
                  sublabel="2,410 / 3,000"
                  unit="cycles"
                  warningThreshold={90}
                />
                <DonutGauge
                  value={3}
                  max={7}
                  label="Sensor Cleanliness"
                  sublabel="3 / 7"
                  unit="days"
                  warningThreshold={80}
                  dangerThreshold={100}
                />
              </div>
            </div>

            {/* Shuttle 2 Gauges */}
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Shuttle 2 Health Gauges (Tyre Storeroom)
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">SHUTTLE-02 (Service Due)</span>
                </div>
                <button
                  onClick={() => alert('Opening Formal FMEA: FMEA-SHUTTLE-RACK-004.pdf')}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded border border-slate-700 transition"
                >
                  📄 FMEA Document Link
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <DonutGauge
                  value={shuttles[1].odometer_meters}
                  max={10000000}
                  label="Wheel Life"
                  sublabel="9,350 / 10,000"
                  unit="km"
                  warningThreshold={90}
                />
                <DonutGauge
                  value={shuttles[1].lifting_cycles}
                  max={100000}
                  label="Lifting Mechanism"
                  sublabel="96.8k / 100k"
                  unit="cycles"
                  warningThreshold={95}
                />
                <DonutGauge
                  value={shuttles[1].charge_cycles}
                  max={3000}
                  label="Battery Cycles"
                  sublabel="2,890 / 3,000"
                  unit="cycles"
                  warningThreshold={90}
                />
                <DonutGauge
                  value={8}
                  max={7}
                  label="Sensor Cleanliness"
                  sublabel="8 / 7 (Overdue)"
                  unit="days"
                  warningThreshold={80}
                  dangerThreshold={100}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OEE & TAKT ANALYTICS */}
        {activeTab === 'OEE' && (
          <div className="bg-[#0b101d] border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">OEE & Takt Performance</span>
              <span className="text-lg font-bold font-mono text-indigo-400">86.3% OEE Aggregate</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#070a12] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Availability</span>
                  <span className="text-emerald-400 font-mono font-bold">94.2%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '94.2%' }} />
                </div>
                <div className="text-[10px] font-mono text-slate-400">452.0 / 480.0 Operating Mins</div>
              </div>

              <div className="bg-[#070a12] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Performance</span>
                  <span className="text-cyan-400 font-mono font-bold">92.4%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: '92.4%' }} />
                </div>
                <div className="text-[10px] font-mono text-slate-400">Actual Cycle: 81.2s (Takt: 75.0s)</div>
              </div>

              <div className="bg-[#070a12] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Quality Rate</span>
                  <span className="text-indigo-400 font-mono font-bold">99.2%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: '99.2%' }} />
                </div>
                <div className="text-[10px] font-mono text-slate-400">318 / 320 Pallets Placed RFT</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Operator Modal */}
      <OperatorManagementModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
      />
    </div>
  );
}
