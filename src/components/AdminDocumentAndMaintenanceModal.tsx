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

  // Maintenance PM Action scheduling form state
  const [maintShuttle, setMaintShuttle] = useState<'Shuttle 1' | 'Shuttle 2' | 'All Shuttles'>('Shuttle 1');
  const [maintTitle, setMaintTitle] = useState('');
  const [maintComponent, setMaintComponent] = useState('Drive Wheels');
  const [maintTrigger, setMaintTrigger] = useState<'USAGE_ODOMETER' | 'USAGE_CYCLES' | 'CALENDAR_DAYS' | 'PREVENTATIVE'>('USAGE_ODOMETER');
  const [maintThreshold, setMaintThreshold] = useState('');
  const [maintDueDate, setMaintDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintPriority, setMaintPriority] = useState<'CRITICAL' | 'HIGH' | 'NORMAL'>('NORMAL');
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
    setNotification(`Successfully registered ${docType} document: ${docCode}`);
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
      threshold_metric: maintThreshold.trim() || 'Scheduled Admin PM Occasion',
      status: 'PENDING',
      due_date: maintDueDate,
      priority: maintPriority,
      assigned_to: 'Shift Operator',
      scheduled_by: 'Plant Administrator',
      instructions: maintInstructions.trim(),
    });

    setNotification(`PM Action scheduled for ${maintShuttle}: "${maintTitle}". Dispatched to Operator & Matrix schedule.`);
    setMaintTitle('');
    setMaintThreshold('');
    setMaintInstructions('');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-sans select-none">
      <div className="bg-white border border-slate-300 rounded w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800 bg-[#0a192f] flex items-center justify-between text-white">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">ADMIN PORTAL</h2>
            <p className="text-sm font-bold text-white font-mono">SOP / FMEA Management & Schedule PM Action</p>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-sm bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 text-xs font-mono transition"
          >
            Close
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-300 bg-slate-100 text-xs font-mono">
          <button
            onClick={() => setActiveTab('DOCS')}
            className={`flex-1 py-2.5 text-center transition font-bold border-b-2 ${
              activeTab === 'DOCS'
                ? 'border-[#0a192f] text-[#0a192f] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload SOP / FMEA
          </button>
          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`flex-1 py-2.5 text-center transition font-bold border-b-2 ${
              activeTab === 'MAINTENANCE'
                ? 'border-[#0a192f] text-[#0a192f] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            + Add PM Action
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div className="bg-blue-50 border-b border-blue-200 text-blue-900 text-xs px-4 py-2 font-medium">
            {notification}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs bg-slate-50">
          {/* TAB 1: UPLOAD SOP OR FMEA */}
          {activeTab === 'DOCS' && (
            <form onSubmit={handleDocumentSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Document Type *</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  >
                    <option value="SOP">Standard Operating Procedure (SOP)</option>
                    <option value="FMEA">Failure Mode & Effects Analysis (FMEA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Document Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. SOP-SH-05 or FMEA-WHEEL-02"
                    value={docCode}
                    onChange={(e) => setDocCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Multi-Directional Shuttle Emergency Stop Procedure"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Pre-Operational, Safety, Mechanical"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Revision / Version</label>
                  <input
                    type="text"
                    placeholder="e.g. Rev 01"
                    value={docVersion}
                    onChange={(e) => setDocVersion(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Attached Filename / ISO Reference</label>
                <input
                  type="text"
                  placeholder="e.g. SOP-SH-05_Emergency_Procedures.pdf"
                  value={docFileName}
                  onChange={(e) => setDocFileName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Summary & Scope</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of document purpose and operating instructions..."
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded font-medium transition text-xs shadow-sm"
                >
                  Register Document
                </button>
              </div>

              {/* Registered Documents List with Previews */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wider font-mono text-[11px]">
                    Active Digital SOP & FMEA ISO Library ({documents.length})
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Instant Operator Availability
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap justify-between items-center gap-2 shadow-sm"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {doc.code}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">{doc.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({doc.version})</span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1">{doc.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-blue-900 border border-slate-300 hover:border-blue-300 rounded font-mono text-[11px] transition shrink-0"
                      >
                        View Interactive Guide
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SCHEDULE PM ACTION (AS ADMIN) */}
          {activeTab === 'MAINTENANCE' && (
            <form onSubmit={handleMaintenanceSubmit} className="space-y-3.5">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <span className="font-bold block font-mono uppercase text-[11px]">Admin Preventative Maintenance Action</span>
                Dispatch routine PM work orders, usage threshold service tasks, and inspection occasions directly to the Operator View and 52-Week Maintenance Matrix.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Target Equipment *</label>
                  <select
                    value={maintShuttle}
                    onChange={(e) => setMaintShuttle(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  >
                    <option value="Shuttle 1">Shuttle 1 (Rim Storeroom)</option>
                    <option value="Shuttle 2">Shuttle 2 (Rim Storeroom)</option>
                    <option value="All Shuttles">All Shuttles (Rim Storeroom)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Priority Level *</label>
                  <select
                    value={maintPriority}
                    onChange={(e) => setMaintPriority(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  >
                    <option value="NORMAL">Standard Routine PM</option>
                    <option value="HIGH">High Priority (Due 24h)</option>
                    <option value="CRITICAL">Critical (Immediate Service - Red)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">PM Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Scissor Lift Grease & Pin Wear Inspection"
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Component Affected</label>
                  <input
                    type="text"
                    placeholder="e.g. Polyurethane Drive Wheels, Sensors, Lift Channels"
                    value={maintComponent}
                    onChange={(e) => setMaintComponent(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Due Date</label>
                  <input
                    type="date"
                    value={maintDueDate}
                    onChange={(e) => setMaintDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Trigger Metric / Schedule</label>
                  <select
                    value={maintTrigger}
                    onChange={(e) => setMaintTrigger(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  >
                    <option value="USAGE_ODOMETER">Odometer Target (e.g. 10,000 km)</option>
                    <option value="USAGE_CYCLES">Lift Cycle Target (e.g. 100,000 cycles)</option>
                    <option value="CALENDAR_DAYS">Sensor Interval (e.g. 7-Day Limit)</option>
                    <option value="PREVENTATIVE">Annual 52-Week Matrix Occasion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Trigger Limit Note</label>
                  <input
                    type="text"
                    placeholder="e.g. 10,000 km wear limit / 100,000 cycles"
                    value={maintThreshold}
                    onChange={(e) => setMaintThreshold(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1 font-semibold">Technician & Operator Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed maintenance instructions, lubricant grades, and safety verification steps..."
                  value={maintInstructions}
                  onChange={(e) => setMaintInstructions(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-600 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded font-medium transition text-xs shadow-sm"
                >
                  Schedule PM Action
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-200 bg-white flex justify-end text-xs">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-800 font-medium transition"
          >
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
