'use client';

import React, { useState, useEffect } from 'react';
import { getStoredDocuments, saveDocument, DocumentItem } from '@/lib/documentStore';
import { getStoredMaintenanceTasks, saveMaintenanceTask, MaintenanceTask } from '@/lib/maintenanceStore';
import DigitalSopViewerModal from './DigitalSopViewerModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'DOCS' | 'MAINTENANCE';
}

export default function AdminDocumentAndMaintenanceModal({
  isOpen,
  onClose,
  defaultTab = 'DOCS',
}: Props) {
  const [activeTab, setActiveTab] = useState<'DOCS' | 'MAINTENANCE'>(defaultTab);

  // Document upload form state
  const [docType, setDocType] = useState<'SOP' | 'FMEA'>('SOP');
  const [docCode, setDocCode] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Pre-Operational');
  const [docVersion, setDocVersion] = useState('v1.0');
  const [docFileName, setDocFileName] = useState('');
  const [docDesc, setDocDesc] = useState('');

  // Maintenance scheduling form state
  const [maintShuttle, setMaintShuttle] = useState<'Shuttle 1' | 'Shuttle 2' | 'All Shuttles'>('Shuttle 1');
  const [maintTitle, setMaintTitle] = useState('');
  const [maintComponent, setMaintComponent] = useState('Drive Wheels');
  const [maintTrigger, setMaintTrigger] = useState<'USAGE_ODOMETER' | 'USAGE_CYCLES' | 'CALENDAR_DAYS' | 'PREVENTATIVE'>('USAGE_ODOMETER');
  const [maintThreshold, setMaintThreshold] = useState('');
  const [maintDueDate, setMaintDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintPriority, setMaintPriority] = useState<'CRITICAL' | 'HIGH' | 'NORMAL'>('HIGH');
  const [maintInstructions, setMaintInstructions] = useState('');

  const [notification, setNotification] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDocuments(getStoredDocuments());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docCode || !docTitle) return;

    saveDocument({
      code: docCode.trim().toUpperCase(),
      title: docTitle.trim(),
      type: docType,
      category: docCategory,
      version: docVersion.trim(),
      uploaded_by: 'Plant Administrator',
      file_name: docFileName.trim() || `${docCode.trim().toUpperCase()}.pdf`,
      description: docDesc.trim(),
    });

    setDocuments(getStoredDocuments());
    setNotification(`Successfully uploaded ${docType} document: ${docCode}`);
    setDocCode('');
    setDocTitle('');
    setDocFileName('');
    setDocDesc('');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintTitle) return;

    saveMaintenanceTask({
      shuttle: maintShuttle,
      task_title: maintTitle.trim(),
      component: maintComponent.trim(),
      trigger_type: maintTrigger,
      threshold_metric: maintThreshold.trim() || 'Scheduled by Plant Lead',
      status: 'PENDING',
      due_date: maintDueDate,
      priority: maintPriority,
      assigned_to: 'Shift Operator',
      scheduled_by: 'Plant Administrator',
      instructions: maintInstructions.trim(),
    });

    setNotification(`Scheduled maintenance task for ${maintShuttle}: "${maintTitle}" added to Operator View.`);
    setMaintTitle('');
    setMaintThreshold('');
    setMaintInstructions('');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#1e293b] border border-slate-700 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between bg-[#0f172a]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Manager Portal</h2>
            <p className="text-[11px] text-slate-400">Upload SOPs, FMEAs, & Schedule Maintenance for Operators</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm p-1">✕</button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-700 bg-[#0f172a] text-xs font-mono">
          <button
            onClick={() => setActiveTab('DOCS')}
            className={`flex-1 py-2 text-center transition ${
              activeTab === 'DOCS' ? 'border-b-2 border-blue-500 text-white font-bold bg-[#1e293b]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload SOP / FMEA
          </button>
          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`flex-1 py-2 text-center transition ${
              activeTab === 'MAINTENANCE' ? 'border-b-2 border-blue-500 text-white font-bold bg-[#1e293b]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Schedule Maintenance in Operator View
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="bg-emerald-950 border-b border-emerald-700 text-emerald-300 text-xs px-4 py-2">
            ✓ {notification}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: UPLOAD SOP OR FMEA */}
          {activeTab === 'DOCS' && (
            <form onSubmit={handleDocumentSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-300 mb-1">Document Type *</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="SOP">Standard Operating Procedure (SOP)</option>
                    <option value="FMEA">Failure Mode & Effects Analysis (FMEA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-300 mb-1">Document Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. SOP-SH-05 or FMEA-WHEEL-02"
                    value={docCode}
                    onChange={(e) => setDocCode(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Multi-Directional Shuttle Emergency Stop Procedure"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Safety, Mechanical, Electrical"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-300 mb-1">Version</label>
                  <input
                    type="text"
                    placeholder="e.g. v2.0"
                    value={docVersion}
                    onChange={(e) => setDocVersion(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-300 mb-1">Attach File / PDF Name</label>
                <input
                  type="text"
                  placeholder="e.g. SOP-SH-05_Emergency_Procedures.pdf"
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-300 mb-1">Summary / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of document purpose and guidelines..."
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition"
                >
                  Upload Document
                </button>
              </div>

              {/* Registered Documents List with Previews */}
              <div className="pt-4 border-t border-slate-700/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
                    Active Digital SOPs & FMEA ISO Library ({documents.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Instant Operator Mobile Availability
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 flex flex-wrap justify-between items-center gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                            {doc.code}
                          </span>
                          <span className="font-bold text-white text-xs">{doc.title}</span>
                          <span className="text-[9px] text-slate-400 font-mono">({doc.version})</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{doc.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="px-2.5 py-1 bg-blue-600/80 hover:bg-blue-500 text-white rounded font-mono text-[11px] transition flex items-center gap-1 shrink-0"
                      >
                        <span>⚡</span>
                        <span>Interactive & Sheet Preview</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SCHEDULE MAINTENANCE FOR OPERATOR VIEW */}
          {activeTab === 'MAINTENANCE' && (
            <form onSubmit={handleMaintenanceSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-300 mb-1">Target Shuttle *</label>
                  <select
                    value={maintShuttle}
                    onChange={(e) => setMaintShuttle(e.target.value as any)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Shuttle 1">Shuttle 1 (Rim Storeroom)</option>
                    <option value="Shuttle 2">Shuttle 2 (Rim Storeroom)</option>
                    <option value="All Shuttles">All Shuttles</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-300 mb-1">Priority</label>
                  <select
                    value={maintPriority}
                    onChange={(e) => setMaintPriority(e.target.value as any)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="CRITICAL">Critical (Immediate Service)</option>
                    <option value="HIGH">High (Due within 24h)</option>
                    <option value="NORMAL">Normal Routine</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-300 mb-1">Maintenance Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Scissor Lift Grease & Pin Wear Inspection"
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-300 mb-1">Component Affected</label>
                  <input
                    type="text"
                    placeholder="e.g. Guide Channels, Wheels, Batteries"
                    value={maintComponent}
                    onChange={(e) => setMaintComponent(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={maintDueDate}
                    onChange={(e) => setMaintDueDate(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-300 mb-1">Trigger Threshold / Metric</label>
                <input
                  type="text"
                  placeholder="e.g. 10,000 km replacement / 100,000 cycles grease"
                  value={maintThreshold}
                  onChange={(e) => setMaintThreshold(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-300 mb-1">Technician / Operator Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Instructions for the operator performing this service..."
                  value={maintInstructions}
                  onChange={(e) => setMaintInstructions(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold transition"
                >
                  Schedule in Operator View
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-700 bg-[#0f172a] flex justify-end text-xs">
          <button onClick={onClose} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200">
            Close
          </button>
        </div>
      </div>

      {/* Digital SOP & High-Res Document Preview Modal */}
      <DigitalSopViewerModal
        document={previewDoc}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
