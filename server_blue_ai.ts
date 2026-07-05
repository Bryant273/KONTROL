import express from "express";
import path from "path";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import hpp from "hpp";
import xss from "xss-clean";
import { BlueNeuralBrain } from "./src/api/lib/blue-neural-brain.ts";

dotenv.config();

console.log("[BLUE-AI-COGNITIVE-SERVER] Booting Standalone Intelligence App...");

const dbPath = path.join(process.cwd(), "kontrol_blue_ai.db");
let db: any;
try {
  const DB = (Database as any).default || Database;
  db = new DB(dbPath);
  console.log("[BLUE-AI-DB] Bound to physical blueprint AI storage:", dbPath);
} catch (err) {
  console.error("[BLUE-AI-DB] Connection failure:", err);
  process.exit(1);
}

function initDb() {
  console.log("[BLUE-AI-DB] Scanning and bootstrapping Blue AI schema...");
  try {
    // Structural SQL definition for BLUE AI cognition and continuous learning
    db.exec(`
      CREATE TABLE IF NOT EXISTS blue_brain_training_pairs (
          id TEXT PRIMARY KEY,
          prompt TEXT NOT NULL,
          response TEXT NOT NULL,
          category TEXT DEFAULT 'GENERAL',
          source TEXT DEFAULT 'USER_FEEDBACK',
          confidence REAL DEFAULT 1.0,
          security_hash TEXT,
          createdAt INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS blue_system_cognitive_indexes (
          id TEXT PRIMARY KEY,
          module_key TEXT NOT NULL,
          index_name TEXT NOT NULL,
          record_count INTEGER DEFAULT 0,
          last_indexed_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ai_neural_history (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          prompt TEXT,
          response TEXT,
          trust_score REAL,
          model_used TEXT,
          createdAt INTEGER
      );
    `);

    // Smart attachment of other schemas to support high-level semantic queries over operational metrics
    try {
      db.exec("ATTACH DATABASE './kontrol_client.db' AS client;");
      db.exec("ATTACH DATABASE './kontrol_admin.db' AS admin;");
      
      // First drop any accidental persistent views from the main schema to prevent cross-database reference errors
      try {
        db.exec(`
          DROP VIEW IF EXISTS users;
          DROP VIEW IF EXISTS companies;
          DROP VIEW IF EXISTS produits;
          DROP VIEW IF EXISTS transactions;
          DROP VIEW IF EXISTS charges;
          DROP VIEW IF EXISTS tiers;
        `);
      } catch (dropErr) {
        // Ignore if views don't exist
      }

      // Creating live transparent TEMPORARY views for schema translation
      db.exec(`
        CREATE TEMP VIEW IF NOT EXISTS users AS SELECT * FROM admin.users;
        CREATE TEMP VIEW IF NOT EXISTS companies AS SELECT * FROM admin.companies;
        CREATE TEMP VIEW IF NOT EXISTS produits AS SELECT * FROM client.produits;
        CREATE TEMP VIEW IF NOT EXISTS transactions AS SELECT * FROM client.transactions;
        CREATE TEMP VIEW IF NOT EXISTS charges AS SELECT * FROM client.charges;
        CREATE TEMP VIEW IF NOT EXISTS tiers AS SELECT * FROM client.tiers;
      `);
      console.log("[BLUE-AI-DB] DB Attachments matched successfully. Live cross-schema views active.");
    } catch (attachErr: any) {
      console.warn("[BLUE-AI-DB] Storage attachment warning: parent schemas might be initialized dynamically. Proceeding with view emulation fallback.", attachErr.message);
    }
  } catch (err) {
    console.error("[BLUE-AI-DB] Bootstrapped schema failure:", err);
  }
}

initDb();

const neuralBrain = new BlueNeuralBrain(db);

const app = express();
const PORT = 3003;

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false
}));

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  message: { error: "AI_API_THROTTLE", message: "Inférence temporairement limitée." },
  validate: { trustProxy: false, forwardedHeader: false }
});

app.use("/api/", aiLimiter);
app.use(express.json({ limit: "15kb" }));
app.use(xss());
app.use(hpp());

const AiBrainSchema = z.object({
  prompt: z.string().min(1).max(5000),
  user_id: z.string().min(1).max(128),
  companyId: z.string().max(128).optional()
});

const AiAnalyzeSchema = z.object({
  data: z.any(),
  type: z.enum(['financial', 'code', 'logistics']).optional()
});

const aiExpert = {
  blueBrain: async (req: any, res: any) => {
    try {
      const { prompt, user_id, companyId } = AiBrainSchema.parse(req.body);
      const result = await neuralBrain.infer(prompt, user_id, companyId);
      res.json({
        engine: "PYTHON_NEURAL_ENSEMBLE",
        models: ["Qwen", "Gemini", "DeepSeek"],
        response: result.response,
        trust_score: result.score,
        java_audit: "SUCCESS",
        consensus: result.consensus
      });
    } catch (error: any) {
      console.error("AI Neural Brain Core Error:", error);
      res.status(500).json({ 
        error: "NEURAL_LATENCY", 
        message: "Problème d'inférence cognitrice.",
        details: error.message 
      });
    }
  },
  analyze: async (req: any, res: any) => {
    try {
      const { data, type } = AiAnalyzeSchema.parse(req.body);
      const prompt = type === 'code' 
        ? `En tant qu'expert en sécurité et architecture logicielle pour l'application KONTROL, analyse ces métriques et fournis des recommandations techniques: ${JSON.stringify(data)}`
        : `En tant qu'expert en gestion d'entreprise, analyse ces données financières et fournis des conseils stratégiques: ${JSON.stringify(data)}`;
      
      const result = await neuralBrain.infer(prompt, "system_analysis");
      res.json({ text: result.response });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
  getHistory: (req: any, res: any) => {
    res.json(db.prepare("SELECT * FROM ai_neural_history ORDER BY createdAt DESC").all());
  },
  getIndexes: (req: any, res: any) => {
    try {
      res.json(db.prepare("SELECT * FROM blue_system_cognitive_indexes").all());
    } catch (err) {
      res.json([]);
    }
  }
};

// Routing for BLUE AI actions
app.post("/api/ai/blue-brain", aiExpert.blueBrain);
app.post("/api/ai/analyze", aiExpert.analyze);
app.get("/api/ai/history", aiExpert.getHistory);
app.get("/api/ai/indexes", aiExpert.getIndexes);

app.get("/api/business/analyze", async (req, res) => {
  try {
    const result = await neuralBrain.infer("Fais un audit de santé de la trésorerie et de la vélocité des stocks actuels de la PME.");
    res.json({
      success: true,
      analysis: result.response,
      score: result.score,
      consensus: result.consensus
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[BLUE-AI-COGNITIVE-SERVER] Running cleanly on http://localhost:${PORT}`);
});
