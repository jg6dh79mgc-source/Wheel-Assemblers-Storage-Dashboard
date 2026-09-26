-- ============================================================================
-- WHEEL ASSEMBLERS: HIGH-BAY SHUTTLE AUTOMATION & MAINTENANCE DATABASE SCHEMA
-- Target Database: PostgreSQL 15+ (Supabase)
-- Author: Industrial Engineering Digital Systems Team
-- ============================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE shuttle_status_enum AS ENUM (
    'LOCKED_PENDING_INSPECTION',
    'ACTIVE',
    'FAULT',
    'MAINTENANCE'
);

CREATE TYPE sku_category_enum AS ENUM (
    'RIM',
    'TIRE',
    'ASSEMBLED_WHEEL'
);

CREATE TYPE pallet_direction_enum AS ENUM (
    'INBOUND',
    'OUTBOUND'
);

-- 2. SHUTTLES TABLE (Master Assets & Telemetry)
CREATE TABLE IF NOT EXISTS shuttles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- 'SHUTTLE-01', 'SHUTTLE-02'
    display_name VARCHAR(100) NOT NULL, -- 'Shuttle 1', 'Shuttle 2'
    status shuttle_status_enum NOT NULL DEFAULT 'LOCKED_PENDING_INSPECTION',
    battery_pct INT NOT NULL DEFAULT 100 CHECK (battery_pct BETWEEN 0 AND 100),
    current_bay VARCHAR(50) DEFAULT 'Bay A-01',
    is_charging BOOLEAN DEFAULT FALSE,
    
    -- Usage-Based Telemetry Gauges
    odometer_meters NUMERIC(12, 2) NOT NULL DEFAULT 0.00,     -- Replacement at 10,000,000 m (10,000 km)
    lifting_cycles INT NOT NULL DEFAULT 0,                     -- Grease at 100,000 cycles
    charge_cycles INT NOT NULL DEFAULT 0,                      -- Warning at 3,000 cycles
    last_sensor_clean_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- Warning every 7 days
    
    last_inspection_at TIMESTAMPTZ,
    last_inspection_passed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INSPECTIONS TABLE (Daily FR-7.2-04 Header)
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shuttle_id UUID NOT NULL REFERENCES shuttles(id) ON DELETE CASCADE,
    form_code VARCHAR(50) NOT NULL DEFAULT 'FR-7.2-04',
    inspector_name VARCHAR(150) NOT NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    total_passed_items INT NOT NULL DEFAULT 0,
    total_failed_items INT NOT NULL DEFAULT 0,
    supervisor_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to quickly check if today's inspection is completed for a shuttle
CREATE UNIQUE INDEX IF NOT EXISTS idx_shuttle_daily_inspection 
ON inspections (shuttle_id, inspection_date);

-- 4. INSPECTION LINE ITEMS (The 22 Checklist Points)
CREATE TABLE IF NOT EXISTS inspection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    item_number INT NOT NULL CHECK (item_number BETWEEN 1 AND 22),
    question_text TEXT NOT NULL,
    is_passed BOOLEAN NOT NULL,
    comment TEXT, -- Mandatory if is_passed is FALSE
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MAINTENANCE LOGS & MATRIX (Usage-based & Preventive Actions)
CREATE TABLE IF NOT EXISTS maintenance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shuttle_id UUID NOT NULL REFERENCES shuttles(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(100) NOT NULL, -- 'WHEEL_REPLACEMENT', 'LIFT_GREASING', 'BATTERY_REPLACE', 'SENSOR_CLEAN'
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'USAGE_LIMIT', -- 'USAGE_LIMIT', 'MANUAL', 'INSPECTION_FAULT'
    odometer_at_service NUMERIC(12,2),
    cycles_at_service INT,
    performed_by VARCHAR(150) NOT NULL,
    work_order_number VARCHAR(100),
    notes TEXT,
    fmea_failure_mode_ref VARCHAR(100) DEFAULT 'FM-SH-001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CAVITY UTILIZATION (Deep-Lane High-Density Racking Map)
CREATE TABLE IF NOT EXISTS racking_cavities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bay_number INT NOT NULL,       -- Bay 1 to 12
    level_number INT NOT NULL,     -- Level 1 to 5 (vertical height)
    lane_depth_index INT NOT NULL, -- Depth position 1 to 8 (deep lane)
    sku_category sku_category_enum,
    part_number VARCHAR(100),      -- e.g. 'RIM-18-ALLOY', 'TIRE-225-50-R17'
    is_occupied BOOLEAN NOT NULL DEFAULT FALSE,
    pallet_qr_code VARCHAR(100),
    last_shuttle_movement_at TIMESTAMPTZ,
    UNIQUE(bay_number, level_number, lane_depth_index)
);

-- 7. THROUGHPUT METRICS & LOGS (Inbound / Outbound)
CREATE TABLE IF NOT EXISTS throughput_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shuttle_id UUID REFERENCES shuttles(id),
    direction pallet_direction_enum NOT NULL,
    sku_category sku_category_enum NOT NULL,
    part_number VARCHAR(100),
    pallet_id VARCHAR(100),
    destination_bay INT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. OEE & SHIFT METRICS (Availability, Performance, Quality)
CREATE TABLE IF NOT EXISTS oee_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift_number INT NOT NULL DEFAULT 1,
    planned_production_minutes NUMERIC(6,2) DEFAULT 480.0,
    downtime_minutes NUMERIC(6,2) DEFAULT 24.0,
    takt_time_seconds NUMERIC(6,2) DEFAULT 75.0,        -- Standard target cycle
    actual_cycle_time_seconds NUMERIC(6,2) DEFAULT 82.5, -- Measured shuttle run
    total_pallets_handled INT DEFAULT 320,
    defective_pallet_placements INT DEFAULT 3,
    availability_pct NUMERIC(5,2) GENERATED ALWAYS AS (
        ROUND(((planned_production_minutes - downtime_minutes) / NULLIF(planned_production_minutes, 0)) * 100, 2)
    ) STORED,
    performance_pct NUMERIC(5,2) GENERATED ALWAYS AS (
        ROUND((takt_time_seconds / NULLIF(actual_cycle_time_seconds, 0)) * 100, 2)
    ) STORED,
    quality_pct NUMERIC(5,2) GENERATED ALWAYS AS (
        ROUND(((total_pallets_handled - defective_pallet_placements)::NUMERIC / NULLIF(total_pallets_handled, 0)) * 100, 2)
    ) STORED,
    overall_oee_pct NUMERIC(5,2) GENERATED ALWAYS AS (
        ROUND(
            (((planned_production_minutes - downtime_minutes) / NULLIF(planned_production_minutes, 0)) *
             (takt_time_seconds / NULLIF(actual_cycle_time_seconds, 0)) *
             ((total_pallets_handled - defective_pallet_placements)::NUMERIC / NULLIF(total_pallets_handled, 0))) * 100, 2
        )
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. DIGITAL SOPS CATALOG
CREATE TABLE IF NOT EXISTS standard_operating_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- 'SOP-SH-01', 'FR-7.2-04'
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,   -- 'Pre-Operational', 'Emergency', 'Maintenance'
    pdf_url TEXT,
    markdown_content TEXT,
    version VARCHAR(20) DEFAULT 'v2.4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. BUSINESS LOGIC: VIEWS, FUNCTIONS & STORED PROCEDURES
-- ============================================================================

-- A. USAGE HEALTH GAUGES VIEW
-- Calculates operational wear vs engineering maintenance thresholds
CREATE OR REPLACE VIEW view_shuttle_maintenance_gauges AS
SELECT 
    s.id AS shuttle_id,
    s.code,
    s.display_name,
    s.status,
    s.battery_pct,
    
    -- 1. Wheel Life: 10,000 km threshold (10,000,000 meters)
    s.odometer_meters,
    10000000 AS wheel_life_max_meters,
    ROUND((s.odometer_meters / 10000000.0) * 100, 2) AS wheel_wear_pct,
    (s.odometer_meters >= 9000000) AS wheel_service_due_warning,
    
    -- 2. Lifting Mechanism: Grease at 100,000 cycles
    s.lifting_cycles,
    100000 AS lift_cycles_max,
    ROUND((s.lifting_cycles / 100000.0) * 100, 2) AS lift_grease_wear_pct,
    (s.lifting_cycles >= 95000) AS lift_grease_due_warning,
    
    -- 3. Battery Degradation: Warning at 3,000 full cycles
    s.charge_cycles,
    3000 AS charge_cycles_max,
    ROUND((s.charge_cycles / 3000.0) * 100, 2) AS battery_degradation_pct,
    (s.charge_cycles >= 2700) AS battery_replacement_warning,
    
    -- 4. Sensor Cleanliness: 7 Calendar Days threshold
    s.last_sensor_clean_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - s.last_sensor_clean_at)) / 86400, 1) AS days_since_sensor_clean,
    (EXTRACT(EPOCH FROM (NOW() - s.last_sensor_clean_at)) / 86400 >= 7.0) AS sensor_cleaning_due_warning,
    
    -- Consolidated Maintenance Alert
    (
        (s.odometer_meters >= 9000000) OR
        (s.lifting_cycles >= 95000) OR
        (s.charge_cycles >= 2700) OR
        (EXTRACT(EPOCH FROM (NOW() - s.last_sensor_clean_at)) / 86400 >= 7.0)
    ) AS pm_due_within_24h,
    
    -- Daily Inspection Missing Check
    (
        s.last_inspection_at IS NULL OR 
        s.last_inspection_at::DATE < CURRENT_DATE OR 
        s.last_inspection_passed = FALSE
    ) AS inspection_missing_alert

FROM shuttles s;

-- B. RPC FUNCTION: ATOMIC INSPECTION SUBMISSION & INTERLOCK UNLOCK
-- Called directly from Next.js Mobile View
CREATE OR REPLACE FUNCTION submit_daily_inspection(
    p_shuttle_id UUID,
    p_inspector_name VARCHAR(150),
    p_items JSONB -- Array of { item_number: int, question_text: text, is_passed: bool, comment: text }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inspection_id UUID;
    v_item RECORD;
    v_failed_count INT := 0;
    v_passed_count INT := 0;
    v_overall_passed BOOLEAN;
    v_new_status shuttle_status_enum;
BEGIN
    -- 1. Validate items count (must be exactly 22)
    IF jsonb_array_length(p_items) != 22 THEN
        RAISE EXCEPTION 'Inspection must include all 22 checklist items.';
    END IF;

    -- 2. Count passes & fails and enforce comments on fails
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        item_number INT,
        question_text TEXT,
        is_passed BOOLEAN,
        comment TEXT
    ) LOOP
        IF v_item.is_passed = FALSE THEN
            v_failed_count := v_failed_count + 1;
            IF v_item.comment IS NULL OR TRIM(v_item.comment) = '' THEN
                RAISE EXCEPTION 'Question % failed but has no mandatory comments.', v_item.item_number;
            END IF;
        ELSE
            v_passed_count := v_passed_count + 1;
        END IF;
    END LOOP;

    v_overall_passed := (v_failed_count = 0);

    -- 3. Determine new shuttle status based on Interlock logic
    IF v_overall_passed THEN
        v_new_status := 'ACTIVE';
    ELSE
        v_new_status := 'FAULT';
    END IF;

    -- 4. Insert Master Inspection Record
    INSERT INTO inspections (
        shuttle_id,
        inspector_name,
        inspection_date,
        passed,
        total_passed_items,
        total_failed_items
    )
    VALUES (
        p_shuttle_id,
        p_inspector_name,
        CURRENT_DATE,
        v_overall_passed,
        v_passed_count,
        v_failed_count
    )
    ON CONFLICT (shuttle_id, inspection_date)
    DO UPDATE SET
        inspector_name = EXCLUDED.inspector_name,
        passed = EXCLUDED.passed,
        total_passed_items = EXCLUDED.total_passed_items,
        total_failed_items = EXCLUDED.total_failed_items,
        created_at = NOW()
    RETURNING id INTO v_inspection_id;

    -- 5. Insert or replace line items
    DELETE FROM inspection_items WHERE inspection_id = v_inspection_id;

    INSERT INTO inspection_items (inspection_id, item_number, question_text, is_passed, comment)
    SELECT 
        v_inspection_id,
        (elem->>'item_number')::INT,
        (elem->>'question_text')::TEXT,
        (elem->>'is_passed')::BOOLEAN,
        (elem->>'comment')::TEXT
    FROM jsonb_array_elements(p_items) AS elem;

    -- 6. Execute the Electronic Interlock State Transition
    UPDATE shuttles
    SET 
        status = v_new_status,
        last_inspection_at = NOW(),
        last_inspection_passed = v_overall_passed,
        updated_at = NOW()
    WHERE id = p_shuttle_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'inspection_id', v_inspection_id,
        'shuttle_status', v_new_status,
        'passed', v_overall_passed,
        'total_failed', v_failed_count
    );
END;
$$;

-- C. MIDNIGHT CRON TRIGGER / STORED PROCEDURE (Resets interlock daily)
CREATE OR REPLACE FUNCTION reset_shuttles_daily_interlock()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Every midnight, shuttles revert to LOCKED_PENDING_INSPECTION
    -- unless actively marked under deep repair (FAULT/MAINTENANCE)
    UPDATE shuttles
    SET status = 'LOCKED_PENDING_INSPECTION',
        last_inspection_passed = FALSE,
        updated_at = NOW()
    WHERE status = 'ACTIVE';
END;
$$;

-- ============================================================================
-- 11. SEED DATA FOR DEMO & TESTING
-- ============================================================================

INSERT INTO shuttles (code, display_name, status, battery_pct, odometer_meters, lifting_cycles, charge_cycles, last_sensor_clean_at)
VALUES 
    ('SHUTTLE-01', 'Shuttle 1', 'LOCKED_PENDING_INSPECTION', 94, 8754200.00, 89200, 2410, NOW() - INTERVAL '3 days'),
    ('SHUTTLE-02', 'Shuttle 2', 'ACTIVE', 82, 9320500.00, 96400, 2890, NOW() - INTERVAL '8 days')
ON CONFLICT (code) DO NOTHING;

-- Populate Racking Cavities (12 bays x 5 levels x 4 sample depths)
INSERT INTO racking_cavities (bay_number, level_number, lane_depth_index, sku_category, part_number, is_occupied)
SELECT 
    b, l, d,
    CASE WHEN (b + l + d) % 2 = 0 THEN 'TIRE'::sku_category_enum ELSE 'RIM'::sku_category_enum END,
    CASE WHEN (b + l + d) % 2 = 0 THEN 'TIRE-225-50-R17' ELSE 'RIM-18-ALLOY' END,
    ((b * l + d) % 5 != 0) -- 80% occupancy
FROM generate_series(1, 12) b
CROSS JOIN generate_series(1, 5) l
CROSS JOIN generate_series(1, 4) d
ON CONFLICT (bay_number, level_number, lane_depth_index) DO NOTHING;

-- Seed Today's Inbound/Outbound counts
INSERT INTO throughput_logs (direction, sku_category, part_number, pallet_id)
SELECT 
    'INBOUND'::pallet_direction_enum, 'TIRE'::sku_category_enum, 'TIRE-225-50-R17', 'PAL-IN-' || i
FROM generate_series(1, 148) i;

INSERT INTO throughput_logs (direction, sku_category, part_number, pallet_id)
SELECT 
    'OUTBOUND'::pallet_direction_enum, 'RIM'::sku_category_enum, 'RIM-18-ALLOY', 'PAL-OUT-' || i
FROM generate_series(1, 112) i;

-- Seed OEE metric for today
INSERT INTO oee_metrics (shift_date, shift_number, planned_production_minutes, downtime_minutes, takt_time_seconds, actual_cycle_time_seconds, total_pallets_handled, defective_pallet_placements)
VALUES (CURRENT_DATE, 1, 480.0, 28.0, 75.0, 81.2, 260, 2)
ON CONFLICT DO NOTHING;

-- Seed Digital SOPs
INSERT INTO standard_operating_procedures (code, title, category, version, markdown_content)
VALUES 
    ('FR-7.2-04', 'Daily High Bay Racking Shuttle Inspection SOP', 'Pre-Operational', 'v3.1', 'Standard inspection steps for multi-directional shuttles before shift release.'),
    ('SOP-E-STOP-01', 'Emergency Stop & Safe Recovery Protocol', 'Emergency', 'v2.0', 'Procedures to follow when an E-Stop bumper or optical sensor triggers a halt in deep-lane racking.'),
    ('SOP-RF-PAIR', 'RF Remote Controller Pairing & Channel Selection', 'Maintenance', 'v1.4', 'Step-by-step RF frequency tuning between handheld controller and Shuttle logic unit.')
ON CONFLICT (code) DO NOTHING;
