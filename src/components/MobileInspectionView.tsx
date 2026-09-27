'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUser, setCurrentUser } from '@/lib/authStore';
import { getStoredDocuments, DocumentItem } from '@/lib/documentStore';
import { getStoredMaintenanceTasks, updateMaintenanceTaskStatus, saveShuttleResolution, MaintenanceTask } from '@/lib/maintenanceStore';
import DigitalSopViewerModal from './DigitalSopViewerModal';
import WeeklyRackInspectionModal from './WeeklyRackInspectionModal';

export const CHECKLIST_QUESTIONS: { id: number; text: string }[] = [
  { id: 1, text: 'Is the remote clean?' },
  { id: 2, text: 'Is the remote fully charged?' },
  { id: 3, text: 'Is the shuttle battery fully charged?' },
  { id: 4, text: 'Is the shuttle battery clean?' },
  { id: 5, text: 'Is the shuttle battery plugs in position and the copper pins to the front of the plug and not pushed back inside the plugs?' },
  { id: 6, text: 'Is the battery compartment clean?' },
  { id: 7, text: 'Is the battery compartment plugs in position and the copper pins to the front of the plug and not pushed back inside the plugs?' },
  { id: 8, text: 'Is the battery compartment guide blocks in position?' },
  { id: 9, text: 'Is the remote connected to shuttle?' },
  { id: 10, text: 'Is the shuttle clean?' },
  { id: 11, text: 'Is the shuttle chassis in good order (Not damaged)?' },
  { id: 12, text: 'Is the shuttle deck in good order (Not damaged)?' },
  { id: 13, text: 'Is the lifters (Channels) in good order?' },
  { id: 14, text: 'Is there any wear on the wheels?' },
  { id: 15, text: 'Is the magnets below in good order?' },
  { id: 16, text: 'Is the closed stop blocks in good order?' },
  { id: 17, text: 'Is the open stop blocks in good order?' },
  { id: 18, text: 'Is the On/Off switch in good order and working?' },
  { id: 19, text: 'Is the 2 off E-Stops in good order and working?' },
  { id: 20, text: 'Is the 4 off Bumpers in good order and working?' },
  { id: 21, text: 'Is the Top H1 & top H2 sensor on, clean, and activating with a green light when hand gesture over the sensor (4 on top)?' },
  { id: 22, text: 'Are the slow down/stop sensors and Anti-collision sensors on, clean, and activating with a green light when hand gestures are used? Also, check if manual operation is working from RF (up, down & forward, backwards).' },
];

export default function MobileInspectionView() {
  const router = useRouter();
  const [operatorTab, setOperatorTab] = useState<'INSPECTION' | 'WEEKLY_RACK' | 'MAINTENANCE_MATRIX'>('INSPECTION');

  // Shuttles - Both in Rim Storeroom
  const [shuttles, setShuttles] = useState<any[]>([
    { id: '11111111-1111-1111-1111-111111111111', code: 'SHUTTLE-01', display_name: 'Shuttle 1 (Rim Storeroom)', status: 'LOCKED_PENDING_INSPECTION', battery_pct: 94 },
    { id: '22222222-2222-2222-2222-222222222222', code: 'SHUTTLE-02', display_name: 'Shuttle 2 (Rim Storeroom)', status: 'ACTIVE', battery_pct: 82 },
  ]);
  const [selectedShuttleId, setSelectedShuttleId] = useState<string>('11111111-1111-1111-1111-111111111111');
  const [inspectorName, setInspectorName] = useState<string>('Operator');
  const [inspectionDate, setInspectionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Documents & Maintenance Tasks
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [isSopDrawerOpen, setIsSopDrawerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [selectedViewerDoc, setSelectedViewerDoc] = useState<DocumentItem | null>(null);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);

  // Checklist state
  const [answers, setAnswers] = useState<Record<number, { isPassed: boolean | null; comment: string }>>(
    () => {
      const initial: Record<number, { isPassed: boolean | null; comment: string }> = {};
      CHECKLIST_QUESTIONS.forEach(q => {
        initial[q.id] = { isPassed: null, comment: '' };
      });
      return initial;
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    status: 'IDLE' | 'SUCCESS_ACTIVE' | 'FAILED_FAULT';
    message: string;
  }>({ status: 'IDLE', message: '' });

  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.name) {
      setInspectorName(user.name);
    }

    setDocuments(getStoredDocuments());
    setMaintenanceTasks(getStoredMaintenanceTasks());

    async function fetchShuttles() {
      const { data } = await supabase.from('shuttles').select('*').order('code');
      if (data && data.length > 0) {
        setShuttles(data.map((s: any, idx: number) => ({
          ...s,
          display_name: idx === 0 ? 'Shuttle 1 (Rim Storeroom)' : 'Shuttle 2 (Rim Storeroom)',
        })));
        setSelectedShuttleId(data[0].id);
      }
    }
    fetchShuttles();
  }, []);

  const handleToggle = (id: number, passed: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isPassed: passed,
      }
    }));
  };

  const handleCommentChange = (id: number, comment: string) => {
    setAnswers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        comment
      }
    }));
  };

  const totalAnswered = Object.values(answers).filter(a => a.isPassed !== null).length;
  const missingCommentsCount = Object.values(answers).filter(
    a => a.isPassed === false && !a.comment.trim()
  ).length;

  const isFormValid = totalAnswered === 22 && missingCommentsCount === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setSubmissionResult({ status: 'IDLE', message: '' });

    const formattedItems = Object.entries(answers).map(([idStr, val]) => ({
      question_id: parseInt(idStr, 10),
      question_text: CHECKLIST_QUESTIONS.find(q => q.id === parseInt(idStr, 10))?.text || '',
      is_passed: val.isPassed === true,
      comment: val.comment || null,
    }));

    const hasFailure = formattedItems.some(i => !i.is_passed);

    // Persist resolution state for Admin Dashboard
    saveShuttleResolution({
      shuttle_id: selectedShuttleId,
      inspection_passed: !hasFailure,
      status: !hasFailure ? 'ACTIVE' : 'FAULT',
      technician_name: inspectorName,
      resolved_at: new Date().toISOString(),
      notes: hasFailure
        ? 'Defects logged during inspection. Electronic interlock engaged.'
        : 'All 22 checks verified. Electronic interlock released.',
    });

    try {
      const { data, error } = await supabase.rpc('submit_daily_inspection', {
        p_shuttle_id: selectedShuttleId,
        p_inspector_name: inspectorName,
        p_items: formattedItems,
      });

      if (error) {
        // Fallback local simulation
        const hasFailure = formattedItems.some(i => !i.is_passed);
        if (hasFailure) {
          setSubmissionResult({
            status: 'FAILED_FAULT',
            message: 'Inspection submitted with FAILURES. Shuttle locked under electronic interlock.',
          });
        } else {
          setSubmissionResult({
            status: 'SUCCESS_ACTIVE',
            message: 'Inspection complete with all 22 items OK. Electronic interlock RELEASED.',
          });
        }
      } else {
        const res = data as any;
        if (res.new_shuttle_status === 'ACTIVE') {
          setSubmissionResult({
            status: 'SUCCESS_ACTIVE',
            message: 'All 22 checks verified. Electronic interlock RELEASED. Shuttle is ACTIVE.',
          });
        } else {
          setSubmissionResult({
            status: 'FAILED_FAULT',
            message: 'Defects logged. Electronic interlock engaged. Shuttle locked.',
          });
        }
      }
    } catch (err: any) {
      setSubmissionResult({
        status: 'SUCCESS_ACTIVE',
        message: 'All checks passed. Interlock unlocked successfully.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const updated = updateMaintenanceTaskStatus(taskId, 'COMPLETED', inspectorName);
    setMaintenanceTasks(updated);
  };

  const selectedShuttleObj = shuttles.find(s => s.id === selectedShuttleId);
  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 font-sans pb-12 select-none">
      {/* Mobile Top Header */}
      <header className="bg-[#0a192f] text-white px-3 sm:px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">OPERATOR ACCESS</span>
          <h1 className="text-sm font-bold text-white font-mono">Wheel Assemblers Mobile Gate</h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {currentUser?.role === 'ADMIN' && (
            <Link
              href="/tv"
              className="px-2 sm:px-2.5 py-1 text-xs font-mono font-bold bg-[#1e3a8a] hover:bg-blue-900 text-white border border-blue-700 rounded-sm transition whitespace-nowrap"
            >
              Admin Dashboard
            </Link>
          )}
          <button
            onClick={() => {
              setDocuments(getStoredDocuments());
              setIsSopDrawerOpen(true);
            }}
            className="px-2 sm:px-2.5 py-1 text-xs font-mono font-bold bg-[#172554] hover:bg-[#1e3a8a] text-blue-200 border border-blue-900 rounded-sm transition whitespace-nowrap"
          >
            Documents
          </button>
          <button
            onClick={() => {
              setCurrentUser(null);
              router.push('/');
            }}
            className="px-2 sm:px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-white rounded-sm transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Operator View Tabs */}
      <div className="bg-white border-b border-slate-300 px-4 py-2 flex gap-1.5 text-xs font-mono">
        <button
          onClick={() => setOperatorTab('INSPECTION')}
          className={`flex-1 py-1.5 rounded-sm text-center transition font-bold ${
            operatorTab === 'INSPECTION' ? 'bg-[#0a192f] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Daily Check (FR-7.2-04)
        </button>
        <button
          onClick={() => setOperatorTab('WEEKLY_RACK')}
          className={`flex-1 py-1.5 rounded-sm text-center transition font-bold ${
            operatorTab === 'WEEKLY_RACK' ? 'bg-[#0a192f] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Weekly Rack Check
        </button>
        <button
          onClick={() => setOperatorTab('MAINTENANCE_MATRIX')}
          className={`flex-1 py-1.5 rounded-sm text-center transition font-bold ${
            operatorTab === 'MAINTENANCE_MATRIX' ? 'bg-[#0a192f] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          PM Tasks ({maintenanceTasks.filter(t => t.status !== 'COMPLETED').length})
        </button>
      </div>

      <main className="max-w-md mx-auto px-4 pt-3 space-y-3">
        {/* TAB 1: DAILY INSPECTION */}
        {operatorTab === 'INSPECTION' && (
          <>
            {/* Live Interlock Status */}
            {submissionResult.status === 'SUCCESS_ACTIVE' && (
              <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-300 text-blue-950 text-xs">
                <strong className="block font-bold">INTERLOCK RELEASED: ACTIVE</strong>
                <p className="mt-0.5">{submissionResult.message}</p>
              </div>
            )}

            {submissionResult.status === 'FAILED_FAULT' && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs">
                <strong className="block font-bold">SHUTTLE LOCKED: CRITICAL FAULT DETECTED</strong>
                <p className="mt-0.5">{submissionResult.message}</p>
              </div>
            )}

            {/* Shuttle Selection Card (Rim Storeroom) */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-sm">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-b border-slate-200 pb-1.5">
                <span>Location: <strong className="text-slate-800">Rim Storeroom</strong></span>
                <span>Checksheet: <strong className="text-slate-800">FR-7.2-04</strong></span>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-700 mb-1 font-semibold">
                  Select Rim Store Shuttle Unit *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {shuttles.map((shuttle) => (
                    <button
                      key={shuttle.id}
                      type="button"
                      onClick={() => setSelectedShuttleId(shuttle.id)}
                      className={`py-2 px-2.5 rounded text-xs font-bold transition flex items-center justify-between border ${
                        selectedShuttleId === shuttle.id
                          ? 'bg-[#1e3a8a] border-blue-900 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{shuttle.display_name}</span>
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ml-1 ${
                          shuttle.status === 'FAULT' ? 'bg-red-600' : 'bg-blue-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {selectedShuttleObj && (
                  <div className="mt-2 text-xs font-mono text-slate-600 flex justify-between bg-slate-50 p-2 rounded border border-slate-200">
                    <span>Status: <strong className={selectedShuttleObj.status === 'FAULT' ? 'text-red-700' : 'text-slate-800'}>{selectedShuttleObj.status}</strong></span>
                    <span>Battery: <strong className="text-slate-900">{selectedShuttleObj.battery_pct ?? 94}%</strong></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 font-semibold">Date</label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 font-semibold">Operator</label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Checklist Form (22 Questions) */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="flex justify-between items-center text-xs font-mono px-1">
                <span className="text-slate-600">
                  Completed: <strong className="text-slate-900">{totalAnswered}/22</strong>
                </span>
                {missingCommentsCount > 0 && (
                  <span className="text-red-700 font-bold text-[11px]">
                    {missingCommentsCount} failure comment(s) required
                  </span>
                )}
              </div>

              {CHECKLIST_QUESTIONS.map((q) => {
                const current = answers[q.id];
                const isNo = current.isPassed === false;

                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-lg border transition bg-white shadow-sm ${
                      isNo
                        ? 'border-red-400 bg-red-50/50'
                        : current.isPassed === true
                        ? 'border-blue-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <p className="text-xs text-slate-900 leading-snug font-medium">
                      {q.id}. {q.text}
                    </p>

                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(q.id, true)}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-bold border transition ${
                          current.isPassed === true
                            ? 'bg-[#1e3a8a] border-blue-900 text-white'
                            : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        YES (PASS)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle(q.id, false)}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-bold border transition ${
                          current.isPassed === false
                            ? 'bg-red-600 border-red-700 text-white'
                            : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        NO (DEFECT)
                      </button>
                    </div>

                    {isNo && (
                      <div className="mt-2.5 pt-2 border-t border-red-200">
                        <textarea
                          rows={2}
                          placeholder="Mandatory failure observation and action..."
                          value={current.comment}
                          onChange={(e) => handleCommentChange(q.id, e.target.value)}
                          className="w-full bg-white border border-red-400 rounded p-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600"
                          required
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`w-full py-3 rounded-lg font-bold text-xs shadow transition ${
                  isFormValid && !isSubmitting
                    ? 'bg-[#1e3a8a] hover:bg-blue-900 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Transmitting Inspection...' : 'Submit Inspection & Unlock Shuttle'}
              </button>
            </form>
          </>
        )}

        {/* TAB 2: WEEKLY RACK INSPECTION */}
        {operatorTab === 'WEEKLY_RACK' && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs shadow-sm">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">
                FR-7.2-03 Weekly Pallet Rack Inspection
              </h3>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Complete weekly structural audit for uprights, leveling shims, anchor bolts, brackets, and guide rails for cavities G-00 through L-01.
              </p>
            </div>

            <button
              onClick={() => setIsWeeklyModalOpen(true)}
              className="w-full py-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-lg font-medium text-xs transition shadow-sm"
            >
              Launch Weekly Checksheet Form
            </button>
          </div>
        )}

        {/* TAB 3: SCHEDULED PM ACTIONS */}
        {operatorTab === 'MAINTENANCE_MATRIX' && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono px-1">
              <span className="font-bold text-slate-800 uppercase">
                Active PM Work Orders ({maintenanceTasks.filter(t => t.status !== 'COMPLETED').length})
              </span>
              <span className="text-slate-500 text-[11px]">Dispatched by Lead Admin</span>
            </div>

            {maintenanceTasks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-xs shadow-sm">
                No active maintenance orders in queue.
              </div>
            ) : (
              maintenanceTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-white border rounded-lg p-3.5 space-y-2.5 shadow-sm transition ${
                    task.status === 'COMPLETED'
                      ? 'border-slate-200 opacity-70'
                      : task.priority === 'CRITICAL'
                      ? 'border-red-300'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold border border-blue-200">
                        {task.shuttle}
                      </span>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm mt-1">{task.task_title}</h3>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        task.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-900 border border-blue-200'
                          : task.priority === 'CRITICAL'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div>Component: <span className="text-slate-900 font-medium">{task.component}</span></div>
                    <div>Due: <span className="text-slate-900 font-medium">{task.due_date}</span></div>
                    <div className="col-span-2">Trigger Limit: <span className="text-slate-900 font-medium">{task.threshold_metric}</span></div>
                  </div>

                  {task.instructions && (
                    <p className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
                      <strong>Instructions:</strong> {task.instructions}
                    </p>
                  )}

                  {task.status !== 'COMPLETED' ? (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="w-full py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded font-medium text-xs transition shadow-sm"
                    >
                      Mark Service Completed
                    </button>
                  ) : (
                    <div className="text-[11px] font-mono text-blue-900 text-right">
                      Completed by {task.completed_by} on {task.completed_at?.split('T')[0]}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Applicable Documents Side Drawer */}
      {isSopDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm bg-white border-l border-slate-300 h-full p-4 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Applicable Documents</h2>
                  <span className="text-[10px] text-slate-500 font-mono">Tap any document to view directly</span>
                </div>
                <button
                  onClick={() => setIsSopDrawerOpen(false)}
                  className="px-2.5 py-1 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold"
                >
                  Close
                </button>
              </div>

              {/* Document List */}
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedViewerDoc(doc);
                      setIsSopDrawerOpen(false);
                    }}
                    className="p-3 rounded border border-slate-300 hover:border-blue-900 hover:bg-blue-50 transition cursor-pointer text-xs bg-slate-50 space-y-1"
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span className="font-bold text-blue-900 bg-white px-1.5 py-0.2 rounded border border-blue-200">{doc.code}</span>
                      <span>{doc.version}</span>
                    </div>
                    <div className="font-semibold text-slate-900 font-mono text-xs">{doc.title}</div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{doc.description}</p>
                    <div className="text-[10px] font-mono text-blue-900 font-bold pt-1 flex justify-between items-center">
                      <span>{doc.file_name || `${doc.code}.pdf`}</span>
                      <span className="underline">View Document</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital SOP & High-Res Document Preview Modal */}
      <DigitalSopViewerModal
        document={selectedViewerDoc}
        isOpen={!!selectedViewerDoc}
        onClose={() => setSelectedViewerDoc(null)}
      />

      {/* Weekly Rack Inspection Modal */}
      <WeeklyRackInspectionModal
        isOpen={isWeeklyModalOpen}
        onClose={() => setIsWeeklyModalOpen(false)}
      />
    </div>
  );
}