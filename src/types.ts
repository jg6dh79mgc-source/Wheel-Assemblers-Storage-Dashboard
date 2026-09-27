export type ShuttleStatus = 'LOCKED_PENDING_INSPECTION' | 'ACTIVE' | 'FAULT' | 'MAINTENANCE';

export interface Shuttle {
  id: string;
  code: string;
  display_name: string;
  status: ShuttleStatus;
  battery_pct: number;
  current_bay?: string;
  is_charging?: boolean;
  odometer_meters: number;
  lifting_cycles: number;
  charge_cycles: number;
  last_sensor_clean_at: string;
  last_inspection_at?: string;
  last_inspection_passed?: boolean;
}

export interface Operator {
  id: string;
  username: string;
  name: string;
  role: 'OPERATOR' | 'ADMIN' | 'MAINTENANCE_TECH';
  shift?: string;
  active: boolean;
  created_at: string;
}

export interface InspectionCheckItem {
  id: number;
  text: string;
  status: 'YES' | 'NO' | null;
  comment: string;
}

export interface MaintenanceGauges {
  shuttle_id: string;
  code: string;
  display_name: string;
  wheel_wear_pct: number;
  wheel_service_due: boolean;
  lift_grease_wear_pct: number;
  lift_grease_due: boolean;
  battery_degradation_pct: number;
  battery_replacement_warning: boolean;
  days_since_sensor_clean: number;
  sensor_cleaning_due: boolean;
  pm_due_within_24h: boolean;
  inspection_missing_alert: boolean;
}
