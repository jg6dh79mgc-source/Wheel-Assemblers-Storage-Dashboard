'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Types for TV Dashboard
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
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'OEE' | 'MAINTENANCE'>('OVERVIEW');
  const [shuttles, setShuttles] = useState<ShuttleData[]>([
    {
      id: '1',
      code: 'SHUTTLE-01',
      display_name: 'Shuttle 1 (South Bank)',
      status: 'LOCKED_PENDING_INSPECTION',
      battery_pct: 94,
      odometer_meters: 8840200, // 8,840 km / 10,000 km
      lifting_cycles: 89400,    // 89,400 / 100,000 cycles
      charge_cycles: 2410,     // 2,410 / 3,000 cycles
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
      odometer_meters: 9350400, // 9,350 km -> PM WARNING (>9000 km)
      lifting_cycles: 96800,    // 96,800 -> PM WARNING (>95000)
      charge_cycles: 2890,     // 2,890 -> WARNING (>2700)
      last_sensor_clean_at: new Date(Date.now() - 8 * 86400000).toISOString(), // > 7 days -> PM WARNING
      last_inspection_passed: true,
      current_bay: 'Bay 09 - Level 4',
    },
  ]);

  const [inboundCount, setInboundCount] = useState<number>(148);
  const [outboundCount, setOutboundCount] = useState<number>(112);
  const [stockBufferTires, setStockBufferTires] = useState<number>(4.2);
  const [stockBufferRims, setStockBufferRims] = useState<number>(5.1);

  // OEE Data
  const oeeData = {
    availability: 94.2,
    actualCycleTime: 81.2,
    taktTime: 75.0,
    performance: 92.4, // (75 / 81.2) * 100
    quality: 99.2,     // 318 / 320
    overallOee: 86.3,  // 0.942 * 0.924 * 0.992
  };

  // Clock tick
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch from Supabase (with fallback to default state)
  useEffect(() => {
    async function loadLiveData() {
      try {
        const { data: shuttleRes } = await supabase.from('shuttles').select('*').order('code');
        if (shuttleRes && shuttleRes.length > 0) {
          setShuttles(shuttleRes as any);
        }
      } catch (err) {
        console.warn('Using local telemetry state:', err);
      }
    }
    loadLiveData();

    // Supabase Realtime Subscription for live telemetry updates
    const channel = supabase
      .channel('tv-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shuttles' },
        (payload: any) => {
          const newRecord = payload?.new as ShuttleData | undefined;
          if (newRecord && newRecord.id) {
            setShuttles((prev) =>
              prev.map((s) => (s.id === newRecord.id ? { ...s, ...newRecord } : s))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check alert conditions
  const hasInspectionAlert = shuttles.some(
    (s) => s.status === 'LOCKED_PENDING_INSPECTION' || s.last_inspection_passed === false
  );

  const hasPmAlert = shuttles.some((s) => {
    const daysSinceSensorClean =
      (Date.now() - new Date(s.last_sensor_clean_at).getTime()) / 86400000;
    return (
      s.odometer_meters >= 9000000 || // 9,000 km
      s.lifting_cycles >= 95000 ||
      s.charge_cycles >= 2700 ||
      daysSinceSensorClean >= 7.0
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. TOP HEADER & TELEMETRY CLOCK */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/20">
            WA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-widest text-indigo-400 uppercase">
                Wheel Assemblers
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono border border-indigo-700/50">
                WCS v4.8
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-100">
              High-Bay Automation Racking Control & Maintenance Hub
            </h1>
          </div>
        </div>

        {/* Navigation Tabs for TV Operator */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'OVERVIEW'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Main KPI Screen
          </button>
          <button
            onClick={() => setActiveTab('OEE')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'OEE'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⏱️ OEE & Performance
          </button>
          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'MAINTENANCE'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🛠️ Maintenance Hub (FMEA)
          </button>
        </div>

        {/* Live Clock & Shift Status */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Shift 1 • Auto-Dispatch
            </div>
            <div className="text-xl font-mono font-black text-emerald-400 tracking-wider">
              {currentTime || '08:00:00'}
            </div>
          </div>
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" title="Telemetry Heartbeat Active" />
        </div>
      </header>

      {/* 2. DYNAMIC LIVE ALERTS BANNER (Module B Requirement) */}
      <section className="px-6 pt-4 space-y-2">
        {/* Red Alert: Missing Inspection / Locked Shuttle */}
        {hasInspectionAlert && (
          <div className="bg-red-950/90 border-2 border-red-500 text-red-100 px-5 py-3 rounded-xl shadow-2xl flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <span className="font-extrabold uppercase tracking-wide text-red-300 text-sm">
                  CRITICAL INTERLOCK ALERT: MORNING INSPECTION MISSING OR FAILED
                </span>
                <p className="text-xs text-red-200 mt-0.5">
                  Shuttle 1 has not passed daily safety inspection form <span className="font-mono font-bold underline">FR-7.2-04</span>. Shuttle electronic interlock is <strong className="text-white">LOCKED</strong>. Autonomous rack dispatch halted.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono bg-red-800 text-white px-3 py-1 rounded font-bold border border-red-400">
              BLOCKING OPERATIONS
            </span>
          </div>
        )}

        {/* Yellow Alert: Preventative Maintenance Due Within 24h */}
        {hasPmAlert && (
          <div className="bg-amber-950/80 border border-amber-500/80 text-amber-100 px-5 py-2.5 rounded-xl shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <span className="font-bold uppercase tracking-wide text-amber-300 text-xs">
                  PREVENTATIVE MAINTENANCE WARNING (DUE WITHIN 24 HOURS)
                </span>
                <p className="text-xs text-amber-200/90">
                  Shuttle 2: Optical sensor clean due (&gt;7 days) & Wheel odometer is at 93.5% of 10,000 km threshold. Schedule maintenance window during Shift 2 changeover.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('MAINTENANCE')}
              className="text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-lg transition"
            >
              View Matrix →
            </button>
          </div>
        )}
      </section>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 p-6 space-y-6">
        {activeTab === 'OVERVIEW' && (
          <>
            {/* ROW 1: LIVE SHUTTLE VITALS & THROUGHPUT & BUFFER */}
            <div className="grid grid-cols-12 gap-5">
              {/* SHUTTLE 1 VITALS */}
              {shuttles[0] && (
                <div className="col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                        {shuttles[0].code}
                      </div>
                      <h3 className="text-base font-extrabold text-white">{shuttles[0].display_name}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                        shuttles[0].status === 'ACTIVE'
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                          : shuttles[0].status === 'FAULT'
                          ? 'bg-red-950 border-red-500 text-red-400'
                          : 'bg-amber-950 border-amber-500 text-amber-400 animate-pulse'
                      }`}
                    >
                      {shuttles[0].status}
                    </span>
                  </div>

                  {/* Battery Gauge */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Battery Level</span>
                      <span className="font-bold text-emerald-400">{shuttles[0].battery_pct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all"
                        style={{ width: `${shuttles[0].battery_pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800/80 text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Position</span>
                      <span className="font-semibold text-indigo-300">{shuttles[0].current_bay || 'Bay A-04'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">FR-7.2-04 Status</span>
                      <span className="font-semibold text-amber-400">Pending Pass</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SHUTTLE 2 VITALS */}
              {shuttles[1] && (
                <div className="col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                        {shuttles[1].code}
                      </div>
                      <h3 className="text-base font-extrabold text-white">{shuttles[1].display_name}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                        shuttles[1].status === 'ACTIVE'
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                          : 'bg-red-950 border-red-500 text-red-400'
                      }`}
                    >
                      {shuttles[1].status}
                    </span>
                  </div>

                  {/* Battery Gauge */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Battery Level</span>
                      <span className="font-bold text-emerald-400">{shuttles[1].battery_pct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all"
                        style={{ width: `${shuttles[1].battery_pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800/80 text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Position</span>
                      <span className="font-semibold text-indigo-300">{shuttles[1].current_bay || 'Bay B-09'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Inspection</span>
                      <span className="font-semibold text-emerald-400">Verified Today ✓</span>
                    </div>
                  </div>
                </div>
              )}

              {/* THROUGHPUT METRICS */}
              <div className="col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                    Daily Facility Throughput
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-mono">INBOUND PALLETS</span>
                      <span className="text-2xl font-mono font-black text-cyan-400">{inboundCount}</span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">+18% vs target</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-mono">OUTBOUND PALLETS</span>
                      <span className="text-2xl font-mono font-black text-indigo-400">{outboundCount}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">On Schedule</span>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between border-t border-slate-800">
                  <span>Target: 280 pallets/shift</span>
                  <span className="font-mono text-emerald-400 font-bold">92.8% Pace</span>
                </div>
              </div>

              {/* USABLE STOCK BUFFER (DAYS) */}
              <div className="col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                    Usable Assembly Buffer
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {/* Tires Buffer */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-400 font-mono font-bold">TIRES BUFFER</span>
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                      </div>
                      <div className="text-2xl font-mono font-black text-white mt-1">
                        {stockBufferTires} <span className="text-xs font-normal text-slate-400">Days</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: '70%' }} />
                      </div>
                    </div>

                    {/* Rims Buffer */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-cyan-400 font-mono font-bold">RIMS BUFFER</span>
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      </div>
                      <div className="text-2xl font-mono font-black text-white mt-1">
                        {stockBufferRims} <span className="text-xs font-normal text-slate-400">Days</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2">
                        <div className="bg-cyan-400 h-full rounded-full" style={{ width: '85%' }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between border-t border-slate-800">
                  <span>Safety Stock Limit: 3.0 Days</span>
                  <span className="text-emerald-400 font-semibold font-mono">STATUS: OPTIMAL</span>
                </div>
              </div>
            </div>

            {/* ROW 2: HIGH-DENSITY DEEP-LANE CAVITY UTILIZATION HEATMAP */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>🏢 Deep-Lane Storage Racking Cavity Heatmap</span>
                    <span className="text-xs font-mono font-normal text-slate-400">
                      (12 Bays × 5 Levels • High Density Deep Lane)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time automated multi-directional shuttle allocation by SKU category.
                  </p>
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-cyan-500 shadow-sm shadow-cyan-500/50" />
                    <span className="text-slate-300">Rims SKU (48%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-amber-500 shadow-sm shadow-amber-500/50" />
                    <span className="text-slate-300">Tires SKU (38%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-800 border border-slate-700" />
                    <span className="text-slate-400">Empty Cavity (14%)</span>
                  </div>
                </div>
              </div>

              {/* Racking Matrix Grid (5 Levels high x 12 Bays wide) */}
              <div className="space-y-1.5 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                {[5, 4, 3, 2, 1].map((level) => (
                  <div key={level} className="flex items-center gap-2">
                    <span className="w-14 text-[10px] font-mono text-slate-400 font-bold shrink-0">
                      LVL {level}
                    </span>
                    <div className="grid grid-cols-12 gap-1.5 flex-1">
                      {Array.from({ length: 12 }, (_, bayIndex) => {
                        const bayNum = bayIndex + 1;
                        // Deterministic visual mockup calculation matching warehouse storage pattern
                        const isOccupied = (bayNum * level + 3) % 7 !== 0;
                        const isTire = (bayNum + level) % 2 === 0;

                        return (
                          <div
                            key={bayNum}
                            title={`Bay ${bayNum}, Level ${level}: ${isOccupied ? (isTire ? 'TIRES SKU-225' : 'RIMS ALLOY-18') : 'EMPTY'}`}
                            className={`h-7 rounded flex items-center justify-center text-[9px] font-mono font-bold transition-all hover:scale-105 cursor-pointer border ${
                              !isOccupied
                                ? 'bg-slate-900 border-slate-800 text-slate-600'
                                : isTire
                                ? 'bg-amber-500/80 hover:bg-amber-400 border-amber-400/40 text-amber-950 font-extrabold shadow-sm'
                                : 'bg-cyan-500/80 hover:bg-cyan-400 border-cyan-400/40 text-cyan-950 font-extrabold shadow-sm'
                            }`}
                          >
                            B{bayNum}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-3 px-1">
                <span>Racking Utilization: <strong className="text-emerald-400 font-mono">86.2%</strong> of 240 Deep Cavities Occupied</span>
                <span>FIFO Turnover Rate: <strong className="text-indigo-400 font-mono">3.4 Days Avg</strong></span>
              </div>
            </div>
          </>
        )}

        {/* 4. MODULE C: OEE & PERFORMANCE DROPDOWN / TAB */}
        {activeTab === 'OEE' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>⏱️ High-Bay Automation OEE & Production Takt Analysis</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Overall Equipment Effectiveness based on standard takt cycle times vs automated shuttle travel.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">World-Class Target: 85%</span>
                <span className="text-3xl font-mono font-black text-indigo-400">
                  {oeeData.overallOee}% <span className="text-xs text-emerald-400 font-semibold">OEE</span>
                </span>
              </div>
            </div>

            {/* OEE 3 Pillars: Availability, Performance, Quality */}
            <div className="grid grid-cols-3 gap-6">
              {/* AVAILABILITY */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">1. Availability</span>
                  <span className="text-2xl font-mono font-black text-emerald-400">{oeeData.availability}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${oeeData.availability}%` }} />
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Planned Operating:</span>
                    <span className="text-slate-200">480.0 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unplanned Downtime:</span>
                    <span className="text-red-400">28.0 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Operating:</span>
                    <span className="text-slate-200">452.0 min</span>
                  </div>
                </div>
              </div>

              {/* PERFORMANCE */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">2. Performance</span>
                  <span className="text-2xl font-mono font-black text-cyan-400">{oeeData.performance}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${oeeData.performance}%` }} />
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Engineered Takt Time:</span>
                    <span className="text-emerald-400 font-bold">{oeeData.taktTime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual Shuttle Cycle:</span>
                    <span className="text-amber-400 font-bold">{oeeData.actualCycleTime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cycle Variance:</span>
                    <span className="text-slate-200">+6.2s delta</span>
                  </div>
                </div>
              </div>

              {/* QUALITY */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">3. Quality</span>
                  <span className="text-2xl font-mono font-black text-indigo-400">{oeeData.quality}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${oeeData.quality}%` }} />
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Pallets Handled:</span>
                    <span className="text-slate-200">260</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Misaligned Cavities:</span>
                    <span className="text-slate-200">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Right-First-Time:</span>
                    <span className="text-emerald-400">99.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. MODULE D: MAINTENANCE HUB (USAGE-BASED TRACKING) */}
        {activeTab === 'MAINTENANCE' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>🛠️ Predictive Usage-Based Maintenance Gauges</span>
                  <span className="text-xs bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-700/50 font-mono">
                    Engineering RCM System
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Wear-index tracking replaces arbitrary calendar scheduling with actual shuttle odometer & cycle telemetry.
                </p>
              </div>

              {/* FMEA Link Button */}
              <a
                href="#fmea-modal"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Opening Formal FMEA: FMEA-SHUTTLE-RACK-004.pdf (Failure Mode & Effects Analysis - Deep-Lane Shuttle Units)');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-indigo-300 rounded-xl flex items-center gap-1.5 shadow-md transition"
              >
                📄 View Formal FMEA Matrix →
              </a>
            </div>

            {/* The 4 Usage-Based Health Gauges for Both Shuttles */}
            <div className="grid grid-cols-2 gap-6">
              {shuttles.map((shuttle) => {
                const wheelKm = (shuttle.odometer_meters / 1000).toFixed(1);
                const wheelPct = Math.min(100, Math.round((shuttle.odometer_meters / 10000000) * 100));
                const liftPct = Math.min(100, Math.round((shuttle.lifting_cycles / 100000) * 100));
                const batteryCyclePct = Math.min(100, Math.round((shuttle.charge_cycles / 3000) * 100));
                const daysSinceClean = Math.round(
                  (Date.now() - new Date(shuttle.last_sensor_clean_at).getTime()) / 86400000
                );

                return (
                  <div key={shuttle.id} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                      <span className="font-extrabold text-white text-sm">{shuttle.display_name}</span>
                      <span className="text-[11px] font-mono text-slate-400">{shuttle.code}</span>
                    </div>

                    {/* 1. Wheel Life Gauge (10,000 km replacement) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">1. Wheel Life (Replace @ 10,000 km)</span>
                        <span className={`font-mono font-bold ${wheelPct >= 90 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {wheelKm} km / 10,000 km ({wheelPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            wheelPct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${wheelPct}%` }}
                        />
                      </div>
                    </div>

                    {/* 2. Lifting Mechanism Gauge (100,000 cycles greasing) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">2. Lift Mechanism (Grease @ 100k Cycles)</span>
                        <span className={`font-mono font-bold ${liftPct >= 95 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {shuttle.lifting_cycles.toLocaleString()} / 100,000 ({liftPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            liftPct >= 95 ? 'bg-amber-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${liftPct}%` }}
                        />
                      </div>
                    </div>

                    {/* 3. Battery Degradation (3,000 cycles warning) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">3. Battery Degradation (Warning @ 3,000 Cycles)</span>
                        <span className={`font-mono font-bold ${batteryCyclePct >= 90 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {shuttle.charge_cycles} / 3,000 Cycles ({batteryCyclePct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            batteryCyclePct >= 90 ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${batteryCyclePct}%` }}
                        />
                      </div>
                    </div>

                    {/* 4. Sensor Cleanliness (7 calendar days) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">4. Optical Sensor Cleanliness (Warning every 7 Days)</span>
                        <span className={`font-mono font-bold ${daysSinceClean >= 7 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {daysSinceClean} Days Elapsed {daysSinceClean >= 7 ? '(OVERDUE)' : ''}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            daysSinceClean >= 7 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (daysSinceClean / 7) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Digital Maintenance Matrix Table */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Digital Maintenance Matrix & Action Schedule
              </h4>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-2">Component</th>
                    <th className="p-2">Trigger Metric</th>
                    <th className="p-2">Current Status</th>
                    <th className="p-2">Prescribed Engineering Action</th>
                    <th className="p-2">FMEA RPN Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="p-2 font-bold text-slate-200">Polyurethane Wheels</td>
                    <td className="p-2">Odometer &gt; 9,000 km</td>
                    <td className="p-2 text-amber-400">Shuttle 2 (9,350 km)</td>
                    <td className="p-2 text-slate-300">Schedule drive-wheel tread depth inspection & replacement.</td>
                    <td className="p-2 text-indigo-400">RPN-144 (FM-SH-01)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-200">Hydraulic/Screw Lifter</td>
                    <td className="p-2">Cycles &gt; 95,000</td>
                    <td className="p-2 text-amber-400">Shuttle 2 (96,800 cycles)</td>
                    <td className="p-2 text-slate-300">Apply lithium food/industrial-grade grease to lifting guide channels.</td>
                    <td className="p-2 text-indigo-400">RPN-96 (FM-SH-03)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-200">H1/H2 Optical Sensors</td>
                    <td className="p-2">Elapsed &gt; 7 Days</td>
                    <td className="p-2 text-red-400">Shuttle 2 (8 Days)</td>
                    <td className="p-2 text-slate-300">Clean optical lens with isopropyl alcohol wipe; verify green LED trigger.</td>
                    <td className="p-2 text-indigo-400">RPN-180 (FM-SH-08)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-200">LiFePO4 Power Pack</td>
                    <td className="p-2">Cycles &gt; 2,700</td>
                    <td className="p-2 text-amber-400">Shuttle 2 (2,890 cycles)</td>
                    <td className="p-2 text-slate-300">Conduct internal resistance & cell balancing discharge test.</td>
                    <td className="p-2 text-indigo-400">RPN-120 (FM-SH-11)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs text-slate-500 font-mono">
        <div>Wheel Assemblers High-Bay Storage • Deep-Lane Automated Shuttle Cell</div>
        <div>Interlock System: Online • Supabase Telemetry Synced • Render Host</div>
      </footer>
    </div>
  );
}
