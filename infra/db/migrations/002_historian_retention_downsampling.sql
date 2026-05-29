CREATE TABLE IF NOT EXISTS historian_retention_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO historian_retention_config(key, value)
VALUES
  ('raw_retention', '30 days'),
  ('aggregate_resolution', '1m'),
  ('aggregate_retention', '180 days'),
  ('simulation_only', 'true')
ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE TABLE IF NOT EXISTS telemetry_history_1m (
  bucket TIMESTAMPTZ NOT NULL,
  tag TEXT NOT NULL,
  name TEXT,
  avg_value DOUBLE PRECISION NOT NULL,
  min_value DOUBLE PRECISION NOT NULL,
  max_value DOUBLE PRECISION NOT NULL,
  sample_count INTEGER NOT NULL,
  unit TEXT,
  quality TEXT,
  source TEXT,
  area TEXT,
  asset_tag TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, tag)
);

SELECT create_hypertable('telemetry_history_1m', 'bucket', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS telemetry_history_1m_bucket_desc_idx ON telemetry_history_1m (bucket DESC);
CREATE INDEX IF NOT EXISTS telemetry_history_1m_tag_bucket_desc_idx ON telemetry_history_1m (tag, bucket DESC);
CREATE INDEX IF NOT EXISTS telemetry_history_1m_source_bucket_desc_idx ON telemetry_history_1m (source, bucket DESC);

SELECT add_retention_policy('telemetry_history', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_retention_policy('telemetry_history_1m', INTERVAL '180 days', if_not_exists => TRUE);
