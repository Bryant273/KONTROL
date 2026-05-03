-- Table des Entreprises / Clients ERP
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    mrr REAL DEFAULT 0,
    churn REAL DEFAULT 0,
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    logo_url TEXT,
    created_at INTEGER
);

-- Table des Abonnements
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    plan_name TEXT,
    price REAL,
    billing_cycle TEXT,
    next_billing INTEGER,
    status TEXT,
    FOREIGN KEY(company_id) REFERENCES companies(id)
);

-- Table des Tickets Support
CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    subject TEXT,
    description TEXT,
    priority TEXT,
    status TEXT,
    assigned_to TEXT,
    company_id TEXT,
    created_at INTEGER,
    updated_at INTEGER
);
