'use client';

export interface DocumentStep {
  step_number: string;
  title: string;
  description: string;
  image_ref?: string;
  safety_note?: string;
}

export interface DocumentItem {
  id: string;
  code: string;
  title: string;
  type: 'SOP' | 'FMEA' | 'SPL' | 'CHECKSHEET';
  category: string;
  version: string;
  uploaded_at: string;
  uploaded_by: string;
  file_name?: string;
  image_url?: string;
  description: string;
  critical_point?: string;
  reason?: string;
  matters_to_obey?: string[];
  reaction_plan?: string;
  steps?: DocumentStep[];
}

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-spl-026',
    code: 'SPL-026',
    title: 'Single Point Lesson No:026 - Shuttle Collision Prevention',
    type: 'SPL',
    category: 'Shuttle Operations & Collision Prevention',
    version: 'Rev 01 (13.03.2026)',
    uploaded_at: '2026-03-13T08:00:00.000Z',
    uploaded_by: 'S. van Schoor (Quality Dept)',
    file_name: 'SPL-026_Shuttle_Collision_Prevention.png',
    image_url: '/docs/spl-026-collision-prevention.png',
    description: 'Workstation: Rim Storage New. Process: Check shuttle is in DOWN position before automated command. Frequency: 100%. Part: All rims.',
    critical_point: 'Ensuring that the shuttle is fully in the lowered position and no alarms are being displayed on the remote.',
    reason: 'To ensure that no accidental pallet collisions occur when an automated command is given to the shuttle.',
    matters_to_obey: [
      '1. Ensure railing on the applicable cavity is completely clear of any obstructions (plastic, wood pieces, etc.)',
      '2. Ensure shuttle is fitted correctly into the applicable racking cavity.',
      '3. Ensure shuttle is lowered completely in the DOWN position.',
      '4. Ensure correct shuttle is selected on the remote.',
      '5. Ensure shuttle is clear of any alarms.',
    ],
    reaction_plan: 'Notify Quality Manager or Quality Inspector should any nonconformance be experienced.',
    steps: [
      {
        step_number: '1',
        title: 'Check Racking Railing Clearance',
        description: 'Visually verify that cavity railings are 100% free of debris, wood splinters, stretch wrap, or fallen dunnage before introducing the shuttle.',
      },
      {
        step_number: '2',
        title: 'Confirm Shuttle Seating',
        description: 'Inspect guide wheels to ensure the shuttle is squarely seated on the cavity profile rails.',
      },
      {
        step_number: '3',
        title: 'Verify Fully DOWN State',
        description: 'Verify lifting deck is completely retracted in the lowered DOWN position before transmitting run commands.',
      },
      {
        step_number: '4',
        title: 'Verify RF Remote Selection & Zero Alarms',
        description: 'Confirm the remote display matches the shuttle ID (Shuttle 1 or Shuttle 2) and display screen has no active fault flags.',
      },
    ],
  },
  {
    id: 'doc-wi-inbound',
    code: 'WI NL.RW001 (Inbound)',
    title: 'Work Instruction - Warehousing of Rims (Inbound Operations)',
    type: 'SOP',
    category: 'Inbound Warehouse Operations',
    version: 'Rev 3 (08.01.2026)',
    uploaded_at: '2026-01-08T08:00:00.000Z',
    uploaded_by: 'LeeRoy Adams / Sebastian van Schoor',
    file_name: 'WI_NL.RW001_Inbound_Operations.png',
    image_url: '/docs/wi-inbound-operations.png',
    description: 'Standard work instruction for rim intake, POD verification, SAP barcode scanning, loading bay positioning, and automated shelving.',
    critical_point: 'The Rim is an expensive part - always handle with caution and do not cause scratches or damage to the rim.',
    reason: 'Maintain 100% Right-First-Time quality and avoid inventory discrepancies in SAP.',
    matters_to_obey: [
      'The Rim is an expensive part - always use part with caution and do not cause scratches or any damage to the rim.',
      'Ensure Shuttle is in Waiting position away from Loading bay before inserting pallet.',
      'In case of Emergency: Immediately press STOP on remote or E-Stop on shuttle.',
    ],
    reaction_plan: 'In case of an Emergency, immediately hit the STOP button on the remote or the red E-Stop button on the front bumper of the shuttle.',
    steps: [
      {
        step_number: '1.1',
        title: 'Verify POD & SAP ASN',
        description: 'Verify quantity on the POD versus actual stock received. Receive ASN on Forward system and SAP.',
        image_ref: 'Picture 1',
      },
      {
        step_number: '1.2',
        title: 'Attach Serial Printed Barcode',
        description: 'Attach the serial printed barcode label with total quantity and part number to the rim pallet.',
        image_ref: 'Picture 2',
      },
      {
        step_number: '1.3',
        title: 'Prepare Row & Shuttle Position',
        description: 'Ensure shuttle is loaded into correct Storage Row in Waiting position, safely away from loading bay entrance.',
        image_ref: 'Picture 3',
      },
      {
        step_number: '1.4',
        title: 'Load Pallet & Scan Barcode',
        description: 'Forklift loads pallet into loading bay of row. Scan serial barcode and row allocation on handheld scanner.',
        image_ref: 'Picture 4, 5, 6',
      },
      {
        step_number: '1.5',
        title: 'Send Automated Shelving Command',
        description: 'Press green IN shelving button on remote for shuttle to store pallet. Repeat until row is full/shelving complete.',
        image_ref: 'Picture 7, 8',
      },
      {
        step_number: '1.6',
        title: 'Compact Row (Shuffle Command)',
        description: 'If there are any gaps in row, press "shuffle" button on remote to compact pallets together. Move shuttle to next row.',
        image_ref: 'Picture 9',
      },
    ],
  },
  {
    id: 'doc-wi-outbound',
    code: 'WI NL.RW001 (Outbound)',
    title: 'Work Instruction - Warehousing of Rims (Outbound Operations)',
    type: 'SOP',
    category: 'Outbound Warehouse Operations',
    version: 'Rev 3 (08.01.2026)',
    uploaded_at: '2026-01-08T08:00:00.000Z',
    uploaded_by: 'LeeRoy Adams / Sebastian van Schoor',
    file_name: 'WI_NL.RW001_Outbound_Operations.png',
    image_url: '/docs/wi-outbound-operations.png',
    description: 'Picking procedure for single and multi-pallet outbound orders, RF scanner verification, WIP transfer, and row reshuffling.',
    critical_point: 'Maintain zero cosmetic damage on rim faces; verify batch allocation before taking pallets to assembly WIP.',
    reason: 'Prevent line stoppages and sequence mismatch on the automated assembly line.',
    matters_to_obey: [
      'The Rim is an expensive part - always use part with caution and do not cause scratches or any damage to the rim.',
      'Always ensure more than one pallet gap exists before initiating tunnel reshuffle.',
      'In case of Emergency: Immediately press STOP button on remote or the E-Stop on the shuttle.',
    ],
    reaction_plan: 'Hit emergency stop immediately if pallet shifts out of alignment on the guide rails.',
    steps: [
      {
        step_number: '1.1.1 - 1.1.2',
        title: 'Picking Slip Verification & Scanner Issue',
        description: 'Verify rim type and quantity on Picking Slip. Select "Issue to Order" on handheld scanner and scan picking slip barcode.',
        image_ref: 'Picture 1, 2',
      },
      {
        step_number: '1.1.3 - 1.1.4',
        title: 'Scan Rack Barcode & Pallet Batch',
        description: 'Scan rack barcode matching required rim type. Scan batch barcode on pallet and enter pallet quantity into scanner.',
        image_ref: 'Picture 3, 4',
      },
      {
        step_number: '1.1.5',
        title: 'Transport to Assembly WIP',
        description: 'Safely retrieve pallet with pallet jack or forklift and transport to Wheel Assembly WIP.',
        image_ref: 'Picture 5',
      },
      {
        step_number: '1.2.1 - 1.2.3',
        title: 'Continuous Multi-Pallet Outbound Command',
        description: 'Using Remote 2, press "OUT" for 1 pallet or double-arrow button for continuous automatic offloading.',
        image_ref: 'Picture 6, 7, 8',
      },
      {
        step_number: '2.1 - 2.3',
        title: 'Reshuffling Pallets to Front',
        description: 'When picking creates front tunnel gaps, press "reshuffle" button to pull back deep pallets flush to the front offloading face.',
        image_ref: 'Picture 9',
      },
    ],
  },
  {
    id: 'doc-fr-7.2-03',
    code: 'FR-7.2-03',
    title: 'Weekly Pallet Rack Inspection Sheet 1 & 2',
    type: 'CHECKSHEET',
    category: 'Weekly Structural Rack Inspection',
    version: 'Rev 01 (20.01.2026)',
    uploaded_at: '2026-01-20T08:00:00.000Z',
    uploaded_by: 'Operations Manager & ISO Management Rep',
    file_name: 'FR-7.2-03_Weekly_Rack_Inspection.png',
    image_url: '/docs/fr-7.2-03-weekly-rack-sheet-1.png',
    description: 'Weekly mandatory structural safety audit covering 13 active cavities (G-00 to L-01) for uprights, diagonals, shims, anchors, brackets, and guide rails.',
    critical_point: 'Identify upright deformation (Green/Amber/Red), loose anchor bolts, and rail misalignment before structural failure.',
    reason: 'ISO 9001 compliance and BMW Tier-1 plant structural racking safety standards.',
    matters_to_obey: [
      'Inspect every cavity individually from rear loading area and front picking area.',
      'Red condition on uprights requires immediate isolation of the storage lane.',
      'Check floor for cracks and verify guide rail stopper integrity.',
    ],
    reaction_plan: 'Red tag lane immediately, inform Warehouse Manager, and lock shuttle entry into affected cavity.',
    steps: [
      {
        step_number: 'Sheet 1',
        title: 'Loading Area (Rear) Uprights & Anchors',
        description: 'Audit uprights (Green/Amber/Red), diagonal bracing, leveling shims, anchor bolts, upright tilt, stoppers, and lane markings for cavities G-00 through L-01.',
      },
      {
        step_number: 'Sheet 2',
        title: 'Brackets & Rail Integrity (Rear & Front)',
        description: 'Check bracket condition (Green/Amber/Red), rail supports, centering rails, guide rails, and rail stoppers (Right & Left sides).',
      },
      {
        step_number: 'General',
        title: 'General Facility Operation Check',
        description: 'Inspect for deformed protections, floor cracks, missing bolts/nuts, damaged pallets, and damaged safety signage.',
      },
    ],
  },
  {
    id: 'doc-fr-7.2-04',
    code: 'FR-7.2-04',
    title: 'Daily High Bay Racking Shuttle Inspection SOP',
    type: 'SOP',
    category: 'Daily Operator Pre-Shift Safety',
    version: 'Rev 02 (2026)',
    uploaded_at: '2026-01-15T08:00:00.000Z',
    uploaded_by: 'Plant Operations',
    file_name: 'FR-7.2-04_Shuttle_Daily_Inspection.pdf',
    description: 'Mandatory 22-question visual and mechanical checklist. Must be signed off before shuttle interlock unlocks for the shift.',
    critical_point: 'All 22 safety items must pass. Any "NO" requires technical comments and flags safety supervisor.',
    reason: 'Pre-operational verification prevents in-lane derailment and electrical fires.',
    matters_to_obey: [
      'Inspection must be performed at beginning of each shift before automated dispatch.',
      'Do not bypass the electronic interlock.',
    ],
  },
];

const STORAGE_KEY = 'wa_documents_db_v3';

export function getStoredDocuments(): DocumentItem[] {
  if (typeof window === 'undefined') return INITIAL_DOCUMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DOCUMENTS));
      return INITIAL_DOCUMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DOCUMENTS;
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
