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
  last_inspection_at?: string;
  current_bay?: string;
}

export default function TvKpiDashboard() {
  const router = useRouter();
  const [currentUser, setLocalCurrentUser] = useState<any>(null);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'OEE' | 'MAINTENANCE'>('OVERVIEW');

  const [shuttles, setShuttles] = useState<ShuttleData[]>([
    {
      id: '1',
      code: 'SHUTTLE-01',
      display_name: 'Shuttle 1 (South Bank)',
      status: 'LOCKED_PENDING_INSPECTION',
      battery_pct: 94,
      odometer_meters: 8840200,
      lifting_cycles: 89400,
      charge_cycles: 2410,
      last_sensor_clean_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      last_inspection_passed: false,
      current_bay: 'Bay 04 - Level 2',
    },
    {
      id: '2',
      code: 'SHUTTLE-02',
      display_name: 'Shuttle 2 (North Bank)',
      status: 'ACTIVE',
      battery_pct: 82,
      odometer_meters: 9350400,
      lifting_cycles: 96800,
      charge_cycles: 2890,
      last_sensor_clean_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      last_inspection_passed: true,
      current_bay: 'Bay 09 - Level 4',
    },
  ]);

  const [inboundCount, setInboundCount] = useState<number>(148);
  const [outboundCount, setOutboundCount] = useState<number>(112);
  const [stockBufferTires, setStockBufferTires] = useState<number>(4.2);
  const [stockBufferRims, setStockBufferRims] = useState<number>(5.1);

  // OEE Telemetry
  const oeeData = {
    availability: 94.2,
    actualCycleTime: 81.2,
    taktTime: 75.0,
    performance: 92.4,
    quality: 99.2,
    overallOee: 86.3,
  };

  // Clock
  useEffect(() => {
    setLocalCurrentUser(getCurrentUser());
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

  // Supabase Data & Realtime Listener
  useEffect(() => {
    async function loadLiveData() {
      try {
        const { data } = await supabase.from('shuttles').select('*').order('code');
        if (data && data.length > 0) {
          setShuttles(data as any);
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
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. ULTRA-SLEEK TOP NAVIGATION & TELEMETRY BAR */}
      <header className="bg-[#0e1424] border-b border-slate-800/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-sm">
            WA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">Wheel Assemblers</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Intralogistics WCS
              </span>
            </div>
            <div className="text-[11px] text-slate-400">High-Bay Automated Racking Operations</div>
          </div>
        </div>

        {/* Sleek Central Tab Selector */}
        <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'OVERVIEW'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Monitor Overview
          </button>
          <button
            onClick={() => setActiveTab('OEE')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'OEE'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OEE & Takt
          </button>
          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'MAINTENANCE'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Maintenance & FMEA
          </button>
        </div>

        {/* Right Tools: Admin Operator Management, Live Time & Sign Out */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsOperatorModalOpen(true)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition flex items-center gap-1.5"
            title="Manage Authorized Operators"
          >
            <span>👤 Operators</span>
          </button>

          <Link
            href="/mobile"
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-800/50 transition flex items-center gap-1"
          >
            <span>📱 Mobile View</span>
          </Link>

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Clock & Status */}
          <div className="text-right font-mono">
            <div className="text-[10px] text-slate-500 uppercase">Shift 1 • Running</div>
            <div className="text-sm font-bold text-slate-200">{currentTime || '08:00:00'}</div>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs text-slate-500 hover:text-slate-300 p-1"
            title="Sign Out"
          >
            ✕
          </button>
        </div>
      </header>

      {/* 2. REFINED, UNCLUTTERED STATUS & ALERT STRIP */}
      {(hasInspectionAlert || hasPmAlert) && (
        <div className="px-6 pt-3 space-y-1.5">
          {hasInspectionAlert && (
            <div className="bg-rose-950/40 border border-rose-500/40 px-4 py-2 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-rose-200">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-semibold uppercase tracking-wide text-[11px] text-rose-400 font-mono">
                  Safety Interlock:
                </span>
                <span>
                  Shuttle 1 requires daily inspection signoff (FR-7.2-04). Auto-dispatch locked.
                </span>
              </div>
              <Link
                href="/mobile"
                className="text-[11px] font-semibold text-rose-300 hover:text-white underline underline-offset-2 ml-4"
              >
                Sign Off Inspection →
              </Link>
            </div>
          )}

          {hasPmAlert && (
            <div className="bg-amber-950/30 border border-amber-500/30 px-4 py-2 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="font-semibold uppercase tracking-wide text-[11px] text-amber-400 font-mono">
                  Preventative Maintenance:
                </span>
                <span>
                  Shuttle 2 approaching service thresholds (Wheel wear 93.5% / Sensor clean overdue).
                </span>
              </div>
              <button
                onClick={() => setActiveTab('MAINTENANCE')}
                className="text-[11px] font-semibold text-amber-300 hover:text-white underline underline-offset-2 ml-4"
              >
                View Action Matrix →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. PRIMARY CONTENT AREA */}
      <main className="flex-1 p-6 space-y-6">
        {activeTab === 'OVERVIEW' && (
          <>
            {/* ROW 1: 4 SLEEK TELEMETRY TILES */}
            <div className="grid grid-cols-4 gap-4">
              {/* SHUTTLE 1 */}
              <div className="bg-[#0e1424] border border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">Shuttle 1</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                        shuttles[0]?.status === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : shuttles[0]?.status === 'FAULT'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      }`}
                    >
                      {shuttles[0]?.status === 'LOCKED_PENDING_INSPECTION' ? 'PENDING INSPECTION' : shuttles[0]?.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Battery</span>
                      <span className="text-slate-200 font-bold">{shuttles[0]?.battery_pct ?? 94}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${shuttles[0]?.battery_pct ?? 94}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                  <span>Loc: <strong className="text-slate-300">{shuttles[0]?.current_bay || 'Bay 04'}</strong></span>
                  <span>Odo: <strong className="text-slate-300">8,840 km</strong></span>
                </div>
              </div>

              {/* SHUTTLE 2 */}
              <div className="bg-[#0e1424] border border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">Shuttle 2</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                        shuttles[1]?.status === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {shuttles[1]?.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Battery</span>
                      <span className="text-slate-200 font-bold">{shuttles[1]?.battery_pct ?? 82}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${shuttles[1]?.battery_pct ?? 82}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                  <span>Loc: <strong className="text-slate-300">{shuttles[1]?.current_bay || 'Bay 09'}</strong></span>
                  <span>Odo: <strong className="text-amber-400">9,350 km</strong></span>
                </div>
              </div>

              {/* THROUGHPUT TODAY */}
              <div className="bg-[#0e1424] border border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">Throughput Today</span>
                  <span className="text-[10px] font-mono text-slate-400">Shift Target: 280</span>
                </div>

                <div className="grid grid-cols-2 gap-3 my-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Inbound</span>
                    <span className="text-xl font-bold font-mono text-slate-100">{inboundCount}</span>
                    <span className="text-[10px] text-emerald-400 block font-mono">Pallets</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Outbound</span>
                    <span className="text-xl font-bold font-mono text-slate-100">{outboundCount}</span>
                    <span className="text-[10px] text-indigo-400 block font-mono">Pallets</span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60 flex justify-between">
                  <span>Quota Progress:</span>
                  <span className="text-emerald-400 font-semibold font-mono">92.8%</span>
                </div>
              </div>

              {/* USABLE STOCK BUFFER */}
              <div className="bg-[#0e1424] border border-slate-800/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">Usable Stock Buffer</span>
                  <span className="text-[10px] font-mono text-emerald-400">Safe (&gt; 3.0d)</span>
                </div>

                <div className="grid grid-cols-2 gap-3 my-2">
                  <div className="bg-[#090d16] p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-mono text-amber-400 block font-semibold">Tires</span>
                    <span className="text-lg font-bold font-mono text-white">{stockBufferTires} <span className="text-xs font-normal text-slate-400">Days</span></span>
                  </div>
                  <div className="bg-[#090d16] p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-mono text-cyan-400 block font-semibold">Rims</span>
                    <span className="text-lg font-bold font-mono text-white">{stockBufferRims} <span className="text-xs font-normal text-slate-400">Days</span></span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/60 flex justify-between">
                  <span>Min Buffer Limit:</span>
                  <span className="text-slate-300 font-mono">3.0 Days</span>
                </div>
              </div>
            </div>

            {/* ROW 2: SLEEK DEEP-LANE RACKING VISUALIZER */}
            <div className="bg-[#0e1424] border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Deep-Lane Storage Racking Matrix
                  </h3>
                  <p className="text-xs text-slate-400">
                    High-density bay allocation • 12 Bays × 5 Vertical Levels
                  </p>
                </div>

                {/* Sleek Legend */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500/80" />
                    <span className="text-slate-300">Rims SKU (48%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/80" />
                    <span className="text-slate-300">Tires SKU (38%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-800 border border-slate-700" />
                    <span className="text-slate-500">Available (14%)</span>
                  </div>
                </div>
              </div>

              {/* Matrix Layout */}
              <div className="bg-[#090d16] p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                {[5, 4, 3, 2, 1].map((lvl) => (
                  <div key={lvl} className="flex items-center gap-2">
                    <span className="w-10 text-[10px] font-mono text-slate-500 text-right pr-1">
                      L{lvl}
                    </span>
                    <div className="grid grid-cols-12 gap-1.5 flex-1">
                      {Array.from({ length: 12 }, (_, i) => {
                        const bay = i + 1;
                        const isOccupied = (bay * lvl + 3) % 7 !== 0;
                        const isTire = (bay + lvl) % 2 === 0;

                        return (
                          <div
                            key={bay}
                            title={`Bay ${bay}, Level ${lvl}: ${isOccupied ? (isTire ? 'Tires SKU' : 'Rims SKU') : 'Empty'}`}
                            className={`h-6 rounded flex items-center justify-center text-[9px] font-mono font-medium transition cursor-pointer border ${
                              !isOccupied
                                ? 'bg-slate-900/60 border-slate-800/60 text-slate-600'
                                : isTire
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
                            }`}
                          >
                            B{bay}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-1">
                <span>Racking Occupancy: <strong className="text-slate-200">207 / 240 Cavities (86.2%)</strong></span>
                <span>Turnover Rate: <strong className="text-slate-200">3.4 Days Average</strong></span>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: OEE & TAKT TIME ANALYTICS */}
        {activeTab === 'OEE' && (
          <div className="bg-[#0e1424] border border-slate-800/80 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">Overall Equipment Effectiveness (OEE)</h3>
                <p className="text-xs text-slate-400">Automated multi-directional shuttle performance metrics</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Aggregate OEE</span>
                <span className="text-2xl font-bold font-mono text-indigo-400">{oeeData.overallOee}%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Availability</span>
                  <span className="text-emerald-400 font-mono">{oeeData.availability}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${oeeData.availability}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 font-mono">Net Operating: 452.0 / 480.0 min</p>
              </div>

              <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Performance</span>
                  <span className="text-cyan-400 font-mono">{oeeData.performance}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full" style={{ width: `${oeeData.performance}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 font-mono">Actual Cycle: 81.2s (Takt: 75.0s)</p>
              </div>

              <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Quality Rate</span>
                  <span className="text-indigo-400 font-mono">{oeeData.quality}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full" style={{ width: `${oeeData.quality}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 font-mono">Pallets Handled: 318 / 320 RFT</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MAINTENANCE & FMEA */}
        {activeTab === 'MAINTENANCE' && (
          <div className="bg-[#0e1424] border border-slate-800/80 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-white">Usage-Based Preventive Health Gauges</h3>
                <p className="text-xs text-slate-400">Reliability-Centered Maintenance (RCM) wear indexes</p>
              </div>
              <button
                onClick={() => alert('FMEA Matrix: FMEA-SHUTTLE-RACK-004.pdf')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg border border-slate-700 transition"
              >
                📄 FMEA Matrix Link
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {shuttles.map((s) => (
                <div key={s.id} className="bg-[#090d16] p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                    <span className="text-xs font-semibold text-white">{s.display_name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{s.code}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Wheel Wear (10,000 km)</span>
                      <span className="text-slate-200">{(s.odometer_meters / 1000).toFixed(1)} km</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.odometer_meters >= 9000000 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (s.odometer_meters / 10000000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Lifting Mechanism (100k cycles)</span>
                      <span className="text-slate-200">{s.lifting_cycles.toLocaleString()} cycles</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.lifting_cycles >= 95000 ? 'bg-amber-400' : 'bg-cyan-500'}`}
                        style={{ width: `${Math.min(100, (s.lifting_cycles / 100000) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Battery Degradation (3k cycles)</span>
                      <span className="text-slate-200">{s.charge_cycles} cycles</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (s.charge_cycles / 3000) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Operator Management Modal */}
      <OperatorManagementModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
      />
    </div>
  );
}
