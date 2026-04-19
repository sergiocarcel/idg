const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

// Firestore trigger: send FCM push when a new notification is created
const { onNotificacionCreated } = require("./notifications");
exports.onNotificacionCreated = onNotificacionCreated;

// Verifies that the caller is an active admin in config/usuarios
async function assertAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para realizar esta acción.");
  }
  const callerEmail = request.auth.token.email;
  const db = getFirestore();
  const configSnap = await db.collection("config").doc("usuarios").get();
  const list = configSnap.data()?.list ?? [];
  const caller = list.find((u) => u.email === callerEmail);
  if (!caller || caller.rol !== "admin" || caller.activo === false) {
    throw new HttpsError("permission-denied", "Solo los administradores activos pueden gestionar usuarios.");
  }
}

// Creates a Firebase Auth account and adds the user to config/usuarios
exports.createUser = onCall(async (request) => {
  await assertAdmin(request);

  const { email, password, nombre, rol } = request.data;
  if (!email || !password || !nombre || !rol) {
    throw new HttpsError("invalid-argument", "Faltan campos obligatorios: email, password, nombre, rol.");
  }
  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "La contraseña debe tener al menos 6 caracteres.");
  }

  const auth = getAuth();
  const db = getFirestore();

  // Create the Auth account
  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: nombre });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Ya existe una cuenta de Firebase Auth con ese email.");
    }
    throw new HttpsError("internal", `Error creando cuenta: ${err.message}`);
  }

  // Add to config/usuarios list
  const configRef = db.collection("config").doc("usuarios");
  const snap = await configRef.get();
  const list = snap.data()?.list ?? [];
  const newEntry = {
    id: "U" + Date.now(),
    uid: userRecord.uid,
    nombre,
    email,
    rol,
    activo: true,
  };
  list.push(newEntry);
  await configRef.set({ list }, { merge: true });

  return { uid: userRecord.uid, id: newEntry.id };
});

// Deletes a Firebase Auth account and removes the user from config/usuarios
exports.deleteUser = onCall(async (request) => {
  await assertAdmin(request);

  const { uid, id, email } = request.data;
  if (!id) {
    throw new HttpsError("invalid-argument", "El campo id es obligatorio.");
  }

  const auth = getAuth();
  const db = getFirestore();

  // Resolve uid if not provided (legacy Spark-created users without uid)
  let resolvedUid = uid;
  if (!resolvedUid && email) {
    try {
      const userRecord = await auth.getUserByEmail(email);
      resolvedUid = userRecord.uid;
    } catch {
      // No Auth account found — only remove Firestore entry
    }
  }

  if (resolvedUid) {
    try {
      await auth.deleteUser(resolvedUid);
    } catch (err) {
      if (err.code !== "auth/user-not-found") {
        throw new HttpsError("internal", `Error eliminando cuenta Auth: ${err.message}`);
      }
    }
  }

  // Remove from config/usuarios list
  const configRef = db.collection("config").doc("usuarios");
  const snap = await configRef.get();
  const list = (snap.data()?.list ?? []).filter((u) => u.id !== id);
  await configRef.set({ list }, { merge: true });

  return { deleted: true };
});

// Generates a password reset link for the given email and returns it to the caller
exports.resetUserPassword = onCall(async (request) => {
  await assertAdmin(request);

  const { email } = request.data;
  if (!email) {
    throw new HttpsError("invalid-argument", "El campo email es obligatorio.");
  }

  const auth = getAuth();
  try {
    const link = await auth.generatePasswordResetLink(email);
    return { link };
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "No existe ninguna cuenta de Firebase Auth con ese email.");
    }
    throw new HttpsError("internal", `Error generando enlace: ${err.message}`);
  }
});

// Enables or disables a Firebase Auth account and syncs the activo flag in Firestore
exports.toggleUserActive = onCall(async (request) => {
  await assertAdmin(request);

  const { uid, id, email, disabled } = request.data;
  if (disabled === undefined || !id) {
    throw new HttpsError("invalid-argument", "Los campos id y disabled son obligatorios.");
  }

  const auth = getAuth();
  const db = getFirestore();

  // Resolve uid if not provided
  let resolvedUid = uid;
  if (!resolvedUid && email) {
    try {
      const userRecord = await auth.getUserByEmail(email);
      resolvedUid = userRecord.uid;
    } catch {
      // No Auth account — skip Auth update, only update Firestore
    }
  }

  if (resolvedUid) {
    try {
      await auth.updateUser(resolvedUid, { disabled });
    } catch (err) {
      if (err.code !== "auth/user-not-found") {
        throw new HttpsError("internal", `Error actualizando cuenta Auth: ${err.message}`);
      }
    }
  }

  // Sync activo in config/usuarios list
  const configRef = db.collection("config").doc("usuarios");
  const snap = await configRef.get();
  const list = (snap.data()?.list ?? []).map((u) =>
    u.id === id ? { ...u, activo: !disabled } : u
  );
  await configRef.set({ list }, { merge: true });

  return { activo: !disabled };
});
