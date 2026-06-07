-- BLUE NEURAL BRAIN CONTINUOUS LEARNING DATA STORE
-- Supports dynamic real-time training collection & continuous machine learning feedback

CREATE TABLE IF NOT EXISTS blue_brain_training_pairs (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL',
    source TEXT DEFAULT 'USER_FEEDBACK', -- SYSTEM / USER_FEEDBACK / EXPERT_INJECTION
    confidence REAL DEFAULT 1.0,
    security_hash TEXT, -- Cryptographic shield validity
    createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS blue_system_cognitive_indexes (
    id TEXT PRIMARY KEY,
    module_key TEXT NOT NULL, -- e.g. STOCK_VELOCITY, CASH_FLOW_TREND, LIQUIDITY_BRIDGE
    index_name TEXT NOT NULL,
    record_count INTEGER DEFAULT 0,
    last_indexed_at INTEGER NOT NULL
);
