import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAElvJh1S1M-7yg-W3XIYOkz-f7QttI4lI",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "guia-de-coccion.firebaseapp.com",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    "https://guia-de-coccion-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "guia-de-coccion",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "guia-de-coccion.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "184979337863",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || "1:184979337863:web:bb459811e7886f55103e22",
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  db = getFirestore(app);
}

const storage = getStorage(app);

export { app, auth, db, storage, serverTimestamp };
