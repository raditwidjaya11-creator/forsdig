import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== '' &&
  !firebaseConfig.apiKey.includes('placeholder')
);

// Memory cache for active authenticated user ID to prevent concurrent local storage locking issues
let cachedUserId: string | null = null;

export const setCachedUserId = (id: string | null) => {
  console.log(`[ForsDig POS] Supplying memory-cached Firebase userId: ${id}`);
  cachedUserId = id;
};

export const getCachedUserId = (): string | null => {
  return cachedUserId;
};

async function testConnection() {
  if (!isFirebaseConfigured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("[ForsDig POS] Firebase Firestore initialization check passed.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    } else {
      console.log("[ForsDig POS] Firebase check completed.");
    }
  }
}

testConnection();
