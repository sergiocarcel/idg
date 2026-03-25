import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import "firebase/compat/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCdkEYlyjCgzcgQn6yFVHPI_igy0e0kJ0M",
  authDomain: "idg-crm.firebaseapp.com",
  projectId: "idg-crm",
  storageBucket: "idg-crm.firebasestorage.app",
  messagingSenderId: "831560014827",
  appId: "1:831560014827:web:7d4b0d2c6e5a51c6b6d7ae"
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

export { app, db, auth, storage };
