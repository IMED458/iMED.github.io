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
  type Auth,
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
 * Fix: set authDomain to the ACTUAL hosting domain (gbmnsubmit.github.io)
 * so Firebase opens the popup/redirect on the same origin.
 * Also add 'gbmnsubmit.github.io' to Firebase Console →
 * Authentication → Settings → Authorized domains.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCu8RuX9cSeJfDBCuB-QqhHR00I2PKgEPo',
  // Use the actual hosting domain — NOT firebaseapp.com — to avoid cross-origin
  // sessionStorage issues on GitHub Pages.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gbmnsubmit.github.io',
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

/** No-op — redirect flow removed. Kept for import compatibility. */
export async function getGoogleRedirectResult() {
  return null;
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
