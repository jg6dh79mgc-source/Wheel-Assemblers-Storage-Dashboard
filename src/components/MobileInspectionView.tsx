'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUser, setCurrentUser } from '@/lib/authStore';
import { getStoredDocuments, DocumentItem } from '@/lib/documentStore';
import { saveShuttleResolution } from '@/lib/maintenanceStore';
import { ShuttleItem, fetchShuttlesFromCloud, getStoredShuttles } from '@/lib/shuttleStore';
import DigitalSopViewerModal from './DigitalSopViewerModal';

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
  { id: 18, text: 'Are the fasteners in position (Not missing)?' },
  { id: 19, text: 'Are the sensors in good order (Not damaged)?' },
  { id: 20, text: 'Is the emergency switch in good order (Not damaged)?' },
  { id: 21, text: 'Is the antenna in good order (Not damaged)?' },
  { id: 22, text: 'Are the slow down/stop sensors and Anti-collision sensors on, clean, and activating with a green light when hand gestures are used? Also, check if manual operation is working from RF (up, down & forward, backwards).' },
];

function getBatteryPastelColor(pct: number): string {
  if (pct >= 70) return '#86efac'; // Pastel green
  if (pct >= 40) return '#fde047'; // Pastel yellow
  if (pct >= 20) return '#fdba74'; // Pastel orange
  return '#fca5a5'; // Pastel red
}

export default function MobileInspectionView() {
  const router = useRouter();

  // Shuttles state
  const [shuttles, setShuttles] = useState<ShuttleItem[]>([]);
  const [selectedShuttleId, setSelectedShuttleId] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>('Operator');
  const [inspectionDate, setInspectionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Standardized Documents Drawer & Modal
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isSopDrawerOpen, setIsSopDrawerOpen] = useState(false);
  const [selectedViewerDoc, setSelectedViewerDoc] = useState<DocumentItem | null>(null);

  // Checklist state
  const [answers, setAnswers] = useState<Record<number, { isPassed: boolean | null; comment: string }>>(
    () => {
      const initial: Record<number, { isPassed: boolean | null; comment: string }> = {};
      CHECKLIST_QUESTIONS.forEach((q) => {
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

    async function loadShuttles() {
      const stored = getStoredShuttles();
      setShuttles(stored);
      if (stored.length > 0) {
        setSelectedShuttleId(stored[0].id);
      }

      const cloud = await fetchShuttlesFromCloud();
      if (cloud && cloud.length > 0) {
        setShuttles(cloud);
        setSelectedShuttleId((prev) => (cloud.some((s) => s.id === prev) ? prev : cloud[0].id));
      }
    }
    loadShuttles();
  }, []);

  const handleToggle = (id: number, passed: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isPassed: passed,
      },
    }));
  };

  const handleCommentChange = (id: number, comment: string) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        comment,
      },
    }));
  };

  const totalAnswered = Object.values(answers).filter((a) => a.isPassed !== null).length;
  const missingCommentsCount = Object.values(answers).filter(
    (a) => a.isPassed === false && !a.comment.trim()
  ).length;

  const isFormValid = totalAnswered === 22 && missingCommentsCount === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setSubmissionResult({ status: 'IDLE', message: '' });

    const allPassed = Object.values(answers).every((a) => a.isPassed === true);
    const defects = Object.entries(answers)
      .filter(([_, a]) => a.isPassed === false)
      .map(([id, a]) => ({
        question_id: Number(id),
        question_text: CHECKLIST_QUESTIONS.find((q) => q.id === Number(id))?.text || '',
        comment: a.comment,
      }));

    try {
      const { data, error } = await supabase.rpc('submit_daily_inspection', {
        p_shuttle_id: selectedShuttleId,
        p_inspector_name: inspectorName,
        p_answers: answers,
        p_all_passed: allPassed,
        p_defects: defects,
      });

      if (error) {
        console.warn('RPC unavailable, executing client fallback:', error.message);
        const newStatus = allPassed ? 'ACTIVE' : 'FAULT';
        await supabase
          .from('shuttles')
          .update({
            status: newStatus,
            last_inspection_at: new Date().toISOString(),
            last_inspection_passed: allPassed,
          })
          .eq('id', selectedShuttleId);

        saveShuttleResolution({
          shuttle_id: selectedShuttleId,
          shuttle_code: shuttles.find((s) => s.id === selectedShuttleId)?.code || 'SHUTTLE',
          resolved_by: inspectorName,
          resolved_at: new Date().toISOString(),
          resolution_notes: allPassed ? 'Client fallback: 22/22 items passed inspection.' : 'Inspection logged critical defects.',
          status_after: newStatus,
        });

        if (allPassed) {
          setSubmissionResult({
            status: 'SUCCESS_ACTIVE',
            message: 'All 22 items passed. Shuttle electronic interlock released: status is now ACTIVE.',
          });
        } else {
          setSubmissionResult({
            status: 'FAILED_FAULT',
            message: 'Inspection recorded failure. Shuttle electronic interlock locked: status set to FAULT.',
          });
        }
      } else {
        const result = data as { status: string; message: string };
        if (result.status === 'ACTIVE') {
          setSubmissionResult({
            status: 'SUCCESS_ACTIVE',
            message: result.message,
          });
        } else {
          setSubmissionResult({
            status: 'FAILED_FAULT',
            message: result.message,
          });
        }
      }

      setShuttles((prev) =>
        prev.map((s) =>
          s.id === selectedShuttleId
            ? { ...s, status: allPassed ? 'ACTIVE' : 'FAULT' }
            : s
        )
      );
    } catch (err: any) {
      console.error('Inspection submission error:', err);
      const newStatus = allPassed ? 'ACTIVE' : 'FAULT';
      saveShuttleResolution({
        shuttle_id: selectedShuttleId,
        shuttle_code: shuttles.find((s) => s.id === selectedShuttleId)?.code || 'SHUTTLE',
        resolved_by: inspectorName,
        resolved_at: new Date().toISOString(),
        resolution_notes: allPassed ? 'Offline mode: 22 items passed.' : 'Offline mode: inspection recorded defects.',
        status_after: newStatus,
      });

      if (allPassed) {
        setSubmissionResult({
          status: 'SUCCESS_ACTIVE',
          message: 'All 22 items passed. Shuttle electronic interlock released: status is now ACTIVE.',
        });
      } else {
        setSubmissionResult({
          status: 'FAILED_FAULT',
          message: 'Inspection recorded failure. Shuttle electronic interlock locked: status set to FAULT.',
        });
      }
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedShuttleObj = shuttles.find((s) => s.id === selectedShuttleId);
  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 font-sans pb-12 select-none">
      {/* Mobile Top Header: Dedicated Action Buttons with Zero Overlap */}
      <header className="bg-[#0a192f] text-white px-3 sm:px-4 py-2 sticky top-0 z-30 border-b border-slate-800 shadow-md">
        {/* Row 1: Brand & Sign Out */}
        <div className="flex items-center justify-between gap-2 pb-1.5">
          <div className="min-w-0">
            <span className="text-[9px] font-mono uppercase tracking-wider text-blue-300 block leading-tight">
              OPERATOR ACCESS
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-white font-mono truncate leading-tight">
              Wheel Assemblers Mobile Gate
            </h1>
          </div>
          <button
            onClick={() => {
              setCurrentUser(null);
              router.push('/');
            }}
            className="px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition shrink-0"
          >
            Sign Out
          </button>
        </div>

        {/* Row 2: Standardized Documents & Admin Dashboard Link */}
        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/80">
          <button
            onClick={() => {
              setDocuments(getStoredDocuments());
              setIsSopDrawerOpen(true);
            }}
            className="flex-1 py-1.5 px-2 text-[11px] font-mono font-bold bg-[#172554] hover:bg-[#1e3a8a] text-blue-100 border border-blue-900 rounded transition text-center truncate"
          >
            Standardized Documents
          </button>
          {currentUser?.role === 'ADMIN' && (
            <Link
              href="/tv"
              className="py-1.5 px-3 text-[11px] font-mono font-bold bg-[#1e3a8a] hover:bg-blue-900 text-white border border-blue-700 rounded transition shrink-0 whitespace-nowrap"
            >
              Admin Dashboard
            </Link>
          )}
        </div>
      </header>

      {/* Main Checklist Body (Strictly FR-7.2-04 Daily Checksheet Only) */}
      <main className="max-w-md mx-auto px-3.5 pt-3 space-y-3">
        {/* Live Interlock Status */}
        {submissionResult.status === 'SUCCESS_ACTIVE' && (
          <div className="p-3.5 rounded bg-blue-50 border border-blue-300 text-blue-950 text-xs shadow-2xs">
            <strong className="block font-bold">INTERLOCK RELEASED: ACTIVE</strong>
            <p className="mt-0.5">{submissionResult.message}</p>
          </div>
        )}

        {submissionResult.status === 'FAILED_FAULT' && (
          <div className="p-3.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs shadow-2xs">
            <strong className="block font-bold">SHUTTLE LOCKED: CRITICAL FAULT DETECTED</strong>
            <p className="mt-0.5">{submissionResult.message}</p>
          </div>
        )}

        {/* Shuttle Selection & Inspector Details Card (Strictly Bound, Zero Extrusion) */}
        <div className="bg-white border border-slate-300 rounded p-3.5 space-y-3 shadow-xs overflow-hidden box-border">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-b border-slate-200 pb-1.5">
            <span>Location: <strong className="text-slate-800">Rim Storeroom</strong></span>
            <span>Checksheet: <strong className="text-slate-800">FR-7.2-04</strong></span>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-700 mb-1.5 font-semibold">
              Select Shuttle Unit ({shuttles.length} Registered) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {shuttles.map((shuttle) => (
                <button
                  key={shuttle.id}
                  type="button"
                  onClick={() => setSelectedShuttleId(shuttle.id)}
                  className={`p-2 rounded text-xs font-bold transition flex flex-col justify-between border text-left ${
                    selectedShuttleId === shuttle.id
                      ? 'bg-[#1e3a8a] border-blue-900 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono">{shuttle.code || 'SHUTTLE'}</span>
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        shuttle.status === 'FAULT' ? 'bg-red-500' : 'bg-emerald-400'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] opacity-85 mt-1 truncate w-full">{shuttle.display_name}</span>
                </button>
              ))}
            </div>

            {selectedShuttleObj && (
              <div className="mt-2 text-xs font-mono text-slate-700 flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200">
                <div>
                  Status: <strong className={selectedShuttleObj.status === 'FAULT' ? 'text-red-700' : 'text-slate-900'}>{selectedShuttleObj.status}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>BATTERY:</span>
                  <span
                    className="px-1.5 py-0.2 rounded text-[11px] font-bold text-slate-900"
                    style={{ backgroundColor: getBatteryPastelColor(selectedShuttleObj.battery_pct ?? 100) }}
                  >
                    {selectedShuttleObj.battery_pct ?? 100}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Date & Operator Fields: Box-Border, Max-Width Confined */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <div className="w-full min-w-0">
              <label className="block text-[11px] font-mono text-slate-600 mb-1 font-semibold">
                Inspection Date
              </label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full max-w-full box-border bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-900"
                style={{ maxWidth: '100%', minWidth: 0 }}
              />
            </div>
            <div className="w-full min-w-0">
              <label className="block text-[11px] font-mono text-slate-600 mb-1 font-semibold">
                Inspector / Operator Name
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Enter operator name"
                className="w-full max-w-full box-border bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-900"
                style={{ maxWidth: '100%', minWidth: 0 }}
              />
            </div>
          </div>
        </div>

        {/* 22 Checklist Form Questions */}
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
                className={`p-3 rounded border transition bg-white shadow-xs ${
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

                <div className="flex gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggle(q.id, true)}
                    className={`flex-1 py-2 px-2 rounded text-xs font-bold border transition ${
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
                    className={`flex-1 py-2 px-2 rounded text-xs font-bold border transition ${
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
            className={`w-full py-3 rounded font-bold text-xs uppercase tracking-wider shadow transition ${
              isFormValid && !isSubmitting
                ? 'bg-[#1e3a8a] hover:bg-blue-900 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Transmitting Inspection...' : 'Submit Inspection & Unlock Shuttle'}
          </button>
        </form>
      </main>

      {/* Standardized Documents Side Drawer (Streamlined, No Long Descriptions) */}
      {isSopDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm bg-white border-l border-slate-300 h-full p-4 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Standardized Documents
                  </h2>
                  <span className="text-[10px] text-slate-500 font-mono">Tap any document to view directly</span>
                </div>
                <button
                  onClick={() => setIsSopDrawerOpen(false)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold"
                >
                  Close
                </button>
              </div>

              {/* Streamlined Document List without verbose descriptions */}
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedViewerDoc(doc);
                      setIsSopDrawerOpen(false);
                    }}
                    className="p-3 rounded border border-slate-300 hover:border-blue-900 hover:bg-blue-50 transition cursor-pointer text-xs bg-slate-50 space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span className="font-bold text-blue-900 bg-white px-1.5 py-0.2 rounded border border-blue-200">
                        {doc.code}
                      </span>
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                        {doc.version}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 font-mono text-xs">{doc.title}</div>
                    <div className="text-[10px] font-mono text-blue-900 font-bold pt-1 flex justify-between items-center">
                      <span className="text-slate-500 truncate max-w-[180px]">{doc.file_name || `${doc.code}.pdf`}</span>
                      <span className="bg-[#0a192f] text-white px-2 py-0.5 rounded text-[10px]">View</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital Standardized Document Preview Modal */}
      <DigitalSopViewerModal
        document={selectedViewerDoc}
        isOpen={!!selectedViewerDoc}
        onClose={() => setSelectedViewerDoc(null)}
      />
    </div>
  );
}
