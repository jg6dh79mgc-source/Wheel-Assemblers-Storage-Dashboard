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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none font-sans">
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn text-xs text-slate-100">
        {/* Header */}
        <div className="bg-[#0f172a] px-5 py-3 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-blue-900/80 text-blue-300 border border-blue-700 text-[10px] font-mono font-bold">
              {document.code}
            </span>
            <div>
              <h3 className="font-bold text-white text-sm leading-tight">{document.title}</h3>
              <div className="text-[10px] font-mono text-slate-400">
                {document.category} • {document.version}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle View Mode */}
            {document.image_url && (
              <div className="flex items-center bg-[#1e293b] p-0.5 rounded border border-slate-700 font-mono text-[11px]">
                <button
                  onClick={() => setViewMode('INTERACTIVE')}
                  className={`px-2.5 py-1 rounded transition ${
                    viewMode === 'INTERACTIVE' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Interactive Guide
                </button>
                <button
                  onClick={() => setViewMode('ORIGINAL_SHEET')}
                  className={`px-2.5 py-1 rounded transition ${
                    viewMode === 'ORIGINAL_SHEET' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📄 Original Document Sheet
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-mono text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {viewMode === 'ORIGINAL_SHEET' && document.image_url ? (
            /* Original Document Sheet Preview */
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pb-1 border-b border-slate-800">
                <span>Direct In-App Visual Document Preview (Zero Download Required)</span>
                <span>Wheel Assemblers ISO Archive</span>
              </div>
              <div className="bg-[#0f172a] p-2 rounded-xl border border-slate-700 flex justify-center overflow-auto max-h-[68vh]">
                <img
                  src={document.image_url}
                  alt={document.title}
                  className="max-w-full h-auto rounded shadow-lg object-contain"
                />
              </div>
            </div>
          ) : (
            /* Interactive Operator-Friendly Guide */
            <div className="space-y-4">
              {/* Critical Quality Point & Reason Callout */}
              {document.critical_point && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-800/80 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-blue-300 uppercase tracking-wider block">
                      Critical Quality Point
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      {document.critical_point}
                    </p>
                  </div>
                  {document.reason && (
                    <div className="p-3.5 rounded-xl bg-[#0f172a] border border-slate-700 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                        Reason / Purpose
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {document.reason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Matters to Obey (Safety & Quality) */}
              {document.matters_to_obey && document.matters_to_obey.length > 0 && (
                <div className="p-4 rounded-xl bg-[#0f172a] border border-amber-500/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                      ⚠️ Matters to Absolutely Obey (Safety, Environment, Quality)
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {document.matters_to_obey.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">•</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Step-by-Step Operator Instructions */}
              {document.steps && document.steps.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="font-mono font-bold text-slate-200 uppercase tracking-wider text-xs border-b border-slate-700 pb-1.5 flex items-center justify-between">
                    <span>Operational Procedure Steps</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Follow sequentially
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {document.steps.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#0f172a] border border-slate-700/80 hover:border-slate-600 transition flex items-start gap-3.5"
                      >
                        <div className="h-7 w-7 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/50 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {st.step_number}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-100 text-xs">{st.title}</span>
                            {st.image_ref && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                                {st.image_ref}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {st.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reaction Plan */}
              {document.reaction_plan && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-1 text-xs">
                  <span className="text-[10px] font-mono font-bold text-rose-300 uppercase tracking-wider block">
                    🚨 Reaction Plan (In Case of Nonconformance or Emergency)
                  </span>
                  <p className="text-rose-200 font-medium">
                    {document.reaction_plan}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0f172a] px-5 py-3 border-t border-slate-700 flex justify-between items-center text-[10px] font-mono text-slate-400">
          <div>
            Registered by: <strong className="text-slate-200">{document.uploaded_by}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
