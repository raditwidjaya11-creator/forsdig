import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import crypto from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as tripayService from "./services/tripay.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Supabase Admin Client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  
  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
    console.error("[SERVER] CRITICAL: Supabase Admin credentials missing! System will not function correctly.");
  }

  const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceKey || 'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    }
  );

  // Heartbeat check for database accessibility
  const checkDb = async () => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) return;
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        console.warn(`[DB-HEARTBEAT] Warning: Profiles table might have issues: ${error.message}`);
      } else {
        console.log("[DB-HEARTBEAT] Connection to 'profiles' table confirmed.");
      }
    } catch (e) {
      console.error("[DB-HEARTBEAT] Failed to connect to database.");
    }
  };
  checkDb();

  // --- TRIPAY HANDLERS ---
  // Using services/tripay.ts for advanced Tripay logic

  // --- DIGIFLAZZ HANDLERS ---
  const DIGIFLAZZ_API_URL = "https://api.digiflazz.com/v1";
  
  // Helper for Digiflazz Signature
  const getDigiflazzSignature = (command: string) => {
    const username = process.env.DIGIFLAZZ_USERNAME || "";
    const apiKey = process.env.DIGIFLAZZ_API_KEY || "";
    return crypto.createHash("md5").update(username + apiKey + command).digest("hex");
  };

  // Action: Sync Products from Digiflazz
  const syncDigiflazzProducts = async () => {
    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
      return { success: false, message: "Supabase credentials missing" };
    }

    if (!process.env.DIGIFLAZZ_USERNAME || !process.env.DIGIFLAZZ_API_KEY) {
      return { success: false, error: "Digiflazz credentials missing" };
    }

    try {
      console.log("[SERVER] Starting Digiflazz PPOB Sync...");
      const response = await axios.post(`${DIGIFLAZZ_API_URL}/price-list`, {
        cmd: "prepaid",
        username: process.env.DIGIFLAZZ_USERNAME,
        sign: getDigiflazzSignature("PriceList")
      });

      const products = response.data.data;
      if (!Array.isArray(products)) throw new Error("Invalid response from Digiflazz");

      let syncedCount = 0;
      for (const p of products) {
        const { error } = await supabase.from("ppob_services").upsert({
          code: p.buyer_sku_code,
          name: p.product_name,
          category: p.category,
          provider: p.brand,
          base_price: p.price,
          is_active: p.buyer_product_status && p.seller_product_status,
          updated_at: new Date().toISOString(),
          description: p.desc
        }, { onConflict: 'code' });

        if (!error) syncedCount++;
      }

      console.log(`[SERVER] Digiflazz Sync completed: ${syncedCount} products updated`);
      return { success: true, count: syncedCount };
    } catch (error: unknown) {
      const err = error as Error;
      console.error("[SERVER] Digiflazz Sync Error:", err.message);
      return { success: false, error: err.message };
    }
  };

  // Universal Transaction Handler
  app.post("/api/ppob/transaction", async (req, res) => {
    const { productCode, customerNumber, ref, provider = 'Tripay' } = req.body;
    
    if (!productCode || !customerNumber || !ref) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`[PPOB] INITIATING (${provider}): Ref:${ref} | Product:${productCode}`);

    try {
      if (provider === 'Digiflazz') {
        const response = await axios.post(`${DIGIFLAZZ_API_URL}/transaction`, {
          username: process.env.DIGIFLAZZ_USERNAME,
          buyer_sku_code: productCode,
          customer_no: customerNumber,
          ref_id: ref,
          sign: getDigiflazzSignature(ref)
        });
        
        const data = response.data.data;
        res.json({
          success: true,
          data: {
            reference: data.ref_id,
            status: data.status,
            sn: data.sn,
            note: data.message
          }
        });
      } else {
        // Use Tripay Service
        try {
          const data = await tripayService.createTransaction({
            code: productCode,
            customer_no: customerNumber,
            api_ref: ref
          });
          res.json({ success: true, data });
        } catch (error: unknown) {
          throw error;
        }
      }
    } catch (error: unknown) {
      const err = error as any;
      const status = err.response?.status || 500;
      res.status(status).json({ 
        error: err.response?.data?.message || err.message,
        details: err.response?.data 
      });
    }
  });

  // Proxy: Multi-provider Sync
  app.post("/api/ppob/sync", async (req, res) => {
    const { provider = 'Tripay' } = req.body;
    const result = provider === 'Digiflazz' ? await syncDigiflazzProducts() : await syncPPOBProducts();
    
    if (result.success) {
      res.json({ message: `Synced ${result.count} products from ${provider}` });
    } else {
      res.status(500).json({ error: result.error || `Failed to sync from ${provider}` });
    }
  });

  // Proxy: Fetch PPOB Products from DB
  app.get("/api/ppob/products", async (req, res) => {
    try {
      if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
        return res.status(500).json({ 
          error: "Konfigurasi Supabase Server (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY) tidak ditemukan. Mode Demo dinonaktifkan.",
          code: "CONFIG_MISSING" 
        });
      }

      let query = supabase.from("ppob_services").select("*");
      
      // Attempt to filter by is_active, but handle cases where column might be missing
      let { data, error } = await query.eq("is_active", true);
      
      if (error) {
        console.error("[SERVER] Table 'ppob_services' Fetch Error:", error.message);
        
        // If column doesn't exist, retry without filter
        if (error.message.includes("column") && error.message.includes("does not exist")) {
          console.warn("[SERVER] 'is_active' column missing in 'ppob_services'. Retrying without filter.");
          const { data: retryData, error: retryError } = await supabase.from("ppob_services").select("*");
          if (!retryError) data = retryData;
          else error = retryError;
        }
      }

      if (error) {
        if (error.message.includes("Could not find the table") || error.code === '42P01') {
          console.warn("[SERVER] Table 'ppob_services' not found. Returning migration instruction.");
          return res.status(404).json({ 
            error: "Tabel 'ppob_services' tidak ditemukan. Silakan jalankan SQL schema terbaru di dashboard Supabase.",
            code: "TABLE_NOT_FOUND" 
          });
        }

        if (error.message.includes("permission denied")) {
          return res.status(403).json({
            error: "Izin ditolak untuk mengakses 'ppob_services'. Pastikan SERVICE_ROLE_KEY di server benar dan GRANT ALL TO service_role sudah dijalankan di Supabase SQL Editor.",
            code: "PERMISSION_DENIED"
          });
        }
        throw error;
      }
      res.json(data || []);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Fetch Products Error:", err.message);
      res.status(500).json({ error: err.message || "Failed to fetch products" });
    }
  });

  // Proxy: Fetch User Profile
  app.get("/api/user/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`[SERVER] API GET /api/user/profile/${userId}`);

      if (!userId || userId === 'undefined' || userId === 'null') {
        return res.status(400).json({ error: "Invalid User ID disediakan" });
      }

      if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
        return res.status(500).json({ 
          error: "Konfigurasi Supabase Server (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY) tidak ditemukan.",
          code: "CONFIG_MISSING" 
        });
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // maybeSingle doesn't throw error if not found
      
      if (error) {
        console.error(`[SERVER] Profile Fetch DB Error for ${userId}:`, error.message);
        return res.status(500).json({ error: error.message, code: error.code });
      }
      
      if (!data) {
        console.log(`[SERVER] Profile not found for ${userId}. Attempting to auto-create...`);
        // Auto-create profile if missing (Admin context using service_role)
        const { data: newProfile, error: createErr } = await supabase
          .from("profiles")
          .insert({ 
            id: userId, 
            username: `user_${userId.substring(0, 5)}`,
            full_name: 'New User',
            balance: 0,
            role: 'kasir',
            status: 'active'
          })
          .select()
          .single();
        
        if (createErr) {
          console.error(`[SERVER] Profile Auto-Creation Error for ${userId}:`, createErr.message);
          return res.status(500).json({ error: "Gagal membuat profil otomatis", details: createErr.message });
        }
        return res.json(newProfile);
      }

      res.json(data);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("[SERVER] Profile Endpoint Critical Error:", err.message);
      res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  });

  // Action: Sync Products from Tripay to DB
  const syncPPOBProducts = async () => {
    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
      console.log("[SERVER] Sync skipped: Supabase credentials missing");
      return { success: false, message: "Supabase credentials missing" };
    }

    try {
      console.log("[SERVER] Starting PPOB Sync with Tripay via service...");
      const products = await tripayService.getProducts();
      
      let syncedCount = 0;
      for (const p of products) {
        const { error } = await supabase.from("ppob_services").upsert({
          code: p.code,
          name: p.product_name,
          category: p.category || 'Lainnya',
          provider: p.operator || 'Lainnya',
          base_price: p.price,
          is_active: p.status === 'available',
          updated_at: new Date().toISOString()
        }, { onConflict: 'code' });

        if (!error) syncedCount++;
      }

      console.log(`[SERVER] Tripay Sync completed: ${syncedCount} products updated`);
      return { success: true, count: syncedCount };
    } catch (error: unknown) {
      const err = error as Error;
      console.error("[SERVER] Tripay Sync Error:", err.message);
      return { success: false, error: err.message };
    }
  };

  // Simple "Scheduled" Sync every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    syncPPOBProducts().catch(err => console.error("[SERVER] auto-sync failed:", err.message));
  }, TWENTY_FOUR_HOURS);

  // Initial sync on start if enabled
  if (process.env.AUTO_SYNC_ON_START === 'true') {
    setTimeout(() => {
      syncPPOBProducts().catch(() => {});
    }, 5000); // Wait 5s for DB to be ready
  }

  // Action: Check Transaction Status
  app.get("/api/ppob/status/:reference", async (req, res) => {
    try {
      const { reference } = req.params;
      const data = await tripayService.getTransactionStatus(reference);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to check status" });
    }
  });

  // Action: Check Transaction Status from Tripay (External Only)
  app.get("/api/ppob/check-status/:reference", async (req, res) => {
    const { reference } = req.params;
    if (!reference) return res.status(400).json({ error: "Reference is required" });

    console.log(`[PPOB] STATUS CHECK: Ref:${reference}`);

    try {
      const data = await tripayService.getTransactionStatus(reference);
      console.log(`[PPOB] STATUS RESPONSE: Ref:${reference} | Status:${data?.status}`);
      res.json({ success: true, data });
    } catch (error: any) {
      const status = error.response?.status || 500;
      console.error(`[PPOB] STATUS ERROR: Ref:${reference} | Error:`, error.message);
      res.status(status).json({ error: "Failed to fetch status from Tripay", details: error.message });
    }
  });

  // Route: Tripay Webhook Callback
  app.post("/api/ppob/callback", async (req, res) => {
    const signature = req.headers["x-callback-signature"];
    const payload = JSON.stringify(req.body);
    
    // Verify Signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.TRIPAY_PRIVATE_KEY || "")
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(403).json({ error: "Invalid signature" });
    }

    const { reference, api_ref, status, sn, note } = req.body;

    try {
      // 1. Get Transaction from DB
      const { data: transaction, error: fetchErr } = await supabase
        .from("ppob_transactions")
        .select("*")
        .eq("reference", reference)
        .single();

      if (fetchErr || !transaction) {
        console.error("Transaction not found for callback:", reference);
        return res.status(404).json({ error: "Transaction not found" });
      }

      // 2. Map Tripay Status to DB Status
      let newStatus = "pending";
      if (status === "Success") newStatus = "success";
      if (status === "Failed") newStatus = "failed";

      // 3. If failed/refunded, return balance to user
      if (newStatus === "failed" && transaction.status !== "failed") {
        await supabase.rpc("process_transaction", {
          p_user_id: transaction.user_id,
          p_amount: transaction.total,
          p_type: "refund",
          p_description: `Refund for PPOB ${transaction.product_name} (${api_ref})`,
          p_reference_id: transaction.id
        });
      }

      // 4. Update Transaction Status (Lowercase)
      await supabase
        .from("ppob_transactions")
        .update({
          status: newStatus,
          sn: sn || transaction.sn,
          notes: note || transaction.notes,
          updated_at: new Date().toISOString()
        })
        .eq("id", transaction.id);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Callback Processing Error:", error.message);
      res.status(500).json({ error: "Failed to process callback" });
    }
  });

  // --- ADMIN ENDPOINTS ---
  
  // Get all users (Admin only)
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
        return res.status(500).json({ error: "Supabase configuration missing" });
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("[ADMIN] Fetch Users Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Adjust User Balance (Admin only)
  app.post("/api/admin/adjust-balance", async (req, res) => {
    try {
      const { userId, amount, type, description } = req.body;
      
      if (!userId || amount === undefined || !type) {
        return res.status(400).json({ error: "Missing required fields: userId, amount, type" });
      }

      if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
        return res.json({ success: true, message: "Demo mode: Balance adjustment simulated" });
      }

      // Use RPC process_transaction for atomic update
      const { data, error } = await supabase.rpc("process_transaction", {
        p_user_id: userId,
        p_amount: amount, // amount should be positive for topup, negative for deduction
        p_type: type, // 'topup' or 'deduction'
        p_description: description || `Adjustment (${type}) by Admin`,
        p_reference_id: `ADM-${Date.now()}`
      });

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      console.error("[ADMIN] Adjust Balance Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all Mutations (Admin only)
  app.get("/api/admin/mutations", async (req, res) => {
    try {
      if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
        return res.status(500).json({ error: "Supabase configuration missing" });
      }

      const { data, error } = await supabase
        .from("balance_mutations")
        .select(`
          *,
          profiles:user_id (full_name, username)
        `)
        .order("timestamp", { ascending: false })
        .limit(200);
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("[ADMIN] Fetch Mutations Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
