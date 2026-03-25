import { db } from '../config/firebase';
import { initialData } from '../utils/mockData';

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

// CRUD Operations
export const saveDoc = async (colName, id, data) => {
  try {
    await db.collection(colName).doc(id).set(data);
  } catch(e) {
    console.error("Error guardando doc", colName, id, e);
  }
};

export const deleteDoc = async (colName, id) => {
  try {
    await db.collection(colName).doc(id).delete();
  } catch(e) {
    console.error("Error borrando doc", colName, id, e);
  }
};

export const updateDoc = async (colName, id, data) => {
  try {
    await db.collection(colName).doc(id).update(data);
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
