'use client';

import React, { useState } from 'react';
import { DocumentItem } from '@/lib/documentStore';

interface Props {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DigitalSopViewerModal({ document, isOpen, onClose }: Props) {
  const [viewMode, setViewMode] = useState<'INTERACTIVE' | 'ORIGINAL_SHEET'>('INTERACTIVE');

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none font-sans">
      <div className="bg-white border border-slate-300 rounded w-full max-w-4xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-[#0a192f] px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-sm bg-[#172554] text-blue-200 border border-blue-900 text-xs font-mono font-bold tracking-wide">
              {document.code}
            </span>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base leading-snug font-mono">
                {document.title}
              </h3>
              <div className="text-[11px] font-mono text-slate-400">
                {document.category} • Revision {document.version}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            {document.image_url && (
              <div className="flex items-center bg-[#172554] p-0.5 rounded-sm border border-blue-900 font-mono text-xs">
                <button
                  onClick={() => setViewMode('INTERACTIVE')}
                  className={`px-3 py-1 rounded-sm transition text-xs font-bold ${
                    viewMode === 'INTERACTIVE'
                      ? 'bg-[#1e3a8a] text-white'
                      : 'text-blue-200 hover:text-white'
                  }`}
                >
                  Interactive Guide
                </button>
                <button
                  onClick={() => setViewMode('ORIGINAL_SHEET')}
                  className={`px-3 py-1 rounded-sm transition text-xs font-bold ${
                    viewMode === 'ORIGINAL_SHEET'
                      ? 'bg-[#1e3a8a] text-white'
                      : 'text-blue-200 hover:text-white'
                  }`}
                >
                  Document Sheet
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-sm bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 font-mono text-xs transition border border-blue-900"
              aria-label="Close"
            >
              Close
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50">
          {viewMode === 'ORIGINAL_SHEET' && document.image_url ? (
            /* Original Document Sheet Preview */
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-slate-500 pb-1 border-b border-slate-200">
                <span>Direct Visual Document Preview (Zero Delay ISO Archive)</span>
                <span>Document: {document.file_name}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex justify-center overflow-auto max-h-[70vh] shadow-inner">
                <img
                  src={document.image_url}
                  alt={document.title}
                  className="max-w-full h-auto rounded border border-slate-200 object-contain"
                />
              </div>
            </div>
          ) : (
            /* Interactive Operator-Friendly Guide */
            <div className="space-y-4">
              {/* Critical Quality Point & Purpose Callout */}
              {document.critical_point && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-1">
                    <span className="text-[11px] font-mono font-bold text-blue-900 uppercase tracking-wider block">
                      Critical Quality Point
                    </span>
                    <p className="text-xs text-blue-950 font-medium leading-relaxed">
                      {document.critical_point}
                    </p>
                  </div>
                  {document.reason && (
                    <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-1">
                      <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider block">
                        Reason & Objective
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {document.reason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Matters to Obey (Safety & Environmental Guidelines) */}
              {document.matters_to_obey && document.matters_to_obey.length > 0 && (
                <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2.5">
                  <span className="text-slate-800 font-bold text-xs uppercase tracking-wider font-mono block">
                    Matters to Absolutely Obey (Safety, Quality, Environment)
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {document.matters_to_obey.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="text-blue-700 font-bold shrink-0 mt-0.5">•</span>
                        <span className="leading-relaxed">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Step-by-Step Operator Instructions */}
              {document.steps && document.steps.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="font-mono font-bold text-slate-800 uppercase tracking-wider text-xs border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>Sequential Standard Operating Steps</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Follow in exact order
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {document.steps.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-white border border-slate-200 hover:border-blue-300 transition flex items-start gap-3.5 shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {st.step_number}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {st.title}
                            </span>
                            {st.image_ref && (
                              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                {st.image_ref}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {st.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reaction Plan (Emergency or Nonconformance - Red for Critical) */}
              {document.reaction_plan && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-1.5 text-xs">
                  <span className="text-[11px] font-mono font-bold text-red-700 uppercase tracking-wider block">
                    CRITICAL: Reaction Plan (Nonconformance or Emergency Incident)
                  </span>
                  <p className="text-red-900 font-medium leading-relaxed">
                    {document.reaction_plan}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-4 sm:px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs font-mono text-slate-500">
          <div>
            ISO Registered By: <strong className="text-slate-800">{document.uploaded_by}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
