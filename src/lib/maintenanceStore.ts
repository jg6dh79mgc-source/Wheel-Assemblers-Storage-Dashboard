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
    assigned_to: 'Shift Technician',
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
    assigned_to: 'Shift Technician',
    scheduled_by: 'Plant Administrator',
    instructions: 'Apply industrial lithium grease to lifting guide channels. Check for uniform lift clearance.',
  },
];

const STORAGE_KEY_TASKS = 'wa_maintenance_schedule_v2';
const STORAGE_KEY_SHUTTLE_RES = 'wa_shuttle_resolutions_v2';
const STORAGE_KEY_SENSOR_RES = 'wa_sensor_resolutions_v2';

function dispatchSyncEvent(type: string, detail?: any) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('wa-maintenance-sync', { detail: { type, ...detail } }));
    } catch {}
  }
}

export function getStoredMaintenanceTasks(): MaintenanceTask[] {
  if (typeof window === 'undefined') return INITIAL_MAINTENANCE_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(INITIAL_MAINTENANCE_TASKS));
      return INITIAL_MAINTENANCE_TASKS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MAINTENANCE_TASKS;
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
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
    } catch {}
    dispatchSyncEvent('task-added', { task: newTask });
  }
  return newTask;
}

export function deleteMaintenanceTask(taskId: string): MaintenanceTask[] {
  const current = getStoredMaintenanceTasks();
  const updated = current.filter((t) => t.id !== taskId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
    } catch {}
    dispatchSyncEvent('task-deleted', { taskId });
  }
  return updated;
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
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(updated));
    } catch {}
    dispatchSyncEvent('task-status-changed', { taskId, newStatus, completedBy });
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
    return all[shuttleId] || all['1'] || all['SHUTTLE-01'] || null;
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
    all['1'] = record;
    if (record.shuttle_code) {
      all[record.shuttle_code] = record;
    }
    localStorage.setItem(STORAGE_KEY_SHUTTLE_RES, JSON.stringify(all));
    dispatchSyncEvent('shuttle-resolved', { record });

    // Also update Supabase shuttle status if table exists
    try {
      supabase
        .from('shuttles')
        .update({
          status: record.status || record.status_after || 'ACTIVE',
          last_inspection_passed: record.inspection_passed ?? true,
          last_inspection_at: record.resolved_at || new Date().toISOString(),
        })
        .or(`id.eq.${record.shuttle_id},code.eq.${record.shuttle_code || 'SHUTTLE-01'}`);
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
    return all[shuttleId] || all['2'] || all['SHUTTLE-02'] || null;
  } catch {
    return null;
  }
}

export function resolveSensorCleaning(shuttleId: string, technicianName: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENSOR_RES);
    const all = raw ? JSON.parse(raw) : {};
    const record = {
      shuttle_id: shuttleId,
      cleaned: true,
      technician_name: technicianName,
      cleaned_at: new Date().toISOString(),
      notes: 'Lenses wiped with alcohol swab. Gesture trigger response verified.',
    };
    all[shuttleId] = record;
    all['2'] = record;
    all['SHUTTLE-02'] = record;
    localStorage.setItem(STORAGE_KEY_SENSOR_RES, JSON.stringify(all));

    // Also update Supabase shuttles table
    try {
      supabase
        .from('shuttles')
        .update({
          last_sensor_clean_at: new Date().toISOString(),
        })
        .or(`id.eq.${shuttleId},code.eq.SHUTTLE-02`);
    } catch {}

    // Also update task if pending
    const tasks = getStoredMaintenanceTasks();
    const sensorTask = tasks.find((t) => t.id === 'maint-02');
    if (sensorTask && sensorTask.status !== 'COMPLETED') {
      sensorTask.status = 'COMPLETED';
      sensorTask.completed_at = new Date().toISOString();
      sensorTask.completed_by = technicianName;
      try {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
      } catch {}
    }
    dispatchSyncEvent('sensor-cleaned', { shuttleId, technicianName });
  } catch {}
}
