'use client';

import { supabase } from './supabaseClient';

export interface MaintenanceTask {
  id: string;
  shuttle: string;
  task_title: string;
  component?: string;
  trigger_type?: 'USAGE_ODOMETER' | 'USAGE_CYCLES' | 'CALENDAR_DAYS' | 'PREVENTATIVE';
  threshold_metric?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  due_date?: string;
  scheduled_for?: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  assigned_to: string;
  scheduled_by?: string;
  instructions?: string;
  description?: string;
  completed_at?: string;
  completed_by?: string;
}

export interface ShuttleResolutionRecord {
  shuttle_id: string;
  shuttle_code?: string;
  inspection_passed?: boolean;
  status?: 'ACTIVE' | 'LOCKED_PENDING_INSPECTION' | 'FAULT';
  status_after?: 'ACTIVE' | 'LOCKED_PENDING_INSPECTION' | 'FAULT';
  technician_name?: string;
  resolved_by?: string;
  resolved_at: string;
  notes?: string;
  resolution_notes?: string;
}

export interface SensorResolutionRecord {
  shuttle_id: string;
  cleaned: boolean;
  technician_name: string;
  cleaned_at: string;
  notes?: string;
}

export const INITIAL_MAINTENANCE_TASKS: MaintenanceTask[] = [
  {
    id: 'maint-01',
    shuttle: 'Shuttle 1',
    task_title: 'Drive Wheel Tread & Wear Inspection',
    component: 'Polyurethane Drive Wheels',
    trigger_type: 'USAGE_ODOMETER',
    threshold_metric: '8,840 km / 10,000 km target',
    status: 'PENDING',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    priority: 'HIGH',
    assigned_to: 'Maintenance Team',
    scheduled_by: 'Plant Administrator',
    instructions: 'Measure tread depth across all 4 wheels. Clean aluminum debris from guide flanges.',
  },
  {
    id: 'maint-02',
    shuttle: 'Shuttle 2',
    task_title: 'H1/H2 Optical Sensor Cleaning & Alignment',
    component: 'Optical Distance & Stop Sensors',
    trigger_type: 'CALENDAR_DAYS',
    threshold_metric: '7-Day Interval (8 Days Elapsed - Overdue)',
    status: 'PENDING',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'CRITICAL',
    assigned_to: 'Shift Operator',
    scheduled_by: 'Plant Administrator',
    instructions: 'Wipe front and rear optical lenses with alcohol swab. Test hand gesture trigger response.',
  },
  {
    id: 'maint-03',
    shuttle: 'Shuttle 2',
    task_title: 'Lifting Channel Greasing & Roller Check',
    component: 'Lifting Scissor Mechanism',
    trigger_type: 'USAGE_CYCLES',
    threshold_metric: '96,800 cycles / 100,000 cycles',
    status: 'IN_PROGRESS',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'HIGH',
    assigned_to: 'Shift Operator',
    scheduled_by: 'Plant Administrator',
    instructions: 'Apply industrial lithium grease to lifting guide channels. Check for uniform lift clearance.',
  },
];

const STORAGE_KEY_TASKS = 'wa_maintenance_schedule_v2';
const STORAGE_KEY_SHUTTLE_RES = 'wa_shuttle_resolutions_v2';
const STORAGE_KEY_SENSOR_RES = 'wa_sensor_resolutions_v2';

export function getStoredMaintenanceTasks(): MaintenanceTask[] {
  if (typeof window === 'undefined') return INITIAL_MAINTENANCE_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(INITIAL_MAINTENANCE_TASKS));
      return INITIAL_MAINTENANCE_TASKS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MAINTENANCE_TASKS;
  }
}

export function saveMaintenanceTask(task: Omit<MaintenanceTask, 'id'>): MaintenanceTask {
  const current = getStoredMaintenanceTasks();
  const newTask: MaintenanceTask = {
    ...task,
    id: `maint-${Date.now()}`,
  };
  const updated = [newTask, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
  }
  return newTask;
}

export function updateMaintenanceTaskStatus(
  taskId: string,
  newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
  completedBy?: string
) {
  const current = getStoredMaintenanceTasks();
  const updated = current.map((t) =>
    t.id === taskId
      ? {
          ...t,
          status: newStatus,
          completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
          completed_by: newStatus === 'COMPLETED' ? completedBy || 'Shift Technician' : undefined,
        }
      : t
  );
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
  }

  // If this task was the optical sensor cleaning task, also resolve the sensor emergency
  if (taskId === 'maint-02' && newStatus === 'COMPLETED') {
    resolveSensorCleaning('2', completedBy || 'Shift Technician');
  }

  return updated;
}

// Shuttle Inspection Resolution Management
export function getStoredShuttleResolution(shuttleId: string): ShuttleResolutionRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHUTTLE_RES);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[shuttleId] || null;
  } catch {
    return null;
  }
}

export function saveShuttleResolution(record: ShuttleResolutionRecord) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHUTTLE_RES);
    const all = raw ? JSON.parse(raw) : {};
    all[record.shuttle_id] = record;
    localStorage.setItem(STORAGE_KEY_SHUTTLE_RES, JSON.stringify(all));

    // Also update Supabase shuttle status if table exists
    try {
      supabase.from('shuttles').update({
        status: record.status,
        last_inspection_passed: record.inspection_passed,
      }).eq('id', record.shuttle_id);
    } catch {}
  } catch {}
}

// Sensor Cleaning Resolution Management
export function getStoredSensorResolution(shuttleId: string): SensorResolutionRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENSOR_RES);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[shuttleId] || null;
  } catch {
    return null;
  }
}

export function resolveSensorCleaning(shuttleId: string, technicianName: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENSOR_RES);
    const all = raw ? JSON.parse(raw) : {};
    all[shuttleId] = {
      shuttle_id: shuttleId,
      cleaned: true,
      technician_name: technicianName,
      cleaned_at: new Date().toISOString(),
      notes: 'Lenses wiped with alcohol swab. Gesture trigger response verified.',
    };
    localStorage.setItem(STORAGE_KEY_SENSOR_RES, JSON.stringify(all));

    // Also update task if pending
    const tasks = getStoredMaintenanceTasks();
    const sensorTask = tasks.find(t => t.id === 'maint-02');
    if (sensorTask && sensorTask.status !== 'COMPLETED') {
      sensorTask.status = 'COMPLETED';
      sensorTask.completed_at = new Date().toISOString();
      sensorTask.completed_by = technicianName;
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    }
  } catch {}
}
