import { messaging, db } from '../config/firebase';
import { isBlaze } from './userAdmin';
import firebase from 'firebase/compat/app';

export function isFcmSupported() {
  return (
    isBlaze() &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

// Registers the SW, requests browser permission, retrieves FCM token
export async function requestPermissionAndToken() {
  if (!isFcmSupported()) return null;
  if (Notification.permission === 'denied') return null;

  const registration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js'
  );

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const token = await messaging.getToken({
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  return token;
}

// Stores the FCM token for this user in fcmTokens/{email}
export async function registerCurrentUserToken(email, token) {
  if (!email || !token) return;
  const ref = db.collection('fcmTokens').doc(email);
  const snap = await ref.get();
  if (snap.exists && (snap.data().tokens || []).includes(token)) return;
  await ref.set(
    {
      tokens: firebase.firestore.FieldValue.arrayUnion(token),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// Subscribe to foreground messages (tab is open)
export function onForegroundMessage(callback) {
  if (!isFcmSupported()) return () => {};
  return messaging.onMessage((payload) => {
    callback(payload);
  });
}

// Removes a FCM token on logout
export async function unregisterToken(email, token) {
  if (!email || !token) return;
  const ref = db.collection('fcmTokens').doc(email);
  await ref.update({
    tokens: firebase.firestore.FieldValue.arrayRemove(token),
    updatedAt: new Date().toISOString(),
  });
}
