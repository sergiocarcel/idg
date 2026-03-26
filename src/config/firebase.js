import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import "firebase/compat/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializamos la app en compat mode para facilitar la migración del HTML viejo al principio
const app = firebase.initializeApp(firebaseConfig);
const db = app.firestore();
const auth = app.auth();
const storage = app.storage();

// Conectar a emuladores locales en desarrollo
if (import.meta.env.DEV) {
  db.useEmulator("127.0.0.1", 8080);
  auth.useEmulator("http://127.0.0.1:9099");
  storage.useEmulator("127.0.0.1", 9199);
  console.log("🔥 Firebase Emulators Connected");
}

export { firebase, app, db, auth, storage };
