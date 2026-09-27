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
    { id: 1, text: 'Any de-formed or damaged Protection', status: 'NO' as 'YES' | 'NO', comment: '' },
    { id: 2, text: 'Any cracks in the floor', status: 'NO' as 'YES' | 'NO', comment: '' },
    { id: 3, text: 'Any missing Bolts or Nuts', status: 'NO' as 'YES' | 'NO', comment: '' },
    { id: 4, text: 'Any damaged pallets', status: 'NO' as 'YES' | 'NO', comment: '' },
    { id: 5, text: 'Any missing or damaged Signage', status: 'NO' as 'YES' | 'NO', comment: '' },
  ]);

  if (!isOpen) return null;

  const handleSignOff = () => {
    setIsSignedOff(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none font-sans">
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn text-xs text-slate-100">
        {/* Document Header */}
        <div className="bg-[#0f172a] px-5 py-3.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-blue-700 flex items-center justify-center font-black text-white text-xs">
              WA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white uppercase text-sm">FR-7.2-03 Weekly High-Bay Pallet Rack Inspection</span>
                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-1.5 rounded">
                  Rev 01 20.01.2026
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Owner: Operations Manager • Controller: ISO Management Representative
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-mono text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher & Inspector Sign-off Details */}
        <div className="bg-[#1e293b] px-5 py-2.5 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#0f172a] p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveSheet('SHEET_1')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                activeSheet === 'SHEET_1' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sheet 1: Uprights & Anchors (Rear)
            </button>
            <button
              onClick={() => setActiveSheet('SHEET_2')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                activeSheet === 'SHEET_2' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sheet 2: Brackets & Guide Rails
            </button>
            <button
              onClick={() => setActiveSheet('GENERAL')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                activeSheet === 'GENERAL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              General Operations Safety
            </button>
          </div>

          {/* Inspector Inputs */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] mr-1">Date:</span>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="bg-[#0f172a] border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
              />
            </div>
            <div>
              <span className="text-slate-400 text-[10px] mr-1">Inspector:</span>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="bg-[#0f172a] border border-slate-700 rounded px-2 py-0.5 text-xs text-white w-32"
              />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {isSignedOff && (
            <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-200 text-center font-semibold">
              ✓ FR-7.2-03 Inspection Form Successfully Signed Off and Archived!
            </div>
          )}

          {/* SHEET 1: UPRIGHTS & ANCHORS */}
          {activeSheet === 'SHEET_1' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white uppercase tracking-wider font-mono">
                  Loading Area (Rear) • Cavities G-00 to L-01
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Green: Safe • Amber: Minor Dent / Monitor • Red: Out of Specification
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-700 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#0f172a] text-slate-300 font-mono text-[10px] border-b border-slate-700 uppercase">
                    <tr>
                      <th className="py-2 px-3 border-r border-slate-800">Cavity No</th>
                      <th className="py-2 px-3 border-r border-slate-800 text-center" colSpan={3}>
                        Uprights Condition
                      </th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center">Diagonals Poor</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center">Leveling Shims Poor</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center">Anchor Bolts Poor</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center">Upright Tilt</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center">Stopper Poor</th>
                      <th className="py-2 px-2 text-center">Lane Marking Poor</th>
                    </tr>
                    <tr className="bg-slate-900/60 text-[9px] text-slate-400 text-center border-b border-slate-800">
                      <th className="border-r border-slate-800"></th>
                      <th className="text-emerald-400 py-1">Green</th>
                      <th className="text-amber-400 py-1">Amber</th>
                      <th className="text-rose-400 py-1 border-r border-slate-800">Red</th>
                      <th className="border-r border-slate-800">Check</th>
                      <th className="border-r border-slate-800">Check</th>
                      <th className="border-r border-slate-800">Check</th>
                      <th className="border-r border-slate-800">Yes / No</th>
                      <th className="border-r border-slate-800">Check</th>
                      <th>Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
                    {ACTIVE_CAVITIES.map((cav) => {
                      const row = sheet1Data[cav];
                      return (
                        <tr key={`s1-${cav}`} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-bold text-white border-r border-slate-800 bg-[#0f172a]/60">
                            {cav}
                          </td>

                          {/* Uprights Green */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], uprights: 'GREEN' },
                                }))
                              }
                              className={`h-5 w-5 rounded mx-auto transition ${
                                row.uprights === 'GREEN'
                                  ? 'bg-emerald-500 text-black font-bold'
                                  : 'bg-slate-800 border border-slate-700 text-transparent'
                              }`}
                            >
                              ✓
                            </button>
                          </td>

                          {/* Uprights Amber */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], uprights: 'AMBER' },
                                }))
                              }
                              className={`h-5 w-5 rounded mx-auto transition ${
                                row.uprights === 'AMBER'
                                  ? 'bg-amber-500 text-black font-bold'
                                  : 'bg-slate-800 border border-slate-700 text-transparent'
                              }`}
                            >
                              !
                            </button>
                          </td>

                          {/* Uprights Red */}
                          <td className="py-1 px-1 text-center border-r border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], uprights: 'RED' },
                                }))
                              }
                              className={`h-5 w-5 rounded mx-auto transition ${
                                row.uprights === 'RED'
                                  ? 'bg-rose-500 text-white font-bold'
                                  : 'bg-slate-800 border border-slate-700 text-transparent'
                              }`}
                            >
                              ✕
                            </button>
                          </td>

                          {/* Diagonals Poor */}
                          <td className="py-1 px-1 text-center border-r border-slate-800">
                            <input
                              type="checkbox"
                              checked={row.diagonalsPoor}
                              onChange={(e) =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], diagonalsPoor: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-700 text-blue-600 focus:ring-0"
                            />
                          </td>

                          {/* Leveling Shims Poor */}
                          <td className="py-1 px-1 text-center border-r border-slate-800">
                            <input
                              type="checkbox"
                              checked={row.shimsPoor}
                              onChange={(e) =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], shimsPoor: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-700 text-blue-600 focus:ring-0"
                            />
                          </td>

                          {/* Anchor Bolts Poor */}
                          <td className="py-1 px-1 text-center border-r border-slate-800">
                            <input
                              type="checkbox"
                              checked={row.anchorsPoor}
                              onChange={(e) =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], anchorsPoor: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-700 text-blue-600 focus:ring-0"
                            />
                          </td>

                          {/* Upright Tilt */}
                          <td className="py-1 px-1 text-center border-r border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], uprightTilt: prev[cav].uprightTilt === 'NO' ? 'YES' : 'NO' },
                                }))
                              }
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                row.uprightTilt === 'YES' ? 'bg-rose-900 text-rose-300 border border-rose-700' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {row.uprightTilt}
                            </button>
                          </td>

                          {/* Stopper Poor */}
                          <td className="py-1 px-1 text-center border-r border-slate-800">
                            <input
                              type="checkbox"
                              checked={row.stopperPoor}
                              onChange={(e) =>
                                setSheet1Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], stopperPoor: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-700 text-blue-600 focus:ring-0"
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
                              className="rounded border-slate-700 text-blue-600 focus:ring-0"
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
                <span className="font-bold text-white uppercase tracking-wider font-mono">
                  Loading Area (Rear) & Picking Area (Front) • Guide Rails & Brackets
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  R: Right Side • L: Left Side
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-700 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#0f172a] text-slate-300 font-mono text-[10px] border-b border-slate-700 uppercase">
                    <tr>
                      <th className="py-2 px-3 border-r border-slate-800">Cavity</th>
                      <th className="py-2 px-3 border-r border-slate-800 text-center" colSpan={3}>
                        Brackets Condition
                      </th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center" colSpan={2}>Rail Support Poor</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center" colSpan={2}>Centering Rail Poor</th>
                      <th className="py-2 px-2 border-r border-slate-800 text-center" colSpan={2}>Base/Guide Rails Poor</th>
                      <th className="py-2 px-2 text-center" colSpan={2}>Rail Stoppers Poor</th>
                    </tr>
                    <tr className="bg-slate-900/60 text-[9px] text-slate-400 text-center border-b border-slate-800">
                      <th className="border-r border-slate-800"></th>
                      <th className="text-emerald-400 py-1">Green</th>
                      <th className="text-amber-400 py-1">Amber</th>
                      <th className="text-rose-400 py-1 border-r border-slate-800">Red</th>
                      <th className="py-1">R</th>
                      <th className="py-1 border-r border-slate-800">L</th>
                      <th className="py-1">R</th>
                      <th className="py-1 border-r border-slate-800">L</th>
                      <th className="py-1">R</th>
                      <th className="py-1 border-r border-slate-800">L</th>
                      <th className="py-1">R</th>
                      <th className="py-1">L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
                    {ACTIVE_CAVITIES.map((cav) => {
                      const row = sheet2Data[cav];
                      return (
                        <tr key={`s2-${cav}`} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 font-bold text-white border-r border-slate-800 bg-[#0f172a]/60">
                            {cav}
                          </td>

                          {/* Brackets Green */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], brackets: 'GREEN' },
                                }))
                              }
                              className={`h-5 w-5 rounded mx-auto transition ${
                                row.brackets === 'GREEN'
                                  ? 'bg-emerald-500 text-black font-bold'
                                  : 'bg-slate-800 border border-slate-700 text-transparent'
                              }`}
                            >
                              ✓
                            </button>
                          </td>

                          {/* Brackets Amber */}
                          <td className="py-1 px-1 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], brackets: 'AMBER' },
                                }))
                              }
                              className={`h-5 w-5 rounded mx-auto transition ${
                                row.brackets === 'AMBER'
                                  ? 'bg-amber-500 text-black font-bold'
                                  : 'bg-slate-800 border border-slate-700 text-transparent'
                              }`}
                            >
                              !
                            </button>
                          </td>

                          {/* Brackets Red */}
                          <td className="py-1 px-1 text-center border-r border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], brackets: 'RED' },
                                }))
                              }
                              className={`h-5 w-5 rounded mx-auto transition ${
                                row.brackets === 'RED'
                                  ? 'bg-rose-500 text-white font-bold'
                                  : 'bg-slate-800 border border-slate-700 text-transparent'
                              }`}
                            >
                              ✕
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
                              className="rounded border-slate-700"
                            />
                          </td>
                          <td className="py-1 text-center border-r border-slate-800">
                            <input
                              type="checkbox"
                              checked={row.railSupportPoorLeft}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], railSupportPoorLeft: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-700"
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
                              className="rounded border-slate-700"
                            />
                          </td>
                          <td className="py-1 text-center border-r border-slate-800">
                            <input
                              type="checkbox"
                              checked={row.centeringRailPoorLeft}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], centeringRailPoorLeft: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-700"
                            />
                          </td>

                          {/* Base/Guide Rails R / L */}
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
                              className="rounded border-slate-700"
                            />
                          </td>
                          <td className="py-1 text-center border-r border-slate-800">
                            <input
                              type="checkbox"
                              checked={row.guideRailsPoorLeft}
                              onChange={(e) =>
                                setSheet2Data((prev) => ({
                                  ...prev,
                                  [cav]: { ...prev[cav], guideRailsPoorLeft: e.target.checked },
                                }))
                              }
                              className="rounded border-slate-700"
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
                              className="rounded border-slate-700"
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
                              className="rounded border-slate-700"
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

          {/* GENERAL OPERATIONS SAFETY */}
          {activeSheet === 'GENERAL' && (
            <div className="space-y-4">
              <div className="font-bold text-white uppercase tracking-wider font-mono text-xs">
                General Operation Inspection Checks
              </div>

              <div className="border border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f172a] text-slate-300 font-mono text-[10px] border-b border-slate-700 uppercase">
                    <tr>
                      <th className="py-2 px-3">Inspection Item</th>
                      <th className="py-2 px-3 text-center w-24">Yes</th>
                      <th className="py-2 px-3 text-center w-24">No</th>
                      <th className="py-2 px-3">Comments / Observations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {generalChecks.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-medium text-slate-200">
                          {idx + 1}. {item.text}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...generalChecks];
                              updated[idx].status = 'YES';
                              setGeneralChecks(updated);
                            }}
                            className={`px-3 py-1 rounded font-bold text-xs ${
                              item.status === 'YES' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            YES
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...generalChecks];
                              updated[idx].status = 'NO';
                              setGeneralChecks(updated);
                            }}
                            className={`px-3 py-1 rounded font-bold text-xs ${
                              item.status === 'NO' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            NO
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
                            className="w-full bg-[#0f172a] border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
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
        <div className="bg-[#0f172a] px-5 py-3 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-400">
            Sign-off locks FR-7.2-03 into the ISO archive for ISO audit compliance.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSignOff}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md flex items-center gap-1.5"
            >
              <span>✓</span>
              <span>Sign Off & Archive Weekly Check</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
