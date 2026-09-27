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

const MAINTENANCE_PROGRAMS: MaintenanceOccasion[] = [
  {
    id: 'prog-01',
    name: 'FR-7.2-03 Weekly High-Bay Racking Check',
    code: 'FR-7.2-03',
    component: 'Racking Structure (Uprights, Shims, Anchors, Rails)',
    frequency: 'WEEKLY',
    target: 'RACKING',
    weeksScheduled: Array.from({ length: 52 }, (_, i) => i + 1), // Every week
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
  { name: 'May', weeks: [18, 19, 20, 21] },
  { name: 'Jun', weeks: [22, 23, 24, 25, 26] },
  { name: 'Jul', weeks: [27, 28, 29, 30] },
  { name: 'Aug', weeks: [31, 32, 33, 34] },
  { name: 'Sep', weeks: [35, 36, 37, 38, 39] },
  { name: 'Oct', weeks: [40, 41, 42, 43] },
  { name: 'Nov', weeks: [44, 45, 46, 47] },
  { name: 'Dec', weeks: [48, 49, 50, 51, 52] },
];

const CURRENT_WEEK = 39; // Today's operational week for late September 2026

interface Props {
  onOpenWeeklyRackModal?: () => void;
}

export default function YearlyMaintenanceMatrix({ onOpenWeeklyRackModal }: Props) {
  const [filterTarget, setFilterTarget] = useState<'ALL' | 'SHUTTLE_1' | 'SHUTTLE_2' | 'RACKING' | 'SAFETY'>('ALL');
  const [selectedCell, setSelectedCell] = useState<{
    program: MaintenanceOccasion;
    week: number;
    status: 'COMPLETED' | 'DUE' | 'SCHEDULED';
  } | null>(null);

  // Completed items memory in state
  const [completedCells, setCompletedCells] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    // Pre-mark all past scheduled occurrences (Week 1 to 38) as completed
    MAINTENANCE_PROGRAMS.forEach((prog) => {
      prog.weeksScheduled.forEach((w) => {
        if (w < CURRENT_WEEK) {
          initial[`${prog.id}-w${w}`] = true;
        }
      });
    });
    return initial;
  });

  const toggleComplete = (progId: string, week: number) => {
    const key = `${progId}-w${week}`;
    setCompletedCells((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const filteredPrograms = MAINTENANCE_PROGRAMS.filter((p) => {
    if (filterTarget === 'ALL') return true;
    return p.target === filterTarget;
  });

  // Calculate statistics
  let totalScheduledToDate = 0;
  let totalCompletedToDate = 0;
  let dueThisWeekCount = 0;

  MAINTENANCE_PROGRAMS.forEach((prog) => {
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
    <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl p-4 sm:p-5 space-y-4 text-xs font-sans">
      {/* 1. Header & KPI Statistics */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-700/80 pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-blue-500" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Annual Preventative Maintenance Matrix (52 Weeks • 2026)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            ISO 9001 Scheduled Preventative Maintenance & Weekly High-Bay Structural Audits
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenWeeklyRackModal && (
            <button
              onClick={onOpenWeeklyRackModal}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5"
            >
              <span>📋</span>
              <span>Open Weekly Rack Checksheet (FR-7.2-03)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-700">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Annual Compliance</span>
          <span className="text-lg font-mono font-bold text-emerald-400">{complianceRate}%</span>
          <span className="text-[10px] text-slate-500 block">{totalCompletedToDate} / {totalScheduledToDate} Executed</span>
        </div>

        <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-700">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Current Operating Week</span>
          <span className="text-lg font-mono font-bold text-white">Week {CURRENT_WEEK}</span>
          <span className="text-[10px] text-slate-400 block">Late September 2026</span>
        </div>

        <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-700">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Due This Week (W{CURRENT_WEEK})</span>
          <span className="text-lg font-mono font-bold text-amber-300">{dueThisWeekCount} Occasions</span>
          <span className="text-[10px] text-slate-400 block">Action Required</span>
        </div>

        <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-700">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">Next Major Service</span>
          <span className="text-lg font-mono font-bold text-blue-300">Week 52</span>
          <span className="text-[10px] text-slate-400 block">Annual Rack & Anchor Audit</span>
        </div>
      </div>

      {/* 3. Filter Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700/60">
        <div className="flex items-center gap-1.5 bg-[#0f172a] p-1 rounded-lg border border-slate-700">
          <span className="text-[10px] font-mono text-slate-400 px-1.5">Filter:</span>
          {(['ALL', 'SHUTTLE_1', 'SHUTTLE_2', 'RACKING', 'SAFETY'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTarget(t)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                filterTarget === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'ALL'
                ? 'All Programs'
                : t === 'SHUTTLE_1'
                ? 'Shuttle 1'
                : t === 'SHUTTLE_2'
                ? 'Shuttle 2'
                : t === 'RACKING'
                ? 'Racking (FR-7.2-03)'
                : 'Safety E-Stop'}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
            <span className="text-slate-300">Completed (✓)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-amber-500 animate-pulse" />
            <span className="text-amber-300">Due This Week (W{CURRENT_WEEK})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded border border-blue-400 bg-blue-950/60" />
            <span className="text-slate-400">Scheduled Upcoming</span>
          </div>
        </div>
      </div>

      {/* 4. 52-WEEK CALENDAR MATRIX TABLE */}
      <div className="overflow-x-auto border border-slate-700/90 rounded-lg bg-[#0f172a] shadow-inner">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          {/* Top Month Header */}
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400">
              <th className="py-2 px-3 sticky left-0 bg-slate-900 z-20 w-72 border-r border-slate-800 font-bold uppercase">
                Maintenance Occasion / Protocol
              </th>
              {MONTH_GROUPS.map((m) => (
                <th
                  key={m.name}
                  colSpan={m.weeks.length}
                  className="py-1 px-1 text-center border-r border-slate-800 font-bold text-slate-300 bg-slate-900/90"
                >
                  {m.name}
                </th>
              ))}
            </tr>

            {/* Week Numbers W01 - W52 */}
            <tr className="bg-[#0b1329] border-b border-slate-700 text-[9px] font-mono text-slate-400">
              <th className="py-1 px-3 sticky left-0 bg-[#0b1329] z-20 border-r border-slate-800">
                Target / Component
              </th>
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <th
                  key={`wk-${w}`}
                  className={`py-1 text-center w-5 font-bold ${
                    w === CURRENT_WEEK
                      ? 'bg-amber-500 text-black font-extrabold'
                      : w % 2 === 0
                      ? 'bg-slate-900/60 text-slate-400'
                      : 'text-slate-400'
                  }`}
                >
                  {w}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/80 font-mono text-[10px]">
            {filteredPrograms.map((prog) => (
              <tr key={prog.id} className="hover:bg-slate-900/40 transition">
                {/* Program Description */}
                <td className="py-2 px-3 sticky left-0 bg-[#0f172a] z-10 border-r border-slate-800">
                  <div className="font-bold text-slate-100 flex items-center justify-between">
                    <span>{prog.name}</span>
                    <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {prog.frequency}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 truncate max-w-[260px]">{prog.component}</div>
                </td>

                {/* 52 Week Cells */}
                {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => {
                  const isScheduled = prog.weeksScheduled.includes(w);
                  const isDone = completedCells[`${prog.id}-w${w}`];
                  const isCurrent = w === CURRENT_WEEK;

                  if (!isScheduled) {
                    return (
                      <td
                        key={`cell-${prog.id}-${w}`}
                        className={`text-center p-0.5 border-r border-slate-800/40 ${
                          isCurrent ? 'bg-amber-950/20' : ''
                        }`}
                      >
                        <span className="text-slate-800 text-[8px] select-none">·</span>
                      </td>
                    );
                  }

                  let cellClass = 'bg-blue-950/40 border border-blue-500/50 text-blue-300';
                  let symbol = '○';

                  if (isDone) {
                    cellClass = 'bg-emerald-950/70 border border-emerald-500 text-emerald-300 font-bold';
                    symbol = '✓';
                  } else if (isCurrent) {
                    cellClass = 'bg-amber-500 text-black font-black animate-pulse border border-amber-300';
                    symbol = '!';
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
                      title={`${prog.name} (W${w}): ${isDone ? 'Completed' : isCurrent ? 'DUE NOW' : 'Scheduled'}`}
                      className={`text-center p-0.5 cursor-pointer border-r border-slate-800/60 ${
                        isCurrent ? 'bg-amber-950/30' : ''
                      }`}
                    >
                      <div
                        className={`h-4 w-4 mx-auto rounded flex items-center justify-center text-[9px] transition hover:scale-125 ${cellClass}`}
                      >
                        {symbol}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Cell Detail Popover Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-start border-b border-slate-700 pb-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase text-blue-400 font-semibold">
                  Week {selectedCell.week} • Scheduled Occasion
                </span>
                <h4 className="text-sm font-bold text-white">{selectedCell.program.name}</h4>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-[#0f172a] p-3 rounded border border-slate-700 space-y-1">
                <div className="text-slate-400">Target Component:</div>
                <div className="text-white font-semibold">{selectedCell.program.component}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0f172a] p-2.5 rounded border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-mono">Frequency</span>
                  <span className="text-slate-200 font-semibold">{selectedCell.program.frequency}</span>
                </div>
                <div className="bg-[#0f172a] p-2.5 rounded border border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-mono">Status</span>
                  <span
                    className={`font-semibold ${
                      completedCells[`${selectedCell.program.id}-w${selectedCell.week}`]
                        ? 'text-emerald-400'
                        : selectedCell.week === CURRENT_WEEK
                        ? 'text-amber-400'
                        : 'text-blue-300'
                    }`}
                  >
                    {completedCells[`${selectedCell.program.id}-w${selectedCell.week}`]
                      ? '✓ COMPLETED'
                      : selectedCell.week === CURRENT_WEEK
                      ? '⚠ DUE THIS WEEK'
                      : 'PLANNED / SCHEDULED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex justify-between items-center border-t border-slate-700">
              <button
                onClick={() => {
                  toggleComplete(selectedCell.program.id, selectedCell.week);
                  setSelectedCell(null);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  completedCells[`${selectedCell.program.id}-w${selectedCell.week}`]
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {completedCells[`${selectedCell.program.id}-w${selectedCell.week}`]
                  ? 'Mark as Incomplete'
                  : '✓ Mark Service Completed'}
              </button>

              {selectedCell.program.code === 'FR-7.2-03' && onOpenWeeklyRackModal && (
                <button
                  onClick={() => {
                    setSelectedCell(null);
                    onOpenWeeklyRackModal();
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Open FR-7.2-03 Checksheet →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
