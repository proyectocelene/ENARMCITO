// src/firebase/firebaseConfig.js
// Configuración de Firebase Firestore con modo híbrido y soporte offline

import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

// Configuración leída de variables de entorno o editable directamente
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== "TU_API_KEY"
);

let app = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      // Inicializar Firestore con persistencia offline en IndexedDB
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
      console.log("🔥 Firebase Firestore inicializado con soporte offline activo");
    } else {
      app = getApps()[0];
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn("⚠️ Error al inicializar Firebase, operando en modo local:", err);
    db = null;
  }
} else {
  console.log("📦 ENARMCITO corriendo en Modo Local / IndexedDB (configura Firebase cuando estés listo)");
}

export { app, db };
