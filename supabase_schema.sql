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

-- 2. OPERATORS & SYSTEM USERS (Authentication & Role Access across Desktop & Mobile)
CREATE TABLE IF NOT EXISTS operators (
    id TEXT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'OPERATOR',
    password TEXT,
    shift VARCHAR(50) DEFAULT 'Default Shift',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Administrator
INSERT INTO operators (id, username, name, role, password, shift, active)
VALUES ('admin-primary', 'admin', 'System Administrator', 'ADMIN', 'admin', 'A', TRUE)
ON CONFLICT (username) DO NOTHING;

-- 3. SHUTTLES TABLE (Master Assets & Telemetry)
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

-- 4. INSPECTIONS TABLE (Daily FR-7.2-04 Header)
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

-- 5. INSPECTION LINE ITEMS (The 22 Checklist Points)
CREATE TABLE IF NOT EXISTS inspection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    item_number INT NOT NULL CHECK (item_number BETWEEN 1 AND 22),
    question_text TEXT NOT NULL,
    is_passed BOOLEAN NOT NULL,
    comment TEXT, -- Mandatory if is_passed is FALSE
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MAINTENANCE TASKS TABLE (Usage-based & Preventive Actions)
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id TEXT PRIMARY KEY,
    shuttle VARCHAR(50) NOT NULL,
    task_title VARCHAR(255) NOT NULL,
    component VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    threshold_metric VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    due_date DATE,
    priority VARCHAR(50) DEFAULT 'NORMAL',
    assigned_to VARCHAR(150),
    scheduled_by VARCHAR(150),
    instructions TEXT,
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SHUTTLE RESOLUTIONS TABLE
CREATE TABLE IF NOT EXISTS shuttle_resolutions (
    shuttle_id VARCHAR(50) PRIMARY KEY,
    inspection_passed BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    technician_name VARCHAR(150),
    resolved_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 8. SENSOR RESOLUTIONS TABLE
CREATE TABLE IF NOT EXISTS sensor_resolutions (
    shuttle_id VARCHAR(50) PRIMARY KEY,
    cleaned BOOLEAN DEFAULT FALSE,
    technician_name VARCHAR(150),
    cleaned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 9. CAVITY UTILIZATION (Deep-Lane High-Density Racking Map)
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

-- 10. DIGITAL SOPS CATALOG
CREATE TABLE IF NOT EXISTS standard_operating_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- 'SOP-SH-01', 'FR-7.2-04'
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,   -- 'Pre-Operational', 'Emergency', 'Maintenance'
    pdf_url TEXT,
    image_url TEXT,
    markdown_content TEXT,
    version VARCHAR(20) DEFAULT 'v2.4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. RPC FUNCTION: ATOMIC INSPECTION SUBMISSION & INTERLOCK UNLOCK
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
    IF jsonb_array_length(p_items) != 22 THEN
        RAISE EXCEPTION 'Inspection must include all 22 checklist items.';
    END IF;

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

    IF v_overall_passed THEN
        v_new_status := 'ACTIVE';
    ELSE
        v_new_status := 'FAULT';
    END IF;

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

    DELETE FROM inspection_items WHERE inspection_id = v_inspection_id;

    INSERT INTO inspection_items (inspection_id, item_number, question_text, is_passed, comment)
    SELECT 
        v_inspection_id,
        (elem->>'item_number')::INT,
        (elem->>'question_text')::TEXT,
        (elem->>'is_passed')::BOOLEAN,
        (elem->>'comment')::TEXT
    FROM jsonb_array_elements(p_items) AS elem;

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

-- 12. SEED INITIAL SHUTTLES
INSERT INTO shuttles (code, display_name, status, battery_pct, odometer_meters, lifting_cycles, charge_cycles, last_sensor_clean_at)
VALUES 
    ('SHUTTLE-01', 'Shuttle 1', 'LOCKED_PENDING_INSPECTION', 94, 8840000.00, 82140, 2450, NOW() - INTERVAL '2 days'),
    ('SHUTTLE-02', 'Shuttle 2', 'ACTIVE', 82, 9350000.00, 96800, 2890, NOW() - INTERVAL '8 days')
ON CONFLICT (code) DO NOTHING;
