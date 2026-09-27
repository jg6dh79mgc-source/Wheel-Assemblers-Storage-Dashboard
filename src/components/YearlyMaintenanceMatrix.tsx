'use client';

import React, { useState } from 'react';

export interface MaintenanceOccasion {
  id: string;
  name: string;
  code: string;
  component: string;
  frequency: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'BI_ANNUAL';
  target: 'SHUTTLE_1' | 'SHUTTLE_2' | 'RACKING' | 'SAFETY';
  weeksScheduled: number[]; // 1 to 52
}

const INITIAL_MAINTENANCE_PROGRAMS: MaintenanceOccasion[] = [
  {
    id: 'prog-01',
    name: 'FR-7.2-03 Weekly High-Bay Racking Check',
    code: 'FR-7.2-03',
    component: 'Racking Structure (Uprights, Shims, Anchors, Rails)',
    frequency: 'WEEKLY',
    target: 'RACKING',
    weeksScheduled: Array.from({ length: 52 }, (_, i) => i + 1),
  },
  {
    id: 'prog-02',
    name: 'Optical Laser Sensor Clean & Recalibration',
    code: 'PM-SENS-01',
    component: 'Optical Laser Distance Sensors (H1/H2) - 7-Day Limit',
    frequency: 'BI_WEEKLY',
    target: 'SHUTTLE_1',
    weeksScheduled: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 39, 40, 42, 44, 46, 48, 50, 52],
  },
  {
    id: 'prog-03',
    name: 'Optical Laser Sensor Clean & Recalibration',
    code: 'PM-SENS-02',
    component: 'Optical Laser Distance Sensors (H1/H2) - 7-Day Limit',
    frequency: 'BI_WEEKLY',
    target: 'SHUTTLE_2',
    weeksScheduled: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 39, 40, 42, 44, 46, 48, 50, 52],
  },
  {
    id: 'prog-04',
    name: 'Drive Wheel Wear & Polyurethane Tread Audit',
    code: 'PM-WHL-10K',
    component: 'Polyurethane Drive & Guide Wheels (10,000 km)',
    frequency: 'MONTHLY',
    target: 'SHUTTLE_1',
    weeksScheduled: [4, 8, 13, 17, 21, 26, 30, 34, 39, 43, 47, 52],
  },
  {
    id: 'prog-05',
    name: 'Drive Wheel Wear & Polyurethane Tread Audit',
    code: 'PM-WHL-10K',
    component: 'Polyurethane Drive & Guide Wheels (10,000 km)',
    frequency: 'MONTHLY',
    target: 'SHUTTLE_2',
    weeksScheduled: [4, 8, 13, 17, 21, 26, 30, 34, 39, 43, 47, 52],
  },
  {
    id: 'prog-06',
    name: 'Scissor-Lift Hydraulic & Chain Greasing',
    code: 'PM-LIFT-100K',
    component: 'Scissor Lift Mechanism (100,000 cycles)',
    frequency: 'MONTHLY',
    target: 'SHUTTLE_1',
    weeksScheduled: [4, 8, 13, 17, 21, 26, 30, 34, 39, 43, 47, 52],
  },
  {
    id: 'prog-07',
    name: 'Scissor-Lift Hydraulic & Chain Greasing',
    code: 'PM-LIFT-100K',
    component: 'Scissor Lift Mechanism (100,000 cycles)',
    frequency: 'MONTHLY',
    target: 'SHUTTLE_2',
    weeksScheduled: [4, 8, 13, 17, 21, 26, 30, 34, 39, 43, 47, 52],
  },
  {
    id: 'prog-08',
    name: 'LiFePO4 Battery Cell Impedance & Balancing',
    code: 'PM-BATT-3K',
    component: 'Battery Management System (3,000 cycles)',
    frequency: 'QUARTERLY',
    target: 'SHUTTLE_1',
    weeksScheduled: [13, 26, 39, 52],
  },
  {
    id: 'prog-09',
    name: 'LiFePO4 Battery Cell Impedance & Balancing',
    code: 'PM-BATT-3K',
    component: 'Battery Management System (3,000 cycles)',
    frequency: 'QUARTERLY',
    target: 'SHUTTLE_2',
    weeksScheduled: [13, 26, 39, 52],
  },
  {
    id: 'prog-10',
    name: 'Emergency Stop & Wireless RF Remote Audit',
    code: 'SOP-ESTOP-AUDIT',
    component: 'E-Stop Buttons, Bumpers & Remote 1 & 2',
    frequency: 'MONTHLY',
    target: 'SAFETY',
    weeksScheduled: [4, 8, 13, 17, 21, 26, 30, 34, 39, 43, 47, 52],
  },
  {
    id: 'prog-11',
    name: 'Floor Anchor Bolt Torque & Rail Expansion Check',
    code: 'FR-7.2-03-STR',
    component: 'Cavities G-00 to L-01 Foundation Anchors',
    frequency: 'BI_ANNUAL',
    target: 'RACKING',
    weeksScheduled: [26, 52],
  },
];

const MONTH_GROUPS = [
  { name: 'Jan', weeks: [1, 2, 3, 4] },
  { name: 'Feb', weeks: [5, 6, 7, 8] },
  { name: 'Mar', weeks: [9, 10, 11, 12, 13] },
  { name: 'Apr', weeks: [14, 15, 16, 17] },
  { name: 'May', weeks: [18, 19, 20, 21, 22] },
  { name: 'Jun', weeks: [23, 24, 25, 26] },
  { name: 'Jul', weeks: [27, 28, 29, 30] },
  { name: 'Aug', weeks: [31, 32, 33, 34, 35] },
  { name: 'Sep', weeks: [36, 37, 38, 39] },
  { name: 'Oct', weeks: [40, 41, 42, 43] },
  { name: 'Nov', weeks: [44, 45, 46, 47, 48] },
  { name: 'Dec', weeks: [49, 50, 51, 52] },
];

const CURRENT_WEEK = 39;

interface Props {
  onOpenWeeklyRackModal?: () => void;
  onOpenAddPmAction?: () => void;
}

export default function YearlyMaintenanceMatrix({ onOpenWeeklyRackModal, onOpenAddPmAction }: Props) {
  const [targetFilter, setTargetFilter] = useState<'ALL' | 'SHUTTLE_1' | 'SHUTTLE_2' | 'RACKING' | 'SAFETY'>('ALL');
  const [selectedCell, setSelectedCell] = useState<{
    program: MaintenanceOccasion;
    week: number;
    status: 'COMPLETED' | 'DUE' | 'SCHEDULED';
  } | null>(null);

  const [mobileMatrixMode, setMobileMatrixMode] = useState<'WEEK_FOCUS' | 'MONTH_VIEW' | 'FULL_GRID'>('WEEK_FOCUS');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(8); // Default to Sep (month index 8)

  const [completedCells, setCompletedCells] = useState<Record<string, boolean>>(() => {
    const defaultDone: Record<string, boolean> = {};
    INITIAL_MAINTENANCE_PROGRAMS.forEach((prog) => {
      prog.weeksScheduled.forEach((w) => {
        if (w < CURRENT_WEEK) {
          defaultDone[`${prog.id}-w${w}`] = true;
        }
      });
    });
    return defaultDone;
  });

  const toggleComplete = (programId: string, week: number) => {
    const key = `${programId}-w${week}`;
    setCompletedCells((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    if (selectedCell && selectedCell.program.id === programId && selectedCell.week === week) {
      setSelectedCell(null);
    }
  };

  const filteredPrograms = INITIAL_MAINTENANCE_PROGRAMS.filter((p) => {
    if (targetFilter === 'ALL') return true;
    return p.target === targetFilter;
  });

  let totalScheduledToDate = 0;
  let totalCompletedToDate = 0;
  let dueThisWeekCount = 0;

  INITIAL_MAINTENANCE_PROGRAMS.forEach((prog) => {
    prog.weeksScheduled.forEach((w) => {
      if (w <= CURRENT_WEEK) {
        totalScheduledToDate++;
        if (completedCells[`${prog.id}-w${w}`]) {
          totalCompletedToDate++;
        } else if (w === CURRENT_WEEK) {
          dueThisWeekCount++;
        }
      }
    });
  });

  const complianceRate = Math.round((totalCompletedToDate / (totalScheduledToDate || 1)) * 100);

  return (
    <div className="bg-white border border-slate-300 rounded p-4 sm:p-5 space-y-4 text-xs font-sans text-slate-800">
      {/* 1. Header & Actions */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0a192f]" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase font-mono">
              Annual Preventative Maintenance Matrix (52 Weeks • 2026)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
            ISO 9001 Scheduled Preventative Maintenance & Weekly High-Bay Structural Audits
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenAddPmAction && (
            <button
              onClick={onOpenAddPmAction}
              className="px-3 py-1.5 rounded bg-[#0a192f] hover:bg-[#172554] text-white font-mono text-xs font-bold transition"
            >
              + ADD PM ACTION
            </button>
          )}

          {onOpenWeeklyRackModal && (
            <button
              onClick={onOpenWeeklyRackModal}
              className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-mono text-xs font-medium transition"
            >
              WEEKLY RACK CHECK (FR-7.2-03)
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
        <div className="bg-slate-50 p-3 rounded border border-slate-300">
          <span className="text-[10px] uppercase text-slate-500 block">Annual Compliance</span>
          <span className="text-lg font-bold text-[#1e3a8a]">{complianceRate}%</span>
          <span className="text-[10px] text-slate-500 block">{totalCompletedToDate} / {totalScheduledToDate} Executed</span>
        </div>

        <div className="bg-slate-50 p-3 rounded border border-slate-300">
          <span className="text-[10px] uppercase text-slate-500 block">Operating Week</span>
          <span className="text-lg font-bold text-slate-900">Week {CURRENT_WEEK}</span>
          <span className="text-[10px] text-slate-500 block">Late September 2026</span>
        </div>

        <div className="bg-slate-50 p-3 rounded border border-slate-300">
          <span className="text-[10px] uppercase text-slate-500 block">Due This Week (W{CURRENT_WEEK})</span>
          <span className={`text-lg font-bold ${dueThisWeekCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {dueThisWeekCount} Occasions
          </span>
          <span className="text-[10px] text-slate-500 block">Action Required</span>
        </div>

        <div className="bg-slate-50 p-3 rounded border border-slate-300">
          <span className="text-[10px] uppercase text-slate-500 block">Next Major Service</span>
          <span className="text-lg font-bold text-[#1e3a8a]">Week 52</span>
          <span className="text-[10px] text-slate-500 block">Annual Rack & Anchor Audit</span>
        </div>
      </div>

      {/* 3. Filter Controls, View Mode Selector & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-200">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-xs font-mono">
          <button
            onClick={() => setMobileMatrixMode('WEEK_FOCUS')}
            className={`px-3 py-1 rounded transition text-xs font-medium ${
              mobileMatrixMode === 'WEEK_FOCUS' ? 'bg-[#1e3a8a] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Week {CURRENT_WEEK} Focus
          </button>
          <button
            onClick={() => setMobileMatrixMode('MONTH_VIEW')}
            className={`px-3 py-1 rounded transition text-xs font-medium ${
              mobileMatrixMode === 'MONTH_VIEW' ? 'bg-[#1e3a8a] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Month View
          </button>
          <button
            onClick={() => setMobileMatrixMode('FULL_GRID')}
            className={`px-3 py-1 rounded transition text-xs font-medium ${
              mobileMatrixMode === 'FULL_GRID' ? 'bg-[#1e3a8a] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            52-Week Table
          </button>
        </div>

        {/* Equipment Filter */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <span className="text-slate-500 text-[11px] mr-1 hidden sm:inline">Filter:</span>
          {(['ALL', 'SHUTTLE_1', 'SHUTTLE_2', 'RACKING', 'SAFETY'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTargetFilter(t)}
              className={`px-2 py-0.5 rounded transition ${
                targetFilter === t
                  ? 'bg-blue-100 text-blue-900 font-bold border border-blue-200'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'ALL' ? 'All' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Minimal Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-[#1e3a8a]" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-red-600" />
            <span>Due W{CURRENT_WEEK} (Critical)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-blue-100 border border-blue-300" />
            <span>Scheduled</span>
          </div>
        </div>
      </div>

      {/* 4A. MOBILE VIEW: CURRENT WEEK FOCUS */}
      {mobileMatrixMode === 'WEEK_FOCUS' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-mono border-b border-slate-200 pb-1.5">
            <span className="font-bold text-slate-900 uppercase">
              Current Operating Tasks • Week {CURRENT_WEEK} (Late September)
            </span>
            <span className="text-slate-500 text-[11px]">
              Tap task to toggle completion
            </span>
          </div>

          <div className="space-y-2">
            {filteredPrograms
              .filter((prog) => prog.weeksScheduled.includes(CURRENT_WEEK))
              .map((prog) => {
                const isDone = completedCells[`${prog.id}-w${CURRENT_WEEK}`];

                return (
                  <div
                    key={`focus-${prog.id}`}
                    className={`p-3.5 rounded-lg border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isDone
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : 'bg-white border-blue-300 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          isDone
                            ? 'bg-blue-50 text-blue-900 border border-blue-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {isDone ? 'Completed' : 'Due This Week'}
                        </span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{prog.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 font-mono">
                        Target: {prog.component} • {prog.frequency}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                      {prog.code === 'FR-7.2-03' && onOpenWeeklyRackModal && (
                        <button
                          type="button"
                          onClick={onOpenWeeklyRackModal}
                          className="px-3 py-1.5 rounded bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 font-medium text-xs transition"
                        >
                          Checksheet Form
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleComplete(prog.id, CURRENT_WEEK)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                          isDone
                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            : 'bg-[#1e3a8a] hover:bg-blue-900 text-white'
                        }`}
                      >
                        {isDone ? 'Undo' : 'Mark Completed'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 4B. MOBILE VIEW: MONTH SELECTOR */}
      {mobileMatrixMode === 'MONTH_VIEW' && (
        <div className="space-y-3">
          {/* Month Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-mono">
            {MONTH_GROUPS.map((m, idx) => (
              <button
                key={m.name}
                onClick={() => setSelectedMonthIndex(idx)}
                className={`px-3 py-1.5 rounded transition shrink-0 font-medium ${
                  selectedMonthIndex === idx
                    ? 'bg-[#1e3a8a] text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {m.name} {idx === 8 ? '(Current)' : ''}
              </button>
            ))}
          </div>

          {/* Month Weeks Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-mono text-[11px] border-b border-slate-200 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Maintenance Task</th>
                  {MONTH_GROUPS[selectedMonthIndex].weeks.map((w) => (
                    <th
                      key={`mhead-w${w}`}
                      className={`py-2 px-2 text-center border-l border-slate-200 ${
                        w === CURRENT_WEEK ? 'bg-blue-50 text-blue-950 font-bold' : ''
                      }`}
                    >
                      W{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-xs">
                {filteredPrograms.map((prog) => (
                  <tr key={`month-row-${prog.id}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">{prog.name}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{prog.component}</div>
                    </td>
                    {MONTH_GROUPS[selectedMonthIndex].weeks.map((w) => {
                      const isScheduled = prog.weeksScheduled.includes(w);
                      const isDone = completedCells[`${prog.id}-w${w}`];
                      const isCurrent = w === CURRENT_WEEK;

                      if (!isScheduled) {
                        return (
                          <td key={`mw-${prog.id}-${w}`} className="py-2 px-2 text-center border-l border-slate-200 text-slate-300">
                            -
                          </td>
                        );
                      }

                      return (
                        <td
                          key={`mw-${prog.id}-${w}`}
                          onClick={() => toggleComplete(prog.id, w)}
                          className={`py-2 px-2 text-center border-l border-slate-200 cursor-pointer ${
                            isCurrent ? 'bg-blue-50/60' : ''
                          }`}
                        >
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isDone
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : isCurrent
                                ? 'bg-red-50 text-red-700 border border-red-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isDone ? 'DONE' : isCurrent ? 'DUE' : 'PLAN'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4C. FULL 52-WEEK MATRIX (HORIZONTAL SCROLL ON PHONES) */}
      {mobileMatrixMode === 'FULL_GRID' && (
        <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 sticky left-0 bg-slate-100 z-20 border-r border-slate-200 min-w-[220px]">
                  Program / Occasion
                </th>
                {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                  <th
                    key={`w-head-${w}`}
                    className={`py-2 px-1 text-center font-bold border-r border-slate-200 min-w-[24px] ${
                      w === CURRENT_WEEK ? 'bg-blue-50 text-blue-950 font-black' : ''
                    }`}
                  >
                    {w}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-mono text-xs">
              {filteredPrograms.map((prog) => (
                <tr key={prog.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 sticky left-0 bg-white z-10 border-r border-slate-200">
                    <div className="font-bold text-slate-900 truncate max-w-[200px]">{prog.name}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{prog.component}</div>
                  </td>

                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => {
                    const isScheduled = prog.weeksScheduled.includes(w);
                    const isDone = completedCells[`${prog.id}-w${w}`];
                    const isCurrent = w === CURRENT_WEEK;

                    if (!isScheduled) {
                      return (
                        <td key={`cell-${prog.id}-${w}`} className="text-center p-0.5 border-r border-slate-200 text-slate-300 text-[10px]">
                          -
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`cell-${prog.id}-${w}`}
                        onClick={() =>
                          setSelectedCell({
                            program: prog,
                            week: w,
                            status: isDone ? 'COMPLETED' : isCurrent ? 'DUE' : 'SCHEDULED',
                          })
                        }
                        className={`text-center p-0.5 cursor-pointer border-r border-slate-200 ${
                          isCurrent ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div
                          className={`h-4 w-4 mx-auto rounded flex items-center justify-center text-[8px] font-bold ${
                            isDone
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : isCurrent
                              ? 'bg-red-50 text-red-700 border border-red-300 font-black'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isDone ? 'D' : isCurrent ? '!' : '·'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Cell Detail Popover Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase text-blue-900 font-semibold">
                  Week {selectedCell.week} • Scheduled PM Occasion
                </span>
                <h4 className="text-sm font-bold text-slate-900">{selectedCell.program.name}</h4>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-600">
              <div className="flex justify-between">
                <span>Program Code:</span>
                <strong className="text-slate-900">{selectedCell.program.code}</strong>
              </div>
              <div className="flex justify-between">
                <span>Target Equipment:</span>
                <strong className="text-slate-900">{selectedCell.program.target}</strong>
              </div>
              <div className="flex justify-between">
                <span>Frequency:</span>
                <strong className="text-slate-900">{selectedCell.program.frequency}</strong>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    selectedCell.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : selectedCell.status === 'DUE'
                      ? 'bg-red-50 text-red-700 border border-red-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {selectedCell.status}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => toggleComplete(selectedCell.program.id, selectedCell.week)}
                className="px-4 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white font-medium rounded text-xs transition"
              >
                {completedCells[`${selectedCell.program.id}-w${selectedCell.week}`]
                  ? 'Undo Completed Status'
                  : 'Mark Service Completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}