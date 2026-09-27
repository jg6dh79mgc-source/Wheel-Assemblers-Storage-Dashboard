'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUser, setCurrentUser } from '@/lib/authStore';
import { DocumentItem } from '@/lib/documentStore';
import {
  getStoredMaintenanceTasks,
  updateMaintenanceTaskStatus,
  getStoredShuttleResolution,
  saveShuttleResolution,
  getStoredSensorResolution,
  resolveSensorCleaning,
  MaintenanceTask,
} from '@/lib/maintenanceStore';
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

// Rim Storeroom (Bays L to G, Levels 0 to 2) - 16 Storage Lanes, Total Capacity: 464 Pallets (29 per lane)
// Configured to 75.0% Occupancy (348 Pallets / 4 Days of Stock Buffer)
const RIM_STOREROOM_CAVITIES: CavitySlot[] = [
  // Level 2 (Top) - Stepped Roofline: L-2 and G-2 are open/empty
  { store: 'RIM_STORE', col: 'L', level: 2, type: 'EMPTY', partCode: '—', occupied: 0, capacity: 0 },
  { store: 'RIM_STORE', col: 'K', level: 2, type: 'SMALL_RIM', partCode: 'Overflow', occupied: 0, capacity: 29 }, // Reserved empty for F100 overflow
  { store: 'RIM_STORE', col: 'J', level: 2, type: 'LARGE_RIM', partCode: 'F119', occupied: 19, capacity: 29 },
  { store: 'RIM_STORE', col: 'I', level: 2, type: 'LARGE_RIM', partCode: 'F90', occupied: 19, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 2, type: 'SMALL_RIM', partCode: 'F100', occupied: 28, capacity: 29 },
  { store: 'RIM_STORE', col: 'G', level: 2, type: 'EMPTY', partCode: '—', occupied: 0, capacity: 0 },

  // Level 1 (Middle)
  { store: 'RIM_STORE', col: 'L', level: 1, type: 'LARGE_RIM', partCode: 'F117 / F118', occupied: 18, capacity: 29 },
  { store: 'RIM_STORE', col: 'K', level: 1, type: 'SMALL_RIM', partCode: '5a19d', occupied: 19, capacity: 29 },
  { store: 'RIM_STORE', col: 'J', level: 1, type: 'LARGE_RIM', partCode: 'F91', occupied: 21, capacity: 29 }, // Shuttle 1
  { store: 'RIM_STORE', col: 'I', level: 1, type: 'LARGE_RIM', partCode: 'F112 / F113', occupied: 24, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 1, type: 'SMALL_RIM', partCode: 'F100', occupied: 28, capacity: 29 },
  { store: 'RIM_STORE', col: 'G', level: 1, type: 'LARGE_RIM', partCode: 'F112', occupied: 22, capacity: 29 },

  // Level 0 (Ground)
  { store: 'RIM_STORE', col: 'L', level: 0, type: 'LARGE_RIM', partCode: 'F120', occupied: 21, capacity: 29 },
  { store: 'RIM_STORE', col: 'K', level: 0, type: 'SMALL_RIM', partCode: 'F114', occupied: 21, capacity: 29 },
  { store: 'RIM_STORE', col: 'J', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 28, capacity: 29 },
  { store: 'RIM_STORE', col: 'I', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 28, capacity: 29 },
  { store: 'RIM_STORE', col: 'H', level: 0, type: 'SMALL_RIM', partCode: 'F100', occupied: 29, capacity: 29 }, // Shuttle 2
  { store: 'RIM_STORE', col: 'G', level: 0, type: 'LARGE_RIM', partCode: 'F113', occupied: 23, capacity: 29 },
];

// Active SKUs on Cross-Section View (Averaged Daily Inbound & Outbound, Averaged Daily Values)
// Note: 5A6F115-01 (0.35 arr / 0.38 disp) and 5A6F116-01 (0.35 arr / 0.35 disp) excluded per operational directive
const ACTIVE_CROSS_SECTION_SKUS = [
  { code: '5a19de0-01', short: '5a19d', name: 'Small Rim (Green)', type: 'SMALL_RIM', arrivals: 2, dispatch: 2, buffer4d: 8, bays: 'K-1' },
  { code: '5A6F100-01', short: 'F100', name: 'Small Rim High Vol (Green)', type: 'SMALL_RIM', arrivals: 34, dispatch: 34, buffer4d: 136, bays: 'H-2, H-1, J-0, I-0, H-0 (Overflow: K-2)' },
  { code: '5A6F114-01', short: 'F114', name: 'Small Rim (Green)', type: 'SMALL_RIM', arrivals: 3, dispatch: 3, buffer4d: 12, bays: 'K-0' },
  { code: '5A90F90-01', short: 'F90', name: 'Large Rim (Peach)', type: 'LARGE_RIM', arrivals: 5, dispatch: 5, buffer4d: 20, bays: 'I-2' },
  { code: '5A90F91-01', short: 'F91', name: 'Large Rim (Peach)', type: 'LARGE_RIM', arrivals: 5, dispatch: 5, buffer4d: 20, bays: 'J-1' },
  { code: '5A6F112-01', short: 'F112', name: 'Large Rim (Peach)', type: 'LARGE_RIM', arrivals: 9, dispatch: 9, buffer4d: 36, bays: 'G-1, I-1' },
  { code: '5A6F113-01', short: 'F113', name: 'Large Rim (Peach)', type: 'LARGE_RIM', arrivals: 9, dispatch: 9, buffer4d: 36, bays: 'G-0, I-1' },
  { code: '5A6F117-01', short: 'F117', name: 'Large Rim (Peach)', type: 'LARGE_RIM', arrivals: 2, dispatch: 2, buffer4d: 8, bays: 'L-1' },
  { code: '5A6F118-01', short: 'F118', name: 'Large Rim (Peach)', type: 'LARGE_RIM', arrivals: 2, dispatch: 2, buffer4d: 8, bays: 'L-1' },
  { code: '5A6F119-01', short: 'F119', name: 'Large Rim (Peach)', type: 'LARGE_RIM', arrivals: 3, dispatch: 2, buffer4d: 8, bays: 'J-2' },
  { code: '5A6F120-01', short: 'F120', name: 'Large Rim (Peach)', type: 'LARGE_RIM', arrivals: 3, dispatch: 2, buffer4d: 8, bays: 'L-0' },
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
  const [mobileShowElevationGrid, setMobileShowElevationGrid] = useState<boolean>(false);

  // Technician Resolution and Maintenance State
  const [currentUser, setCurrentUserState] = useState(getCurrentUser());
  const [shuttle1Resolution, setShuttle1Resolution] = useState(getStoredShuttleResolution('1'));
  const [sensorResolution, setSensorResolution] = useState(getStoredSensorResolution('2'));
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);

  const refreshResolutionData = () => {
    const s1Res = getStoredShuttleResolution('1');
    const sensRes = getStoredSensorResolution('2');
    const tasks = getStoredMaintenanceTasks();
    setShuttle1Resolution(s1Res);
    setSensorResolution(sensRes);
    setMaintenanceTasks(tasks);

    if (s1Res && s1Res.status === 'ACTIVE') {
      setShuttles((prev) =>
        prev.map((s) =>
          s.id === '11111111-1111-1111-1111-111111111111' || s.code === 'SHUTTLE-01'
            ? { ...s, status: 'ACTIVE', last_inspection_passed: true }
            : s
        )
      );
    }
  };

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
    // Set responsive sidebar & mobile mode: auto-collapse and set mobile view on screens < 1024px
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
      setAdminViewMode('MOBILE');
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
    refreshResolutionData();
    const resInterval = setInterval(refreshResolutionData, 2500);
    return () => {
      clearInterval(timer);
      clearInterval(resInterval);
    };
  }, []);

  const handleSignOut = () => {
    setCurrentUser(null);
    router.push('/');
  };

  // Technician Resolution & Emergency Alert Evaluation
  const isShuttle1Resolved = shuttle1Resolution?.status === 'ACTIVE';
  const isSensorResolved = sensorResolution?.cleaned === true;
  const hasInspectionAlert = !isShuttle1Resolved && shuttles[0].status === 'LOCKED_PENDING_INSPECTION';
  const hasOverdueSensorEmergency = !isSensorResolved;
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
      {/* 1. TOP SLEEK CONTROL BAR (RESPONSIVE - ALERTS NEVER OUT OF FRAME) */}
      <header className="bg-[#0a192f] text-white px-2.5 sm:px-4 py-2 sm:py-2.5 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Collapsible Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="px-2 sm:px-2.5 py-1 bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 rounded font-mono text-[10px] sm:text-xs uppercase transition tracking-wider shrink-0"
            title="Toggle side menu navigation"
          >
            <span className="hidden sm:inline">{isSidebarOpen ? 'COLLAPSE MENU' : 'EXPAND MENU'}</span>
            <span className="sm:hidden">{isSidebarOpen ? 'CLOSE' : 'MENU'}</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 border-l border-slate-700 pl-2 sm:pl-3">
            <span className="font-bold text-white tracking-wider text-xs sm:text-sm uppercase whitespace-nowrap font-mono">
              WHEEL ASSEMBLERS
            </span>
            <span className="text-[10px] font-mono text-slate-400 hidden lg:inline">
              STORAGE CONTROL SYSTEM
            </span>
          </div>
        </div>

        {/* Right Info: View Switcher, Time & Emergency Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs font-mono shrink-0">
          {/* Desktop vs Mobile Orientation Switcher */}
          <button
            onClick={() => setAdminViewMode(adminViewMode === 'DESKTOP' ? 'MOBILE' : 'DESKTOP')}
            className="px-2 sm:px-2.5 py-1 bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 rounded font-mono text-[10px] sm:text-[11px] font-bold transition flex items-center gap-1 shrink-0"
            title="Toggle Desktop or Mobile orientation preview"
          >
            <span className="text-slate-400 hidden md:inline">VIEW:</span>
            <span>{adminViewMode}</span>
          </button>

          <span className="text-slate-400 hidden lg:inline">{currentTime || '08:00:00'}</span>

          {/* Emergency Alert Indicator (Always Visible & In-Frame) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className={`px-2 py-1 sm:px-2.5 rounded text-[10px] sm:text-xs font-mono font-bold border transition whitespace-nowrap ${
                emergencyCount > 0
                  ? 'bg-red-900/80 text-red-100 border-red-600 hover:bg-red-900'
                  : 'bg-[#172554] text-blue-200 border-blue-900 hover:bg-[#1e3a8a]'
              }`}
            >
              {emergencyCount > 0 ? `ALERTS (${emergencyCount})` : 'NORMAL'}
            </button>

            {isAlertsOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-300 rounded shadow-2xl p-3 sm:p-4 z-50 space-y-3 text-xs text-slate-800">
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
                  {/* Shuttle 1 Inspection Condition */}
                  {hasInspectionAlert ? (
                    <div className="p-2.5 bg-slate-50 border border-slate-300 rounded space-y-1">
                      <div className="font-semibold text-slate-800 text-[11px]">
                        Shuttle 1 pending FR-7.2-04 pre-operational sign-off. Electronic interlock active.
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <Link
                          href="/mobile"
                          onClick={() => setIsAlertsOpen(false)}
                          className="text-[11px] font-mono font-bold text-[#1e3a8a] underline"
                        >
                          OPEN OPERATOR GATE
                        </Link>
                        <button
                          onClick={() => {
                            saveShuttleResolution({
                              shuttle_id: '1',
                              inspection_passed: true,
                              status: 'ACTIVE',
                              technician_name: currentUser?.name || 'Lead Technician',
                              resolved_at: new Date().toISOString(),
                              notes: 'Direct supervisory override & unlock.',
                            });
                            refreshResolutionData();
                          }}
                          className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 font-mono text-[10px] font-bold"
                        >
                          Unlock Interlock
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-blue-900">PRE-OP INSPECTION (FR-7.2-04)</span>
                        <span className="px-1.5 py-0.2 rounded bg-white text-blue-900 font-bold border border-blue-300">RESOLVED</span>
                      </div>
                      <div className="text-slate-800 text-[11px] font-medium">
                        Shuttle 1 interlock released. Verified by technician <strong>{shuttle1Resolution?.technician_name || 'Technician'}</strong> at {shuttle1Resolution?.resolved_at ? new Date(shuttle1Resolution.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00'}.
                      </div>
                    </div>
                  )}

                  {/* Shuttle 2 Optical Sensor Condition */}
                  {hasOverdueSensorEmergency ? (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded space-y-1 text-red-900">
                      <div className="font-bold text-[11px]">
                        CRITICAL: Shuttle 2 optical sensors cleanliness limit exceeded (8/7 days).
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <button
                          onClick={() => {
                            setActiveTab('MAINTENANCE');
                            setIsAlertsOpen(false);
                          }}
                          className="text-[11px] font-mono font-bold text-red-700 underline"
                        >
                          VIEW IN MAINTENANCE
                        </button>
                        <button
                          onClick={() => {
                            resolveSensorCleaning('2', currentUser?.name || 'Lead Technician');
                            refreshResolutionData();
                          }}
                          className="px-2 py-0.5 rounded bg-white border border-red-300 text-red-800 font-mono text-[10px] font-bold"
                        >
                          Sign-off Cleaned
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-blue-900">OPTICAL SENSORS (SHUTTLE 2)</span>
                        <span className="px-1.5 py-0.2 rounded bg-white text-blue-900 font-bold border border-blue-300">RESOLVED</span>
                      </div>
                      <div className="text-slate-800 text-[11px] font-medium">
                        Cleaned & optical calibration confirmed by technician <strong>{sensorResolution?.technician_name || 'Technician'}</strong> at {sensorResolution?.cleaned_at ? new Date(sensorResolution.cleaned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00'}. Interval reset (0/7 days).
                      </div>
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
        <main className={`flex-1 overflow-y-auto transition-all ${adminViewMode === 'MOBILE' ? 'p-2 sm:p-4 flex justify-center bg-slate-200' : 'p-3 sm:p-5'}`}>
          <div className={adminViewMode === 'MOBILE' ? 'w-full max-w-md bg-[#f0f2f5] shadow-xl rounded border border-slate-300 p-2.5 sm:p-3.5 space-y-3 min-h-full' : 'space-y-4'}>
          {/* TAB 1: CAVITIES & CROSS SECTION */}
          {activeTab === 'MONITOR' && (
            <>
              {adminViewMode === 'MOBILE' ? (
                /* ========================================================
                   EXECUTIVE MOBILE SUMMARY VIEW (CLEAN, SUMMARIZED, TOUCH-OPTIMIZED)
                   ======================================================== */
                <div className="space-y-3 font-sans">
                  {/* 1. Mobile Executive Header Banner (Spacious, Roomy & Uncompressed) */}
                  <div className="bg-[#0a192f] text-white p-4 rounded-md border border-slate-700 shadow-sm space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-blue-300 font-semibold tracking-wider block">
                          PLANT SCADA • RIM STOREROOM
                        </span>
                        <h2 className="text-base font-bold font-mono text-white tracking-wide">
                          WHEEL ASSEMBLERS
                        </h2>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#172554] border border-blue-700 text-blue-200 font-bold shrink-0">
                        75% BUFFER
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800">
                      <span>CAPACITY: 464 PALLETS</span>
                      <span className="text-slate-300 font-bold">348 OCCUPIED (4.0 DAYS)</span>
                    </div>
                  </div>

                  {/* 2. 2x2 Industrial Vitals Tiles (Touch-Optimized) */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Shuttle 1 */}
                    <div className="bg-white border border-slate-300 p-2.5 rounded shadow-xs">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-slate-900">SHUTTLE 1</span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-700">LOCKED</span>
                      </div>
                      <div className="my-1.5">
                        <div className="flex justify-between text-[10px] font-mono text-slate-600">
                          <span>BATT</span>
                          <span className="font-bold text-slate-900">{shuttles[0].battery_pct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-xs overflow-hidden mt-0.5">
                          <div className="bg-[#1e3a8a] h-full" style={{ width: `${shuttles[0].battery_pct}%` }} />
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                        <span>BAY J-1</span>
                        <span>8,840 KM</span>
                      </div>
                    </div>

                    {/* Shuttle 2 */}
                    <div className="bg-white border border-slate-300 p-2.5 rounded shadow-xs">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-slate-900">SHUTTLE 2</span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-blue-50 border border-blue-300 text-blue-900 font-bold">ACTIVE</span>
                      </div>
                      <div className="my-1.5">
                        <div className="flex justify-between text-[10px] font-mono text-slate-600">
                          <span>BATT</span>
                          <span className="font-bold text-slate-900">{shuttles[1].battery_pct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-xs overflow-hidden mt-0.5">
                          <div className="bg-[#1e3a8a] h-full" style={{ width: `${shuttles[1].battery_pct}%` }} />
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                        <span>BAY H-0</span>
                        <span>9,350 KM</span>
                      </div>
                    </div>

                    {/* Daily Flow */}
                    <div className="bg-white border border-slate-300 p-2.5 rounded shadow-xs">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-slate-900">DAILY FLOW</span>
                        <span className="text-[8px] text-slate-500">PALLETS</span>
                      </div>
                      <div className="my-1.5 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-600">INBOUND</span>
                          <span className="font-bold text-slate-900">77</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-600">OUTBOUND</span>
                          <span className="font-bold text-slate-900">75</span>
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                        <span>FLOW RATE</span>
                        <span className="font-bold text-slate-800">77 IN • 75 OUT</span>
                      </div>
                    </div>

                    {/* Usable Buffer */}
                    <div className="bg-white border border-slate-300 p-2.5 rounded shadow-xs">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-slate-900">BUFFER</span>
                        <span className="text-[8px] px-1 py-0.2 rounded bg-blue-50 border border-blue-200 text-blue-900 font-bold">READY</span>
                      </div>
                      <div className="my-1 text-center">
                        <span className="text-xl font-mono font-bold text-slate-900">4.0</span>
                        <span className="text-[9px] text-slate-500 font-mono ml-1">DAYS</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                        <span>OCCUPIED</span>
                        <span className="font-bold text-slate-800">348/464 (75%)</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Cross-Sectional Elevation Rack (Exact Engineering Schematic) */}
                  <div className="bg-white border border-slate-300 p-2.5 sm:p-3 rounded space-y-2 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 text-xs font-mono">
                      <span className="font-bold text-slate-900 uppercase">
                        RACK CROSS-SECTIONAL ELEVATION
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        348 / 464 PALLETS (75% FULL)
                      </span>
                    </div>

                    {/* Legend matching Engineering Schematic */}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-[#dcfce7] border border-[#16a34a] rounded-xs" />
                        <span className="text-slate-700 font-semibold">Small Rim</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 bg-[#ffedd5] border border-[#ea580c] rounded-xs" />
                        <span className="text-slate-700 font-semibold">Large Rim</span>
                      </div>
                    </div>

                    {/* Visual 16-Cavity Stepped Profile */}
                    <div className="overflow-x-auto pb-1">
                      <div className="min-w-[460px] space-y-1.5">
                        {[2, 1, 0].map((lvl) => (
                          <div key={`m-grid-lvl-${lvl}`} className="flex items-center gap-1.5">
                            <span className="w-6 text-[10px] font-mono font-bold text-slate-500 text-right pr-0.5">
                              L{lvl}
                            </span>
                            <div className="grid grid-cols-6 gap-1.5 flex-1">
                              {['L', 'K', 'J', 'I', 'H', 'G'].map((col) => {
                                const slot = RIM_STOREROOM_CAVITIES.find((c) => c.col === col && c.level === lvl);
                                if (!slot || slot.capacity === 0) {
                                  return <div key={`m-void-${col}-${lvl}`} className="h-12 invisible pointer-events-none" />;
                                }
                                const isShuttle1 = col === 'J' && lvl === 1;
                                const isShuttle2 = col === 'H' && lvl === 0;
                                const isSmall = slot.type === 'SMALL_RIM';
                                const bgClass = isSmall
                                  ? 'bg-[#dcfce7] border-[#16a34a] text-[#14532d]'
                                  : 'bg-[#ffedd5] border-[#ea580c] text-[#7c2d12]';

                                return (
                                  <div
                                    key={`m-slot-${col}-${lvl}`}
                                    className={`relative h-12 rounded-sm border p-1 flex flex-col justify-between shadow-2xs ${bgClass}`}
                                  >
                                    <div className="flex justify-between items-center text-[9px] font-mono leading-none">
                                      <span className="font-bold">{col}-{lvl}</span>
                                      <span className="font-bold truncate max-w-[44px]">{slot.partCode}</span>
                                    </div>
                                    <div className="text-center font-mono font-bold text-xs leading-none">
                                      {slot.occupied}/{slot.capacity}
                                    </div>
                                    {isShuttle1 && (
                                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-white text-[#1e3a8a] border border-blue-500 px-1 py-0.2 rounded text-[7px] font-mono font-black shadow-xs whitespace-nowrap">
                                        SHUTTLE 1
                                      </div>
                                    )}
                                    {isShuttle2 && (
                                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-white text-[#1e3a8a] border border-blue-500 px-1 py-0.2 rounded text-[7px] font-mono font-black shadow-xs whitespace-nowrap">
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
                        <div className="flex items-center gap-1.5 pt-1 text-[9px] font-mono text-slate-600 font-bold text-center">
                          <span className="w-6 text-right pr-0.5"></span>
                          <div className="grid grid-cols-6 gap-1.5 flex-1">
                            {['BAY L', 'BAY K', 'BAY J', 'BAY I', 'BAY H', 'BAY G'].map((bay) => (
                              <div key={`m-col-${bay}`}>{bay}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Active Daily SKU Movement (Mobile Touch Cards) */}
                  <div className="bg-white border border-slate-300 p-3 rounded space-y-2 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 text-xs font-mono">
                      <span className="font-bold text-slate-900 uppercase">DAILY SKU FLOW</span>
                      <span className="text-[10px] font-bold text-slate-700">77 IN • 75 OUT</span>
                    </div>
                    <div className="space-y-1.5">
                      {ACTIVE_CROSS_SECTION_SKUS.map((item) => (
                        <div key={`m-sku-${item.code}`} className="bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${item.type === 'SMALL_RIM' ? 'bg-[#bfdbfe] border border-blue-400' : 'bg-[#1e3a8a]'}`} />
                              {item.code}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600 font-bold">
                              {item.type === 'SMALL_RIM' ? 'Small Rim' : 'Large Rim'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 pt-1.5 mt-1 border-t border-slate-200 text-[10px] text-center">
                            <div>
                              <span className="text-slate-500 block text-[9px]">INBOUND</span>
                              <strong className="text-blue-900">{item.arrivals}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px]">OUTBOUND</span>
                              <strong className="text-slate-900">{item.dispatch}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px]">4D BUFFER</span>
                              <strong className="text-slate-800">{item.buffer4d}</strong>
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-500 pt-1 mt-1 border-t border-slate-100 flex justify-between">
                            <span>BAYS: {item.bays}</span>
                            <span>BUFFER REQ: {item.buffer4d} PALLETS</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-100 border border-slate-200 p-2 rounded text-[10px] font-mono text-slate-700 flex justify-between font-bold">
                      <span>TOTALS (11 SKUS)</span>
                      <span>77 IN • 75 OUT • 300 BUFFER REQ</span>
                    </div>
                  </div>

                  {/* 5. Quick Dispatch Actions for Admin on Mobile */}
                  <div className="bg-white border border-slate-300 p-3 rounded space-y-2 shadow-xs">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block border-b border-slate-200 pb-1">
                      QUICK DISPATCH TOOLS
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <button
                        onClick={openAddPmAction}
                        className="p-2 bg-[#172554] hover:bg-[#1e3a8a] text-blue-100 rounded border border-blue-900 font-bold transition text-left"
                      >
                        + Add PM Action
                      </button>
                      <button
                        onClick={openManagerDocs}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold transition text-left"
                      >
                        Upload Documents
                      </button>
                      <button
                        onClick={() => setIsOperatorModalOpen(true)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold transition text-left"
                      >
                        Manage Users
                      </button>
                      <button
                        onClick={() => setIsWeeklyRackModalOpen(true)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold transition text-left"
                      >
                        Weekly Rack Check
                      </button>
                    </div>
                    <Link
                      href="/mobile"
                      className="block text-center py-2 bg-[#0a192f] hover:bg-[#172554] text-white rounded font-mono text-xs font-bold transition mt-2 uppercase tracking-wider"
                    >
                      Go to Operator Inspection Gate →
                    </Link>
                  </div>
                </div>
              ) : (
                /* ========================================================
                   WIDESCREEN DESKTOP SCADA VIEW (DETAILED CROSS-SECTION & TABLE)
                   ======================================================== */
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

                    {/* Tile 3: Pallet Flow (No Upper Bounds, Averaged Daily Values) */}
                    <div className="bg-white border border-slate-300 p-3.5 rounded">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-slate-900 font-mono">THROUGHPUT FLOW</span>
                        <span className="text-[10px] font-mono text-slate-500">DAILY AVERAGE</span>
                      </div>
                      <div className="space-y-1.5 my-2">
                        <div>
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-slate-600">INBOUND</span>
                            <span className="font-bold text-slate-900 text-sm">77</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-sm overflow-hidden mt-0.5">
                            <div className="bg-[#1e3a8a] h-full" style={{ width: '77%' }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-slate-600">OUTBOUND</span>
                            <span className="font-bold text-slate-900 text-sm">75</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-sm overflow-hidden mt-0.5">
                            <div className="bg-slate-500 h-full" style={{ width: '75%' }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                        <span>ACTIVE PALLETS / DAY</span>
                        <span className="font-bold text-slate-800">77 IN • 75 OUT</span>
                      </div>
                    </div>

                    {/* Tile 4: Stock Buffer (~75% Full, 4 Days of Stock) */}
                    <div className="bg-white border border-slate-300 p-3.5 rounded">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-slate-900 font-mono">USABLE BUFFER</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-blue-200 bg-blue-50 text-blue-900">
                          READY
                        </span>
                      </div>
                      <div className="my-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-mono font-bold text-slate-900">4.0</span>
                          <span className="text-xs text-slate-500 font-mono">DAYS OF STOCK</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-sm overflow-hidden mt-1">
                          <div className="bg-[#1e3a8a] h-full" style={{ width: '75%' }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1.5 border-t border-slate-200">
                        <span>OCCUPIED</span>
                        <span>348 / 464 PALLETS (75%)</span>
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
                          <span className="h-3 w-3 bg-[#dcfce7] border border-[#16a34a] rounded-sm" />
                          <span className="font-semibold text-slate-700">Small Rims</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-3 w-3 bg-[#ffedd5] border border-[#ea580c] rounded-sm" />
                          <span className="font-semibold text-slate-700">Large Rims</span>
                        </div>
                        <button
                          onClick={() => setShowTyreStore(!showTyreStore)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] sm:text-xs transition font-semibold"
                        >
                          {showTyreStore ? 'Hide Tyre Storeroom' : 'Show Tyre Storeroom (Inactive)'}
                        </button>
                      </div>
                    </div>

                    {/* Both Racks Display */}
                    <div className="flex flex-col lg:flex-row gap-4 items-start">
                      {/* RIM STOREROOM (Active - Bays L to G) */}
                      <div className="flex-1 bg-white p-2 sm:p-3.5 border border-slate-300 rounded space-y-2 w-full">
                        <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono border-b border-slate-200 pb-1.5">
                          <span className="font-bold text-slate-900 uppercase">
                            RIM STOREROOM (ACTIVE • BAYS L-G, LEVELS 0-2)
                          </span>
                          <span className="text-[10px] text-blue-900 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            348 / 464 PALLETS (75% FULL)
                          </span>
                        </div>

                        {/* Levels: L2 (Top), L1 (Middle), L0 (Ground) */}
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
                                if (!slot || slot.capacity === 0) {
                                  return <div key={`rim-${col}-${lvl}`} className="h-10 sm:h-14 invisible pointer-events-none" />;
                                }

                                const isShuttle1 = col === 'J' && lvl === 1;
                                const isShuttle2 = col === 'H' && lvl === 0;

                                const isSmall = slot.type === 'SMALL_RIM';
                                const bgClass = isSmall
                                  ? 'bg-[#dcfce7] border-[#16a34a] text-[#14532d]'
                                  : 'bg-[#ffedd5] border-[#ea580c] text-[#7c2d12]';

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

                  {/* ACTIVE SKU THROUGHPUT TABLE (CROSS-SECTION ASSIGNED ONLY) */}
                  <div className="bg-white border border-slate-300 p-3 sm:p-4 rounded space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-2 text-xs font-mono">
                      <div>
                        <span className="font-bold text-slate-900 uppercase tracking-wider">
                          DAILY SKU FLOW & STOCK (CROSS-SECTION ASSIGNED)
                        </span>
                        <span className="ml-2 text-[10px] text-slate-500">
                          (Total Inbound: 77 | Outbound: 75 Pallets/Day)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold">
                        4-DAY BUFFER: 300-348 PALLETS (~75% FULL)
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase">
                            <th className="py-1.5 px-2">SKU Code</th>
                            <th className="py-1.5 px-2">Type / Category</th>
                            <th className="py-1.5 px-2 text-right">Daily Inbound</th>
                            <th className="py-1.5 px-2 text-right">Daily Outbound</th>
                            <th className="py-1.5 px-2 text-center">Assigned Bays</th>
                            <th className="py-1.5 px-2 text-right">4-Day Buffer Req</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {ACTIVE_CROSS_SECTION_SKUS.map((item) => (
                            <tr key={item.code} className="hover:bg-slate-50 transition">
                              <td className="py-1.5 px-2 font-bold text-slate-900 flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full inline-block ${
                                    item.type === 'SMALL_RIM' ? 'bg-[#bfdbfe] border border-blue-400' : 'bg-[#1e3a8a]'
                                  }`}
                                />
                                {item.code}
                              </td>
                              <td className="py-1.5 px-2 text-slate-600">{item.name}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-slate-800">{item.arrivals}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-slate-800">{item.dispatch}</td>
                              <td className="py-1.5 px-2 text-center text-slate-700 font-semibold">{item.bays}</td>
                              <td className="py-1.5 px-2 text-right text-slate-600">{item.buffer4d}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-300 font-bold text-slate-900 text-xs bg-slate-50">
                            <td className="py-2 px-2" colSpan={2}>
                              TOTALS (11 CROSS-SECTION SKUS)
                            </td>
                            <td className="py-2 px-2 text-right text-blue-900">77</td>
                            <td className="py-2 px-2 text-right text-slate-900">75</td>
                            <td className="py-2 px-2 text-center text-[10px] text-slate-600">16 Storage Lanes</td>
                            <td className="py-2 px-2 text-right text-blue-950">300 Pallets</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="text-[10px] font-mono text-slate-500 pt-1 flex flex-wrap justify-between items-center gap-2 border-t border-slate-100">
                      <span>Note: SKUs 5A6F115-01 (1 arr / 1 disp) and 5A6F116-01 (1 arr / 1 disp) excluded per directive (not on cross-section racking).</span>
                      <span className="font-bold text-slate-700">STOREROOM: 348 / 464 PALLETS (75% FULL)</span>
                    </div>
                  </div>
                </>
              )}
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

                {/* Shuttle 2 (Reflects Technician Resolution on Optical Sensors) */}
                <div className="bg-white border border-slate-300 p-4 rounded space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                      Shuttle 2 Component Telemetry
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                      isSensorResolved
                        ? 'border-blue-200 bg-blue-50 text-blue-900'
                        : 'border-red-300 bg-red-50 text-red-800'
                    }`}>
                      {isSensorResolved ? 'NOMINAL' : 'ACTION REQUIRED'}
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
                      value={isSensorResolved ? 0 : 8}
                      max={7}
                      sublabel={
                        isSensorResolved
                          ? `0 / 7 days (Cleaned by ${sensorResolution?.technician_name || 'Technician'})`
                          : '8 / 7 days (OVERDUE)'
                      }
                      isEmergency={!isSensorResolved}
                    />
                  </div>
                </div>
              </div>

              {/* Technician Maintenance Action Dispatches */}
              <div className="bg-white border border-slate-300 p-4 rounded space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                    Technician Maintenance Tasks & Resolutions
                  </span>
                  <button
                    onClick={openAddPmAction}
                    className="px-2.5 py-1 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[11px] font-mono font-bold transition"
                  >
                    + Schedule PM Task
                  </button>
                </div>

                <div className="space-y-2">
                  {maintenanceTasks.map((t) => {
                    const isDone = t.status === 'COMPLETED';
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                          isDone ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{t.task_title}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">• {t.shuttle}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isDone
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : t.priority === 'CRITICAL'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Trigger: <strong className="text-slate-800">{t.threshold_metric}</strong> • Target: {t.component}
                          </div>
                          {isDone && (
                            <div className="text-[10px] text-blue-900 font-bold">
                              ✓ Resolved by technician {t.completed_by} ({t.completed_at ? new Date(t.completed_at).toLocaleDateString() : 'Today'})
                            </div>
                          )}
                        </div>

                        {!isDone && (
                          <button
                            onClick={() => {
                              updateMaintenanceTaskStatus(t.id, 'COMPLETED', currentUser?.name || 'Lead Technician');
                              refreshResolutionData();
                            }}
                            className="px-3 py-1.5 rounded bg-white hover:bg-blue-50 text-[#1e3a8a] border border-blue-300 font-mono text-[11px] font-bold transition shrink-0"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    );
                  })}
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