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
import { ShuttleItem, fetchShuttlesFromCloud, getStoredShuttles } from '@/lib/shuttleStore';
import OperatorManagementModal from './OperatorManagementModal';
import AdminDocumentAndMaintenanceModal from './AdminDocumentAndMaintenanceModal';
import ShuttleManagementModal from './ShuttleManagementModal';
import YearlyMaintenanceMatrix from './YearlyMaintenanceMatrix';
import WeeklyRackInspectionModal from './WeeklyRackInspectionModal';
import DigitalSopViewerModal from './DigitalSopViewerModal';

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
  const safeMax = max > 0 ? max : 1;
  const safeVal = typeof value === 'number' && !isNaN(value) ? value : 0;
  const pct = Math.min(100, Math.max(0, Math.round((safeVal / safeMax) * 100)));

  return (
    <div className="bg-white border border-slate-300 p-3 rounded shadow-xs">
      <div className="flex justify-between items-baseline text-xs">
        <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] font-mono">{label}</span>
        <span className={`font-mono font-bold ${isEmergency || pct >= 100 ? 'text-red-700' : 'text-slate-900'}`}>
          {pct}%
        </span>
      </div>

      <div className="w-full bg-slate-200 h-2 rounded-xs overflow-hidden my-2">
        <div
          className={`h-full transition-all duration-300 ${
            isEmergency || pct >= 100
              ? 'bg-red-600'
              : pct >= 80
              ? 'bg-[#1e3a8a]'
              : 'bg-[#0a192f]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] font-mono text-slate-500">
        <span>{sublabel}</span>
        <span>
          {value.toLocaleString()} {unit}
        </span>
      </div>
    </div>
  );
}

// Dynamic Pastel Battery Color Helper (Pastel Green to Pastel Red)
function getBatteryPastelColor(pct: number): string {
  if (pct >= 70) return '#86efac'; // Pastel green
  if (pct >= 40) return '#fde047'; // Pastel yellow
  if (pct >= 20) return '#fdba74'; // Pastel orange
  return '#fca5a5'; // Pastel red
}

interface CavitySlot {
  col: string;
  level: number;
  partCode: string;
  occupied: number;
  capacity: number;
  type: 'SMALL_RIM' | 'LARGE_RIM' | 'VOID';
}

// Exact Physical Cross-Section Layout from Plant Engineering Schematic
// Configured to 75.0% Occupancy (348 Pallets / 4 Days of Available Stock)
// Overflow (K-2) strictly kept empty (0/29) per SOP
const RIM_STOREROOM_CAVITIES: CavitySlot[] = [
  // LEVEL 2 (Top Level - Columns K, J, I, H reach Level 2)
  { col: 'L', level: 2, partCode: '', occupied: 0, capacity: 0, type: 'VOID' },
  { col: 'K', level: 2, partCode: 'Overflow', occupied: 0, capacity: 29, type: 'SMALL_RIM' }, // Strictly 0/29
  { col: 'J', level: 2, partCode: 'F119', occupied: 23, capacity: 29, type: 'LARGE_RIM' },
  { col: 'I', level: 2, partCode: 'F90', occupied: 24, capacity: 29, type: 'LARGE_RIM' },
  { col: 'H', level: 2, partCode: 'F100', occupied: 28, capacity: 29, type: 'SMALL_RIM' },
  { col: 'G', level: 2, partCode: '', occupied: 0, capacity: 0, type: 'VOID' },

  // LEVEL 1 (Middle Level - 6 Cavities)
  { col: 'L', level: 1, partCode: 'F117 / F118', occupied: 22, capacity: 29, type: 'LARGE_RIM' },
  { col: 'K', level: 1, partCode: '5a19d', occupied: 22, capacity: 29, type: 'SMALL_RIM' },
  { col: 'J', level: 1, partCode: 'F91', occupied: 22, capacity: 29, type: 'LARGE_RIM' },
  { col: 'I', level: 1, partCode: 'F112 / F113', occupied: 22, capacity: 29, type: 'LARGE_RIM' },
  { col: 'H', level: 1, partCode: 'F100', occupied: 29, capacity: 29, type: 'SMALL_RIM' },
  { col: 'G', level: 1, partCode: 'F112', occupied: 22, capacity: 29, type: 'LARGE_RIM' },

  // LEVEL 0 (Floor Level - 6 Cavities)
  { col: 'L', level: 0, partCode: 'F120', occupied: 23, capacity: 29, type: 'LARGE_RIM' },
  { col: 'K', level: 0, partCode: 'F114', occupied: 22, capacity: 29, type: 'SMALL_RIM' },
  { col: 'J', level: 0, partCode: 'F100', occupied: 29, capacity: 29, type: 'SMALL_RIM' },
  { col: 'I', level: 0, partCode: 'F100', occupied: 29, capacity: 29, type: 'SMALL_RIM' },
  { col: 'H', level: 0, partCode: 'F100', occupied: 29, capacity: 29, type: 'SMALL_RIM' },
  { col: 'G', level: 0, partCode: 'F113', occupied: 24, capacity: 29, type: 'LARGE_RIM' },
];

// Tyre Storeroom Racking (5 Bays right-to-left: A to E, Levels 0 to 3)
const TYRE_STOREROOM_CAVITIES: CavitySlot[] = [
  { col: 'E', level: 3, partCode: 'TYRE-E3', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'D', level: 3, partCode: 'TYRE-D3', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'C', level: 3, partCode: 'TYRE-C3', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'B', level: 3, partCode: 'TYRE-B3', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'A', level: 3, partCode: 'TYRE-A3', occupied: 0, capacity: 32, type: 'LARGE_RIM' },

  { col: 'E', level: 2, partCode: 'TYRE-E2', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'D', level: 2, partCode: 'TYRE-D2', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'C', level: 2, partCode: 'TYRE-C2', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'B', level: 2, partCode: 'TYRE-B2', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'A', level: 2, partCode: 'TYRE-A2', occupied: 0, capacity: 32, type: 'LARGE_RIM' },

  { col: 'E', level: 1, partCode: 'TYRE-E1', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'D', level: 1, partCode: 'TYRE-D1', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'C', level: 1, partCode: 'TYRE-C1', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'B', level: 1, partCode: 'TYRE-B1', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'A', level: 1, partCode: 'TYRE-A1', occupied: 0, capacity: 32, type: 'LARGE_RIM' },

  { col: 'E', level: 0, partCode: 'TYRE-E0', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'D', level: 0, partCode: 'TYRE-D0', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'C', level: 0, partCode: 'TYRE-C0', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'B', level: 0, partCode: 'TYRE-B0', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
  { col: 'A', level: 0, partCode: 'TYRE-A0', occupied: 0, capacity: 32, type: 'LARGE_RIM' },
];

// Active Cross-Section SKUs with single integer values
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

export default function TvKpiDashboard() {
  const router = useRouter();

  // Sidebar collapsible state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Active Main Section View
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'MAINTENANCE'>('MONITOR');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showTyreStore, setShowTyreStore] = useState<boolean>(false);

  // Modals State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docModalDefaultTab, setDocModalDefaultTab] = useState<'DOCS' | 'MAINTENANCE'>('DOCS');
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [isWeeklyRackModalOpen, setIsWeeklyRackModalOpen] = useState(false);
  const [isShuttleModalOpen, setIsShuttleModalOpen] = useState(false);
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
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(() => {
    if (typeof window !== 'undefined') {
      return getStoredMaintenanceTasks();
    }
    return [];
  });
  const [maintFilter, setMaintFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Shuttles fleet state
  const [shuttles, setShuttles] = useState<ShuttleItem[]>(getStoredShuttles());

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
            ? { ...s, status: 'ACTIVE' }
            : s
        )
      );
    }
  };

  const loadShuttles = async () => {
    const stored = getStoredShuttles();
    setShuttles(stored);
    const cloud = await fetchShuttlesFromCloud();
    if (cloud && cloud.length > 0) {
      setShuttles(cloud);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
      setAdminViewMode('MOBILE');
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));

    loadShuttles();
    refreshResolutionData();
    const resInterval = setInterval(refreshResolutionData, 1500);

    const handleSync = () => refreshResolutionData();
    window.addEventListener('wa-maintenance-sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(timer);
      clearInterval(resInterval);
      window.removeEventListener('wa-maintenance-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleSignOut = () => {
    setCurrentUser(null);
    router.push('/');
  };

  const openAddPmAction = () => {
    setDocModalDefaultTab('MAINTENANCE');
    setIsDocModalOpen(true);
  };

  const openManagerDocs = () => {
    setDocModalDefaultTab('DOCS');
    setIsDocModalOpen(true);
  };

  const isShuttle1Resolved = shuttle1Resolution?.status === 'ACTIVE';
  const isSensorResolved = !!sensorResolution;

  const hasInspectionAlert =
    !isShuttle1Resolved && shuttles[0] && shuttles[0].status === 'LOCKED_PENDING_INSPECTION';
  const hasSensorAlert = !isSensorResolved;
  const pendingPmTasks = maintenanceTasks.filter((t) => t.status !== 'COMPLETED');
  const resolvedPmTasks = maintenanceTasks.filter((t) => t.status === 'COMPLETED');
  const emergencyCount =
    (hasInspectionAlert ? 1 : 0) + (hasSensorAlert ? 1 : 0) + pendingPmTasks.length;

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 flex flex-col font-sans select-none">
      {/* TOP INDUSTRIAL STATUS BAR (DARK INDUSTRIAL HEADER) */}
      <header className="bg-[#0a192f] text-white px-2.5 sm:px-4 py-2 sm:py-2.5 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
          <button
            onClick={() => setAdminViewMode(adminViewMode === 'DESKTOP' ? 'MOBILE' : 'DESKTOP')}
            className="px-2 sm:px-2.5 py-1 bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 rounded font-mono text-[10px] sm:text-[11px] font-bold transition flex items-center gap-1 shrink-0"
            title="Toggle Desktop or Mobile orientation preview"
          >
            <span className="text-slate-400 hidden md:inline">VIEW:</span>
            <span>{adminViewMode}</span>
          </button>

          <span className="text-slate-400 hidden lg:inline">{currentTime || '08:00:00'}</span>

          {/* Emergency Alert Indicator */}
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
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-300 rounded shadow-2xl p-3 sm:p-4 z-50 space-y-3 text-xs text-slate-800 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold uppercase tracking-wider font-mono text-slate-900 text-[11px]">
                    System Action Dispatches & PM Tasks ({emergencyCount})
                  </span>
                  <button
                    onClick={() => setIsAlertsOpen(false)}
                    className="text-slate-400 hover:text-slate-800 font-mono text-xs"
                  >
                    CLOSE
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* Shuttle 1 Pre-op Inspection Interlock Alert */}
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
                              shuttle_id: shuttles[0]?.id || '11111111-1111-1111-1111-111111111111',
                              shuttle_code: shuttles[0]?.code || 'SHUTTLE-01',
                              resolved_by: currentUser?.name || 'Administrator',
                              resolved_at: new Date().toISOString(),
                              resolution_notes: 'Manual interlock release by Admin authorization.',
                              status_after: 'ACTIVE',
                            });
                            refreshResolutionData();
                          }}
                          className="px-2 py-0.5 bg-[#0a192f] text-white rounded text-[10px] font-mono font-bold"
                        >
                          RELEASE
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Shuttle 2 Optical Sensors Overdue Alert */}
                  {hasSensorAlert ? (
                    <div className="p-2.5 bg-red-50 border border-red-300 rounded space-y-1">
                      <div className="font-bold text-red-900 text-[11px]">
                        CRITICAL: Shuttle 2 optical sensors overdue for cleaning (Limit: 7 Days).
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] font-mono text-red-700">Elapsed: 8 Days</span>
                        <button
                          onClick={() => {
                            resolveSensorCleaning(
                              '2',
                              currentUser?.name || 'Technician'
                            );
                            refreshResolutionData();
                          }}
                          className="px-2 py-0.5 bg-red-800 hover:bg-red-900 text-white rounded text-[10px] font-mono font-bold"
                        >
                          SIGN OFF CLEANING
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Pending Preventative Maintenance Work Orders */}
                  {pendingPmTasks.map((t) => (
                    <div
                      key={`alert-${t.id}`}
                      className={`p-2.5 rounded border space-y-1.5 ${
                        t.priority === 'CRITICAL'
                          ? 'bg-red-50 border-red-300 text-red-900'
                          : t.priority === 'HIGH'
                          ? 'bg-amber-50/70 border-amber-300 text-slate-800'
                          : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1.5">
                        <div>
                          <div className="font-bold font-mono text-[11px] leading-tight text-slate-900">
                            {t.task_title}
                          </div>
                          <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                            {t.shuttle} • {t.component || 'General'}
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                            t.priority === 'CRITICAL'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : t.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>

                      {t.instructions && (
                        <p className="text-[10px] text-slate-600 line-clamp-1 italic bg-white/70 p-1 rounded border border-slate-200">
                          {t.instructions}
                        </p>
                      )}

                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/80">
                        <span className="text-[10px] font-mono text-slate-600">
                          Due: {t.due_date || 'Scheduled'}
                        </span>
                        <button
                          onClick={() => {
                            updateMaintenanceTaskStatus(t.id, 'COMPLETED', currentUser?.name || 'Administrator');
                            refreshResolutionData();
                          }}
                          className="px-2 py-0.5 bg-[#0a192f] hover:bg-[#172554] text-white rounded text-[10px] font-mono font-bold shadow-2xs"
                        >
                          RESOLVE / COMPLETE
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Recently Resolved Work Orders */}
                  {resolvedPmTasks.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                        Resolved Work Orders ({resolvedPmTasks.length})
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {resolvedPmTasks.slice(0, 5).map((t) => (
                          <div
                            key={`resolved-alert-${t.id}`}
                            className="p-2 bg-emerald-50/60 border border-emerald-200 rounded text-[10px] font-mono flex justify-between items-center"
                          >
                            <div className="truncate mr-2">
                              <span className="font-bold text-emerald-950 block truncate">{t.task_title}</span>
                              <span className="text-emerald-700 text-[9px]">
                                {t.shuttle} • Resolved by {t.completed_by || 'Technician'}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold text-[9px] shrink-0">
                              RESOLVED
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasInspectionAlert && !hasSensorAlert && pendingPmTasks.length === 0 && (
                    <div className="p-3 text-center text-slate-500 font-mono text-[11px]">
                      All vitals within nominal operational limits. Zero pending alerts.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* COLLAPSIBLE SIDEBAR MENU */}
        <aside
          className={`bg-[#0a192f] text-white border-r border-slate-800 flex flex-col justify-between transition-all duration-300 z-20 shrink-0 ${
            isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none'
          }`}
        >
          {isSidebarOpen && (
            <div className="p-3 space-y-4 overflow-y-auto">
              {/* Primary Dashboard Views */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block px-2">
                  Storage Views
                </span>
                <button
                  onClick={() => setActiveTab('MONITOR')}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-mono font-bold transition flex items-center justify-between ${
                    activeTab === 'MONITOR'
                      ? 'bg-[#1e3a8a] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-[#112240]'
                  }`}
                >
                  <span>Rim Storeroom (Active)</span>
                  <span className="text-[10px] bg-[#0a192f] px-1.5 py-0.2 rounded border border-blue-800 text-blue-200">
                    LIVE
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('MAINTENANCE')}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-mono font-bold transition flex items-center justify-between ${
                    activeTab === 'MAINTENANCE'
                      ? 'bg-[#1e3a8a] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-[#112240]'
                  }`}
                >
                  <span>Maintenance Hub & Matrix</span>
                  {hasSensorAlert && (
                    <span className="text-[9px] bg-red-700 px-1 py-0.2 rounded text-white font-bold">
                      DUE
                    </span>
                  )}
                </button>
              </div>

              {/* Tyre Storeroom Visibility Toggle */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block px-2">
                  Zone Visibility
                </span>
                <button
                  onClick={() => setShowTyreStore(!showTyreStore)}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition flex items-center justify-between border ${
                    showTyreStore
                      ? 'bg-[#112240] text-blue-200 border-blue-900'
                      : 'text-slate-400 hover:bg-[#112240] border-transparent'
                  }`}
                >
                  <span>Tyre Storeroom</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {showTyreStore ? 'SHOWN' : 'HIDDEN'}
                  </span>
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
                  Upload Standardized Documents
                </button>
                <button
                  onClick={() => setIsShuttleModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded text-xs font-mono text-slate-300 hover:bg-[#112240] transition"
                >
                  Fleet & Shuttle Management
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
                  {/* 1. Mobile Executive Header Banner */}
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
                        AVAILABLE STOCK: 75%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800">
                      <span>CAPACITY: 464 PALLETS</span>
                      <span className="text-slate-300 font-bold">348 OCCUPIED (4.0 DAYS)</span>
                    </div>
                  </div>

                  {/* 2. Shuttle Fleet Vitals Cards (Dynamic Pastel Battery) */}
                  <div className="grid grid-cols-2 gap-2">
                    {shuttles.map((shuttle, idx) => (
                      <div key={shuttle.id} className="bg-white border border-slate-300 p-2.5 rounded shadow-xs">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="font-bold text-slate-900 truncate pr-1">
                            {shuttle.code ? shuttle.code.replace('SHUTTLE-', 'SHUTTLE ') : `SHUTTLE ${idx + 1}`}
                          </span>
                          <span
                            className={`text-[8px] px-1 py-0.2 rounded font-mono font-bold ${
                              shuttle.status === 'ACTIVE'
                                ? 'bg-blue-50 border border-blue-300 text-blue-900'
                                : shuttle.status === 'LOCKED_PENDING_INSPECTION'
                                ? 'bg-slate-100 border border-slate-300 text-slate-700'
                                : 'bg-red-50 border border-red-300 text-red-900'
                            }`}
                          >
                            {shuttle.status === 'LOCKED_PENDING_INSPECTION' ? 'LOCKED' : shuttle.status}
                          </span>
                        </div>
                        <div className="my-1.5">
                          <div className="flex justify-between text-[10px] font-mono text-slate-600">
                            <span>BATTERY</span>
                            <span className="font-bold text-slate-900">{shuttle.battery_pct}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-xs overflow-hidden mt-0.5">
                            <div
                              className="h-full rounded-xs transition-all"
                              style={{
                                width: `${shuttle.battery_pct}%`,
                                backgroundColor: getBatteryPastelColor(shuttle.battery_pct),
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                          <span>BAY {shuttle.current_lane}-{shuttle.current_level}</span>
                          <span>{Math.round(shuttle.odometer_meters / 1000).toLocaleString()} KM</span>
                        </div>
                      </div>
                    ))}

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

                    {/* Usable Stock */}
                    <div className="bg-white border border-slate-300 p-2.5 rounded shadow-xs">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-slate-900">AVAILABLE STOCK</span>
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

                  {/* 3. Cross-Sectional Elevation Rack */}
                  <div className="bg-white border border-slate-300 p-2.5 sm:p-3 rounded space-y-2 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 text-xs font-mono">
                      <span className="font-bold text-slate-900 uppercase">
                        RACK CROSS-SECTIONAL ELEVATION
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        348 / 464 PALLETS (75% FULL)
                      </span>
                    </div>

                    {/* Legend */}
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

                    {/* Visual 16-Cavity Profile (Clean, Centered Shuttles, No Cavity Labels inside Box) */}
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
                                  return <div key={`m-void-${col}-${lvl}`} className="h-14 invisible pointer-events-none" />;
                                }
                                const shuttleInSlot = shuttles.find((s) => s.current_lane === col && s.current_level === lvl);
                                const isSmall = slot.type === 'SMALL_RIM';
                                const bgClass = isSmall
                                  ? 'bg-[#dcfce7] border-[#16a34a] text-[#14532d]'
                                  : 'bg-[#ffedd5] border-[#ea580c] text-[#7c2d12]';

                                return (
                                  <div
                                    key={`m-slot-${col}-${lvl}`}
                                    className={`relative h-14 rounded-sm border p-1 flex flex-col justify-between items-center text-center shadow-2xs ${bgClass}`}
                                  >
                                    {/* 1. Rim Type at Top */}
                                    <div className="font-mono font-bold text-[9px] leading-tight truncate w-full text-center">
                                      {slot.partCode}
                                    </div>

                                    {/* 2. Shuttle Badge in Middle (No Border Overflow) */}
                                    <div className="my-auto min-h-[14px] flex items-center justify-center">
                                      {shuttleInSlot ? (
                                        <span className="px-1 py-0.2 rounded-xs bg-[#0a192f] text-white border border-blue-400 text-[8px] font-mono font-black tracking-tight whitespace-nowrap shadow-xs">
                                          {shuttleInSlot.code ? shuttleInSlot.code.replace('SHUTTLE-', 'SHUTTLE ') : 'SHUTTLE'}
                                        </span>
                                      ) : null}
                                    </div>

                                    {/* 3. Pallet Count at Bottom */}
                                    <div className="text-center font-mono font-bold text-[10px] leading-none">
                                      {slot.occupied}/{slot.capacity}
                                    </div>
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

                  {/* 4. Condensed Mobile SKU Inventory */}
                  <div className="bg-white border border-slate-300 p-2.5 rounded space-y-2 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1 text-xs font-mono">
                      <span className="font-bold text-slate-900 uppercase">ACTIVE STOCK BY SKU</span>
                      <span className="text-[10px] text-slate-500">11 SKUS</span>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {ACTIVE_CROSS_SECTION_SKUS.map((item) => (
                        <div
                          key={`m-sku-${item.code}`}
                          className="p-2 rounded bg-slate-50 border border-slate-200 text-xs flex justify-between items-center"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full inline-block ${
                                  item.type === 'SMALL_RIM' ? 'bg-[#bfdbfe] border border-blue-400' : 'bg-[#1e3a8a]'
                                }`}
                              />
                              <span className="font-mono font-bold text-slate-900">{item.short}</span>
                              <span className="text-[10px] font-mono text-slate-500">({item.code})</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                              <span>IN: {item.arrivals}</span> • <span>OUT: {item.dispatch}</span> • <span>AVAILABLE STOCK: {item.buffer4d} PALLETS</span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-slate-500 block text-[9px]">AVAILABLE STOCK</span>
                            <strong className="text-slate-800">{item.buffer4d}</strong>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 text-[10px] font-mono text-slate-600 flex justify-between font-bold">
                      <span>TOTALS (11 SKUS)</span>
                      <span>77 IN • 75 OUT • 300 AVAILABLE STOCK</span>
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
                        Upload Standardized Documents
                      </button>
                      <button
                        onClick={() => setIsShuttleModalOpen(true)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold transition text-left"
                      >
                        Manage Shuttles
                      </button>
                      <button
                        onClick={() => setIsOperatorModalOpen(true)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold transition text-left"
                      >
                        Manage Users
                      </button>
                      <button
                        onClick={() => setIsWeeklyRackModalOpen(true)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold transition text-left col-span-2"
                      >
                        Weekly Rack Check (FR-7.2-03)
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
                  {/* INDUSTRIAL VITALS TILES (Dynamic Fleet + Flows) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {shuttles.map((shuttle, idx) => (
                      <div key={shuttle.id} className="bg-white border border-slate-300 p-3.5 rounded shadow-xs">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="font-bold text-slate-900 font-mono truncate pr-1">
                            {shuttle.code ? shuttle.code.replace('SHUTTLE-', 'SHUTTLE ') : `SHUTTLE ${idx + 1}`} ({shuttle.storeroom?.includes('Tyre') ? 'TYRE' : 'RIM'})
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                              shuttle.status === 'ACTIVE'
                                ? 'border-blue-300 bg-blue-50 text-blue-900'
                                : shuttle.status === 'LOCKED_PENDING_INSPECTION'
                                ? 'border-slate-300 bg-slate-100 text-slate-700'
                                : 'border-red-300 bg-red-50 text-red-900'
                            }`}
                          >
                            {shuttle.status === 'LOCKED_PENDING_INSPECTION' ? 'LOCKED' : shuttle.status}
                          </span>
                        </div>
                        <div className="my-2">
                          <div className="flex justify-between text-xs font-mono text-slate-600">
                            <span>BATTERY</span>
                            <span className="font-bold text-slate-900">{shuttle.battery_pct}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-sm overflow-hidden mt-1">
                            <div
                              className="h-full rounded-sm transition-all"
                              style={{
                                width: `${shuttle.battery_pct}%`,
                                backgroundColor: getBatteryPastelColor(shuttle.battery_pct),
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono text-slate-500 pt-1.5 border-t border-slate-200">
                          <span>POSITION: BAY {shuttle.current_lane} (L{shuttle.current_level})</span>
                          <span>ODO: {Math.round(shuttle.odometer_meters / 1000).toLocaleString()} KM</span>
                        </div>
                      </div>
                    ))}

                    {/* Pallet Flow */}
                    <div className="bg-white border border-slate-300 p-3.5 rounded shadow-xs">
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
                            <div className="bg-[#1e3a8a] h-full" style={{ width: '75%' }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
                        <span>ACTIVE PALLETS / DAY</span>
                        <span className="font-bold text-slate-800">77 IN • 75 OUT</span>
                      </div>
                    </div>

                    {/* Available Stock (~75% Full, 4 Days of Stock) */}
                    <div className="bg-white border border-slate-300 p-3.5 rounded shadow-xs">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-slate-900 font-mono">AVAILABLE STOCK</span>
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
                  <div className="bg-white border border-slate-300 p-2.5 sm:p-4 rounded space-y-3 shadow-xs">
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-2 text-xs font-mono">
                      <span className="font-bold uppercase tracking-wider text-slate-900 text-[11px] sm:text-xs">
                        STORAGE RACKING CROSS-SECTIONAL ELEVATION
                      </span>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 bg-[#dcfce7] border border-[#16a34a] rounded-xs" />
                          <span className="text-slate-700 font-semibold">Small Rim Lane</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 bg-[#ffedd5] border border-[#ea580c] rounded-xs" />
                          <span className="text-slate-700 font-semibold">Large Rim Lane</span>
                        </div>
                        <span className="text-slate-600 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          348 / 464 PALLETS (75.0% CAPACITY)
                        </span>
                      </div>
                    </div>

                    {/* Schematics Grid */}
                    <div className="flex flex-col xl:flex-row gap-4 items-start">
                      {/* RIM STOREROOM (Active) */}
                      <div className="flex-1 space-y-1.5 w-full">
                        <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono border-b border-slate-200 pb-1">
                          <span className="font-bold text-slate-800 uppercase">
                            RIM STOREROOM (BAYS L-G, LEVELS 0-2)
                          </span>
                          <span className="text-[10px] text-blue-900 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            ACTIVE OPERATIONAL ZONE
                          </span>
                        </div>

                        {[2, 1, 0].map((lvl) => (
                          <div key={`rim-lvl-${lvl}`} className="flex items-center gap-1 sm:gap-1.5">
                            <span className="w-5 sm:w-7 text-[9px] sm:text-[10px] font-mono font-bold text-slate-500 text-right pr-0.5 sm:pr-1">
                              L{lvl}
                            </span>
                            <div className="grid grid-cols-6 gap-1 sm:gap-1.5 flex-1">
                              {['L', 'K', 'J', 'I', 'H', 'G'].map((col) => {
                                const slot = RIM_STOREROOM_CAVITIES.find((c) => c.col === col && c.level === lvl);
                                if (!slot || slot.capacity === 0) {
                                  return <div key={`void-${col}-${lvl}`} className="h-12 sm:h-16 invisible pointer-events-none" />;
                                }
                                const shuttleInSlot = shuttles.find((s) => s.current_lane === col && s.current_level === lvl);
                                const isSmall = slot.type === 'SMALL_RIM';
                                const bgClass = isSmall
                                  ? 'bg-[#dcfce7] border-[#16a34a] text-[#14532d]'
                                  : 'bg-[#ffedd5] border-[#ea580c] text-[#7c2d12]';

                                return (
                                  <div
                                    key={`rim-${col}-${lvl}`}
                                    className={`relative h-12 sm:h-16 rounded-sm border p-1 flex flex-col justify-between items-center text-center shadow-2xs ${bgClass}`}
                                  >
                                    {/* 1. Rim Type at Top (no cavity coordinate) */}
                                    <div className="font-mono font-bold text-[9px] sm:text-[11px] leading-tight truncate w-full text-center">
                                      {slot.partCode}
                                    </div>

                                    {/* 2. Shuttle in the Middle (where applicable, no overflow) */}
                                    <div className="my-auto min-h-[16px] flex items-center justify-center">
                                      {shuttleInSlot ? (
                                        <span className="px-1.5 py-0.5 rounded-xs bg-[#0a192f] text-white border border-blue-400 text-[8px] sm:text-[9px] font-mono font-black tracking-tight whitespace-nowrap shadow-xs">
                                          {shuttleInSlot.code ? shuttleInSlot.code.replace('SHUTTLE-', 'SHUTTLE ') : 'SHUTTLE'}
                                        </span>
                                      ) : null}
                                    </div>

                                    {/* 3. Pallet Count at Bottom */}
                                    <div className="text-center font-mono font-bold text-[10px] sm:text-xs leading-none">
                                      {slot.occupied}/{slot.capacity}
                                    </div>
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
                                      <div className="flex justify-between">
                                        <span>{col}-{lvl}</span>
                                        <span className="text-slate-400">INACT</span>
                                      </div>
                                      <div className="text-center text-slate-400">0/{slot?.capacity || 32}</div>
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

                  {/* ACTIVE SKU INVENTORY BREAKDOWN TABLE */}
                  <div className="bg-white border border-slate-300 p-2.5 sm:p-4 rounded space-y-3 shadow-xs">
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <h3 className="font-mono font-bold text-slate-900 text-xs sm:text-sm uppercase">
                          Rim Storeroom SKU Inventory & Flow Analysis
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Averaged daily throughput and dedicated cavity allocations
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold">
                        AVAILABLE STOCK: 348 PALLETS (~75% CAPACITY)
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
                            <th className="py-1.5 px-2 text-right">Available Stock</th>
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
                  </div>
                </>
              )}
            </>
          )}

          {/* TAB 2: MAINTENANCE HUB & MATRIX */}
          {activeTab === 'MAINTENANCE' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-300 pb-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-mono uppercase">
                    Storage System Maintenance Hub & Engineering Matrix
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    52-Week annual preventative maintenance calendar, usage telemetry, and work orders
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsShuttleModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-mono text-xs font-bold transition"
                  >
                    Fleet Configuration
                  </button>
                  <button
                    onClick={openAddPmAction}
                    className="px-3 py-1.5 bg-[#0a192f] hover:bg-[#172554] text-white rounded font-mono text-xs font-bold transition"
                  >
                    + Schedule PM Action
                  </button>
                </div>
              </div>

              {/* Dynamic Telemetry for each shuttle */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {shuttles.map((shuttle, idx) => {
                  const isOverdue = idx === 1 && !isSensorResolved;
                  return (
                    <div key={`telemetry-${shuttle.id}`} className="bg-white border border-slate-300 p-4 rounded space-y-3 shadow-xs">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                          {shuttle.display_name} Component Telemetry
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold ${
                            isOverdue
                              ? 'border-red-300 bg-red-50 text-red-800'
                              : 'border-blue-200 bg-blue-50 text-blue-900'
                          }`}
                        >
                          {isOverdue ? 'ACTION REQUIRED' : 'NOMINAL'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <EngineeringGauge
                          label="Drive Wheels"
                          value={shuttle.odometer_meters}
                          max={10000000}
                          sublabel={`${Math.round(shuttle.odometer_meters / 1000).toLocaleString()} / 10,000 km`}
                        />
                        <EngineeringGauge
                          label="Scissor Lift"
                          value={shuttle.lifting_cycles}
                          max={100000}
                          sublabel={`${(shuttle.lifting_cycles / 1000).toFixed(1)}k / 100k cycles`}
                        />
                        <EngineeringGauge
                          label="Battery Pack"
                          value={shuttle.charge_cycles}
                          max={3000}
                          sublabel={`${shuttle.charge_cycles.toLocaleString()} / 3,000 cycles`}
                        />
                        <EngineeringGauge
                          label="Optical Sensors"
                          value={isOverdue ? 8 : idx === 1 && isSensorResolved ? 0 : 2}
                          max={7}
                          sublabel={
                            isOverdue
                              ? '8 / 7 days (OVERDUE)'
                              : idx === 1 && isSensorResolved
                              ? `0 / 7 days (Cleaned by ${sensorResolution?.technician_name || 'Technician'})`
                              : '2 / 7 days elapsed'
                          }
                          isEmergency={isOverdue}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scheduled Preventative Maintenance Tasks & Work Orders */}
              <div className="bg-white border border-slate-300 rounded p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wide">
                      Preventative Maintenance Work Orders ({maintenanceTasks.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Real-time dispatches, odometer/lift cycle triggers, and scheduled admin PM actions
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-slate-100 p-0.5 rounded border border-slate-300 text-[10px] font-mono">
                      <button
                        onClick={() => setMaintFilter('ALL')}
                        className={`px-2 py-0.5 rounded font-bold transition ${
                          maintFilter === 'ALL' ? 'bg-[#0a192f] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All ({maintenanceTasks.length})
                      </button>
                      <button
                        onClick={() => setMaintFilter('PENDING')}
                        className={`px-2 py-0.5 rounded font-bold transition ${
                          maintFilter === 'PENDING' ? 'bg-[#0a192f] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Pending ({pendingPmTasks.length})
                      </button>
                      <button
                        onClick={() => setMaintFilter('COMPLETED')}
                        className={`px-2 py-0.5 rounded font-bold transition ${
                          maintFilter === 'COMPLETED' ? 'bg-[#0a192f] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Resolved ({resolvedPmTasks.length})
                      </button>
                    </div>

                    <button
                      onClick={openAddPmAction}
                      className="px-2.5 py-1 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-xs font-mono font-bold transition shadow-2xs"
                    >
                      + Schedule PM Action
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-[11px]">
                        <th className="py-2 px-3">Equipment</th>
                        <th className="py-2 px-3">Task Title & Component</th>
                        <th className="py-2 px-3">Priority</th>
                        <th className="py-2 px-3">Trigger / Threshold</th>
                        <th className="py-2 px-3">Due Date</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {(maintFilter === 'ALL'
                        ? maintenanceTasks
                        : maintFilter === 'PENDING'
                        ? pendingPmTasks
                        : resolvedPmTasks
                      ).map((task) => {
                        const isCompleted = task.status === 'COMPLETED';
                        return (
                          <tr key={`dashboard-maint-${task.id}`} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                              {task.shuttle}
                            </td>
                            <td className="py-2.5 px-3 min-w-[220px]">
                              <span className="font-bold text-slate-900 block">{task.task_title}</span>
                              <span className="text-[10px] text-slate-500">{task.component || 'General Equipment'}</span>
                              {task.instructions && (
                                <span className="block text-[10px] text-slate-600 italic line-clamp-1 mt-0.5">
                                  {task.instructions}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                  task.priority === 'CRITICAL'
                                    ? 'bg-red-50 text-red-700 border-red-300'
                                    : task.priority === 'HIGH'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                {task.priority}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                              {task.threshold_metric || 'Scheduled PM'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                              {task.due_date || 'Scheduled'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isCompleted ? (
                                <div>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    RESOLVED
                                  </span>
                                  <span className="block text-[9px] text-slate-500 mt-0.5">
                                    by {task.completed_by || 'Technician'}
                                  </span>
                                </div>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                                  {task.status}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              {isCompleted ? (
                                <button
                                  onClick={() => {
                                    updateMaintenanceTaskStatus(task.id, 'PENDING');
                                    refreshResolutionData();
                                  }}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] font-bold"
                                  title="Reopen task"
                                >
                                  Reopen
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    updateMaintenanceTaskStatus(
                                      task.id,
                                      'COMPLETED',
                                      currentUser?.name || 'Administrator'
                                    );
                                    refreshResolutionData();
                                  }}
                                  className="px-2.5 py-1 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[10px] font-bold shadow-2xs"
                                >
                                  Resolve / Complete
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {maintenanceTasks.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-500 font-mono">
                            Zero preventative maintenance tasks scheduled.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 52-Week Annual Maintenance Matrix Component */}
              <div className="bg-white border border-slate-300 rounded p-4 shadow-xs">
                <YearlyMaintenanceMatrix />
              </div>
            </div>
          )}
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-300 px-4 py-2 flex justify-between items-center text-[10px] font-mono text-slate-500 z-10">
        <div>
          STATUS: <span className="font-bold text-slate-700">ONLINE</span> • RIM STOREROOM OPERATIONAL
        </div>
        <div>
          WHEEL ASSEMBLERS • DEEP-LANE STORAGE WCS
        </div>
      </footer>

      {/* Fleet & Shuttle Management Modal */}
      <ShuttleManagementModal
        isOpen={isShuttleModalOpen}
        onClose={() => setIsShuttleModalOpen(false)}
        shuttles={shuttles}
        onShuttlesUpdated={async () => {
          await loadShuttles();
        }}
      />

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
