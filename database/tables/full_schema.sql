-- KONTROL POSTGRESQL FULL MASTER SCHEMA
-- InnovKorp Ecosystem 2026

-- AUTH & USERS
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    displayName TEXT,
    role TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    last_login INTEGER,
    createdAt INTEGER
);

-- GESTION : TIERS
CREATE TABLE IF NOT EXISTS tiers (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    email TEXT,
    telephone TEXT,
    nif TEXT,
    rccm TEXT,
    adresse TEXT,
    type TEXT, -- CLIENT / FOURNISSEUR
    solde REAL DEFAULT 0,
    created_at INTEGER
);

-- GESTION : PRODUITS
CREATE TABLE IF NOT EXISTS produits (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    code_barre TEXT,
    categorie TEXT,
    prix_achat REAL,
    prix_vente REAL,
    stock INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 5,
    status TEXT DEFAULT 'DISPONIBLE',
    created_at INTEGER
);

-- STOCKS : MOUVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    quantite INTEGER,
    type TEXT, -- ENTRÉE / SORTIE
    motif TEXT,
    created_at INTEGER,
    FOREIGN KEY(product_id) REFERENCES produits(id)
);

-- FINANCE : TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    tiers_id TEXT,
    amount REAL NOT NULL,
    type TEXT, -- ENCAISSEMENT / DÉCAISSEMENT
    category TEXT,
    description TEXT,
    status TEXT DEFAULT 'VALIDÉ',
    createdAt INTEGER,
    FOREIGN KEY(tiers_id) REFERENCES tiers(id)
);

-- FINANCE : CHARGES
CREATE TABLE IF NOT EXISTS charges (
    id TEXT PRIMARY KEY,
    titre TEXT,
    montant REAL,
    frequence TEXT, -- PONCTUELLE / MENSUELLE
    category TEXT,
    due_date INTEGER,
    status TEXT DEFAULT 'A_PAYER'
);

-- COMMUNICATION : CHAT & TICKETS
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    receiver_id TEXT,
    content TEXT,
    channel TEXT,
    is_read BOOLEAN DEFAULT false,
    createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    subject TEXT,
    description TEXT,
    priority TEXT,
    status TEXT DEFAULT 'OPEN',
    created_at INTEGER,
    FOREIGN KEY(author_id) REFERENCES users(uid)
);

-- SYSTEME : NOTIFICATIONS & AUDIT
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    userId TEXT,
    module TEXT,
    action TEXT,
    details TEXT,
    createdAt INTEGER
);

-- AI : KNOWLEDGE & MEMORY
CREATE TABLE IF NOT EXISTS ai_neural_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    prompt TEXT,
    response TEXT,
    trust_score REAL,
    model_used TEXT,
    createdAt INTEGER
);

-- GOVERNANCE : COMPANIES & SUBS
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    mrr REAL DEFAULT 0,
    plan TEXT DEFAULT 'premium',
    status TEXT DEFAULT 'active',
    created_at INTEGER
);
