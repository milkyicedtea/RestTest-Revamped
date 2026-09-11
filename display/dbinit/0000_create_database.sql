
-- Machines tables
CREATE TABLE IF NOT EXISTS machines (
    machine_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- generates UUIDv4
    cpu_model TEXT,
    cpu_cores INTEGER NOT NULL,
    cpu_threads INTEGER NOT NULL,
    cpu_speed_ghz DECIMAL(4, 2) NOT NULL,
    ram_gb INTEGER NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('linux', 'windows', 'macos', 'unknown')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(machine_id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    framework TEXT NOT NULL,
    test_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics table
CREATE TABLE IF NOT EXISTS result_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID NOT NULL REFERENCES test_results(result_id) ON DELETE CASCADE,

    -- Summary metric
    success_rate DECIMAL(5, 4) NOT NULL,
    total_time DECIMAL(10, 6) NOT NULL,
    slowest DECIMAL(10, 6) NOT NULL,
    fastest DECIMAL(10, 6) NOT NULL,
    average DECIMAL(10, 6) NOT NULL,
    requests_per_sec DECIMAL(12, 6) NOT NULL,
    total_data BIGINT NOT NULL,
    size_per_request INTEGER NOT NULL,
    size_per_sec DECIMAL(12, 6) NOT NULL,

    -- Latency percentiles
    latency_p50 DECIMAL(10, 6) NOT NULL,
    latency_p75 DECIMAL(10, 6) NOT NULL,
    latency_p90 DECIMAL(10, 6) NOT NULL,
    latency_p95 DECIMAL(10, 6) NOT NULL,
    latency_p99 DECIMAL(10, 6) NOT NULL,

    -- RPS stats
    rps_mean DECIMAL(12, 6) NOT NULL,
    rps_stddev DECIMAL(12, 6) NOT NULL,
    rps_max DECIMAL(12, 6) NOT NULL,
    rps_min DECIMAL(12, 6) NOT NULL,
    rps_p50 DECIMAL(12, 6) NOT NULL,
    rps_p75 DECIMAL(12, 6) NOT NULL,
    rps_p90 DECIMAL(12, 6) NOT NULL,
    rps_p95 DECIMAL(12, 6) NOT NULL,
    rps_p99 DECIMAL(12, 6) NOT NULL,

    -- DNS metrics
    dns_dialup_avg DECIMAL(10, 6) NOT NULL,
    dns_dialup_fastest DECIMAL(10, 6) NOT NULL,
    dns_dialup_slowest DECIMAL(10, 6) NOT NULL,
    dns_lookup_avg DECIMAL(10, 6) NOT NULL,
    dns_lookup_fastest DECIMAL(10, 6) NOT NULL,
    dns_lookup_slowest DECIMAL(10, 6) NOT NULL,

    -- Status/Error tracking
    status_200_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    error_types TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_test_results_machine ON test_results(machine_id);
CREATE INDEX IF NOT EXISTS idx_test_results_framework ON test_results(language, framework);
CREATE INDEX IF NOT EXISTS idx_test_results_test ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_timestamp ON test_results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_result_metric_result ON result_metrics(result_id);
CREATE INDEX IF NOT EXISTS idx_machines_specs ON machines(cpu_cores, cpu_threads, ram_gb)