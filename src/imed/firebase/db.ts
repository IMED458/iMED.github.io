// ============================================================
// iMED — მონაცემთა შრე
//
// ⚠ ლოკალური რეჟიმი: ამჟამად Firebase გათიშულია და ყველა
// მონაცემი ინახება ბრაუზერში (localStorage), localBackend.ts-ის
// მეშვეობით. Firebase-ზე გადასართავად იხ. ქვემოთ.
// ============================================================

import * as local from './localBackend';

// — Firebase-თავსებადი ექსპორტები (ლოკალური იმპლემენტაცია) —
export const firebaseApp = local.localApp;
export const firebaseAuth = local.localAuth;
export const firestore = local.localFirestore;
export const firebaseStorage = local.localStorageRef;

export const collection = local.collection;
export const doc = local.doc;
export const getDoc = local.getDoc;
export const getDocs = local.getDocs;
export const setDoc = local.setDoc;
export const addDoc = local.addDoc;
export const updateDoc = local.updateDoc;
export const query = local.query;
export const where = local.where;
export const orderBy = local.orderBy;
export const limit = local.limit;
export const serverTimestamp = local.serverTimestamp;
export const Timestamp = local.Timestamp;
export const onSnapshot = local.onSnapshot;
export const writeBatch = local.writeBatch;
export const deleteField = local.deleteField;

export const signInWithEmailAndPassword = local.signInWithEmailAndPassword;
export const createUserWithEmailAndPassword = local.createUserWithEmailAndPassword;
export const adminCreateAuthUser = local.adminCreateAuthUser;
export const adminResetPassword = local.adminResetPassword;
export const signOut = local.signOut;
export const onAuthStateChanged = local.onAuthStateChanged;

export const ref = local.ref;
export const uploadBytes = local.uploadBytes;
export const getDownloadURL = local.getDownloadURL;

export const seedLocalBackend = local.seedLocalBackend;
export const SEEDED_ADMIN = local.SEEDED_ADMIN;

export type FirebaseUser = { uid: string; email: string };
export type QueryConstraint = any;
export type Unsubscribe = () => void;

// Firestore კოლექციების სახელები
export const COLLECTIONS = {
  USERS: 'imed_users',
  PATIENTS: 'imed_patients',
  APPOINTMENTS: 'imed_appointments',
  ORDERS: 'imed_orders',
  LAB_ORDERS: 'imed_lab_orders',
  LAB_TESTS: 'imed_lab_tests',
  RADIO_ORDERS: 'imed_radio_orders',
  EPISODES: 'imed_episodes',
  DOCUMENTS: 'imed_documents',
  AUDIT_LOGS: 'imed_audit_logs',
  CLINIC_CONFIG: 'imed_config',
} as const;

// ============================================================
// 🔌 Firebase-ზე გადასართავად (მომავალში):
//   1. დააბრუნე ძველი Firebase იმპორტები ../../firebase-დან
//   2. ჩაანაცვლე ზემოთ მოცემული `local.*` ექსპორტები
//      Firestore/Auth/Storage SDK ფუნქციებით
//   3. წაშალე seedLocalBackend გამოძახება main.tsx-ში
// ============================================================
