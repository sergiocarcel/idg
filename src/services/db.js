import { db, auth } from '../config/firebase';
import { initialData } from '../utils/mockData';
import { AUDIT_COLLECTIONS, computeDiff, createLog, extractEntityLabel } from './logs';

// Listen real-time
export const listenToCollection = (colName, callback) => {
  return db.collection(colName).onSnapshot(snapshot => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, error => {
    console.error("Error en listener de", colName, error);
    callback([]);
  });
};

function now() { return new Date().toISOString(); }
function currentEmail() { return auth.currentUser?.email || 'sistema'; }

// CRUD Operations
export const saveDoc = async (colName, id, data) => {
  try {
    if (!AUDIT_COLLECTIONS.includes(colName)) {
      await db.collection(colName).doc(id).set(data);
      return;
    }

    const prevSnap = await db.collection(colName).doc(id).get();
    const isCreate = !prevSnap.exists;
    const ts = now();
    const email = currentEmail();

    const enrichedData = {
      ...data,
      updatedAt: ts,
      updatedBy: email,
      ...(isCreate ? { createdAt: ts, createdBy: email } : {}),
    };

    await db.collection(colName).doc(id).set(enrichedData);

    const cambios = isCreate ? [] : computeDiff(prevSnap.data(), data);
    if (isCreate || cambios.length > 0) {
      await createLog({
        entidad: colName,
        entidadId: id,
        entidadLabel: extractEntityLabel(data),
        accion: isCreate ? 'create' : 'update',
        cambios,
      });
    }
  } catch(e) {
    console.error("Error guardando doc", colName, id, e);
  }
};

export const deleteDoc = async (colName, id) => {
  try {
    if (!AUDIT_COLLECTIONS.includes(colName)) {
      await db.collection(colName).doc(id).delete();
      return;
    }

    const prevSnap = await db.collection(colName).doc(id).get();
    const label = prevSnap.exists ? extractEntityLabel(prevSnap.data()) : id;

    await db.collection(colName).doc(id).delete();

    await createLog({
      entidad: colName,
      entidadId: id,
      entidadLabel: label,
      accion: 'delete',
      cambios: [],
    });
  } catch(e) {
    console.error("Error borrando doc", colName, id, e);
  }
};

export const updateDoc = async (colName, id, data) => {
  try {
    if (!AUDIT_COLLECTIONS.includes(colName)) {
      await db.collection(colName).doc(id).update(data);
      return;
    }

    const prevSnap = await db.collection(colName).doc(id).get();
    const ts = now();
    const email = currentEmail();

    await db.collection(colName).doc(id).update({
      ...data,
      updatedAt: ts,
      updatedBy: email,
    });

    const cambios = prevSnap.exists ? computeDiff(prevSnap.data(), data) : [];
    if (cambios.length > 0) {
      await createLog({
        entidad: colName,
        entidadId: id,
        entidadLabel: prevSnap.exists ? extractEntityLabel(prevSnap.data()) : id,
        accion: 'update',
        cambios,
      });
    }
  } catch(e) {
    console.error("Error actualizando doc", colName, id, e);
  }
};

// Configuración inicial si Firebase está vacío
export const seedDatabaseIfNeeded = async () => {
  try {
    const configSnap = await db.collection('config').get();
    if (configSnap.empty) {
      console.warn("🌱 Base de datos vacía. Sembrando datos mock automáticamente...");

      // Colecciones en array
      const colNames = ['clientes', 'obras', 'presupuestos', 'pedidos', 'materiales', 'proveedores', 'trabajadores', 'registroHoras', 'documentosRRHH', 'facturas'];

      for (const col of colNames) {
        if (initialData[col] && initialData[col].length > 0) {
          for (const item of initialData[col]) {
            await db.collection(col).doc(item.id).set(item);
          }
        }
      }

      // Configuración (Documento especial admin)
      await db.collection('config').doc('empresa').set(initialData.config.empresa);
      await db.collection('config').doc('usuarios').set({ list: initialData.config.usuarios });

      console.log("✅ Siembra completada con éxito.");
    }
  } catch (error) {
    console.error("Error al sembrar base de datos:", error);
  }
};
