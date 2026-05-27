import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

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

  // --- ADMIN ENDPOINTS ---
  
  // Get all users (Admin only)
  app.get("/api/admin/users", async (req: Request, res: Response) => {
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
  app.post("/api/admin/adjust-balance", async (req: Request, res: Response) => {
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
  app.get("/api/admin/mutations", async (req: Request, res: Response) => {
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
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
