// src/firebase/firebaseConfig.js
// Configuración de Firebase Firestore con modo híbrido y soporte offline

import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

// Configuración leída de variables de entorno o valores predeterminados del proyecto
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDtzA61SABGfonAJpXMVSCx8U6eSuhm8AA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "enarmcito-a225e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "enarmcito-a225e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "enarmcito-a225e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "821257513613",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:821257513613:web:94f867b4bfe24fca26d0c4"
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
      console.log("🔥 Firebase Firestore inicializado con soporte offline activo (enarmcito-a225e)");
    } else {
      app = getApps()[0];
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn("⚠️ Error al inicializar Firebase, operando en modo local:", err);
    db = null;
  }
} else {
  console.log("📦 ENARMCITO corriendo en Modo Local / IndexedDB");
}

export { app, db };
