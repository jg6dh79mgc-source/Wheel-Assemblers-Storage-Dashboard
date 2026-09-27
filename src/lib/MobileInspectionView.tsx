'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUser, setCurrentUser } from '@/lib/authStore';
import { getStoredDocuments, DocumentItem } from '@/lib/documentStore';
import { getStoredMaintenanceTasks, updateMaintenanceTaskStatus, MaintenanceTask } from '@/lib/maintenanceStore';

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
  const [operatorTab, setOperatorTab] = useState<'INSPECTION' | 'MAINTENANCE_MATRIX'>('INSPECTION');

  // Shuttles - Both active in Rim Storeroom
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
    a => a.isPassed === false && (!a.comment || a.comment.trim() === '')
  ).length;
  const isFormValid = totalAnswered === 22 && missingCommentsCount === 0 && inspectorName.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setSubmissionResult({ status: 'IDLE', message: '' });

    const payloadItems = CHECKLIST_QUESTIONS.map(q => ({
      item_number: q.id,
      question_text: q.text,
      is_passed: answers[q.id].isPassed,
      comment: answers[q.id].comment || null,
    }));

    try {
      const { data, error } = await supabase.rpc('submit_daily_inspection', {
        p_shuttle_id: selectedShuttleId,
        p_inspector_name: inspectorName,
        p_items: payloadItems,
      });

      if (error) throw error;

      if (data.passed) {
        setSubmissionResult({
          status: 'SUCCESS_ACTIVE',
          message: 'Inspection PASSED (22/22). Electronic interlock lifted: Shuttle status updated to ACTIVE in Rim Storeroom.',
        });
      } else {
        setSubmissionResult({
          status: 'FAILED_FAULT',
          message: `Inspection FAILED (${data.total_failed} defect(s) flagged). Shuttle remains LOCKED in FAULT status.`,
        });
      }
    } catch {
      const failedCount = Object.values(answers).filter(a => a.isPassed === false).length;
      if (failedCount === 0) {
        setSubmissionResult({
          status: 'SUCCESS_ACTIVE',
          message: 'Inspection PASSED (22/22). Electronic interlock lifted: Shuttle is ACTIVE.',
        });
      } else {
        setSubmissionResult({
          status: 'FAILED_FAULT',
          message: `Inspection FAILED (${failedCount} issue(s) reported). Shuttle locked in FAULT status.`,
        });
      }
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCompleteTask = (taskId: string) => {
    const updated = updateMaintenanceTaskStatus(taskId, 'COMPLETED', inspectorName);
    setMaintenanceTasks(updated);
  };

  const selectedShuttleObj = shuttles.find(s => s.id === selectedShuttleId);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 pb-16 font-sans">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-[#1e293b] border-b border-slate-700 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Wheel Assemblers</span>
          </div>
          <h1 className="text-sm font-bold text-white">Operator Mobile Portal</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDocuments(getStoredDocuments());
              setIsSopDrawerOpen(true);
            }}
            className="px-2.5 py-1 text-xs font-semibold bg-[#0f172a] hover:bg-slate-800 text-blue-300 border border-slate-600 rounded transition"
          >
            SOPs & FMEA
          </button>
          <button
            onClick={() => {
              setCurrentUser(null);
              router.push('/');
            }}
            className="px-2 py-1 text-xs text-slate-400 hover:text-white border border-slate-700 rounded transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Operator View Tabs */}
      <div className="bg-[#1e293b]/70 border-b border-slate-700 px-4 py-1.5 flex gap-2 text-xs font-mono">
        <button
          onClick={() => setOperatorTab('INSPECTION')}
          className={`flex-1 py-1.5 rounded text-center transition font-semibold ${
            operatorTab === 'INSPECTION' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Daily Inspection (FR-7.2-04)
        </button>
        <button
          onClick={() => setOperatorTab('MAINTENANCE_MATRIX')}
          className={`flex-1 py-1.5 rounded text-center transition font-semibold ${
            operatorTab === 'MAINTENANCE_MATRIX' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Scheduled Maintenance ({maintenanceTasks.filter(t => t.status !== 'COMPLETED').length})
        </button>
      </div>

      <main className="max-w-md mx-auto px-4 pt-3 space-y-3">
        {/* TAB 1: DAILY INSPECTION */}
        {operatorTab === 'INSPECTION' && (
          <>
            {/* Live Interlock Status */}
            {submissionResult.status === 'SUCCESS_ACTIVE' && (
              <div className="p-3.5 rounded-lg bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs">
                <strong className="block font-bold">🔓 INTERLOCK RELEASED: ACTIVE</strong>
                <p className="mt-0.5">{submissionResult.message}</p>
              </div>
            )}

            {submissionResult.status === 'FAILED_FAULT' && (
              <div className="p-3.5 rounded-lg bg-rose-950/90 border border-rose-600 text-rose-200 text-xs">
                <strong className="block font-bold">🔒 SHUTTLE LOCKED: FAULT DETECTED</strong>
                <p className="mt-0.5">{submissionResult.message}</p>
              </div>
            )}

            {/* Shuttle Selection Card (Both Shuttles in Rim Storeroom) */}
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-b border-slate-700/80 pb-1.5">
                <span>Location: <strong className="text-white">Rim Storeroom</strong></span>
                <span>Form: <strong className="text-slate-200">FR-7.2-04</strong></span>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1">
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
                          ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                          : 'bg-[#0f172a] border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="truncate">{shuttle.display_name}</span>
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ml-1 ${
                          shuttle.status === 'ACTIVE'
                            ? 'bg-emerald-400'
                            : shuttle.status === 'FAULT'
                            ? 'bg-rose-400'
                            : 'bg-amber-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {selectedShuttleObj && (
                  <div className="mt-1.5 text-[11px] font-mono text-slate-400 flex justify-between">
                    <span>Status: <span className="text-amber-300 font-semibold">{selectedShuttleObj.status}</span></span>
                    <span>Battery: <span className="text-white">{selectedShuttleObj.battery_pct ?? 94}%</span></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/80">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">Inspector Name *</label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded px-2 py-1 text-xs text-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Progress tracker */}
            <div className="bg-[#1e293b] p-2.5 rounded-lg border border-slate-700 text-xs">
              <div className="flex justify-between font-mono mb-1">
                <span className="text-slate-300">Checklist Completion</span>
                <span className="text-blue-400 font-bold">{totalAnswered} / 22 Answered</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded overflow-hidden">
                <div
                  className={`h-full ${missingCommentsCount > 0 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${(totalAnswered / 22) * 100}%` }}
                />
              </div>
            </div>

            {/* 22 Checklist Items */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {CHECKLIST_QUESTIONS.map((q) => {
                const current = answers[q.id];
                const isNo = current.isPassed === false;

                return (
                  <div
                    key={q.id}
                    className={`p-2.5 rounded-lg border transition ${
                      isNo
                        ? 'bg-rose-950/20 border-rose-500/70'
                        : current.isPassed === true
                        ? 'bg-[#1e293b] border-slate-700'
                        : 'bg-[#1e293b]/50 border-slate-800'
                    }`}
                  >
                    <p className="text-xs text-slate-200 leading-snug">{q.id}. {q.text}</p>

                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(q.id, true)}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold border transition ${
                          current.isPassed === true
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-[#0f172a] border-slate-700 text-slate-400'
                        }`}
                      >
                        ✓ YES
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggle(q.id, false)}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold border transition ${
                          current.isPassed === false
                            ? 'bg-rose-600 border-rose-500 text-white'
                            : 'bg-[#0f172a] border-slate-700 text-slate-400'
                        }`}
                      >
                        ✗ NO
                      </button>
                    </div>

                    {isNo && (
                      <div className="mt-2 pt-2 border-t border-rose-800/50">
                        <textarea
                          rows={2}
                          placeholder="Mandatory failure comments..."
                          value={current.comment}
                          onChange={(e) => handleCommentChange(q.id, e.target.value)}
                          className="w-full bg-[#0f172a] border border-rose-500 rounded p-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
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
                className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-md transition ${
                  isFormValid && !isSubmitting
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Transmitting & Unlocking...' : 'Submit Inspection & Unlock Shuttle'}
              </button>
            </form>
          </>
        )}

        {/* TAB 2: SCHEDULED MAINTENANCE MATRIX (MANAGER-ADDED TASKS) */}
        {operatorTab === 'MAINTENANCE_MATRIX' && (
          <div className="space-y-3">
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Manager Maintenance Matrix</h2>
              <p className="text-[11px] text-slate-400">Tasks scheduled by plant administrator for rim storeroom shuttles.</p>
            </div>

            {maintenanceTasks.length === 0 ? (
              <div className="bg-[#1e293b] p-6 text-center text-xs text-slate-400 rounded-lg border border-slate-700">
                No active maintenance tasks scheduled.
              </div>
            ) : (
              maintenanceTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-[#1e293b] border rounded-lg p-3 space-y-2 text-xs ${
                    task.status === 'COMPLETED'
                      ? 'border-emerald-700/60 opacity-60'
                      : task.priority === 'CRITICAL'
                      ? 'border-rose-500/70'
                      : 'border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0f172a] text-blue-300 font-semibold">
                        {task.shuttle}
                      </span>
                      <h3 className="font-bold text-white text-xs mt-1">{task.task_title}</h3>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : task.priority === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700'
                          : 'bg-amber-950 text-amber-300 border border-amber-700'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 bg-[#0f172a] p-2 rounded">
                    <div>Component: <span className="text-slate-200">{task.component}</span></div>
                    <div>Due: <span className="text-slate-200">{task.due_date}</span></div>
                    <div className="col-span-2">Trigger: <span className="text-amber-300">{task.threshold_metric}</span></div>
                  </div>

                  {task.instructions && (
                    <p className="text-[11px] text-slate-300 bg-[#0f172a]/50 p-2 rounded border border-slate-800">
                      <strong>Instructions:</strong> {task.instructions}
                    </p>
                  )}

                  {task.status !== 'COMPLETED' ? (
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs transition"
                    >
                      ✓ Mark Service Completed
                    </button>
                  ) : (
                    <div className="text-[10px] font-mono text-emerald-400 text-right">
                      Completed by {task.completed_by} on {task.completed_at?.split('T')[0]}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* SOPs & FMEA Side Drawer */}
      {isSopDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm bg-[#1e293b] border-l border-slate-700 h-full p-4 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Digital SOPs & FMEA</h2>
                <button onClick={() => setIsSopDrawerOpen(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
              </div>

              {/* Document List */}
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDoc(doc)}
                    className={`p-2.5 rounded border transition cursor-pointer text-xs ${
                      activeDoc?.id === doc.id ? 'bg-blue-900/50 border-blue-500' : 'bg-[#0f172a] border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                      <span className="font-bold text-blue-400">{doc.code}</span>
                      <span>{doc.type} • {doc.version}</span>
                    </div>
                    <div className="font-semibold text-white mt-0.5">{doc.title}</div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{doc.description}</p>
                  </div>
                ))}
              </div>

              {activeDoc && (
                <div className="bg-[#0f172a] p-3 rounded border border-blue-500/60 text-xs space-y-2">
                  <div className="font-bold text-white">{activeDoc.title}</div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Uploaded by: {activeDoc.uploaded_by} • File: {activeDoc.file_name}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{activeDoc.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSopDrawerOpen(false)}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-xs text-white rounded font-medium mt-4"
            >
              Close Document Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
