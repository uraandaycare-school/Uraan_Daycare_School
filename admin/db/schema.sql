-- ============================================================
--  Uraan Daycare & School — Neon PostgreSQL Schema
--  Run via: node admin/db/seed.js  (seed.js runs this first)
-- ============================================================

-- Admin users table (for login)
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Student records table (Contains all fields from the Uraan Admission Form PDF)
DROP TABLE IF EXISTS students CASCADE;
CREATE TABLE students (
  id                    SERIAL PRIMARY KEY,
  -- Child Information
  child_name            VARCHAR(200) NOT NULL,
  child_dob             DATE NOT NULL,
  preferred_name        VARCHAR(200),
  gender                VARCHAR(50),
  home_address          TEXT,
  languages_spoken      VARCHAR(200),

  -- Parent / Guardian 1 Information (Primary contact)
  parent_name           VARCHAR(200) NOT NULL,
  parent_relationship   VARCHAR(100),
  parent_phone          VARCHAR(30) NOT NULL,
  parent_email          VARCHAR(200) NOT NULL,
  employer              VARCHAR(200),
  parent_work_phone     VARCHAR(30),

  -- Parent / Guardian 2 Information (Secondary contact)
  guardian2_name         VARCHAR(200),
  guardian2_relationship VARCHAR(100),
  guardian2_phone        VARCHAR(30),
  guardian2_email        VARCHAR(200),
  guardian2_employer     VARCHAR(200),
  guardian2_work_phone   VARCHAR(30),

  -- Authorized Pick-Up & Emergency Contacts (other than parents)
  pickup1_name          VARCHAR(200),
  pickup1_relationship  VARCHAR(100),
  pickup1_phone         VARCHAR(30),
  pickup1_authorized    BOOLEAN DEFAULT FALSE,

  pickup2_name          VARCHAR(200),
  pickup2_relationship  VARCHAR(100),
  pickup2_phone         VARCHAR(30),
  pickup2_authorized    BOOLEAN DEFAULT FALSE,

  pickup3_name          VARCHAR(200),
  pickup3_relationship  VARCHAR(100),
  pickup3_phone         VARCHAR(30),
  pickup3_authorized    BOOLEAN DEFAULT FALSE,

  -- Pediatrician & Medical Details
  physician_name        VARCHAR(200),
  physician_phone       VARCHAR(30),
  physician_address     TEXT,
  preferred_hospital    VARCHAR(200),
  insurance_provider    VARCHAR(200),

  -- Health Profile
  food_allergies        TEXT,
  environmental_allergies TEXT,
  chronic_conditions    TEXT,
  regular_medications   TEXT,
  sensory_notes         TEXT,

  -- Consents & Permissions
  consent_photo_video   BOOLEAN DEFAULT FALSE,
  consent_social_media  BOOLEAN DEFAULT FALSE,
  consent_topical       BOOLEAN DEFAULT FALSE,

  -- Internal Intake Checklist (Admin use only)
  classroom_assigned    VARCHAR(100),
  lead_director         VARCHAR(200),
  fee_received          BOOLEAN DEFAULT FALSE,
  deposit_received      BOOLEAN DEFAULT FALSE,
  billing_created       BOOLEAN DEFAULT FALSE,
  welcome_kit_issued    BOOLEAN DEFAULT FALSE,

  -- System Fields
  program               VARCHAR(50) NOT NULL CHECK (program IN ('montessori', 'daycare', 'afterschool')),
  shift                 VARCHAR(50) NOT NULL CHECK (shift IN ('morning', 'afternoon', 'full-day')),
  emergency_contact     VARCHAR(30) NOT NULL, -- Maps to primary emergency contact
  status                VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  notes                 TEXT,
  enrolled_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at ON students;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- NOTE: The 'session' table is created automatically by connect-pg-simple
-- via createTableIfMissing: true in server.js — do not create it manually.

