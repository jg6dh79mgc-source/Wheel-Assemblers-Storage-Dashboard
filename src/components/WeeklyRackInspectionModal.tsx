'use client';

import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ACTIVE_CAVITIES = [
  'G-00', 'G-01', 'H-00', 'H-01', 'H-02', 'I-00', 'I-01',
  'J-02', 'K-00', 'K-01', 'K-02', 'L-00', 'L-01'
];

interface CavitySheet1 {
  uprights: 'GREEN' | 'AMBER' | 'RED';
  diagonalsPoor: boolean;
  shimsPoor: boolean;
  anchorsPoor: boolean;
  uprightTilt: 'YES' | 'NO';
  stopperPoor: boolean;
  laneMarkingPoor: boolean;
}

interface CavitySheet2 {
  brackets: 'GREEN' | 'AMBER' | 'RED';
  railSupportPoorRight: boolean;
  railSupportPoorLeft: boolean;
  centeringRailPoorRight: boolean;
  centeringRailPoorLeft: boolean;
  guideRailsPoorRight: boolean;
  guideRailsPoorLeft: boolean;
  stoppersPoorRight: boolean;
  stoppersPoorLeft: boolean;
}

export default function WeeklyRackInspectionModal({ isOpen, onClose }: Props) {
  const [activeSheet, setActiveSheet] = useState<'SHEET_1' | 'SHEET_2' | 'GENERAL'>('SHEET_1');
  const [inspectorName, setInspectorName] = useState('Maintenance Lead');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSignedOff, setIsSignedOff] = useState(false);

  // Sheet 1 State
  const [sheet1Data, setSheet1Data] = useState<Record<string, CavitySheet1>>(() => {
    const initial: Record<string, CavitySheet1> = {};
    ACTIVE_CAVITIES.forEach((cav) => {
      initial[cav] = {
        uprights: 'GREEN',
        diagonalsPoor: false,
        shimsPoor: false,
        anchorsPoor: false,
        uprightTilt: 'NO',
        stopperPoor: false,
        laneMarkingPoor: false,
      };
    });
    return initial;
  });

  // Sheet 2 State
  const [sheet2Data, setSheet2Data] = useState<Record<string, CavitySheet2>>(() => {
    const initial: Record<string, CavitySheet2> = {};
    ACTIVE_CAVITIES.forEach((cav) => {
      initial[cav] = {
        brackets: 'GREEN',
        railSupportPoorRight: false,
        railSupportPoorLeft: false,
        centeringRailPoorRight: false,
        centeringRailPoorLeft: false,
        guideRailsPoorRight: false,
        guideRailsPoorLeft: false,
        stoppersPoorRight: false,
        stoppersPoorLeft: false,
      };
    });
    return initial;
  });

  // General Operations State
  const [generalChecks, setGeneralChecks] = useState([
    { id: 1, text: 'Any deformed or damaged protection barriers', status: 'NO' as 'YES' | 'NO', comment: '' },
    { id: 2, text: 'Any floor cracks or structural settlement', status: 'NO' as 'YES' | 'NO', comment: '' },
    { id: 3, text: 'Any missing anchor bolts, nuts, or clamp hardware', status: 'NO' as 'YES' | 'NO', comment: '' },
    { id: 4, text: 'Any damaged or splintered wood/steel pallets in lanes', status: 'NO' as 'YES' | 'NO', comment: '' },
    { id: 5, text: 'Any missing or illegible safety signage & load limit notices', status: 'NO' as 'YES' | 'NO', comment: '' },
  ]);

  if (!isOpen) return null;

  const handleSignOff = () => {
    setIsSignedOff(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 select-none font-sans">
      <div className="bg-white border border-slate-300 sm:rounded w-full max-w-5xl h-full sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs text-slate-800">
        {/* Document Header */}
        <div className="bg-[#0a192f] px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-sm bg-[#172554] flex items-center justify-center font-bold text-white text-xs shrink-0 border border-blue-900 font-mono">
              WA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white uppercase text-xs sm:text-sm font-mono">
                  FR-7.2-03 Weekly High-Bay Pallet Rack Inspection
                </span>
                <span className="text-[10px] font-mono bg-[#172554] text-blue-200 border border-blue-900 px-1.5 py-0.2 rounded hidden xs:inline">
                  Rev 01
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Operations Manager • ISO Management Controller
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-sm bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 text-xs font-mono transition"
          >
            Close
          </button>
        </div>

        {/* Tab Switcher & Inspector Sign-off Details */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300 text-xs font-mono overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveSheet('SHEET_1')}
              className={`px-3 py-1 rounded transition shrink-0 font-medium ${
                activeSheet === 'SHEET_1' ? 'bg-[#1e3a8a] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sheet 1: Uprights (Rear)
            </button>
            <button
              onClick={() => setActiveSheet('SHEET_2')}
              className={`px-3 py-1 rounded transition shrink-0 font-medium ${
                activeSheet === 'SHEET_2' ? 'bg-[#1e3a8a] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sheet 2: Brackets & Rails
            </button>
            <button
              onClick={() => setActiveSheet('GENERAL')}
              className={`px-3 py-1 rounded transition shrink-0 font-medium ${
                activeSheet === 'GENERAL' ? 'bg-[#1e3a8a] text-white font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              General Safety
            </button>
          </div>

          {/* Inspector Inputs */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-600 mr-1 font-semibold">Date:</span>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <span className="text-slate-600 mr-1 font-semibold">Inspector:</span>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 w-28"
              />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50">
          {isSignedOff && (
            <div className="p-3.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-center font-semibold text-xs">
              FR-7.2-03 Weekly Checksheet Successfully Signed Off and Archived.
            </div>
          )}

          {/* SHEET 1: UPRIGHTS & ANCHORS */}
          {activeSheet === 'SHEET_1' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Loading Area (Rear) • Cavities G-00 to L-01
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  Standard: Pass • Monitor: Track • Red: Out of Spec (Critical)
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-left border-collapse text-xs min-w-[640px]">
                  <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] border-b border-slate-200 uppercase">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-200 sticky left-0 bg-slate-100 z-20">Cavity No</th>
                      <th className="py-2 px-3 border-r border-slate-200 text-center" colSpan={3}>
                        Uprights Condition
                      </th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Diagonals Poor</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Leveling Shims Poor</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Anchor Bolts Poor</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Upright Tilt</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">Stopper Poor</th>
                      <th className="py-2 px-2 text-center">Lane Marking Poor</th>
                    </tr>
                    <tr className="bg-slate-50 text-[9px] text-slate-600 text-center border-b border-slate-200">
                      <th className="border-r border-slate-200 sticky left-0 bg-slate-50 z-20"></th>
                      <th className="py-1">Standard</th>
                      <th className="py-1">Monitor</th>
                      <th className="text-red-700 py-1 border-r border-slate-200 font-bold">Defect (Red)</th>
                      <th className="border-r border-slate-200">Defect</th>
                      <th className="border-r border-slate-200">Defect</th>
                      <th className="border-r border-slate-200">Defect</th>
                      <th className="border-r border-slate-200">Yes / No</th>
                      <th className="border-r border-slate-200">Defect</th>
                      <th>Defect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-xs">
                    {ACTIVE_CAVITIES.map((cav) => {
                      const row = sheet1Data[cav];
                      return (
                        <tr key={`s1-${cav}`} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200 bg-slate-50 sticky left-0 z-10">
                            {cav}
                          </td>

                          {/* Uprights Standard */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], uprights: 'GREEN' },
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                row.uprights === 'GREEN'
                                  ? 'bg-[#1e3a8a] text-white'
                                  : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              OK
                            </button>
                          </td>

                          {/* Uprights Monitor */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], uprights: 'AMBER' },
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                row.uprights === 'AMBER'
                                  ? 'bg-slate-300 text-slate-900'
                                  : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              MON
                            </button>
                          </td>

                          {/* Uprights Red */}
                          <td className="py-1 px-1 text-center border-r border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], uprights: 'RED' },
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                row.uprights === 'RED'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-100 text-slate-400 hover:text-red-700'
                              }`}
                            >
                              DEF
                            </button>
                          </td>

                          {/* Diagonals Poor */}
                          <td className="py-1 px-1 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={row.diagonalsPoor}
                              onChange={(e) =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], diagonalsPoor: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a] focus:ring-0"
                            />
                          </td>

                          {/* Leveling Shims Poor */}
                          <td className="py-1 px-1 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={row.shimsPoor}
                              onChange={(e) =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], shimsPoor: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a] focus:ring-0"
                            />
                          </td>

                          {/* Anchor Bolts Poor */}
                          <td className="py-1 px-1 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={row.anchorsPoor}
                              onChange={(e) =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], anchorsPoor: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a] focus:ring-0"
                            />
                          </td>

                          {/* Upright Tilt */}
                          <td className="py-1 px-1 text-center border-r border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], uprightTilt: prev[cav].uprightTilt === 'NO' ? 'YES' : 'NO' },
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.uprightTilt === 'YES' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.uprightTilt}
                            </button>
                          </td>

                          {/* Stopper Poor */}
                          <td className="py-1 px-1 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={row.stopperPoor}
                              onChange={(e) =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], stopperPoor: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a] focus:ring-0"
                            />
                          </td>

                          {/* Lane Marking Poor */}
                          <td className="py-1 px-1 text-center">
                            <input
                              type="checkbox"
                              checked={row.laneMarkingPoor}
                              onChange={(e) =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], laneMarkingPoor: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a] focus:ring-0"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SHEET 2: BRACKETS & GUIDE RAILS */}
          {activeSheet === 'SHEET_2' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Loading Area (Rear) & Picking Area (Front) • Guide Rails & Brackets
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  R: Right Side • L: Left Side
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-left border-collapse text-xs min-w-[680px]">
                  <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] border-b border-slate-200 uppercase">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-200 sticky left-0 bg-slate-100 z-20">Cavity</th>
                      <th className="py-2 px-3 border-r border-slate-200 text-center" colSpan={3}>
                        Brackets Condition
                      </th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center" colSpan={2}>Rail Support Poor</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center" colSpan={2}>Centering Rail Poor</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center" colSpan={2}>Base/Guide Rails Poor</th>
                      <th className="py-2 px-2 text-center" colSpan={2}>Rail Stoppers Poor</th>
                    </tr>
                    <tr className="bg-slate-50 text-[9px] text-slate-600 text-center border-b border-slate-200">
                      <th className="border-r border-slate-200 sticky left-0 bg-slate-50 z-20"></th>
                      <th className="py-1">Standard</th>
                      <th className="py-1">Monitor</th>
                      <th className="text-red-700 py-1 border-r border-slate-200 font-bold">Defect (Red)</th>
                      <th className="py-1">R</th>
                      <th className="py-1 border-r border-slate-200">L</th>
                      <th className="py-1">R</th>
                      <th className="py-1 border-r border-slate-200">L</th>
                      <th className="py-1">R</th>
                      <th className="py-1 border-r border-slate-200">L</th>
                      <th className="py-1">R</th>
                      <th className="py-1">L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-xs">
                    {ACTIVE_CAVITIES.map((cav) => {
                      const row = sheet2Data[cav];
                      return (
                        <tr key={`s2-${cav}`} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200 bg-slate-50 sticky left-0 z-10">
                            {cav}
                          </td>

                          {/* Brackets Standard */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], brackets: 'GREEN' },
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                row.brackets === 'GREEN'
                                  ? 'bg-[#1e3a8a] text-white'
                                  : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              OK
                            </button>
                          </td>

                          {/* Brackets Monitor */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], brackets: 'AMBER' },
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                row.brackets === 'AMBER'
                                  ? 'bg-slate-300 text-slate-900'
                                  : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              MON
                            </button>
                          </td>

                          {/* Brackets Red */}
                          <td className="py-1 px-1 text-center border-r border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], brackets: 'RED' },
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                row.brackets === 'RED'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-100 text-slate-400 hover:text-red-700'
                              }`}
                            >
                              DEF
                            </button>
                          </td>

                          {/* Rail Support R / L */}
                          <td className="py-1 text-center">
                            <input
                              type="checkbox"
                              checked={row.railSupportPoorRight}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], railSupportPoorRight: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a]"
                            />
                          </td>
                          <td className="py-1 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={row.railSupportPoorLeft}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], railSupportPoorLeft: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a]"
                            />
                          </td>

                          {/* Centering Rail R / L */}
                          <td className="py-1 text-center">
                            <input
                              type="checkbox"
                              checked={row.centeringRailPoorRight}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], centeringRailPoorRight: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a]"
                            />
                          </td>
                          <td className="py-1 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={row.centeringRailPoorLeft}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], centeringRailPoorLeft: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a]"
                            />
                          </td>

                          {/* Guide Rails R / L */}
                          <td className="py-1 text-center">
                            <input
                              type="checkbox"
                              checked={row.guideRailsPoorRight}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], guideRailsPoorRight: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a]"
                            />
                          </td>
                          <td className="py-1 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={row.guideRailsPoorLeft}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], guideRailsPoorLeft: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a]"
                            />
                          </td>

                          {/* Rail Stoppers R / L */}
                          <td className="py-1 text-center">
                            <input
                              type="checkbox"
                              checked={row.stoppersPoorRight}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], stoppersPoorRight: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a]"
                            />
                          </td>
                          <td className="py-1 text-center">
                            <input
                              type="checkbox"
                              checked={row.stoppersPoorLeft}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], stoppersPoorLeft: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-300 text-[#1e3a8a]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GENERAL SAFETY CHECKS */}
          {activeSheet === 'GENERAL' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider font-mono">
                  General Warehouse High-Bay Safety Conditions
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  All anomalies must be recorded
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-mono text-[10px] border-b border-slate-200 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Question / Operational Criteria</th>
                      <th className="py-2.5 px-3 text-center w-28">Status</th>
                      <th className="py-2.5 px-3">Observations / Remedial Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-xs">
                    {generalChecks.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 text-slate-800 font-medium">{item.text}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...generalChecks];
                              updated[idx].status = updated[idx].status === 'NO' ? 'YES' : 'NO';
                              setGeneralChecks(updated);
                            }}
                            className={`px-3 py-1 rounded font-bold text-xs ${
                              item.status === 'YES'
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {item.status === 'YES' ? 'DEFECT (YES)' : 'NO DEFECT'}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="Add comment..."
                            value={item.comment}
                            onChange={(e) => {
                              const updated = [...generalChecks];
                              updated[idx].comment = e.target.value;
                              setGeneralChecks(updated);
                            }}
                            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:border-blue-600 outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Sign-Off Button */}
        <div className="bg-white px-4 sm:px-6 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-500">
            Sign-off validates FR-7.2-03 into the ISO 9001 compliance record.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSignOff}
              className="px-5 py-2 rounded bg-[#1e3a8a] hover:bg-blue-900 text-white font-medium text-xs transition shadow-sm"
            >
              Sign Off & Archive Weekly Check
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}