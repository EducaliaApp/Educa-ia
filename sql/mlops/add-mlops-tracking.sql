-- MLOps Tracking Tables for ProfeFlow ETL Pipeline

-- 1. Add embedding model tracking to existing table
ALTER TABLE documentos_oficiales 
ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50),
ADD COLUMN IF NOT EXISTS embedding_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS pipeline_run_id VARCHAR(100);

-- 2. Create pipeline runs tracking table
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id VARCHAR(100) UNIQUE NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20),
    total_documents INTEGER DEFAULT 0,
    processed_documents INTEGER DEFAULT 0,
    total_embeddings INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Create pipeline metrics table
CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id VARCHAR(100),
    stage VARCHAR(50),
    metric_name VARCHAR(100),
    metric_value NUMERIC,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- 4. Create function to log metrics
CREATE OR REPLACE FUNCTION log_pipeline_metric(
    p_run_id VARCHAR(100),
    p_stage VARCHAR(50),
    p_metric_name VARCHAR(100),
    p_metric_value NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_metric_id UUID;
BEGIN
    INSERT INTO pipeline_metrics (run_id, stage, metric_name, metric_value)
    VALUES (p_run_id, p_stage, p_metric_name, p_metric_value)
    RETURNING id INTO v_metric_id;
    RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql;
