// ============================================================
// iMED — ლოკალური Backend (localStorage)
// Firebase-ის API-ის სრული იმიტაცია, ინტერნეტისა და
// Firebase-ის გარეშე. ყველა მონაცემი ინახება ბრაუზერში.
// ============================================================

const DB_KEY = 'imed_local_db';
const AUTH_KEY = 'imed_local_auth';
const SESSION_KEY = 'imed_local_session';
const FILES_KEY = 'imed_local_files';

// ---------- დაბალი დონის სტორიჯი ----------
function readDB(): Record<string, Record<string, any>> {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '{}'); } catch { return {}; }
}
function writeDB(db: Record<string, Record<string, any>>) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
function readAuth(): Record<string, { uid: string; email: string; password: string }> {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || '{}'); } catch { return {}; }
}
function writeAuth(a: Record<string, any>) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(a));
}
function readFiles(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(FILES_KEY) || '{}'); } catch { return {}; }
}
function writeFiles(f: Record<string, string>) {
  localStorage.setItem(FILES_KEY, JSON.stringify(f));
}

function genId(): string {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

// ---------- მოქატარგe-ს ობიექტები ----------
export const localApp = { name: 'imed-local' };
export const localAuth = { _kind: 'auth' as const, _listeners: [] as ((u: any) => void)[] };
export const localFirestore = { _kind: 'firestore' as const };
export const localStorageRef = { _kind: 'storage' as const };

// ============================================================
// Firestore API
// ============================================================
type Constraint =
  | { _t: 'where'; field: string; op: string; value: any }
  | { _t: 'orderBy'; field: string; dir: 'asc' | 'desc' }
  | { _t: 'limit'; n: number };

export function collection(_db: any, name: string) {
  return { _kind: 'collection' as const, name };
}

export function doc(_db: any, name: string, id?: string) {
  // doc(db, name, id)
  return { _kind: 'doc' as const, name, id: id || genId() };
}

export function query(coll: { name: string }, ...constraints: Constraint[]) {
  return { _kind: 'query' as const, name: coll.name, constraints };
}

export function where(field: string, op: string, value: any): Constraint {
  return { _t: 'where', field, op, value };
}
export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): Constraint {
  return { _t: 'orderBy', field, dir };
}
export function limit(n: number): Constraint {
  return { _t: 'limit', n };
}

function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function applyConstraints(rows: any[], constraints: Constraint[]): any[] {
  let result = [...rows];
  const wheres = constraints.filter(c => c._t === 'where') as any[];
  const orders = constraints.filter(c => c._t === 'orderBy') as any[];
  const lim = constraints.find(c => c._t === 'limit') as any;

  for (const w of wheres) {
    result = result.filter(r => {
      const v = getByPath(r, w.field);
      switch (w.op) {
        case '==': return v === w.value;
        case '!=': return v !== w.value;
        case '>': return v > w.value;
        case '>=': return v >= w.value;
        case '<': return v < w.value;
        case '<=': return v <= w.value;
        case 'in': return Array.isArray(w.value) && w.value.includes(v);
        case 'array-contains': return Array.isArray(v) && v.includes(w.value);
        default: return true;
      }
    });
  }

  for (const o of orders.reverse()) {
    result.sort((a, b) => {
      const va = getByPath(a, o.field);
      const vb = getByPath(b, o.field);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      let cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return o.dir === 'desc' ? -cmp : cmp;
    });
  }

  if (lim) result = result.slice(0, lim.n);
  return result;
}

interface DocSnap {
  id: string;
  exists: () => boolean;
  data: () => any;
}

function makeSnap(id: string, data: any): DocSnap {
  return { id, exists: () => data != null, data: () => data };
}

export async function getDocs(q: { _kind: string; name: string; constraints?: Constraint[] }) {
  const db = readDB();
  const coll = db[q.name] || {};
  let rows = Object.entries(coll).map(([id, data]) => ({ __id: id, ...(data as any) }));
  rows = applyConstraints(rows, q.constraints || []);
  const docs = rows.map(r => {
    const { __id, ...rest } = r;
    return makeSnap(__id, rest);
  });
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (cb: (d: DocSnap) => void) => docs.forEach(cb),
  };
}

export async function getDoc(docRef: { name: string; id: string }) {
  const db = readDB();
  const data = db[docRef.name]?.[docRef.id];
  return makeSnap(docRef.id, data ?? null);
}

export async function addDoc(coll: { name: string }, data: any) {
  const db = readDB();
  if (!db[coll.name]) db[coll.name] = {};
  const id = genId();
  db[coll.name][id] = stripUndefined(data);
  writeDB(db);
  return { id };
}

export async function setDoc(docRef: { name: string; id: string }, data: any) {
  const db = readDB();
  if (!db[docRef.name]) db[docRef.name] = {};
  db[docRef.name][docRef.id] = stripUndefined(data);
  writeDB(db);
}

export async function updateDoc(docRef: { name: string; id: string }, partial: any) {
  const db = readDB();
  if (!db[docRef.name]) db[docRef.name] = {};
  const existing = db[docRef.name][docRef.id] || {};
  db[docRef.name][docRef.id] = stripUndefined({ ...existing, ...partial });
  writeDB(db);
}

function stripUndefined(obj: any): any {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function onSnapshot(_q: any, _cb: any) {
  // ლოკალურ რეჟიმში real-time არ არის — ვაბრუნებთ no-op unsubscribe-ს
  return () => {};
}

export const serverTimestamp = () => new Date().toISOString();
export const Timestamp = {
  now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }),
  fromDate: (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() }),
};
export const deleteField = () => undefined;
export function writeBatch(_db: any) {
  const ops: (() => Promise<void>)[] = [];
  return {
    set: (ref: any, data: any) => { ops.push(() => setDoc(ref, data)); },
    update: (ref: any, data: any) => { ops.push(() => updateDoc(ref, data)); },
    delete: (_ref: any) => {},
    commit: async () => { for (const op of ops) await op(); },
  };
}

// ============================================================
// Auth API
// ============================================================
function makeAuthError(code: string, message: string) {
  const e = new Error(message) as any;
  e.code = code;
  return e;
}

// ელ-ფოსტის ნორმალიზაცია — ყველგან ერთნაირად (trim + lowercase)
function normEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export async function signInWithEmailAndPassword(_auth: any, email: string, password: string) {
  const auth = readAuth();
  const key = normEmail(email);
  const rec = auth[key];
  if (!rec) throw makeAuthError('auth/user-not-found', 'მომხმარებელი ვერ მოიძებნა');
  if (rec.password !== (password || '').trim() && rec.password !== password) {
    throw makeAuthError('auth/wrong-password', 'პაროლი არასწორია');
  }
  localStorage.setItem(SESSION_KEY, rec.uid);
  notifyAuthListeners({ uid: rec.uid, email: rec.email });
  return { user: { uid: rec.uid, email: rec.email } };
}

export async function createUserWithEmailAndPassword(_auth: any, email: string, password: string) {
  const auth = readAuth();
  const key = normEmail(email);
  if (auth[key]) throw makeAuthError('auth/email-already-in-use', 'ეს ელ-ფოსტა უკვე გამოყენებულია');
  if (password.length < 6) throw makeAuthError('auth/weak-password', 'პაროლი ძალიან სუსტია');
  const uid = genId();
  auth[key] = { uid, email: key, password };
  writeAuth(auth);
  localStorage.setItem(SESSION_KEY, uid);
  notifyAuthListeners({ uid, email: key });
  return { user: { uid, email: key } };
}

// ადმინისტრატორის მიერ იუზერის შექმნა — სესია არ იცვლება
export async function adminCreateAuthUser(email: string, password: string): Promise<{ uid: string }> {
  const auth = readAuth();
  const key = normEmail(email);
  if (auth[key]) throw makeAuthError('auth/email-already-in-use', 'ეს ელ-ფოსტა უკვე გამოყენებულია');
  const uid = genId();
  auth[key] = { uid, email: key, password: (password || '').trim() };
  writeAuth(auth);
  return { uid };
}

// პაროლის reset (ადმინი ან თვითონ) — სესია არ იცვლება
export async function adminResetPassword(email: string, newPassword: string): Promise<void> {
  const auth = readAuth();
  const key = normEmail(email);
  if (!auth[key]) throw makeAuthError('auth/user-not-found', 'მომხმარებელი ვერ მოიძებნა');
  auth[key].password = (newPassword || '').trim();
  writeAuth(auth);
}

export async function signOut(_auth: any) {
  localStorage.removeItem(SESSION_KEY);
  notifyAuthListeners(null);
}

function notifyAuthListeners(user: any) {
  localAuth._listeners.forEach(cb => { try { cb(user); } catch {} });
}

export function onAuthStateChanged(_auth: any, cb: (user: any) => void) {
  localAuth._listeners.push(cb);
  // საწყისი მდგომარეობა
  const uid = localStorage.getItem(SESSION_KEY);
  if (uid) {
    const auth = readAuth();
    const rec = Object.values(auth).find(r => r.uid === uid);
    cb(rec ? { uid: rec.uid, email: rec.email } : null);
  } else {
    cb(null);
  }
  return () => {
    const i = localAuth._listeners.indexOf(cb);
    if (i >= 0) localAuth._listeners.splice(i, 1);
  };
}

// ============================================================
// Storage API (base64 data URLs)
// ============================================================
export function ref(_storage: any, path: string) {
  return { _kind: 'storageRef' as const, path };
}

export async function uploadBytes(storageRef: { path: string }, file: Blob) {
  const dataUrl = await blobToDataURL(file);
  const files = readFiles();
  files[storageRef.path] = dataUrl;
  writeFiles(files);
  return { ref: storageRef, metadata: { fullPath: storageRef.path } };
}

export async function getDownloadURL(storageRef: { path: string }) {
  const files = readFiles();
  const url = files[storageRef.path];
  if (!url) throw new Error('ფაილი ვერ მოიძებნა: ' + storageRef.path);
  return url;
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================================
// Seed — პირველი სუპერ-ადმინი
// ============================================================
export const SEEDED_ADMIN = {
  email: 'admin@imed.ge',
  password: 'admin123',
  firstName: 'სისტემის',
  lastName: 'ადმინისტრატორი',
};

export function seedLocalBackend() {
  const auth = readAuth();
  if (Object.keys(auth).length > 0) return; // უკვე დათესილია

  const uid = 'super_admin_seed';
  auth[SEEDED_ADMIN.email] = { uid, email: SEEDED_ADMIN.email, password: SEEDED_ADMIN.password };
  writeAuth(auth);

  const db = readDB();
  if (!db.imed_users) db.imed_users = {};
  const now = new Date().toISOString();
  db.imed_users[uid] = {
    email: SEEDED_ADMIN.email,
    displayName: `${SEEDED_ADMIN.firstName} ${SEEDED_ADMIN.lastName}`,
    firstName: SEEDED_ADMIN.firstName,
    lastName: SEEDED_ADMIN.lastName,
    role: 'super_admin',
    position: 'სისტემის ადმინისტრატორი',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  writeDB(db);
}
