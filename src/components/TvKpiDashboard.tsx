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

// Sleek Engineering Metric Card (No Frills, No Bright Colors, Only Red for Emergency)
function EngineeringGauge({
  label,
  value,
  max,
  sublabel,
  unit = '',
  isEmergency = false,
}: {
  label: string;
  value: number;
  max: number;
  sublabel: string;
  unit?: string;
  isEmergency?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className="bg-white border border-slate-300 p-3 rounded">
      <div className="flex justify-between items-baseline text-xs">
        <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">{label}</span>
        <span className={`font-mono font-bold ${isEmergency || pct >= 100 ? 'text-red-700' : 'text-slate-900'}`}>
          {pct}%
        </span>
      </div>

      <div className="w-full bg-slate-200 h-2 rounded-sm overflow-hidden my-2">
        <div
          className={`h-full transition-all duration-300 ${
            isEmergency || pct >= 100 ? 'bg-red-700' : 'bg-[#1e3a8a]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] font-mono text-slate-500">
        <span>{sublabel}</span>
        <span>{unit}</span>
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

// Rim Storeroom (Bays L to G, Levels 0 to 2)
const RIM_STOREROOM_CAVITIES: CavitySlot[] = [
  // Level 2 (Top)
  { store: 'RIM_STORE', col: 'L', level: 2, type: 'EMPTY', partCode: '—', occupied: 0, capacity: 29 },
  { store: 'RIM_STORE', col: 'K', level: 2, type: 'SMALL_RIM', partCode: 'Overflow', occupied: 4, capacity: 29 },
  { store: 'RIM_STORE', col: 'J', level: 2, type: 'LARGE_RIM', partCode: 'F119', occupied: 6, capacity: 29 },
  { store: 'RIM_STORE', col: 'I', level: 2, type: 'LARGE_RIM', partCode: 'F90', occupied: 5, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 2, type: 'EMPTY', partCode: '—', occupied: 0, capacity: 29 },
  { store: 'RIM_STORE', col: 'G', level: 2, type: 'EMPTY', partCode: '—', occupied: 0, capacity: 29 },

  // Level 1 (Middle)
  { store: 'RIM_STORE', col: 'L', level: 1, type: 'LARGE_RIM', partCode: 'F117 / F118', occupied: 8, capacity: 29 },
  { store: 'RIM_STORE', col: 'K', level: 1, type: 'SMALL_RIM', partCode: '5a19d', occupied: 5, capacity: 29 },
  { store: 'RIM_STORE', col: 'J', level: 1, type: 'LARGE_RIM', partCode: 'F91', occupied: 7, capacity: 29 }, // Shuttle 1
  { store: 'RIM_STORE', col: 'I', level: 1, type: 'LARGE_RIM', partCode: 'F112 / F113', occupied: 6, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 1, type: 'SMALL_RIM', partCode: 'F100', occupied: 8, capacity: 29 },
  { store: 'RIM_STORE', col: 'G', level: 1, type: 'EMPTY', partCode: '—', occupied: 0, capacity: 29 },

  // Level 0 (Ground)
  { store: 'RIM_STORE', col: 'L', level: 0, type: 'LARGE_RIM', partCode: 'F120', occupied: 7, capacity: 29 },
  { store: 'RIM_STORE', col: 'K', level: 0, type: 'SMALL_RIM', partCode: 'F114', occupied: 5, capacity: 29 },
  { store: 'RIM_STORE', col: 'J', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 6, capacity: 29 },
  { store: 'RIM_STORE', col: 'I', level: 0, type: 'EMPTY', partCode: '—', occupied: 0, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 7, capacity: 29 }, // Shuttle 2
  { store: 'RIM_STORE', col: 'G', level: 0, type: 'LARGE_RIM', partCode: 'F113', occupied: 4, capacity: 29 },
];

// Tyre Storeroom (Permanently Greyed Out, Bays E to A, Levels 0 to 3)
const TYRE_STOREROOM_CAVITIES: CavitySlot[] = [
  { store: 'TYRE_STORE', col: 'E', level: 3, type: 'LARGE_RIM', partCode: 'T-130', occupied: 25, capacity: 29 },
  { store: 'TYRE_STORE', col: 'D', level: 3, type: 'LARGE_RIM', partCode: 'T-130', occupied: 27, capacity: 29 },
  { store: 'TYRE_STORE', col: 'C', level: 3, type: 'LARGE_RIM', partCode: 'T-130', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'B', level: 3, type: 'LARGE_RIM', partCode: 'T-130', occupied: 28, capacity: 29 },
  { store: 'TYRE_STORE', col: 'A', level: 3, type: 'LARGE_RIM', partCode: 'T-130', occupied: 29, capacity: 29 },

  { store: 'TYRE_STORE', col: 'E', level: 2, type: 'LARGE_RIM', partCode: 'T-120', occupied: 28, capacity: 29 },
  { store: 'TYRE_STORE', col: 'D', level: 2, type: 'LARGE_RIM', partCode: 'T-120', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'C', level: 2, type: 'LARGE_RIM', partCode: 'T-120', occupied: 26, capacity: 29 },
  { store: 'TYRE_STORE', col: 'B', level: 2, type: 'LARGE_RIM', partCode: 'T-120', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'A', level: 2, type: 'LARGE_RIM', partCode: 'T-120', occupied: 27, capacity: 29 },

  { store: 'TYRE_STORE', col: 'E', level: 1, type: 'SMALL_RIM', partCode: 'T-110', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'D', level: 1, type: 'SMALL_RIM', partCode: 'T-110', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'C', level: 1, type: 'SMALL_RIM', partCode: 'T-110', occupied: 28, capacity: 29 },
  { store: 'TYRE_STORE', col: 'B', level: 1, type: 'SMALL_RIM', partCode: 'T-110', occupied: 27, capacity: 29 },
  { store: 'TYRE_STORE', col: 'A', level: 1, type: 'SMALL_RIM', partCode: 'T-110', occupied: 29, capacity: 29 },

  { store: 'TYRE_STORE', col: 'E', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'D', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 28, capacity: 29 },
  { store: 'TYRE_STORE', col: 'C', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'B', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 29, capacity: 29 },
  { store: 'TYRE_STORE', col: 'A', level: 0, type: 'SMALL_RIM', partCode: 'T-100', occupied: 26, capacity: 29 },
];

export default function TvKpiDashboard() {
  const router = useRouter();

  // Collapsible Side Menu State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Active Main Section View
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'MAINTENANCE'>('MONITOR');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showTyreStore, setShowTyreStore] = useState<boolean>(false);

  // Modals State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalDefaultTab, setDocModalDefaultTab] = useState<'DOCS' | 'MAINTENANCE'>('DOCS');
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [isWeeklyRackModalOpen, setIsWeeklyRackModalOpen] = useState(false);
  const [sopViewerDoc, setSopViewerDoc] = useState<DocumentItem | null>(null);

  // Emergency Alerts state
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);

  // Desktop vs Mobile Layout simulation mode
  const [adminViewMode, setAdminViewMode] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');

  // Shuttles state (Both in Rim Storeroom)
  const [shuttles, setShuttles] = useState<ShuttleData[]>([
    {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'SHUTTLE-01',
      display_name: 'Shuttle 1 (Rim Storeroom)',
      status: 'LOCKED_PENDING_INSPECTION',
      battery_pct: 94,
      odometer_meters: 8840000,
      lifting_cycles: 82140,
      charge_cycles: 2450,
      last_sensor_clean_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      current_lane: 'J',
      current_level: 1,
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      code: 'SHUTTLE-02',
      display_name: 'Shuttle 2 (Rim Storeroom)',
      status: 'ACTIVE',
      battery_pct: 82,
      odometer_meters: 9350000,
      lifting_cycles: 96800,
      charge_cycles: 2890,
      last_sensor_clean_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      current_lane: 'H',
      current_level: 0,
    },
  ]);

  useEffect(() => {
    // Set responsive sidebar: auto-collapse on screens < 1024px
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));

    async function fetchShuttleTelemetry() {
      const { data } = await supabase.from('shuttles').select('*').order('code');
      if (data && data.length > 0) {
        setShuttles((prev) =>
          prev.map((s, idx) => {
            const remote = data[idx];
            if (!remote) return s;
            return {
              ...s,
              status: remote.status || s.status,
              battery_pct: remote.battery_pct ?? s.battery_pct,
              odometer_meters: remote.odometer_meters ?? s.odometer_meters,
              lifting_cycles: remote.lifting_cycles ?? s.lifting_cycles,
            };
          })
        );
      }
    }

    fetchShuttleTelemetry();
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = () => {
    setCurrentUser(null);
    router.push('/');
  };

  // Emergency Alert check (Red only for true emergency)
  const hasInspectionAlert = shuttles[0].status === 'LOCKED_PENDING_INSPECTION';
  const hasOverdueSensorEmergency = true; // Overdue optical sensors > 7 days
  const emergencyCount = (hasInspectionAlert ? 1 : 0) + (hasOverdueSensorEmergency ? 1 : 0);

  const openAddPmAction = () => {
    setDocModalDefaultTab('MAINTENANCE');
    setIsDocModalOpen(true);
  };

  const openManagerDocs = () => {
    setDocModalDefaultTab('DOCS');
    setIsDocModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 font-sans flex flex-col select-none">
      {/* 1. TOP SLEEK CONTROL BAR */}
      <header className="bg-[#0a192f] text-white px-4 py-2.5 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Collapsible Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="px-2.5 py-1 bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 rounded font-mono text-xs uppercase transition tracking-wider"
            title="Toggle side menu navigation"
          >
            {isSidebarOpen ? 'COLLAPSE MENU' : 'EXPAND MENU'}
          </button>

          <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
            <span className="font-bold text-white tracking-wider text-sm uppercase">WHEEL ASSEMBLERS</span>
            <span className="text-[10px] font-mono text-slate-400">STORAGE CONTROL SYSTEM</span>
          </div>
        </div>

        {/* Right Info: View Switcher, Time & Emergency Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          {/* Desktop vs Mobile Orientation Switcher */}
          <button
            onClick={() => setAdminViewMode(adminViewMode === 'DESKTOP' ? 'MOBILE' : 'DESKTOP')}
            className="px-2.5 py-1 bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 rounded font-mono text-[11px] font-bold transition flex items-center gap-1"
            title="Toggle Desktop or Mobile orientation preview"
          >
            <span className="text-slate-400 hidden xs:inline">VIEW:</span>
            <span className={adminViewMode === 'MOBILE' ? 'text-white underline' : 'text-blue-200'}>
              {adminViewMode}
            </span>
          </button>

          <span className="text-slate-400 hidden md:inline">{currentTime || '08:00:00'}</span>

          {/* Emergency Alert Indicator (Red only for critical items) */}
          <div className="relative">
            <button
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className={`px-2 py-1 sm:px-2.5 rounded text-xs font-mono font-bold border transition ${
                emergencyCount > 0
                  ? 'bg-red-900/60 text-red-200 border-red-700 hover:bg-red-900'
                  : 'bg-[#172554] text-blue-200 border-blue-900 hover:bg-[#1e3a8a]'
              }`}
            >
              {emergencyCount > 0 ? `ALERTS (${emergencyCount})` : 'NORMAL'}
            </button>

            {isAlertsOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-300 rounded shadow-2xl p-4 z-50 space-y-3 text-xs text-slate-800">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold uppercase tracking-wider font-mono text-slate-900 text-[11px]">
                    System Action Dispatches
                  </span>
                  <button
                    onClick={() => setIsAlertsOpen(false)}
                    className="text-slate-400 hover:text-slate-800 font-mono text-xs"
                  >
                    CLOSE
                  </button>
                </div>

                <div className="space-y-2">
                  {hasInspectionAlert && (
                    <div className="p-2.5 bg-slate-50 border border-slate-300 rounded space-y-1">
                      <div className="font-semibold text-slate-800 text-[11px]">
                        Shuttle 1 pending FR-7.2-04 pre-operational sign-off. Electronic interlock active.
                      </div>
                      <Link
                        href="/mobile"
                        onClick={() => setIsAlertsOpen(false)}
                        className="inline-block text-[11px] font-mono font-bold text-[#1e3a8a] underline"
                      >
                        OPEN OPERATOR GATE
                      </Link>
                    </div>
                  )}

                  {hasOverdueSensorEmergency && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded space-y-1 text-red-900">
                      <div className="font-bold text-[11px]">
                        CRITICAL: Shuttle 2 optical sensors cleanliness limit exceeded (8/7 days).
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('MAINTENANCE');
                          setIsAlertsOpen(false);
                        }}
                        className="text-[11px] font-mono font-bold text-red-700 underline block"
                      >
                        DISPATCH PM MAINTENANCE
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. BODY WITH COLLAPSIBLE SIDE MENU + MAIN VIEWPORT */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop when menu is expanded */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden"
          />
        )}

        {/* COLLAPSIBLE SIDE MENU */}
        <aside
          className={`bg-[#0a192f] text-slate-200 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 z-40 shrink-0 ${
            isSidebarOpen
              ? 'fixed inset-y-0 left-0 w-64 lg:static lg:w-64 shadow-2xl lg:shadow-none'
              : 'w-0 -translate-x-full lg:w-0 lg:-translate-x-full overflow-hidden'
          }`}
        >
          {isSidebarOpen && (
            <div className="p-4 space-y-5 overflow-y-auto">
              {/* Primary System Views */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block px-2">
                  System Views
                </span>
                <button
                  onClick={() => setActiveTab('MONITOR')}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition ${
                    activeTab === 'MONITOR'
                      ? 'bg-[#172554] text-white font-bold border-l-2 border-blue-400'
                      : 'text-slate-300 hover:bg-[#112240]'
                  }`}
                >
                  Cavities & Elevation
                </button>
                <button
                  onClick={() => setActiveTab('MAINTENANCE')}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition ${
                    activeTab === 'MAINTENANCE'
                      ? 'bg-[#172554] text-white font-bold border-l-2 border-blue-400'
                      : 'text-slate-300 hover:bg-[#112240]'
                  }`}
                >
                  Maintenance & 52-Wk Matrix
                </button>
              </div>

              {/* Administrative Actions */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block px-2">
                  Admin Dispatch
                </span>
                <button
                  onClick={openAddPmAction}
                  className="w-full text-left px-3 py-2 rounded text-xs font-mono bg-[#172554] hover:bg-[#1e3a8a] text-blue-100 border border-blue-800 font-bold transition"
                >
                  + Add PM Action
                </button>
                <button
                  onClick={openManagerDocs}
                  className="w-full text-left px-3 py-2 rounded text-xs font-mono text-slate-300 hover:bg-[#112240] transition"
                >
                  Upload Applicable Documents
                </button>
                <button
                  onClick={() => setIsOperatorModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded text-xs font-mono text-slate-300 hover:bg-[#112240] transition"
                >
                  Operator Management
                </button>
                <button
                  onClick={() => setIsWeeklyRackModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded text-xs font-mono text-slate-300 hover:bg-[#112240] transition"
                >
                  Weekly Rack Check (FR-7.2-03)
                </button>
              </div>

              {/* Floor Operator Link */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block px-2">
                  Floor Operations
                </span>
                <Link
                  href="/mobile"
                  className="block w-full text-left px-3 py-2 rounded text-xs font-mono text-blue-200 hover:bg-[#112240] transition"
                >
                  Switch to Operator Gate
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 rounded text-xs font-mono text-slate-400 hover:text-white transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {isSidebarOpen && (
            <div className="p-3 border-t border-slate-800 text-[10px] font-mono text-slate-400">
              Plant WCS SCADA • Automated Shuttles
            </div>
          )}
        </aside>

        {/* MAIN WORKING AREA (LIGHT GREY BACKGROUND) */}
        <main className={`flex-1 overflow-y-auto transition-all ${adminViewMode === 'MOBILE' ? 'p-2 sm:p-4 flex justify-center bg-slate-300' : 'p-3 sm:p-5'}`}>
          <div className={adminViewMode === 'MOBILE' ? 'w-full max-w-sm bg-[#f0f2f5] shadow-2xl rounded border border-slate-400 p-2.5 sm:p-3 space-y-3 min-h-full' : 'space-y-4'}>
          {/* TAB 1: CAVITIES & CROSS SECTION */}
          {activeTab === 'MONITOR' && (
            <>
              {/* 4 INDUSTRIAL VITALS TILES (NO FRILLS, CLEAN TYPOGRAPHY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Tile 1: Shuttle 1 */}
                <div className="bg-white border border-slate-300 p-3.5 rounded">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold text-slate-900 font-mono">SHUTTLE 1 (RIM)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-slate-300 bg-slate-100 text-slate-700">
                      {shuttles[0].status}
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="flex justify-between text-xs font-mono text-slate-600">
                      <span>BATTERY</span>
                      <span className="font-bold text-slate-900">{shuttles[0].battery_pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-sm overflow-hidden mt-1">
                      <div className="bg-[#1e3a8a] h-full" style={{ width: `${shuttles[0].battery_pct}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1.5 border-t border-slate-200">
                    <span>POSITION: BAY J (L1)</span>
                    <span>ODO: 8,840 KM</span>
                  </div>
                </div>

                {/* Tile 2: Shuttle 2 */}
                <div className="bg-white border border-slate-300 p-3.5 rounded">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold text-slate-900 font-mono">SHUTTLE 2 (RIM)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-blue-300 bg-blue-50 text-blue-900 font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="flex justify-between text-xs font-mono text-slate-600">
                      <span>BATTERY</span>
                      <span className="font-bold text-slate-900">{shuttles[1].battery_pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-sm overflow-hidden mt-1">
                      <div className="bg-[#1e3a8a] h-full" style={{ width: `${shuttles[1].battery_pct}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1.5 border-t border-slate-200">
                    <span>POSITION: BAY H (L0)</span>
                    <span>ODO: 9,350 KM</span>
                  </div>
                </div>

                {/* Tile 3: Pallet Flow Limit 120 In / 93 Out */}
                <div className="bg-white border border-slate-300 p-3.5 rounded">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold text-slate-900 font-mono">THROUGHPUT FLOW</span>
                    <span className="text-[10px] font-mono text-slate-500">MAX 120 IN / 93 OUT</span>
                  </div>
                  <div className="space-y-1.5 my-2">
                    <div>
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-600">INBOUND</span>
                        <span className="font-bold text-slate-900">18 / 120</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-sm overflow-hidden mt-0.5">
                        <div className="bg-[#1e3a8a] h-full" style={{ width: `${(18 / 120) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-600">OUTBOUND</span>
                        <span className="font-bold text-slate-900">14 / 93</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-sm overflow-hidden mt-0.5">
                        <div className="bg-slate-400 h-full" style={{ width: `${(14 / 93) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                    <span>CAPACITY UTILIZATION</span>
                    <span className="font-bold text-slate-800">15% IN • 15% OUT</span>
                  </div>
                </div>

                {/* Tile 4: Stock Buffer */}
                <div className="bg-white border border-slate-300 p-3.5 rounded">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold text-slate-900 font-mono">USABLE BUFFER</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-blue-200 bg-blue-50 text-blue-900">
                      READY
                    </span>
                  </div>
                  <div className="my-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-mono font-bold text-slate-900">2.4</span>
                      <span className="text-xs text-slate-500 font-mono">DAYS AVAILABLE</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-sm overflow-hidden mt-1">
                      <div className="bg-[#1e3a8a] h-full" style={{ width: '15%' }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1.5 border-t border-slate-200">
                    <span>OCCUPIED</span>
                    <span>78 / 522 PALLETS (15%)</span>
                  </div>
                </div>
              </div>

              {/* CROSS-SECTIONAL ELEVATION VIEW */}
              <div className="bg-white border border-slate-300 p-2.5 sm:p-4 rounded space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-2 text-xs font-mono">
                  <span className="font-bold uppercase tracking-wider text-slate-900 text-[11px] sm:text-xs">
                    STORAGE RACKING CROSS-SECTIONAL ELEVATION
                  </span>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-[#1e3a8a] rounded-sm" />
                      <span>Large Rims</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-[#bfdbfe] border border-blue-300 rounded-sm" />
                      <span>Small Rims</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 bg-slate-100 border border-slate-300 rounded-sm" />
                      <span>Empty Cavity</span>
                    </div>

                    <button
                      onClick={() => setShowTyreStore(!showTyreStore)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] sm:text-xs transition font-semibold"
                    >
                      {showTyreStore ? 'HIDE TYRE STORE' : 'SHOW TYRE STORE'}
                    </button>
                  </div>
                </div>

                {/* Grid Container (Responsive & Stacking on Mobile) */}
                <div className="w-full overflow-x-auto pb-1">
                  <div className="flex flex-col lg:flex-row items-stretch gap-3 w-full min-w-[310px]">
                    {/* RIM STOREROOM (Active - Bays L to G) */}
                    <div className="flex-1 bg-slate-50 p-2 sm:p-3.5 border border-slate-300 rounded space-y-2 w-full">
                      <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono border-b border-slate-200 pb-1.5">
                        <span className="font-bold text-slate-900 uppercase">
                          RIM STOREROOM (BAYS L-G, LEVELS 0-2)
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-blue-900 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                          BOTH SHUTTLES ACTIVE IN THIS ROOM
                        </span>
                      </div>

                      {[2, 1, 0].map((lvl) => (
                        <div key={`rim-lvl-${lvl}`} className="flex items-center gap-1 sm:gap-1.5">
                          <span className="w-5 sm:w-7 text-[9px] sm:text-[10px] font-mono font-bold text-slate-500 text-right pr-0.5 sm:pr-1">
                            L{lvl}
                          </span>
                          <div className="grid grid-cols-6 gap-1 sm:gap-1.5 flex-1">
                            {['L', 'K', 'J', 'I', 'H', 'G'].map((col) => {
                              const slot = RIM_STOREROOM_CAVITIES.find(
                                (c) => c.col === col && c.level === lvl
                              );
                              if (!slot) return <div key={`rim-${col}-${lvl}`} className="h-10 sm:h-14" />;

                              const isShuttle1 = col === 'J' && lvl === 1;
                              const isShuttle2 = col === 'H' && lvl === 0;

                              let bgClass = 'bg-slate-100 border-slate-300 text-slate-400';
                              if (slot.type === 'LARGE_RIM') {
                                bgClass = 'bg-[#1e3a8a] border-[#0f172a] text-white';
                              } else if (slot.type === 'SMALL_RIM') {
                                bgClass = 'bg-[#bfdbfe] border-blue-300 text-blue-950 font-bold';
                              }

                              return (
                                <div
                                  key={`rim-${col}-${lvl}`}
                                  className={`relative h-10 sm:h-14 rounded-sm border p-0.5 sm:p-1 flex flex-col justify-between ${bgClass}`}
                                >
                                  <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono leading-none">
                                    <span className="font-bold">{col}-{lvl}</span>
                                    <span className="opacity-90 truncate max-w-[28px] sm:max-w-none">{slot.partCode}</span>
                                  </div>

                                  <div className="text-center font-mono font-bold text-[10px] sm:text-xs leading-none">
                                    {slot.occupied}/{slot.capacity}
                                  </div>

                                  {isShuttle1 && (
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-white text-[#1e3a8a] border border-blue-400 px-0.5 py-0.2 rounded text-[7px] sm:text-[8px] font-mono font-black tracking-tight shadow-sm whitespace-nowrap">
                                      SHUTTLE 1
                                    </div>
                                  )}
                                  {isShuttle2 && (
                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-white text-[#1e3a8a] border border-blue-400 px-0.5 py-0.2 rounded text-[7px] sm:text-[8px] font-mono font-black tracking-tight shadow-sm whitespace-nowrap">
                                      SHUTTLE 2
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Floor Column Labels */}
                      <div className="flex items-center gap-1 sm:gap-1.5 pt-1 text-[8px] sm:text-[10px] font-mono text-slate-600 font-bold text-center">
                        <span className="w-5 sm:w-7 text-right pr-0.5 sm:pr-1"></span>
                        <div className="grid grid-cols-6 gap-1 sm:gap-1.5 flex-1">
                          {['BAY L', 'BAY K', 'BAY J', 'BAY I', 'BAY H', 'BAY G'].map((bay) => (
                            <div key={bay}>{bay}</div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* TYRE STOREROOM (Clearly Visible When Toggled - Bays E to A) */}
                    {showTyreStore && (
                      <div className="flex-1 bg-slate-50 p-2 sm:p-3.5 border border-slate-300 rounded space-y-2 w-full">
                        <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono border-b border-slate-300 pb-1.5">
                          <span className="font-bold text-slate-800 uppercase">
                            TYRE STOREROOM (BAYS E-A, LEVELS 0-3)
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-slate-700 font-bold bg-slate-200 border border-slate-300 px-1.5 py-0.5 rounded">
                            UNCOMMISSIONED • ZONE INACTIVE
                          </span>
                        </div>

                        {[3, 2, 1, 0].map((lvl) => (
                          <div key={`tyre-lvl-${lvl}`} className="flex items-center gap-1 sm:gap-1.5">
                            <span className="w-5 sm:w-7 text-[9px] sm:text-[10px] font-mono font-bold text-slate-500 text-right pr-0.5 sm:pr-1">
                              L{lvl}
                            </span>
                            <div className="grid grid-cols-5 gap-1 sm:gap-1.5 flex-1">
                              {['E', 'D', 'C', 'B', 'A'].map((col) => {
                                const slot = TYRE_STOREROOM_CAVITIES.find(
                                  (c) => c.col === col && c.level === lvl
                                );
                                return (
                                  <div
                                    key={`tyre-${col}-${lvl}`}
                                    className="h-10 sm:h-12 rounded-sm border border-slate-300 bg-white p-1 flex flex-col justify-between text-slate-700 font-mono text-[8px] sm:text-[9px]"
                                  >
                                    <div className="flex justify-between leading-none">
                                      <span className="font-bold text-slate-800">{col}-{lvl}</span>
                                      <span className="truncate max-w-[28px] text-slate-400">{slot?.partCode || 'EMPTY'}</span>
                                    </div>
                                    <div className="text-center font-bold text-[10px] sm:text-xs leading-none text-slate-600">
                                      {slot?.occupied || 0}/29
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center gap-1 sm:gap-1.5 pt-1 text-[8px] sm:text-[10px] font-mono text-slate-600 font-bold text-center">
                          <span className="w-5 sm:w-7 text-right pr-0.5 sm:pr-1"></span>
                          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 flex-1">
                            {['BAY E', 'BAY D', 'BAY C', 'BAY B', 'BAY A'].map((bay) => (
                              <div key={bay}>{bay}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: MAINTENANCE CONTROL & 52-WEEK MATRIX */}
          {activeTab === 'MAINTENANCE' && (
            <div className="space-y-4">
              {/* Header Title */}
              <div className="bg-white border border-slate-300 p-3.5 rounded flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase font-mono">
                    PREVENTATIVE MAINTENANCE CONTROL
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Component Wear Telemetry & 52-Week Annual ISO Matrix
                  </p>
                </div>
              </div>

              {/* Shuttle 1 & Shuttle 2 Telemetry Linear Gauges */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Shuttle 1 */}
                <div className="bg-white border border-slate-300 p-4 rounded space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                      Shuttle 1 Component Telemetry
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-blue-200 bg-blue-50 text-blue-900">
                      NOMINAL
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <EngineeringGauge
                      label="Drive Wheels"
                      value={shuttles[0].odometer_meters}
                      max={10000000}
                      sublabel="8,840 / 10,000 km"
                    />
                    <EngineeringGauge
                      label="Scissor Lift"
                      value={shuttles[0].lifting_cycles}
                      max={100000}
                      sublabel="82.1k / 100k cycles"
                    />
                    <EngineeringGauge
                      label="Battery Pack"
                      value={shuttles[0].charge_cycles}
                      max={3000}
                      sublabel="2,450 / 3,000 cycles"
                    />
                    <EngineeringGauge
                      label="Optical Sensors"
                      value={2}
                      max={7}
                      sublabel="2 / 7 days elapsed"
                    />
                  </div>
                </div>

                {/* Shuttle 2 (Critical Sensor Condition highlighted in Red) */}
                <div className="bg-white border border-slate-300 p-4 rounded space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                      Shuttle 2 Component Telemetry
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-red-300 bg-red-50 text-red-800 font-bold">
                      ACTION REQUIRED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <EngineeringGauge
                      label="Drive Wheels"
                      value={shuttles[1].odometer_meters}
                      max={10000000}
                      sublabel="9,350 / 10,000 km"
                    />
                    <EngineeringGauge
                      label="Scissor Lift"
                      value={shuttles[1].lifting_cycles}
                      max={100000}
                      sublabel="96.8k / 100k cycles"
                    />
                    <EngineeringGauge
                      label="Battery Pack"
                      value={shuttles[1].charge_cycles}
                      max={3000}
                      sublabel="2,890 / 3,000 cycles"
                    />
                    <EngineeringGauge
                      label="Optical Sensors"
                      value={8}
                      max={7}
                      sublabel="8 / 7 days (OVERDUE)"
                      isEmergency={true}
                    />
                  </div>
                </div>
              </div>

              {/* 52-Week Maintenance Matrix */}
              <YearlyMaintenanceMatrix
                onOpenWeeklyRackModal={() => setIsWeeklyRackModalOpen(true)}
                onOpenAddPmAction={openAddPmAction}
              />
            </div>
          )}
          </div>
        </main>
      </div>

      {/* 3. COMPACT BOTTOM STATUS BAR */}
      <footer className="bg-white border-t border-slate-300 px-4 py-2 flex flex-wrap justify-between items-center text-[11px] font-mono text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1e3a8a]" />
          <span>STATUS: ONLINE</span>
          <span className="text-slate-300">•</span>
          <span>HEARTBEAT: /api/health</span>
          <span className="text-slate-300">•</span>
          <span>UPTIME MONITOR: ACTIVE</span>
        </div>
        <div>
          WHEEL ASSEMBLERS • DEEP-LANE STORAGE WCS
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
        defaultTab={docModalDefaultTab}
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