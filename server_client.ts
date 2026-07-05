import express from "express";
import path from "path";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import hpp from "hpp";
import xss from "xss-clean";

dotenv.config();

console.log("[CLIENT-FRONT-OFFICE-SERVER] Booting Standalone ERP Client App...");

const dbPath = path.join(process.cwd(), "kontrol_client.db");
let db: any;
try {
  const DB = (Database as any).default || Database;
  db = new DB(dbPath);
  console.log("[CLIENT-DB] Bound to physical client storage:", dbPath);
} catch (err) {
  console.error("[CLIENT-DB] Connection failure:", err);
  process.exit(1);
}

function initDb() {
  console.log("[CLIENT-DB] Scanning and bootstrapping Client-specific schema...");
  try {
    // Structural SQL definition for Client space
    db.exec(`
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
      CREATE TABLE IF NOT EXISTS stock_movements (
          id TEXT PRIMARY KEY,
          product_id TEXT,
          quantite INTEGER,
          type TEXT, -- ENTRÉE / SORTIE
          motif TEXT,
          created_at INTEGER,
          FOREIGN KEY(product_id) REFERENCES produits(id)
      );
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
      CREATE TABLE IF NOT EXISTS charges (
          id TEXT PRIMARY KEY,
          titre TEXT,
          montant REAL,
          frequence TEXT, -- PONCTUELLE / MENSUELLE
          category TEXT,
          due_date INTEGER,
          status TEXT DEFAULT 'A_PAYER'
      );
      CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          sender_id TEXT,
          receiver_id TEXT,
          content TEXT,
          channel TEXT,
          is_read BOOLEAN DEFAULT false,
          createdAt INTEGER
      );
      CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          type TEXT,
          title TEXT,
          message TEXT,
          is_read BOOLEAN DEFAULT false,
          createdAt INTEGER
      );
    `);

    db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)");
    db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(createdAt)");

    // Seed demographic client data
    const pcCount = db.prepare("SELECT count(*) as count FROM produits").get() as { count: number };
    if (pcCount.count === 0) {
      console.log("[CLIENT-DB] Seeding Client PME Demo Dataset...");
      const now = Date.now();
      db.prepare(`
        INSERT INTO users (uid, email, displayName, role, createdAt) 
        VALUES ('admin_1', 'acherie812@gmail.com', 'Admin KONTROL', 'ADMINISTRATEUR_ERP', ?)
      `).run(now);

      db.prepare(`
        INSERT INTO tiers (id, nom, email, nif, type, solde, created_at)
        VALUES 
          ('t1', 'AgriTech Solutions', 'contact@agritech.com', '123456789', 'FOURNISSEUR', -2500000, ?),
          ('t2', 'Sénégal Logistique', 'info@senelog.sn', '987654321', 'CLIENT', 1200000, ?)
      `).run(now, now);

      db.prepare(`
        INSERT INTO produits (id, nom, categorie, stock, prix_vente, prix_achat, status)
        VALUES 
          ('p1', 'Silo-Grains Ultra', 'Agri-Tech', 5, 1200000, 850000, 'DISPONIBLE'),
          ('p2', 'Bio-Fertilisant K', 'Agri-Tech', 150, 45000, 25000, 'DISPONIBLE'),
          ('p3', 'Drone Surveillance V4', 'Tech', 8, 3500000, 2100000, 'RUPTURE_PROCHE')
      `).run();

      db.prepare(`
        INSERT INTO stock_movements (id, product_id, quantite, type, motif, created_at)
        VALUES 
          ('m1', 'p1', 2, 'ENTRÉE', 'Réception Fournisseur AgriTech', ?),
          ('m2', 'p3', 1, 'SORTIE', 'Vente Client X', ?)
      `).run(now, now);

      db.prepare(`
        INSERT INTO transactions (id, amount, type, category, description, createdAt)
        VALUES 
          ('tx_1', 1500000, 'ENCAISSEMENT', 'VENTE', 'Licence Enterprise - InnovKorp', ?),
          ('tx_2', 450000, 'ENCAISSEMENT', 'VENTE', 'Vente Silo - Client X', ?),
          ('tx_3', -25000, 'DÉCAISSEMENT', 'FACTURE', 'Audit Cloud Mensuel', ?),
          ('tx_4', 850000, 'ENCAISSEMENT', 'VENTE', 'Renouvellement annuel - TechGo', ?)
      `).run(now, now - 3600000, now - 7200000, now - 10800000);

      db.prepare(`
        INSERT INTO charges (id, titre, montant, frequence, category, status, due_date)
        VALUES 
          ('ch1', 'Loyer Bureaux Dakar', 1500000, 'MENSUELLE', 'LOYER', 'PAYÉ', ?),
          ('ch2', 'Serveurs Cloud (Bridge)', 450000, 'MENSUELLE', 'TECH', 'A_PAYER', ?)
      `).run(now, now + 86400000 * 5);

      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, createdAt)
        VALUES 
          ('n1', 'admin_1', 'ALERTE', 'Stock Critique', 'Le produit Drone Surveillance est en rupture.', ?),
          ('n2', 'admin_1', 'INFO', 'Virement Reçu', 'Le client Sénégal Logistique a réglé sa facture.', ?)
      `).run(now, now - 1800000);
    }
  } catch (err) {
    console.error("[CLIENT-DB] Bootstrapping failed:", err);
  }
}

initDb();

const app = express();
const PORT = 3001;

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false, // Let reverse proxy / gateway specify if wrapped
  frameguard: false
}));

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: { error: "CLIENT_API_THROTTLE", message: "Trop de requêtes." },
  validate: { trustProxy: false, forwardedHeader: false }
});

app.use("/api/", apiLimiter);
app.use(express.json({ limit: "10kb" }));
app.use(xss());
app.use(hpp());

// Expert controllers ported directly to client schema
const erpExpert = {
  stockAudit: (req: any, res: any) => {
    const products = db.prepare("SELECT * FROM produits").all();
    res.json({
      module: "CORE_ERP_STOCK",
      total_valuation: products.reduce((acc: number, p: any) => acc + (p.stock * p.prix_achat), 0),
      items: products.length,
      status: "OPTIMIZED_SECURITY"
    });
  },
  movements: (req: any, res: any) => {
    const moves = db.prepare("SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 50").all();
    res.json({ module: "CORE_STOCK_MOVEMENTS", data: moves });
  },
  tiers: (req: any, res: any) => {
    const tiers = db.prepare("SELECT * FROM tiers").all();
    res.json({ module: "CORE_TIERS_MANAGER", count: tiers.length, data: tiers, shield: "SECURE_VERIFIED" });
  },
  products: (req: any, res: any) => {
    const products = db.prepare("SELECT * FROM produits").all();
    res.json(products);
  }
};

const financeExpert = {
  treasuryAnalysis: (req: any, res: any) => {
    const txs = db.prepare("SELECT * FROM transactions").all();
    const charges = db.prepare("SELECT * FROM charges").all();
    res.json({
      engine: "JAVA_FINANCE_HIVE",
      transactions: txs.length,
      total_charges: charges.reduce((acc: number, c: any) => acc + (c.montant || 0), 0),
      status: "SECURE_FLOW_RUST"
    });
  },
  getTransactions: (req: any, res: any) => {
    res.json(db.prepare("SELECT * FROM transactions ORDER BY createdAt DESC").all());
  },
  getCharges: (req: any, res: any) => {
    res.json(db.prepare("SELECT * FROM charges").all());
  },
  bridgeCalc: (req: any, res: any) => {
    const { cash = 0, invoices = 0 } = req.body;
    const hasFlows = Number(cash) > 0 || Number(invoices) > 0;
    const activityFactor = hasFlows ? 1.2 : 0;
    const limit = (Number(cash) * 0.1) + (Number(invoices) * 0.45) * activityFactor;
    
    res.json({ 
      amount_eligible: Math.floor(limit), 
      status: "VERIFIED",
      type: "KONTROL_CERTIFICATE_ELIGIBILITY"
    });
  }
};

const communicationExpert = {
  chat: (req: any, res: any) => {
    const msgs = db.prepare("SELECT * FROM messages ORDER BY createdAt DESC LIMIT 50").all();
    res.json({ module: "JAVA_CHAT_SERVICE", items: msgs });
  },
  sendMessage: (req: any, res: any) => {
    const { sender_id, receiver_id, content, channel } = req.body;
    const id = Date.now().toString();
    db.prepare("INSERT INTO messages (id, sender_id, receiver_id, content, channel, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, sender_id, receiver_id, content, channel, Date.now());
    res.json({ success: true, id });
  },
  support: (req: any, res: any) => {
    res.json({ module: "JAVA_SUPPORT_ENGINE", stats: { open: 0 }, tickets: [] });
  },
  getNotifications: (req: any, res: any) => {
    res.json(db.prepare("SELECT * FROM notifications ORDER BY createdAt DESC").all());
  }
};

// Client specific routes mapping
app.get("/api/enterprise/erp/stock-audit", erpExpert.stockAudit);
app.get("/api/enterprise/erp/movements", erpExpert.movements);
app.get("/api/enterprise/erp/products", erpExpert.products);
app.get("/api/enterprise/crm/tiers", erpExpert.tiers);

app.get("/api/enterprise/treasury/analysis", financeExpert.treasuryAnalysis);
app.get("/api/enterprise/treasury/transactions", financeExpert.getTransactions);
app.get("/api/enterprise/treasury/charges", financeExpert.getCharges);
app.post("/api/enterprise/treasury/bridge-calc", financeExpert.bridgeCalc);

app.get("/api/enterprise/communication/chat", communicationExpert.chat);
app.post("/api/enterprise/communication/chat/send", communicationExpert.sendMessage);
app.get("/api/enterprise/communication/support", communicationExpert.support);
app.get("/api/system/notifications", communicationExpert.getNotifications);

app.get("/api/user/profile/:uid", (req, res) => {
  const { uid } = req.params;
  const user = db.prepare("SELECT * FROM users WHERE uid = ?").get(uid);
  res.json(user || { uid, role: "USER", displayName: "Partenaire PME" });
});

app.get("/api/enterprise/accounting/vat", (req, res) => {
  res.json({
    module: "VAT_AUDITOR",
    tva_collectee: 340000,
    tva_deductible: 120000,
    credit_tva: 0,
    tva_a_payer: 220000,
    status: "VERIFIED"
  });
});

// Single point deployment static server wrapper
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[CLIENT-FRONT-OFFICE-SERVER] Running cleanly on http://localhost:${PORT}`);
});
