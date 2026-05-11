import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import crypto from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // RAW BODY (untuk webhook signature Tripay)
  app.use(
    express.json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );

  app.use(express.urlencoded({ extended: true }));

  // ========================
  // SUPABASE INIT (SAFE MODE)
  // ========================
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabase: any = null;

  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("[SERVER] Supabase connected");
  } else {
    console.warn("[SERVER] Running in DEMO MODE (Supabase disabled)");
  }

  // ========================
  // TRIPAY CONFIG
  // ========================
  const TRIPAY_API_URL =
    process.env.TRIPAY_MODE === "production"
      ? "https://tripay.co.id/api"
      : "https://tripay.co.id/api-sandbox";

  const getTripayHeaders = () => ({
    Authorization: `Bearer ${process.env.TRIPAY_API_KEY}`,
  });

  // ========================
  // DB HEARTBEAT
  // ========================
  const checkDb = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      if (error) {
        console.warn("[DB] Warning:", error.message);
      } else {
        console.log("[DB] Connected OK");
      }
    } catch {
      console.error("[DB] Connection failed");
    }
  };

  checkDb();

  // ========================
  // PPOB PRODUCTS
  // ========================
  app.get("/api/ppob/products", async (req, res) => {
    try {
      if (!supabase) {
        return res.json([
          {
            id: "1",
            category: "Pulsa",
            code: "TSEL10",
            name: "Telkomsel 10K",
            provider: "Telkomsel",
            base_price: 10000,
            is_active: true,
          },
        ]);
      }

      const { data, error } = await supabase
        .from("ppob_services")
        .select("*");

      if (error) throw error;

      res.json(data || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========================
  // USER PROFILE
  // ========================
  app.get("/api/user/profile/:userId", async (req, res) => {
    const { userId } = req.params;

    if (!supabase) {
      return res.json({
        id: userId,
        username: "demo",
        full_name: "Demo User",
        balance: 100000,
        role: "kasir",
      });
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========================
  // SYNC TRIPAY PRODUCTS
  // ========================
  app.get("/api/ppob/sync", async (req, res) => {
    try {
      const response = await axios.get(
        `${TRIPAY_API_URL}/merchant/payment-channel`,
        {
          headers: getTripayHeaders(),
        }
      );

      const products = response.data?.data || [];

      if (!supabase) {
        return res.json({ success: true, demo: true });
      }

      for (const p of products) {
        await supabase.from("ppob_services").upsert(
          {
            code: p.code,
            name: p.product_name,
            category: p.category,
            provider: p.operator,
            base_price: Number(p.price) || 0,
            is_active: p.status === "available",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "code" }
        );
      }

      res.json({ success: true, total: products.length });
    } catch (err: any) {
      res.status(500).json({
        error: err.response?.data || err.message,
      });
    }
  });

  // ========================
  // CREATE TRANSACTION
  // ========================
  app.post("/api/ppob/transaction", async (req, res) => {
    const { productCode, customerNumber, ref } = req.body;

    if (!productCode || !customerNumber || !ref) {
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      const response = await axios.post(
        `${TRIPAY_API_URL}/ppob/transaction/create`,
        {
          code: productCode,
          customer_no: customerNumber,
          api_ref: ref,
        },
        {
          headers: {
            ...getTripayHeaders(),
            "Content-Type": "application/json",
          },
        }
      );

      res.json(response.data);
    } catch (err: any) {
      res.status(500).json({
        error: err.response?.data || err.message,
      });
    }
  });

  // ========================
  // CHECK STATUS
  // ========================
  app.get("/api/ppob/status/:reference", async (req, res) => {
    try {
      const { reference } = req.params;

      const response = await axios.get(
        `${TRIPAY_API_URL}/ppob/transaction/status?reference=${reference}`,
        {
          headers: getTripayHeaders(),
        }
      );

      res.json(response.data);
    } catch (err: any) {
      res.status(500).json({ error: "status failed" });
    }
  });

  // ========================
  // CALLBACK TRIPAY (FIXED)
  // ========================
  app.post("/api/ppob/callback", async (req: any, res) => {
    try {
      const signature = req.headers["x-callback-signature"];
      const payload = req.rawBody;

      const expected = crypto
        .createHmac("sha256", process.env.TRIPAY_PRIVATE_KEY || "")
        .update(payload)
        .digest("hex");

      if (signature !== expected) {
        return res.status(403).json({ error: "invalid signature" });
      }

      const { reference, status } = req.body;

      let newStatus = "pending";
      if (status === "PAID") newStatus = "success";
      if (status === "FAILED" || status === "EXPIRED")
        newStatus = "failed";

      console.log("[CALLBACK]", reference, newStatus);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========================
  // TEST ROUTE
  // ========================
  app.get("/api/test", (req, res) => {
    res.send("FORSDIGPOS API ACTIVE");
  });

  // ========================
  // VITE / STATIC
  // ========================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running http://localhost:${PORT}`);
  });
}

startServer();