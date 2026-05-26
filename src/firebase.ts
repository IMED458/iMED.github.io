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
  signInWithRedirect,
  getRedirectResult,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

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
 * Sign in with Google. Tries popup first; if sessionStorage is unavailable
 * (partitioned browser, IDP-initiated SAML) automatically falls back to redirect.
 */
export async function signInWithGoogle() {
  if (!firebaseAuth) {
    throw new Error('Firebase configuration is not connected yet.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // Detect sessionStorage availability (causes the "missing initial state" error)
  let sessionStorageAvailable = false;
  try {
    const testKey = '__gbmn_ss_test__';
    sessionStorage.setItem(testKey, '1');
    sessionStorage.removeItem(testKey);
    sessionStorageAvailable = true;
  } catch {
    sessionStorageAvailable = false;
  }

  if (!sessionStorageAvailable) {
    // Redirect flow — page will reload; result handled in getGoogleRedirectResult()
    return signInWithRedirect(firebaseAuth, provider);
  }

  try {
    return await signInWithPopup(firebaseAuth, provider);
  } catch (error: any) {
    // Popup blocked or storage partitioned — fall back to redirect
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('missing initial state') ||
      error?.message?.includes('storage-partitioned')
    ) {
      return signInWithRedirect(firebaseAuth, provider);
    }
    throw error;
  }
}

/** Call once on app mount to capture the redirect result after Google sign-in. */
export async function getGoogleRedirectResult() {
  if (!firebaseAuth) return null;
  try {
    return await getRedirectResult(firebaseAuth);
  } catch {
    return null;
  }
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
