import { functions } from '../config/firebase';

export const isBlaze = () => import.meta.env.VITE_FIREBASE_MODE === 'blaze';

function callable(name) {
  return functions.httpsCallable(name);
}

export async function createUserRemote({ email, password, nombre, rol }) {
  const { data } = await callable('createUser')({ email, password, nombre, rol });
  return data; // { uid, id }
}

export async function deleteUserRemote({ uid, id, email }) {
  const { data } = await callable('deleteUser')({ uid, id, email });
  return data; // { deleted: true }
}

// Returns { link } — share the link with the user so they can reset their password
export async function resetUserPasswordRemote({ email }) {
  const { data } = await callable('resetUserPassword')({ email });
  return data; // { link }
}

export async function toggleUserActiveRemote({ uid, id, email, disabled }) {
  const { data } = await callable('toggleUserActive')({ uid, id, email, disabled });
  return data; // { activo }
}
