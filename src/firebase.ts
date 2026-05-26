/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

/**
 * IMPORTANT — Firebase Auth on GitHub Pages:
 *
 * Firebase's signInWithRedirect stores OAuth state in sessionStorage.
 * On GitHub Pages (and any storage-partitioned environment) sessionStorage
 * is unavailable inside the Firebase-hosted auth iframe, so redirect flow
 * ALWAYS fails with "missing initial state".
 *
 * Keep authDomain on the Firebase project domain. The live GitHub Pages host
 * must be added separately in Firebase Console →
 * Authentication → Settings → Authorized domains.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCu8RuX9cSeJfDBCuB-QqhHR00I2PKgEPo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gbmnsubmit.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gbmnsubmit',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gbmnsubmit.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '427592261852',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:427592261852:web:693e8ab33827d5f83a5419',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-JS59R1ZZFG',
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.appId
);

export const firebaseEnabled = hasFirebaseConfig;

export const firebaseApp: FirebaseApp | null = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const firestore: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
export const firebaseStorage: FirebaseStorage | null = firebaseApp ? getStorage(firebaseApp) : null;
export const firebaseAnalyticsPromise: Promise<Analytics | null> = firebaseApp
  ? isSupported().then(supported => supported ? getAnalytics(firebaseApp) : null).catch(() => null)
  : Promise.resolve(null);

/**
 * Sign in with Google using popup only.
 * Redirect flow is intentionally NOT used — it requires sessionStorage
 * which is unavailable in storage-partitioned environments (GitHub Pages).
 */
export async function signInWithGoogle() {
  if (!firebaseAuth) {
    throw new Error('Firebase configuration is not connected yet.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(firebaseAuth, provider);
}

export async function signInWithPassword(email: string, password: string) {
  if (!firebaseAuth) throw new Error('Firebase configuration is not connected yet.');
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function createPasswordAccount(email: string, password: string) {
  if (!firebaseAuth) throw new Error('Firebase configuration is not connected yet.');
  return createUserWithEmailAndPassword(firebaseAuth, email, password);
}

export async function sendFirebasePasswordReset(email: string) {
  if (!firebaseAuth) throw new Error('Firebase configuration is not connected yet.');
  return sendPasswordResetEmail(firebaseAuth, email);
}

export async function changeFirebasePassword(newPassword: string) {
  if (!firebaseAuth?.currentUser) throw new Error('Please sign in again before changing password.');
  return updatePassword(firebaseAuth.currentUser, newPassword);
}

export async function signOutFirebase() {
  if (!firebaseAuth) return;
  return signOut(firebaseAuth);
}

export function subscribeFirebaseAuth(callback: (user: FirebaseUser | null) => void) {
  if (!firebaseAuth) return () => {};
  return onAuthStateChanged(firebaseAuth, callback);
}


export function startOrcidAuthentication() {
  const clientId = import.meta.env.VITE_ORCID_CLIENT_ID;
  if (!clientId) {
    throw new Error('ORCID OAuth requires a public ORCID client ID and redirect URL registration.');
  }
  const redirectUri = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: '/authenticate',
    redirect_uri: redirectUri,
  });
  window.location.href = `https://orcid.org/oauth/authorize?${params.toString()}`;
}
