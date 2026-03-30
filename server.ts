import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

console.log("Environment Variables Check:", {
  KKIAPAY_PRIVATE_KEY: process.env.KKIAPAY_PRIVATE_KEY ? "Defined" : "Undefined",
  KKIAPAY_SECRET: process.env.KKIAPAY_SECRET ? "Defined" : "Undefined",
  VITE_KKIAPAY_PUBLIC_KEY: process.env.VITE_KKIAPAY_PUBLIC_KEY ? "Defined" : "Undefined"
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Kkiapay API Credentials
  const KKIAPAY_PUBLIC_KEY = process.env.VITE_KKIAPAY_PUBLIC_KEY || "295bd8502b0211f1ae5939565e861882";
  const KKIAPAY_PRIVATE_KEY = process.env.KKIAPAY_PRIVATE_KEY;
  const KKIAPAY_SECRET = process.env.KKIAPAY_SECRET;

  // 1. Get Kkiapay Access Token
  app.post("/api/kkiapay/token", async (req, res) => {
    try {
      if (!KKIAPAY_PRIVATE_KEY || !KKIAPAY_SECRET) {
        return res.status(400).json({ error: "Kkiapay credentials missing in server environment" });
      }

      console.log("Attempting to get Kkiapay token...");

      // Try multiple endpoints as a fallback
      const endpoints = [
        "https://api.kkiapay.me/api/v1/utils/token",
        "https://api.kkiapay.me/api/v1/token"
      ];

      let lastError = null;
      for (const url of endpoints) {
        try {
          console.log(`Trying Kkiapay token endpoint: ${url}`);
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              privateKey: KKIAPAY_PRIVATE_KEY,
              private_key: KKIAPAY_PRIVATE_KEY, // Try both formats
              secret: KKIAPAY_SECRET,
              publicKey: KKIAPAY_PUBLIC_KEY
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.token) {
              console.log(`Successfully obtained token from ${url}`);
              return res.json({ token: data.token });
            }
          } else {
            const text = await response.text();
            console.warn(`Endpoint ${url} failed with status ${response.status}: ${text}`);
            lastError = `Status ${response.status}: ${text}`;
          }
        } catch (e: any) {
          console.warn(`Error connecting to ${url}:`, e.message);
          lastError = e.message;
        }
      }

      throw new Error(`Failed to obtain Kkiapay token: ${lastError}`);
    } catch (error: any) {
      console.error("Kkiapay Token Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Initiate Direct Payment
  app.post("/api/kkiapay/pay", async (req, res) => {
    const { amount, phoneNumber, channel, token, firstname, lastname, email, otp } = req.body;
    
    try {
      // For Wave, phoneNumber might be empty, but Kkiapay might require it.
      // We'll provide a placeholder if it's missing for Wave.
      const finalPhone = (channel === 'WAVE' && !phoneNumber) ? "22900000000" : phoneNumber;

      const response = await fetch("https://api.kkiapay.me/api/v1/payments/direct", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          phoneNumber: finalPhone,
          channel,
          firstname,
          lastname,
          email,
          otp
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Kkiapay Payment Error (${response.status}): ${text}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Kkiapay Pay Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Check Payment Status
  app.get("/api/kkiapay/status/:transactionId", async (req, res) => {
    const { transactionId } = req.params;
    const token = req.headers.authorization;

    try {
      const response = await fetch(`https://api.kkiapay.me/api/v1/payments/status/${transactionId}`, {
        method: "GET",
        headers: { 
          "Authorization": token || ""
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Kkiapay Status Error (${response.status}): ${text}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Kkiapay Status Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
