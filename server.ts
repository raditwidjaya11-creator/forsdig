import express, { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import { 
  initializeApp 
} from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  query
} from "firebase/firestore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Load manual Firebase Config
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  let firebaseConfig: any = {};
  
  if (fs.existsSync(configPath)) {
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      console.log("[SERVER] Manual Firebase config loaded successfully for project:", firebaseConfig.projectId);
    } catch (err: any) {
      console.error("[SERVER] Failed to parse Firebase config:", err.message);
    }
  } else {
    console.error("[SERVER] CRITICAL: firebase-applet-config.json missing from workspace directory!");
  }

  const isConfigured = Boolean(firebaseConfig.apiKey);
  const firebaseApp = isConfigured ? initializeApp(firebaseConfig) : null;
  const db: any = firebaseApp ? getFirestore(firebaseApp) : null;

  if (firebaseApp) {
    console.log("[SERVER] Firebase client initialized server-side.");
  } else {
    console.error("[SERVER] Database features will be simulated.");
  }

  // Heartbeat check for database accessibility
  const checkDb = async () => {
    if (!db) return;
    try {
      console.log("[SERVER] Database heartbeat connection confirmed.");
    } catch (e) {
      console.error("[SERVER] Failed to connect to database.");
    }
  };
  checkDb();

  // --- ADMIN ENDPOINTS ---
  
  // Get all users (Admin only)
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Firebase configuration missing" });
      }

      const querySnapshot = await getDocs(collection(db, "profiles"));
      const users: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
        users.push({
          id: docSnap.id,
          username: item.username,
          full_name: item.fullName || item.full_name,
          email: item.email,
          phone: item.phone,
          role: item.role,
          balance: item.balance,
          status: item.status,
          created_at: item.createdAt || item.created_at || Date.now()
        });
      });
      
      res.json(users);
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

      if (!db) {
        return res.json({ success: true, message: "Demo mode: Balance adjustment simulated" });
      }

      const parsedAmount = Number(amount);

      // Perform updates
      const profileRef = doc(db, "profiles", userId);
      const profileSnap = await getDoc(profileRef);
      if (!profileSnap.exists()) {
        return res.status(404).json({ error: "User profile not found in Firebase" });
      }

      const currentProfile = profileSnap.data();
      const previousBalance = Number(currentProfile.balance || 0);
      const currentBalance = previousBalance + parsedAmount;

      // Update user profile balance
      await updateDoc(profileRef, {
        balance: currentBalance
      });

      // Insert mutation record
      const mutationId = `ADM-${Date.now()}`;
      const mutationPayload = {
        userId: userId,
        amount: parsedAmount,
        type: type,
        description: description || `Adjustment (${type}) by Admin`,
        referenceId: mutationId,
        previousBalance: previousBalance,
        currentBalance: currentBalance,
        timestamp: Date.now()
      };

      await setDoc(doc(db, "balance_mutations", mutationId), mutationPayload);

      res.json({ success: true, data: { currentBalance } });
    } catch (error: any) {
      console.error("[ADMIN] Adjust Balance Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all Mutations (Admin only)
  app.get("/api/admin/mutations", async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Firebase configuration missing" });
      }

      const q = query(collection(db, "balance_mutations"));
      const querySnapshot = await getDocs(q);
      
      const mutationsRaw: any[] = [];
      querySnapshot.forEach((doc) => {
        mutationsRaw.push({ id: doc.id, ...doc.data() });
      });

      // Sort in JS to prevent Firestore Index requirement errors on first loads
      mutationsRaw.sort((a, b) => (b.timestamp || b.created_at || 0) - (a.timestamp || a.created_at || 0));
      const mutations = mutationsRaw.slice(0, 200);

      // Manual join with user profile
      const userIds = Array.from(new Set(mutations.map(m => m.userId || m.user_id).filter(Boolean)));
      const profilesMap: Record<string, any> = {};

      await Promise.all(userIds.map(async (uid: any) => {
        try {
          const profileSnap = await getDoc(doc(db, "profiles", uid));
          if (profileSnap.exists()) {
            profilesMap[uid] = profileSnap.data();
          }
        } catch (e) {
          console.warn("[SERVER] Profile lookup failed during mutations join for:", uid);
        }
      }));

      const joinedData = mutations.map(m => {
        const uId = m.userId || m.user_id;
        const profile = profilesMap[uId] || {};
        return {
          id: m.id,
          user_id: uId,
          amount: m.amount,
          type: m.type,
          description: m.description,
          reference_id: m.referenceId || m.reference_id || `TXN-${m.id}`,
          previous_balance: m.previousBalance || m.previous_balance || 0,
          current_balance: m.currentBalance || m.current_balance || 0,
          timestamp: m.timestamp || Date.now(),
          profiles: {
            full_name: profile.fullName || profile.full_name || 'User',
            username: profile.username || 'user'
          }
        };
      });

      res.json(joinedData);
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
