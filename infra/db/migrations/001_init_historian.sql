CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telemetry_history (
  id BIGSERIAL,
  time TIMESTAMPTZ NOT NULL,
  tag TEXT NOT NULL,
  name TEXT,
  numeric_value DOUBLE PRECISION NULL,
  text_value TEXT NULL,
  unit TEXT,
  quality TEXT,
  source TEXT,
  area TEXT,
  asset_tag TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, time)
);

SELECT create_hypertable('telemetry_history', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS telemetry_history_time_desc_idx ON telemetry_history (time DESC);
CREATE INDEX IF NOT EXISTS telemetry_history_tag_time_desc_idx ON telemetry_history (tag, time DESC);
CREATE INDEX IF NOT EXISTS telemetry_history_source_time_desc_idx ON telemetry_history (source, time DESC);

CREATE TABLE IF NOT EXISTS command_history (
  id TEXT PRIMARY KEY,
  target_tag TEXT NOT NULL,
  command_type TEXT NOT NULL,
  source TEXT,
  requested_by TEXT,
  status TEXT NOT NULL,
  requested_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_message TEXT,
  error_code TEXT,
  error_message TEXT,
  correlation_id TEXT,
  reject_reason TEXT,
  arbitration_mode TEXT,
  authority TEXT,
  rejected_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS command_history_requested_at_desc_idx ON command_history (requested_at DESC);
CREATE INDEX IF NOT EXISTS command_history_target_requested_at_desc_idx ON command_history (target_tag, requested_at DESC);
CREATE INDEX IF NOT EXISTS command_history_status_requested_at_desc_idx ON command_history (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS command_history_correlation_id_idx ON command_history (correlation_id);

CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  source TEXT,
  severity TEXT,
  target_tag TEXT,
  command_id TEXT,
  alarm_id TEXT,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_log_time_desc_idx ON event_log (time DESC);
CREATE INDEX IF NOT EXISTS event_log_type_time_desc_idx ON event_log (type, time DESC);
CREATE INDEX IF NOT EXISTS event_log_severity_time_desc_idx ON event_log (severity, time DESC);
CREATE INDEX IF NOT EXISTS event_log_target_time_desc_idx ON event_log (target_tag, time DESC);
CREATE INDEX IF NOT EXISTS event_log_command_id_idx ON event_log (command_id);
CREATE INDEX IF NOT EXISTS event_log_alarm_id_idx ON event_log (alarm_id);

CREATE TABLE IF NOT EXISTS alarm_history (
  id TEXT PRIMARY KEY,
  rule_id TEXT,
  asset_id TEXT,
  tag TEXT NOT NULL,
  code TEXT,
  title TEXT,
  status TEXT NOT NULL,
  severity TEXT,
  message TEXT,
  source TEXT,
  active_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  cleared_at TIMESTAMPTZ,
  last_value DOUBLE PRECISION NULL,
  threshold DOUBLE PRECISION NULL,
  unit TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alarm_history_active_at_desc_idx ON alarm_history (active_at DESC);
CREATE INDEX IF NOT EXISTS alarm_history_cleared_at_desc_idx ON alarm_history (cleared_at DESC);
CREATE INDEX IF NOT EXISTS alarm_history_tag_active_at_desc_idx ON alarm_history (tag, active_at DESC);
CREATE INDEX IF NOT EXISTS alarm_history_status_active_at_desc_idx ON alarm_history (status, active_at DESC);
CREATE INDEX IF NOT EXISTS alarm_history_severity_active_at_desc_idx ON alarm_history (severity, active_at DESC);
