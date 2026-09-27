'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUser, setCurrentUser } from '@/lib/authStore';
import { DocumentItem } from '@/lib/documentStore';
import OperatorManagementModal from './OperatorManagementModal';
import AdminDocumentAndMaintenanceModal from './AdminDocumentAndMaintenanceModal';
import YearlyMaintenanceMatrix from './YearlyMaintenanceMatrix';
import WeeklyRackInspectionModal from './WeeklyRackInspectionModal';
import DigitalSopViewerModal from './DigitalSopViewerModal';

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
  current_lane: string;
  current_level: number;
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
  { store: 'RIM_STORE', col: 'J', level: 1, type: 'LARGE_RIM', partCode: 'F91', occupied: 29, capacity: 29 }, // SHUTTLE 1 HERE
  { store: 'RIM_STORE', col: 'I', level: 1, type: 'LARGE_RIM', partCode: 'F112 / F113', occupied: 25, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 1, type: 'SMALL_RIM', partCode: 'F100', occupied: 28, capacity: 29 },
  { store: 'RIM_STORE', col: 'G', level: 1, type: 'LARGE_RIM', partCode: 'F112', occupied: 21, capacity: 29 },

  // Level 0 (Ground)
  { store: 'RIM_STORE', col: 'L', level: 0, type: 'LARGE_RIM', partCode: 'F120', occupied: 29, capacity: 29 },
  { store: 'RIM_STORE', col: 'K', level: 0, type: 'SMALL_RIM', partCode: 'F114', occupied: 27, capacity: 29 },
  { store: 'RIM_STORE', col: 'J', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 26, capacity: 29 },
  { store: 'RIM_STORE', col: 'I', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 28, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 29, capacity: 29 }, // SHUTTLE 2 HERE
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
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'MAINTENANCE' | 'OEE'>('MONITOR');

  // Desktop vs Mobile layout simulator/enforcer
  const [deviceLayoutMode, setDeviceLayoutMode] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');

  // Storeroom controls: Tyre store is permanently greyed out; user can show or hide it
  const [hideTyreStore, setHideTyreStore] = useState<boolean>(true);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isWeeklyRackModalOpen, setIsWeeklyRackModalOpen] = useState<boolean>(false);
  const [sopViewerDoc, setSopViewerDoc] = useState<DocumentItem | null>(null);
  const [selectedCavity, setSelectedCavity] = useState<CavitySlot | null>(null);

  // Both shuttles in RIM STOREROOM as specified
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
      current_lane: 'J',
      current_level: 1,
    },
    {
      id: '2',
      code: 'SHUTTLE-02',
      display_name: 'Shuttle 2 (Rim Storeroom)',
      status: 'ACTIVE',
      battery_pct: 82,
      odometer_meters: 9350400,
      lifting_cycles: 96800,
      charge_cycles: 2890,
      last_sensor_clean_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      last_inspection_passed: true,
      current_lane: 'H',
      current_level: 0,
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
              display_name: idx === 0 ? 'Shuttle 1 (Rim Storeroom)' : 'Shuttle 2 (Rim Storeroom)',
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

  const alertCount = (hasInspectionAlert ? 1 : 0) + (hasPmAlert ? 1 : 0);

  return (
    <div
      className={`min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans select-none antialiased ${
        deviceLayoutMode === 'MOBILE' ? 'max-w-md mx-auto shadow-2xl border-x border-slate-700' : ''
      }`}
    >
      {/* 1. CLEAN APP HEADER (WITH DESKTOP / MOBILE SWITCHER & ACTION NOTIFICATION BELL) */}
      <header className="bg-[#1e293b] border-b border-slate-700/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between sticky top-0 z-40 shadow-sm gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
            WA
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Wheel Assemblers</span>
              <span className="text-[9px] font-mono text-slate-300 border border-slate-600 px-1 rounded bg-[#0f172a]">
                Admin
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Rim Storeroom Shuttle Operations</div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#0f172a] p-0.5 rounded-lg border border-slate-700 text-xs order-3 sm:order-2 w-full sm:w-auto justify-center">
          <button
            onClick={() => setActiveTab('MONITOR')}
            className={`px-3 py-1 rounded transition text-xs font-medium ${
              activeTab === 'MONITOR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FIFO Cross-Section
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

        {/* Right Tools (Admin Tools, Notification Bell, View Mode Switch, Sign Out) */}
        <div className="flex items-center gap-2 text-xs order-2 sm:order-3">
          {/* Action Notification Bell (Replaces messy banners) */}
          <div className="relative">
            <button
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className={`p-1.5 rounded-lg border transition flex items-center justify-center relative ${
                alertCount > 0
                  ? 'bg-slate-800 border-amber-500/80 text-amber-400 hover:bg-slate-700'
                  : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={alertCount > 0 ? `${alertCount} Pending Actions` : 'All Systems Normal'}
              aria-label="Pending Actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 ${alertCount > 0 ? 'animate-pulse' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 text-black text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-[#1e293b]">
                  {alertCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {isAlertsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl p-3.5 z-50 space-y-2.5 text-xs animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="font-semibold text-slate-100 uppercase tracking-wider text-[11px] font-mono">
                    System Actions ({alertCount})
                  </span>
                  <button
                    onClick={() => setIsAlertsOpen(false)}
                    className="text-slate-400 hover:text-white text-xs font-mono"
                  >
                    ✕
                  </button>
                </div>

                {alertCount === 0 ? (
                  <div className="py-3 text-center text-slate-400 font-mono text-[11px]">
                    All shuttles normal. No pending actions.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hasInspectionAlert && (
                      <div className="p-2.5 rounded bg-[#0f172a] border border-slate-700 space-y-1.5">
                        <div className="text-[11px] text-slate-200">
                          Shuttle 1 pending morning inspection signoff (FR-7.2-04). Interlock active.
                        </div>
                        <Link
                          href="/mobile"
                          onClick={() => setIsAlertsOpen(false)}
                          className="inline-block text-[11px] font-mono text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          Perform Inspection Sign-Off →
                        </Link>
                      </div>
                    )}
                    {hasPmAlert && (
                      <div className="p-2.5 rounded bg-[#0f172a] border border-slate-700 space-y-1.5">
                        <div className="text-[11px] text-slate-200">
                          Shuttle 2 scheduled maintenance due (Optical sensor interval exceeded).
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('MAINTENANCE');
                            setIsAlertsOpen(false);
                          }}
                          className="text-[11px] font-mono text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          Open Maintenance Gauges →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop / Mobile View Switcher */}
          <button
            onClick={() => setDeviceLayoutMode(deviceLayoutMode === 'DESKTOP' ? 'MOBILE' : 'DESKTOP')}
            className="px-2 py-1 rounded bg-[#0f172a] hover:bg-slate-700 text-blue-300 border border-slate-600 transition flex items-center gap-1 font-mono text-[11px]"
            title="Toggle between Desktop and Mobile layout simulation"
          >
            <span>{deviceLayoutMode === 'DESKTOP' ? '📱 Mobile' : '🖥️ Desktop'}</span>
          </button>

          {/* Manager Tools Button (SOP, FMEA, Schedule Maintenance) */}
          <button
            onClick={() => setIsDocModalOpen(true)}
            className="px-2 py-1 rounded bg-blue-700/80 hover:bg-blue-600 text-white border border-blue-500 transition font-medium text-[11px]"
          >
            Manager Tools
          </button>

          <button
            onClick={() => setIsOperatorModalOpen(true)}
            className="px-2 py-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 border border-slate-600 transition text-[11px]"
          >
            Operators
          </button>

          <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />
          <span className="font-mono text-slate-200 font-semibold text-[11px] hidden sm:block">
            {currentTime || '08:00:00'}
          </span>

          <button onClick={handleSignOut} className="text-slate-400 hover:text-slate-200 ml-1 text-xs">
            Sign Out
          </button>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 p-3 sm:p-5 space-y-3.5">
        {activeTab === 'MONITOR' && (
          <>
            {/* TOP ROW: VITALS CARDS (BOTH SHUTTLES IN RIM STORE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Shuttle 1 */}
              <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-100">Shuttle 1 (Rim Store)</span>
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
                  <span>Current Pos: <strong className="text-amber-300 font-bold">Bay J (Lvl 1)</strong></span>
                  <span>Odo: <strong className="text-slate-200">8,840 km</strong></span>
                </div>
              </div>

              {/* Shuttle 2 */}
              <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-100">Shuttle 2 (Rim Store)</span>
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
                  <span>Current Pos: <strong className="text-blue-300 font-bold">Bay H (Lvl 0)</strong></span>
                  <span>Odo: <strong className="text-slate-200">9,350 km</strong></span>
                </div>
              </div>

              {/* Daily Pallet Throughput (Max 120 Inbound / Max 93 Outbound) */}
              <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-3 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-100">Daily Pallet Throughput</span>
                  <span className="text-[10px] font-mono text-slate-400">Ceiling: 120 In / 93 Out</span>
                </div>

                <div className="space-y-2 my-2">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Inbound Received</span>
                      <span className="text-white font-bold">78 <span className="text-slate-400 font-normal">/ 120 Max</span></span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded overflow-hidden mt-1">
                      <div className="bg-blue-500 h-full" style={{ width: `${(78 / 120) * 100}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Outbound Shipped</span>
                      <span className="text-white font-bold">61 <span className="text-slate-400 font-normal">/ 93 Max</span></span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded overflow-hidden mt-1">
                      <div className="bg-slate-300 h-full" style={{ width: `${(61 / 93) * 100}%` }} />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-700 flex justify-between">
                  <span>Day Usage</span>
                  <span className="text-blue-300 font-semibold">In: 65% • Out: 66%</span>
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
                  <span>Threshold: 3.0d</span>
                  <span className="text-emerald-400 font-semibold">Optimal</span>
                </div>
              </div>
            </div>

            {/* ROW 2: CROSS-SECTION VIEW WITH HIGH-VISIBILITY SHUTTLE LOCATION */}
            <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-3.5 space-y-3">
              <div className="flex flex-wrap justify-between items-center border-b border-slate-700 pb-2 gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    FIFO Storage Cavity Elevation
                  </h3>

                  {/* Single Storeroom Control: Hide or Show Permanently-Greyed Tyre Storeroom */}
                  <button
                    onClick={() => setHideTyreStore(!hideTyreStore)}
                    className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono transition"
                  >
                    {hideTyreStore ? 'Show Tyre Store (Commissioning)' : 'Hide Tyre Store'}
                  </button>
                </div>

                {/* Color Legend */}
                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-[#1e40af] border border-blue-400" />
                    <span className="text-slate-200 text-[11px]">Large Rims</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-[#065f46] border border-emerald-400" />
                    <span className="text-slate-200 text-[11px]">Small Rims</span>
                  </div>
                </div>
              </div>

              {/* CROSS-SECTION GRID */}
              <div className="grid grid-cols-12 gap-3 items-end overflow-x-auto">
                {/* 1. LEFT BUILDING: RIM STOREROOM (Contains BOTH Shuttle 1 & Shuttle 2) */}
                <div
                  className={`${
                    hideTyreStore ? 'col-span-12' : 'col-span-12 lg:col-span-6'
                  } bg-[#0f172a] p-3 rounded-lg border border-slate-700 flex flex-col justify-between transition-all`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-center text-[11px] font-mono border-b border-slate-700/80 pb-1.5 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">Rim Storeroom (Active)</span>
                      <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 rounded">
                        2 Shuttles On-Site
                      </span>
                    </div>
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

                            // Check if Shuttle 1 or Shuttle 2 is in this cavity
                            const isShuttle1 = shuttles[0].current_lane === col && shuttles[0].current_level === lvl;
                            const isShuttle2 = shuttles[1].current_lane === col && shuttles[1].current_level === lvl;

                            return (
                              <div
                                key={`rim-${col}-${lvl}`}
                                onClick={() => setSelectedCavity(slot)}
                                className={`h-16 rounded p-1 flex flex-col justify-between transition cursor-pointer border relative ${
                                  isShuttle1 || isShuttle2
                                    ? 'ring-2 ring-amber-400 border-amber-300 shadow-md shadow-amber-500/20 z-10'
                                    : isLarge
                                    ? 'bg-blue-950/60 border-blue-500/70 hover:bg-blue-900/70'
                                    : 'bg-emerald-950/60 border-emerald-500/70 hover:bg-emerald-900/70'
                                }`}
                              >
                                {/* Prominent Shuttle Badges on top (Minimal & Clean) */}
                                {isShuttle1 && (
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-amber-300 border border-amber-500/80 text-[8px] font-bold font-mono px-1 rounded shadow-sm whitespace-nowrap">
                                    SHUTTLE 1
                                  </div>
                                )}
                                {isShuttle2 && (
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-blue-300 border border-blue-500/80 text-[8px] font-bold font-mono px-1 rounded shadow-sm whitespace-nowrap">
                                    SHUTTLE 2
                                  </div>
                                )}

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

                {/* 2. RIGHT BUILDING: TYRE STOREROOM (Permanently Greyed Out, Commissioning Phase) */}
                {!hideTyreStore && (
                  <div className="col-span-12 lg:col-span-6 bg-[#0f172a] p-3 rounded-lg border border-dashed border-slate-700/70 opacity-30 grayscale pointer-events-none select-none flex flex-col justify-between transition-all">
                    {/* Header */}
                    <div className="flex justify-between items-center text-[11px] font-mono border-b border-slate-700/80 pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300 font-semibold">Tyre Storeroom</span>
                        <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 rounded uppercase font-mono">
                          Commissioning Phase • Inactive
                        </span>
                      </div>
                      <span className="text-slate-500">Width: 8,290 mm • 4 Rows</span>
                    </div>

                    {/* Cavities (Lanes numbered right-to-left A-E: E, D, C, B, A) */}
                    <div className="space-y-1.5">
                      {[3, 2, 1, 0].map((lvl) => (
                        <div key={`tyre-lvl-${lvl}`} className="flex items-center gap-1.5">
                          <span className="w-5 text-center text-xs font-mono font-bold text-slate-500 shrink-0">
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
                                  className="h-16 rounded p-1 flex flex-col justify-between border border-slate-700 bg-slate-800/40 relative"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-mono text-slate-400">
                                      {col}{lvl}
                                    </span>
                                    <span className="text-[8px] font-mono text-slate-500">
                                      {slot.occupied}/{slot.capacity}
                                    </span>
                                  </div>

                                  <div className="text-center my-auto">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 truncate block">
                                      {slot.partCode}
                                    </span>
                                  </div>

                                  <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
                                    <div
                                      className="h-full bg-slate-600"
                                      style={{ width: `${(slot.occupied / slot.capacity) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Bay Labels right-to-left A-E */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-700">
                        <span className="w-5 text-center text-[9px] font-mono text-slate-500">Bay</span>
                        <div className="grid grid-cols-5 gap-1.5 flex-1">
                          {(['E', 'D', 'C', 'B', 'A'] as const).map((col) => (
                            <div key={col} className="text-center text-[10px] font-mono font-bold text-slate-400">
                              {col}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Cavity Info */}
              {selectedCavity && (
                <div className="bg-[#0f172a] p-2.5 rounded border border-slate-700 flex flex-wrap justify-between items-center text-xs font-mono gap-1">
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
                    Pallets in Channel: <strong className="text-white font-bold">{selectedCavity.occupied}</strong> / {selectedCavity.capacity} ({Math.round((selectedCavity.occupied / selectedCavity.capacity) * 100)}% FIFO Fill)
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: CLEAN MAINTENANCE MATRIX & GAUGES */}
        {activeTab === 'MAINTENANCE' && (
          <div className="space-y-4">
            {/* 52-Week Year Calendar Maintenance Matrix */}
            <YearlyMaintenanceMatrix
              onOpenWeeklyRackModal={() => setIsWeeklyRackModalOpen(true)}
            />

            {/* Shuttle 1 & Shuttle 2 Telemetry Gauges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Shuttle 1 Gauges */}
              <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="text-xs font-semibold text-white">
                    Shuttle 1 Health Gauges (Rim Storeroom)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">SHUTTLE-01</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    Shuttle 2 Health Gauges (Rim Storeroom)
                  </span>
                  <button
                    onClick={() => setIsDocModalOpen(true)}
                    className="px-2 py-0.5 text-xs text-blue-300 border border-slate-600 rounded hover:bg-slate-700 transition font-mono"
                  >
                    Manage SOPs & FMEA
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          </div>
        )}

        {/* TAB 3: OEE TELEMETRY */}
        {activeTab === 'OEE' && (
          <div className="bg-[#1e293b] border border-slate-700/70 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2 text-xs">
              <span className="font-semibold text-white">OEE Metrics</span>
              <span className="font-mono text-blue-400 font-bold">86.3% Aggregate</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* 4. FOOTER WITH LIVE HEARTBEAT & SITE HEALTH MONITOR */}
      <footer className="bg-[#1e293b] border-t border-slate-700/80 px-4 sm:px-6 py-2 flex flex-wrap justify-between items-center text-[10px] font-mono text-slate-400 gap-2 mt-auto">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200">Site Status: <strong>Online</strong></span>
          <span className="text-slate-500">•</span>
          <span>Health Check: <code className="text-blue-300">/api/health</code></span>
          <span className="text-slate-500">•</span>
          <span>Keep-Alive: <strong className="text-emerald-400">Active (10m Cron)</strong></span>
        </div>
        <div className="text-slate-500">
          Wheel Assemblers Storage Operations • Automated Racking
        </div>
      </footer>

      {/* Operator Modal */}
      <OperatorManagementModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
      />

      {/* Admin Document Upload & Maintenance Scheduling Modal */}
      <AdminDocumentAndMaintenanceModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />

      {/* Weekly High-Bay Rack Inspection Modal (FR-7.2-03) */}
      <WeeklyRackInspectionModal
        isOpen={isWeeklyRackModalOpen}
        onClose={() => setIsWeeklyRackModalOpen(false)}
      />

      {/* Digital SOP & High-Res Document Preview Modal */}
      <DigitalSopViewerModal
        document={sopViewerDoc}
        isOpen={!!sopViewerDoc}
        onClose={() => setSopViewerDoc(null)}
      />
    </div>
  );
}
