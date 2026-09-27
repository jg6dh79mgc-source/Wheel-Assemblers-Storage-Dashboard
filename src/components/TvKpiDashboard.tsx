'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { setCurrentUser } from '@/lib/authStore';
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
  current_storeroom?: 'RIM' | 'TYRE';
  current_lane?: string;
  current_level?: number;
}

// Clean Circular Gauge
function CircularMetric({
  value,
  max,
  label,
  sublabel,
  unit = '',
  warningPct = 90,
}: {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  unit?: string;
  warningPct?: number;
}) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const strokeColor = pct >= warningPct ? '#f59e0b' : '#3b82f6';

  return (
    <div className="bg-[#1e293b] p-3 rounded-lg border border-slate-700/60 flex flex-col items-center">
      <div className="relative w-16 h-16 mb-1 flex items-center justify-center">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 70 70">
          <circle
            cx="35"
            cy="35"
            r={radius}
            className="stroke-slate-700"
            strokeWidth="5"
            fill="transparent"
          />
          <circle
            cx="35"
            cy="35"
            r={radius}
            stroke={strokeColor}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
          <span className="text-xs font-bold text-slate-100">{pct}%</span>
        </div>
      </div>
      <div className="text-xs font-medium text-slate-200">{label}</div>
      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
        {sublabel} {unit}
      </div>
    </div>
  );
}

// Cavity Definition
interface CavitySlot {
  store: 'RIM_STORE' | 'TYRE_STORE';
  col: string;
  level: number;
  type: 'LARGE_RIM' | 'SMALL_RIM' | 'EMPTY';
  partCode: string;
  occupied: number;
  capacity: number;
}

// Rim Storeroom (Left Building, 8,730 mm width, Lanes L to G)
const RIM_STOREROOM_CAVITIES: CavitySlot[] = [
  // Level 2 (Top)
  { store: 'RIM_STORE', col: 'L', level: 2, type: 'EMPTY', partCode: '—', occupied: 0, capacity: 29 },
  { store: 'RIM_STORE', col: 'K', level: 2, type: 'SMALL_RIM', partCode: 'Overflow', occupied: 24, capacity: 29 },
  { store: 'RIM_STORE', col: 'J', level: 2, type: 'LARGE_RIM', partCode: 'F119', occupied: 28, capacity: 29 },
  { store: 'RIM_STORE', col: 'I', level: 2, type: 'LARGE_RIM', partCode: 'F90', occupied: 27, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 2, type: 'SMALL_RIM', partCode: 'F100', occupied: 29, capacity: 29 },
  { store: 'RIM_STORE', col: 'G', level: 2, type: 'EMPTY', partCode: '—', occupied: 0, capacity: 29 },

  // Level 1 (Middle)
  { store: 'RIM_STORE', col: 'L', level: 1, type: 'LARGE_RIM', partCode: 'F117 / F118', occupied: 26, capacity: 29 },
  { store: 'RIM_STORE', col: 'K', level: 1, type: 'SMALL_RIM', partCode: '5a19d', occupied: 22, capacity: 29 },
  { store: 'RIM_STORE', col: 'J', level: 1, type: 'LARGE_RIM', partCode: 'F91', occupied: 29, capacity: 29 },
  { store: 'RIM_STORE', col: 'I', level: 1, type: 'LARGE_RIM', partCode: 'F112 / F113', occupied: 25, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 1, type: 'SMALL_RIM', partCode: 'F100', occupied: 28, capacity: 29 },
  { store: 'RIM_STORE', col: 'G', level: 1, type: 'LARGE_RIM', partCode: 'F112', occupied: 21, capacity: 29 },

  // Level 0 (Ground)
  { store: 'RIM_STORE', col: 'L', level: 0, type: 'LARGE_RIM', partCode: 'F120', occupied: 29, capacity: 29 },
  { store: 'RIM_STORE', col: 'K', level: 0, type: 'SMALL_RIM', partCode: 'F114', occupied: 27, capacity: 29 },
  { store: 'RIM_STORE', col: 'J', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 26, capacity: 29 },
  { store: 'RIM_STORE', col: 'I', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 28, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 29, capacity: 29 },
  { store: 'RIM_STORE', col: 'G', level: 0, type: 'LARGE_RIM', partCode: 'F113', occupied: 23, capacity: 29 },
];

// Tyre Storeroom (Right Building, 8,290 mm width, 7,350 mm height, Lanes numbered right to left A-E, 4 rows tall)
const TYRE_STOREROOM_CAVITIES: CavitySlot[] = [
  // Level 3 (Top Row 4 - Large Rims in blue)
  { store: 'TYRE_STORE', col: 'E', level: 3, type: 'LARGE_RIM', partCode: 'T-130', occupied: 25, capacity: 29 },
  { store: 'TYRE_STORE', col: 'D', level: 3, type: 'LARGE_RIM', partCode: 'T-128', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'C', level: 3, type: 'LARGE_RIM', partCode: 'T-126', occupied: 27, capacity: 29 },
  { store: 'TYRE_STORE', col: 'B', level: 3, type: 'LARGE_RIM', partCode: 'T-124', occupied: 28, capacity: 29 },
  { store: 'TYRE_STORE', col: 'A', level: 3, type: 'LARGE_RIM', partCode: 'T-122', occupied: 26, capacity: 29 },

  // Level 2 (Row 3 - Small Rims in green)
  { store: 'TYRE_STORE', col: 'E', level: 2, type: 'SMALL_RIM', partCode: 'T-108', occupied: 23, capacity: 29 },
  { store: 'TYRE_STORE', col: 'D', level: 2, type: 'SMALL_RIM', partCode: 'T-106', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'C', level: 2, type: 'SMALL_RIM', partCode: 'T-104', occupied: 28, capacity: 29 },
  { store: 'TYRE_STORE', col: 'B', level: 2, type: 'SMALL_RIM', partCode: 'T-102', occupied: 24, capacity: 29 },
  { store: 'TYRE_STORE', col: 'A', level: 2, type: 'SMALL_RIM', partCode: 'T-100', occupied: 29, capacity: 29 },

  // Level 1 (Row 2 - Small Rims in green)
  { store: 'TYRE_STORE', col: 'E', level: 1, type: 'SMALL_RIM', partCode: 'T-118', occupied: 24, capacity: 29 },
  { store: 'TYRE_STORE', col: 'D', level: 1, type: 'SMALL_RIM', partCode: 'T-116', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'C', level: 1, type: 'SMALL_RIM', partCode: 'T-114', occupied: 26, capacity: 29 },
  { store: 'TYRE_STORE', col: 'B', level: 1, type: 'SMALL_RIM', partCode: 'T-112', occupied: 28, capacity: 29 },
  { store: 'TYRE_STORE', col: 'A', level: 1, type: 'SMALL_RIM', partCode: 'T-110', occupied: 27, capacity: 29 },

  // Level 0 (Row 1 Ground - Small Rims in green)
  { store: 'TYRE_STORE', col: 'E', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'D', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 28, capacity: 29 },
  { store: 'TYRE_STORE', col: 'C', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 27, capacity: 29 },
  { store: 'TYRE_STORE', col: 'B', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'A', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 29, capacity: 29 },
];

export default function TvKpiDashboard() {
  const router = useRouter();
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'MAINTENANCE' | 'OEE'>('MONITOR');

  // Storeroom controls
  const [storeroomView, setStoreroomView] = useState<'BOTH' | 'RIM' | 'TYRE'>('BOTH');
  const [isTyreGreyedOut, setIsTyreGreyedOut] = useState<boolean>(false);
  const [selectedCavity, setSelectedCavity] = useState<CavitySlot | null>(null);

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
      current_storeroom: 'RIM',
      current_lane: 'Lane J',
      current_level: 1,
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
      current_storeroom: 'TYRE',
      current_lane: 'Lane C',
      current_level: 2,
    },
  ]);

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
        console.warn('Supabase telemetry fallback:', err);
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
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. CLEAN APP HEADER (LIGHTER SLATE PALETTE) */}
      <header className="bg-[#1e293b] border-b border-slate-700/80 px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
            WA
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Wheel Assemblers</span>
              <span className="text-[10px] font-mono text-slate-300 border border-slate-600 px-1 rounded bg-[#0f172a]">
                Operations
              </span>
            </div>
            <div className="text-[11px] text-slate-400">High-Density Deep-Lane Shuttle Control</div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#0f172a] p-0.5 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setActiveTab('MONITOR')}
            className={`px-3 py-1 rounded transition text-xs font-medium ${
              activeTab === 'MONITOR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FIFO Cavity Cross-Section
          </button>
          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`px-3 py-1 rounded transition text-xs font-medium ${
              activeTab === 'MAINTENANCE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Maintenance Gauges
          </button>
          <button
            onClick={() => setActiveTab('OEE')}
            className={`px-3 py-1 rounded transition text-xs font-medium ${
              activeTab === 'OEE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OEE Telemetry
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setIsOperatorModalOpen(true)}
            className="px-2.5 py-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 border border-slate-600 transition"
          >
            Operators
          </button>

          <Link
            href="/mobile"
            className="px-2.5 py-1 rounded bg-blue-700/70 hover:bg-blue-600 text-white border border-blue-500 transition"
          >
            Mobile Inspection
          </Link>

          <div className="h-4 w-[1px] bg-slate-700" />
          <span className="font-mono text-slate-200 font-semibold">{currentTime || '08:00:00'}</span>

          <button onClick={handleSignOut} className="text-slate-400 hover:text-slate-200 ml-1">
            Sign Out
          </button>
        </div>
      </header>

      {/* 2. SUBTLE ALERT BAR */}
      {(hasInspectionAlert || hasPmAlert) && (
        <div className="px-6 pt-2 space-y-1">
          {hasInspectionAlert && (
            <div className="bg-[#1e293b] border border-amber-500/50 px-3.5 py-1.5 rounded flex items-center justify-between text-xs text-amber-200">
              <span>Shuttle 1 pending morning inspection signoff (FR-7.2-04). Interlock active.</span>
              <Link href="/mobile" className="text-amber-300 underline font-mono text-[11px]">
                Sign Off Inspection →
              </Link>
            </div>
          )}
          {hasPmAlert && (
            <div className="bg-[#1e293b] border border-slate-600 px-3.5 py-1.5 rounded flex items-center justify-between text-xs text-slate-300">
              <span>Shuttle 2 preventative maintenance scheduled (Optical cleaning due).</span>
              <button onClick={() => setActiveTab('MAINTENANCE')} className="text-blue-300 underline font-mono text-[11px]">
                View Maintenance →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 p-5 space-y-4">
        {activeTab === 'MONITOR' && (
          <>
            {/* TOP ROW: VITALS CARDS */}
            <div className="grid grid-cols-4 gap-3">
              {/* Shuttle 1 */}
              <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-100">Shuttle 1</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                      shuttles[0].status === 'ACTIVE'
                        ? 'bg-blue-900/60 text-blue-200 border-blue-600'
                        : 'bg-slate-700 text-amber-300 border-slate-600'
                    }`}
                  >
                    {shuttles[0].status === 'LOCKED_PENDING_INSPECTION' ? 'PENDING' : shuttles[0].status}
                  </span>
                </div>
                <div className="my-2">
                  <div className="flex justify-between text-[11px] font-mono text-slate-300">
                    <span>Battery</span>
                    <span className="text-white font-semibold">{shuttles[0].battery_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-1.5 rounded overflow-hidden mt-1">
                    <div className="bg-blue-500 h-full" style={{ width: `${shuttles[0].battery_pct}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-700">
                  <span>Loc: <strong className="text-slate-200">Rim Store (J-1)</strong></span>
                  <span>Odo: <strong className="text-slate-200">8,840 km</strong></span>
                </div>
              </div>

              {/* Shuttle 2 */}
              <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-100">Shuttle 2</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-200 border border-blue-600">
                    ACTIVE
                  </span>
                </div>
                <div className="my-2">
                  <div className="flex justify-between text-[11px] font-mono text-slate-300">
                    <span>Battery</span>
                    <span className="text-white font-semibold">{shuttles[1].battery_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-1.5 rounded overflow-hidden mt-1">
                    <div className="bg-blue-500 h-full" style={{ width: `${shuttles[1].battery_pct}%` }} />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-700">
                  <span>Loc: <strong className="text-slate-200">Tyre Store (C-2)</strong></span>
                  <span>Odo: <strong className="text-slate-200">9,350 km</strong></span>
                </div>
              </div>

              {/* Throughput */}
              <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-3 flex flex-col justify-between">
                <div className="text-xs font-semibold text-slate-100">Shift Throughput</div>
                <div className="grid grid-cols-2 gap-2 my-1">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">Inbound</span>
                    <span className="text-lg font-mono font-bold text-white">148</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">Outbound</span>
                    <span className="text-lg font-mono font-bold text-white">112</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-700 flex justify-between">
                  <span>Daily Target: 280</span>
                  <span className="text-blue-400">92.8% Pace</span>
                </div>
              </div>

              {/* Usable Stock Buffer */}
              <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-3 flex flex-col justify-between">
                <div className="text-xs font-semibold text-slate-100">Assembly Stock Buffer</div>
                <div className="grid grid-cols-2 gap-2 my-1">
                  <div className="bg-[#0f172a] p-1.5 rounded border border-slate-700">
                    <span className="text-[10px] font-mono text-emerald-400 block">Small Rims (Green)</span>
                    <span className="text-base font-mono font-bold text-white">4.2 <span className="text-xs text-slate-400 font-normal">Days</span></span>
                  </div>
                  <div className="bg-[#0f172a] p-1.5 rounded border border-slate-700">
                    <span className="text-[10px] font-mono text-blue-400 block">Large Rims (Blue)</span>
                    <span className="text-base font-mono font-bold text-white">5.1 <span className="text-xs text-slate-400 font-normal">Days</span></span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-700 flex justify-between">
                  <span>Threshold: 3.0 Days</span>
                  <span className="text-emerald-400">Optimal</span>
                </div>
              </div>
            </div>

            {/* ROW 2: STOREROOM ELEVATION WITH TOGGLE & GREY-OUT FUNCTIONALITY */}
            <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    FIFO Storage Cavity Elevation
                  </h3>

                  {/* View Filters */}
                  <div className="flex items-center bg-[#0f172a] p-0.5 rounded border border-slate-700 text-[11px] font-mono">
                    <button
                      onClick={() => setStoreroomView('BOTH')}
                      className={`px-2.5 py-1 rounded transition ${
                        storeroomView === 'BOTH'
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Full View (Both)
                    </button>
                    <button
                      onClick={() => setStoreroomView('RIM')}
                      className={`px-2.5 py-1 rounded transition ${
                        storeroomView === 'RIM'
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Rim Storeroom
                    </button>
                    <button
                      onClick={() => setStoreroomView('TYRE')}
                      className={`px-2.5 py-1 rounded transition ${
                        storeroomView === 'TYRE'
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tyre Storeroom
                    </button>
                  </div>

                  {/* Grey-Out Tyre Storeroom Button */}
                  <button
                    onClick={() => setIsTyreGreyedOut(!isTyreGreyedOut)}
                    className={`px-2 py-1 rounded border text-[11px] font-mono transition flex items-center gap-1 ${
                      isTyreGreyedOut
                        ? 'bg-slate-700 text-slate-200 border-slate-500'
                        : 'bg-[#0f172a] text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{isTyreGreyedOut ? '✓ Tyre Store Greyed Out' : 'Grey Out Tyre Store'}</span>
                  </button>
                </div>

                {/* Color Legend */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-[#1e40af] border border-blue-400" />
                    <span className="text-slate-200">Large Rims (Blue)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-[#065f46] border border-emerald-400" />
                    <span className="text-slate-200">Small Rims (Green)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-800 border border-slate-600" />
                    <span className="text-slate-400">Clearance</span>
                  </div>
                </div>
              </div>

              {/* DUAL BUILDING CROSS-SECTION GRID */}
              <div className="grid grid-cols-12 gap-4 items-end">
                {/* 1. LEFT BUILDING: RIM STOREROOM (Width 8,730 mm, 3 levels high: 2, 1, 0, Lanes L to G) */}
                {(storeroomView === 'BOTH' || storeroomView === 'RIM') && (
                  <div
                    className={`${
                      storeroomView === 'RIM' ? 'col-span-12' : 'col-span-6'
                    } bg-[#0f172a] p-3 rounded-lg border border-slate-700 flex flex-col justify-between transition-all`}
                  >
                    {/* Building Header */}
                    <div className="flex justify-between items-center text-[11px] font-mono border-b border-slate-700/80 pb-1.5 mb-2">
                      <span className="text-white font-semibold">Rim Storeroom</span>
                      <span className="text-slate-400">Width: 8,730 mm • 3 Levels (0, 1, 2)</span>
                    </div>

                    {/* Cavities */}
                    <div className="space-y-1.5">
                      {[2, 1, 0].map((lvl) => (
                        <div key={`exist-lvl-${lvl}`} className="flex items-center gap-1.5">
                          <span className="w-5 text-center text-xs font-mono font-bold text-slate-400 shrink-0">
                            {lvl}
                          </span>
                          <div className="grid grid-cols-6 gap-1.5 flex-1">
                            {(['L', 'K', 'J', 'I', 'H', 'G'] as const).map((col) => {
                              const slot = RIM_STOREROOM_CAVITIES.find(
                                (c) => c.col === col && c.level === lvl
                              );

                              if (!slot || slot.type === 'EMPTY') {
                                return (
                                  <div
                                    key={`rim-${col}-${lvl}`}
                                    className="h-16 rounded border border-dashed border-slate-700 bg-slate-900/40 flex items-center justify-center text-[9px] font-mono text-slate-600"
                                  >
                                    —
                                  </div>
                                );
                              }

                              const isLarge = slot.type === 'LARGE_RIM';

                              return (
                                <div
                                  key={`rim-${col}-${lvl}`}
                                  onClick={() => setSelectedCavity(slot)}
                                  className={`h-16 rounded p-1.5 flex flex-col justify-between transition cursor-pointer border relative ${
                                    isLarge
                                      ? 'bg-blue-950/60 border-blue-500/70 hover:bg-blue-900/70'
                                      : 'bg-emerald-950/60 border-emerald-500/70 hover:bg-emerald-900/70'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-mono text-slate-300 font-semibold">
                                      {col}{lvl}
                                    </span>
                                    <span
                                      className={`text-[8px] font-mono px-1 rounded font-bold ${
                                        slot.occupied >= 28 ? 'text-amber-300' : 'text-slate-200'
                                      }`}
                                    >
                                      {slot.occupied}/{slot.capacity}
                                    </span>
                                  </div>

                                  <div className="text-center my-auto">
                                    <span className="text-[10px] font-mono font-bold text-white truncate block">
                                      {slot.partCode}
                                    </span>
                                  </div>

                                  {/* Occupancy Indicator Bar */}
                                  <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
                                    <div
                                      className={`h-full ${isLarge ? 'bg-blue-400' : 'bg-emerald-400'}`}
                                      style={{ width: `${(slot.occupied / slot.capacity) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Bay Labels L to G */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700">
                        <span className="w-5 text-center text-[9px] font-mono text-slate-500">Bay</span>
                        <div className="grid grid-cols-6 gap-1.5 flex-1">
                          {(['L', 'K', 'J', 'I', 'H', 'G'] as const).map((col) => (
                            <div key={col} className="text-center text-[10px] font-mono font-bold text-slate-200">
                              {col}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. RIGHT BUILDING: TYRE STOREROOM (Width 8,290 mm, 4 rows tall, Lanes NUMBERED RIGHT TO LEFT A-E) */}
                {(storeroomView === 'BOTH' || storeroomView === 'TYRE') && (
                  <div
                    className={`${
                      storeroomView === 'TYRE' ? 'col-span-12' : 'col-span-6'
                    } bg-[#0f172a] p-3 rounded-lg border border-slate-700 flex flex-col justify-between transition-all ${
                      isTyreGreyedOut ? 'opacity-40 grayscale hover:opacity-80 transition duration-300' : ''
                    }`}
                  >
                    {/* Building Header */}
                    <div className="flex justify-between items-center text-[11px] font-mono border-b border-slate-700/80 pb-1.5 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">Tyre Storeroom</span>
                        {isTyreGreyedOut && (
                          <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 rounded">Greyed Out (Commissioning)</span>
                        )}
                      </div>
                      <span className="text-slate-400">Width: 8,290 mm • 4 Rows (0, 1, 2, 3)</span>
                    </div>

                    {/* Cavities (4 Rows: 3, 2, 1, 0 • Lanes right to left A-E: E, D, C, B, A) */}
                    <div className="space-y-1.5">
                      {[3, 2, 1, 0].map((lvl) => (
                        <div key={`tyre-lvl-${lvl}`} className="flex items-center gap-1.5">
                          <span className="w-5 text-center text-xs font-mono font-bold text-slate-400 shrink-0">
                            {lvl}
                          </span>
                          <div className="grid grid-cols-5 gap-1.5 flex-1">
                            {(['E', 'D', 'C', 'B', 'A'] as const).map((col) => {
                              const slot = TYRE_STOREROOM_CAVITIES.find(
                                (c) => c.col === col && c.level === lvl
                              );

                              if (!slot) return null;
                              const isLarge = slot.type === 'LARGE_RIM';

                              return (
                                <div
                                  key={`tyre-${col}-${lvl}`}
                                  onClick={() => setSelectedCavity(slot)}
                                  className={`h-16 rounded p-1.5 flex flex-col justify-between transition cursor-pointer border relative ${
                                    isLarge
                                      ? 'bg-blue-950/60 border-blue-500/70 hover:bg-blue-900/70'
                                      : 'bg-emerald-950/60 border-emerald-500/70 hover:bg-emerald-900/70'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-mono text-slate-300 font-semibold">
                                      {col}{lvl}
                                    </span>
                                    <span
                                      className={`text-[8px] font-mono px-1 rounded font-bold ${
                                        slot.occupied >= 28 ? 'text-amber-300' : 'text-slate-200'
                                      }`}
                                    >
                                      {slot.occupied}/{slot.capacity}
                                    </span>
                                  </div>

                                  <div className="text-center my-auto">
                                    <span className="text-[10px] font-mono font-bold text-white truncate block">
                                      {slot.partCode}
                                    </span>
                                  </div>

                                  {/* Occupancy Indicator Bar */}
                                  <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
                                    <div
                                      className={`h-full ${isLarge ? 'bg-blue-400' : 'bg-emerald-400'}`}
                                      style={{ width: `${(slot.occupied / slot.capacity) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Bay Labels right to left A-E (Screen: E, D, C, B, A) */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700">
                        <span className="w-5 text-center text-[9px] font-mono text-slate-500">Bay</span>
                        <div className="grid grid-cols-5 gap-1.5 flex-1">
                          {(['E', 'D', 'C', 'B', 'A'] as const).map((col) => (
                            <div key={col} className="text-center text-[10px] font-mono font-bold text-slate-200">
                              {col}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Cavity Channel Details */}
              {selectedCavity && (
                <div className="bg-[#0f172a] p-2.5 rounded border border-slate-700 flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="text-slate-400">Selected Channel: </span>
                    <strong className="text-white">
                      {selectedCavity.store === 'RIM_STORE' ? 'Rim Storeroom' : 'Tyre Storeroom'} • Bay {selectedCavity.col} • Level {selectedCavity.level} ({selectedCavity.partCode})
                    </strong>
                    <span className="text-slate-400 ml-2">
                      Type: <strong className={selectedCavity.type === 'LARGE_RIM' ? 'text-blue-400' : 'text-emerald-400'}>
                        {selectedCavity.type === 'LARGE_RIM' ? 'Large Rims' : 'Small Rims'}
                      </strong>
                    </span>
                  </div>
                  <div className="text-slate-300">
                    Pallets in Channel: <strong className="text-white font-bold">{selectedCavity.occupied}</strong> / {selectedCavity.capacity} ({Math.round((selectedCavity.occupied / selectedCavity.capacity) * 100)}% Channel Fill)
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: CLEAN MAINTENANCE GAUGES */}
        {activeTab === 'MAINTENANCE' && (
          <div className="space-y-4">
            {/* Shuttle 1 Gauges */}
            <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-xs font-semibold text-white">
                  Shuttle 1 Health Gauges (Rim Storeroom)
                </span>
                <span className="text-[11px] font-mono text-slate-400">SHUTTLE-01</span>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <CircularMetric
                  value={shuttles[0].odometer_meters}
                  max={10000000}
                  label="Wheel Life"
                  sublabel="8,840 / 10,000"
                  unit="km"
                />
                <CircularMetric
                  value={shuttles[0].lifting_cycles}
                  max={100000}
                  label="Lifting Mechanism"
                  sublabel="89.4k / 100k"
                  unit="cycles"
                />
                <CircularMetric
                  value={shuttles[0].charge_cycles}
                  max={3000}
                  label="Battery Cycles"
                  sublabel="2,410 / 3,000"
                  unit="cycles"
                />
                <CircularMetric
                  value={3}
                  max={7}
                  label="Optical Sensors"
                  sublabel="3 / 7"
                  unit="days"
                />
              </div>
            </div>

            {/* Shuttle 2 Gauges */}
            <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-xs font-semibold text-white">
                  Shuttle 2 Health Gauges (Tyre Storeroom)
                </span>
                <button
                  onClick={() => alert('FMEA Matrix: FMEA-SHUTTLE-RACK-004.pdf')}
                  className="px-2 py-0.5 text-xs text-blue-300 border border-slate-600 rounded hover:bg-slate-700 transition"
                >
                  FMEA Matrix
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <CircularMetric
                  value={shuttles[1].odometer_meters}
                  max={10000000}
                  label="Wheel Life"
                  sublabel="9,350 / 10,000"
                  unit="km"
                />
                <CircularMetric
                  value={shuttles[1].lifting_cycles}
                  max={100000}
                  label="Lifting Mechanism"
                  sublabel="96.8k / 100k"
                  unit="cycles"
                />
                <CircularMetric
                  value={shuttles[1].charge_cycles}
                  max={3000}
                  label="Battery Cycles"
                  sublabel="2,890 / 3,000"
                  unit="cycles"
                />
                <CircularMetric
                  value={8}
                  max={7}
                  label="Optical Sensors"
                  sublabel="8 / 7 (Overdue)"
                  unit="days"
                  warningPct={80}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OEE TELEMETRY */}
        {activeTab === 'OEE' && (
          <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2 text-xs">
              <span className="font-semibold text-white">OEE Metrics</span>
              <span className="font-mono text-blue-400 font-bold">86.3% Aggregate</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0f172a] p-3 rounded border border-slate-700 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Availability</span>
                  <span className="font-mono text-white font-semibold">94.2%</span>
                </div>
                <div className="w-full bg-slate-700 h-1 rounded overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '94.2%' }} />
                </div>
                <div className="text-[10px] font-mono text-slate-400">452.0 / 480.0 min</div>
              </div>

              <div className="bg-[#0f172a] p-3 rounded border border-slate-700 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Performance</span>
                  <span className="font-mono text-white font-semibold">92.4%</span>
                </div>
                <div className="w-full bg-slate-700 h-1 rounded overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '92.4%' }} />
                </div>
                <div className="text-[10px] font-mono text-slate-400">Cycle: 81.2s (Takt: 75.0s)</div>
              </div>

              <div className="bg-[#0f172a] p-3 rounded border border-slate-700 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Quality</span>
                  <span className="font-mono text-white font-semibold">99.2%</span>
                </div>
                <div className="w-full bg-slate-700 h-1 rounded overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '99.2%' }} />
                </div>
                <div className="text-[10px] font-mono text-slate-400">318 / 320 RFT</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <OperatorManagementModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
      />
    </div>
  );
}
