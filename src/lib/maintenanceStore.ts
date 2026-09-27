'use client';

export interface MaintenanceTask {
  id: string;
  shuttle: 'Shuttle 1' | 'Shuttle 2' | 'All Shuttles';
  task_title: string;
  component: string;
  trigger_type: 'USAGE_ODOMETER' | 'USAGE_CYCLES' | 'CALENDAR_DAYS' | 'PREVENTATIVE';
  threshold_metric: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  due_date: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  assigned_to: string;
  scheduled_by: string;
  instructions: string;
  completed_at?: string;
  completed_by?: string;
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

const STORAGE_KEY = 'wa_maintenance_schedule_v1';

export function getStoredMaintenanceTasks(): MaintenanceTask[] {
  if (typeof window === 'undefined') return INITIAL_MAINTENANCE_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MAINTENANCE_TASKS));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
          completed_by: newStatus === 'COMPLETED' ? completedBy || 'Shift Operator' : undefined,
        }
      : t
  );
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}
