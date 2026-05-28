import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBULFHoPmlAZqtCg7tSzLS0DZSL0-O5jVA",
  authDomain: "ertransfer-1137b.firebaseapp.com",
  projectId: "ertransfer-1137b",
  storageBucket: "ertransfer-1137b.firebasestorage.app",
  messagingSenderId: "1047514579223",
  appId: "1:1047514579223:web:07940f992b82dc88f17752",
  measurementId: "G-HVB2WY4G5G",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Analytics is optional; only initialises in browser
try {
  getAnalytics(app);
} catch (_) {
  // SSR / non-browser – skip
}
