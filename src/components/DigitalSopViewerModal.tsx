'use client';

import React, { useState } from 'react';
import { DocumentItem } from '@/lib/documentStore';

interface Props {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DigitalSopViewerModal({ document, isOpen, onClose }: Props) {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none font-sans">
      <div className="bg-white border border-slate-300 rounded w-full max-w-5xl h-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-[#0a192f] px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-sm bg-[#172554] text-blue-200 border border-blue-900 text-xs font-mono font-bold tracking-wide">
              {document.code}
            </span>
            <div>
              <h3 className="font-bold text-white text-xs sm:text-sm leading-snug font-mono">
                {document.title}
              </h3>
              <div className="text-[11px] font-mono text-slate-400">
                {document.category} • Revision {document.version}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.image_url && (
              <button
                type="button"
                onClick={() => setIsZoomed(!isZoomed)}
                className="px-2.5 py-1 rounded-sm bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 font-mono text-xs transition border border-blue-900"
              >
                {isZoomed ? 'FIT TO SCREEN' : 'ZOOM (100%)'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-sm bg-[#172554] hover:bg-red-900 text-slate-200 hover:text-white font-mono text-xs transition border border-blue-900"
              aria-label="Close"
            >
              Close
            </button>
          </div>
        </div>

        {/* Document Sheet Direct Display */}
        <div className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-4 flex flex-col items-center">
          {document.image_url ? (
            <div className="w-full flex justify-center">
              <img
                src={document.image_url}
                alt={document.title}
                className={`rounded border border-slate-300 shadow-md bg-white object-contain transition-all ${
                  isZoomed ? 'max-w-none w-auto' : 'max-w-full max-h-[75vh] w-auto h-auto'
                }`}
              />
            </div>
          ) : (
            <div className="w-full max-w-2xl bg-white border border-slate-300 rounded p-6 shadow-sm space-y-4 my-auto">
              <div className="border-b border-slate-200 pb-2">
                <span className="text-xs font-mono uppercase text-slate-500 block">Applicable Document File</span>
                <span className="font-mono font-bold text-sm text-slate-900">{document.file_name || `${document.code}.pdf`}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">{document.description}</p>
              {document.critical_point && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-950 font-medium">
                  <strong className="block font-mono text-[10px] text-blue-900 uppercase">Critical Point:</strong>
                  {document.critical_point}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Document Context */}
        <div className="bg-white px-4 sm:px-6 py-2.5 border-t border-slate-300 flex flex-wrap justify-between items-center text-xs font-mono text-slate-500 gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <span>FILE: <strong className="text-slate-800">{document.file_name || `${document.code}.pdf`}</strong></span>
            <span className="text-slate-300">•</span>
            <span>REGISTERED BY: <strong className="text-slate-800">{document.uploaded_by}</strong></span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            {isZoomed ? 'Zoomed: Pan or click 100% to reset' : 'Full Page Fit'}
          </div>
        </div>
      </div>
    </div>
  );
}
