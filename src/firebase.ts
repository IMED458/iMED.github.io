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

export async function signInWithGoogle() {
  if (!firebaseAuth) {
    throw new Error('Firebase configuration is not connected yet.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(firebaseAuth, provider);
}
