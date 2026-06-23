import { create } from 'zustand';
import type { ImedUser, UserRole } from '../types';
import {
  firebaseAuth,
  firestore,
  COLLECTIONS,
  collection,
  doc,
  getDoc,
  setDoc,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type FirebaseUser,
} from '../firebase/db';
import { addAuditLog } from '../modules/audit/auditService';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  imedUser: ImedUser | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setImedUser: (user: ImedUser | null) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  clearError: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  imedUser: null,
  loading: true,
  error: null,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      if (!firebaseAuth) throw new Error('Firebase Auth არ არის ინიციალიზებული');
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (firestore) {
        const userRef = doc(firestore, COLLECTIONS.USERS, cred.user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) throw new Error('მომხმარებელი სისტემაში არ მოიძებნა');
        const userData = snap.data() as ImedUser;
        if (!userData.isActive) throw new Error('ანგარიში გათიშულია. მიმართეთ ადმინისტრატორს.');
        set({ imedUser: userData });
        await addAuditLog({
          userId: cred.user.uid,
          userDisplayName: userData.displayName,
          userRole: userData.role,
          action: 'login',
          resourceType: 'auth',
          description: `${userData.displayName} შევიდა სისტემაში`,
        });
      }
    } catch (err: unknown) {
      const msg = translateFirebaseError(err);
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    const { imedUser, firebaseUser } = get();
    if (imedUser && firebaseUser) {
      await addAuditLog({
        userId: firebaseUser.uid,
        userDisplayName: imedUser.displayName,
        userRole: imedUser.role,
        action: 'logout',
        resourceType: 'auth',
        description: `${imedUser.displayName} გამოვიდა სისტემიდან`,
      });
    }
    if (firebaseAuth) await signOut(firebaseAuth);
    set({ firebaseUser: null, imedUser: null });
  },

  setImedUser: (user) => set({ imedUser: user }),
  setLoading: (v) => set({ loading: v }),
  setError: (msg) => set({ error: msg }),
  clearError: () => set({ error: null }),

  hasRole: (roles) => {
    const { imedUser } = get();
    if (!imedUser) return false;
    return roles.includes(imedUser.role);
  },
}));

// Firebase Auth მდგომარეობის თვალყურის დევნება
export function initAuthListener() {
  if (!firebaseAuth) {
    useAuthStore.setState({ loading: false, initialized: true });
    return;
  }
  return onAuthStateChanged(firebaseAuth, async (fbUser) => {
    if (fbUser && firestore) {
      try {
        const userRef = doc(firestore, COLLECTIONS.USERS, fbUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          useAuthStore.setState({
            firebaseUser: fbUser,
            imedUser: snap.data() as ImedUser,
            loading: false,
            initialized: true,
          });
          return;
        }
      } catch {
        // ignore
      }
    }
    useAuthStore.setState({
      firebaseUser: fbUser,
      imedUser: null,
      loading: false,
      initialized: true,
    });
  });
}

function translateFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'ელ-ფოსტა ან პაროლი არასწორია';
    case 'auth/too-many-requests':
      return 'ძალიან ბევრი მცდელობა. გთხოვთ, სცადოთ მოგვიანებით';
    case 'auth/network-request-failed':
      return 'ქსელის შეცდომა. შეამოწმეთ ინტერნეტ-კავშირი';
    case 'auth/user-disabled':
      return 'ეს ანგარიში გათიშულია';
    default:
      return (err as Error)?.message || 'შეცდომა სისტემაში შესვლისას';
  }
}
