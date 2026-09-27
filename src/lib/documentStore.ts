'use client';

export interface DocumentItem {
  id: string;
  code: string;
  title: string;
  type: 'SOP' | 'FMEA';
  category: string;
  version: string;
  uploaded_at: string;
  uploaded_by: string;
  file_name?: string;
  file_url?: string;
  description: string;
}

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-sop-01',
    code: 'FR-7.2-04',
    title: 'Daily High Bay Racking Shuttle Inspection SOP',
    type: 'SOP',
    category: 'Pre-Operational Safety',
    version: 'v3.2',
    uploaded_at: new Date().toISOString(),
    uploaded_by: 'Plant Administrator',
    file_name: 'FR-7.2-04_Shuttle_Inspection.pdf',
    description: '22-point daily mandatory pre-shift inspection interlock procedure for multi-directional shuttles.',
  },
  {
    id: 'doc-sop-02',
    code: 'SOP-E-STOP-01',
    title: 'Emergency Stop & Deep-Lane Recovery Protocol',
    type: 'SOP',
    category: 'Emergency & Safety',
    version: 'v2.1',
    uploaded_at: new Date().toISOString(),
    uploaded_by: 'Plant Administrator',
    file_name: 'SOP-E-STOP-01_Recovery.pdf',
    description: 'Safety lock-out, tag-out, and manual RF retrieval protocols for shuttles stalled inside 29-deep bays.',
  },
  {
    id: 'doc-fmea-01',
    code: 'FMEA-SHUTTLE-RACK-004',
    title: 'Deep-Lane Automated Shuttle Racking FMEA Matrix',
    type: 'FMEA',
    category: 'Reliability Engineering',
    version: 'v4.0',
    uploaded_at: new Date().toISOString(),
    uploaded_by: 'Plant Administrator',
    file_name: 'FMEA-SHUTTLE-RACK-004.pdf',
    description: 'Process Failure Mode & Effects Analysis covering polyurethane drive wheels, lifting channels, and sensor degradation.',
  },
];

const STORAGE_KEY = 'wa_documents_db_v1';

export function getStoredDocuments(): DocumentItem[] {
  if (typeof window === 'undefined') return INITIAL_DOCUMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DOCUMENTS));
      return INITIAL_DOCUMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DOCUMENTS;
  }
}

export function saveDocument(item: Omit<DocumentItem, 'id' | 'uploaded_at'>): DocumentItem {
  const current = getStoredDocuments();
  const newDoc: DocumentItem = {
    ...item,
    id: `doc-${Date.now()}`,
    uploaded_at: new Date().toISOString(),
  };
  const updated = [newDoc, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return newDoc;
}
