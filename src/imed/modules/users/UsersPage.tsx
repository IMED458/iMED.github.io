import React, { useEffect, useState, useRef } from 'react';
import {
  firestore, firebaseStorage, COLLECTIONS,
  collection, getDocs, query, orderBy, doc, updateDoc, setDoc,
  adminCreateAuthUser, adminResetPassword, ref, uploadBytes, getDownloadURL,
} from '../../firebase/db';
import type { ImedUser, UserRole } from '../../types';
import { ROLE_LABELS, SPECIALTIES, DEPARTMENTS } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { addAuditLog } from '../audit/auditService';
import { UserPlus, Edit2, X, Upload, CheckCircle2, KeyRound, Copy, RefreshCw } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

// ერთჯერადი პაროლის გენერატორი (წასაკითხი, უსაფრთხო)
function genTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p = '';
  for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// ელ-ფოსტის ავტო-შემოთავაზება გვარ-სახელიდან
function suggestEmail(firstName: string, lastName: string): string {
  const translit = (s: string) => s.toLowerCase()
    .replace(/[ა]/g,'a').replace(/[ბ]/g,'b').replace(/[გ]/g,'g').replace(/[დ]/g,'d')
    .replace(/[ე]/g,'e').replace(/[ვ]/g,'v').replace(/[ზ]/g,'z').replace(/[თ]/g,'t')
    .replace(/[ი]/g,'i').replace(/[კ]/g,'k').replace(/[ლ]/g,'l').replace(/[მ]/g,'m')
    .replace(/[ნ]/g,'n').replace(/[ო]/g,'o').replace(/[პ]/g,'p').replace(/[ჟ]/g,'zh')
    .replace(/[რ]/g,'r').replace(/[ს]/g,'s').replace(/[ტ]/g,'t').replace(/[უ]/g,'u')
    .replace(/[ფ]/g,'f').replace(/[ქ]/g,'q').replace(/[ღ]/g,'gh').replace(/[ყ]/g,'y')
    .replace(/[შ]/g,'sh').replace(/[ჩ]/g,'ch').replace(/[ც]/g,'ts').replace(/[ძ]/g,'dz')
    .replace(/[წ]/g,'w').replace(/[ჭ]/g,'ch').replace(/[ხ]/g,'x').replace(/[ჯ]/g,'j')
    .replace(/[ჰ]/g,'h').replace(/[^a-z0-9]/g,'');
  const f = translit(firstName), l = translit(lastName);
  if (!f && !l) return '';
  return `${f}.${l}@imed.local`;
}

interface UserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  specialty: string;
  department: string;
  position: string;
  personalId: string;
  licenseNumber: string;
}

const EMPTY_FORM: UserFormData = {
  email: '', password: '', firstName: '', lastName: '',
  role: 'doctor', specialty: '', department: '',
  position: '', personalId: '', licenseNumber: '',
};

export default function UsersPage() {
  const { imedUser } = useAuthStore();
  const [users, setUsers] = useState<ImedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sigFile, setSigFile] = useState<File | null>(null);
  const sigRef = useRef<HTMLInputElement>(null);
  // credentials ჩვენების მოდალი შექმნის/reset-ის შემდეგ
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string } | null>(null);

  const load = async () => {
    if (!firestore) return;
    setLoading(true);
    const snap = await getDocs(query(collection(firestore, COLLECTIONS.USERS), orderBy('lastName')));
    setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as ImedUser)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (k: keyof UserFormData, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const openNew = () => { setForm({ ...EMPTY_FORM, password: genTempPassword() }); setEditId(null); setShowForm(true); setError(''); };
  const openEdit = (u: ImedUser) => {
    setForm({
      email: u.email, password: '', firstName: u.firstName, lastName: u.lastName,
      role: u.role, specialty: u.specialty || '', department: u.department || '',
      position: u.position || '', personalId: u.personalId || '', licenseNumber: u.licenseNumber || '',
    });
    setEditId(u.uid);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imedUser || !firestore) return;
    setSaving(true);
    setError('');
    try {
      let uid = editId;
      const tempPassword = form.password;
      if (!editId) {
        const email = (form.email.trim() || suggestEmail(form.firstName, form.lastName)).toLowerCase();
        const cred = await adminCreateAuthUser(email, tempPassword);
        uid = cred.uid;
        form.email = email;
      }

      let signatureUrl: string | undefined;
      if (sigFile && uid && firebaseStorage) {
        const sRef = ref(firebaseStorage, `imed/signatures/${uid}.png`);
        await uploadBytes(sRef, sigFile);
        signatureUrl = await getDownloadURL(sRef);
      }

      const userData: Omit<ImedUser, 'uid'> = {
        email: form.email,
        displayName: `${form.firstName} ${form.lastName}`,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        specialty: form.specialty || undefined,
        department: form.department || undefined,
        position: form.position || undefined,
        personalId: form.personalId || undefined,
        licenseNumber: form.licenseNumber || undefined,
        signatureUrl: signatureUrl || (editId ? users.find(u => u.uid === editId)?.signatureUrl : undefined),
        isActive: true,
        mustChangePassword: editId ? users.find(u => u.uid === editId)?.mustChangePassword : true,
        createdAt: editId ? (users.find(u => u.uid === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(firestore, COLLECTIONS.USERS, uid!), userData);

      await addAuditLog({
        userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
        action: editId ? 'update' : 'create', resourceType: 'user', resourceId: uid!,
        description: `${editId ? 'განახლდა' : 'შეიქმნა'} მომხმარებელი: ${form.firstName} ${form.lastName} (${ROLE_LABELS[form.role]})`,
      });

      setShowForm(false);
      setSigFile(null);
      if (!editId) setCredentials({ name: `${form.firstName} ${form.lastName}`, email: form.email, password: tempPassword });
      load();
    } catch (err: any) {
      setError(err.message || 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: ImedUser) => {
    if (!firestore || !imedUser) return;
    await updateDoc(doc(firestore, COLLECTIONS.USERS, u.uid), { isActive: !u.isActive, updatedAt: new Date().toISOString() });
    load();
  };

  const resetPassword = async (u: ImedUser) => {
    if (!firestore || !imedUser) return;
    if (!confirm(`გენერირდეს ახალი ერთჯერადი პაროლი მომხმარებლისთვის ${u.displayName}?`)) return;
    const newPass = genTempPassword();
    try {
      await adminResetPassword(u.email, newPass);
      await updateDoc(doc(firestore, COLLECTIONS.USERS, u.uid), { mustChangePassword: true, updatedAt: new Date().toISOString() });
      await addAuditLog({
        userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
        action: 'update', resourceType: 'user', resourceId: u.uid,
        description: `პაროლის reset: ${u.displayName}`,
      });
      setCredentials({ name: u.displayName, email: u.email, password: newPass });
      load();
    } catch (err: any) {
      alert(err.message || 'შეცდომა');
    }
  };

  const copyCreds = () => {
    if (!credentials) return;
    navigator.clipboard?.writeText(`მომხმარებელი: ${credentials.name}\nელ-ფოსტა: ${credentials.email}\nერთჯერადი პაროლი: ${credentials.password}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">მომხმარებლები</h2>
          <p className="text-sm text-gray-500">{users.length} მომხმარებელი</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors">
          <UserPlus size={18} /> ახალი მომხმარებელი
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">{editId ? 'მომხმარებლის რედ.' : 'ახალი მომხმარებელი'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠ {error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">გვარი *</label>
                  <input className={inputCls} value={form.lastName} onChange={e => set('lastName', e.target.value)} required /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">სახელი *</label>
                  <input className={inputCls} value={form.firstName} onChange={e => set('firstName', e.target.value)} required /></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ელ-ფოსტა (login) {!editId && '— ავტომატური'}</label>
                <div className="flex gap-2">
                  <input type="text" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} disabled={!!editId}
                    placeholder={!editId ? suggestEmail(form.firstName, form.lastName) || 'name.surname@imed.local' : ''} />
                  {!editId && (
                    <button type="button" onClick={() => set('email', suggestEmail(form.firstName, form.lastName))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap">ავტო</button>
                  )}
                </div>
                {!editId && <p className="text-xs text-gray-400 mt-1">ცარიელის შემთხვევაში ავტომატურად შეიქმნება გვარ-სახელიდან</p>}
              </div>
              {!editId && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ერთჯერადი პაროლი *</label>
                  <div className="flex gap-2">
                    <input type="text" className={`${inputCls} font-mono`} value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
                    <button type="button" onClick={() => set('password', genTempPassword())}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                      <RefreshCw size={13} /> ახალი
                    </button>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">⚠ მომხმარებელი პირველ შესვლაზე შეცვლის ამ პაროლს</p>
                </div>
              )}
              <div><label className="block text-xs font-medium text-gray-600 mb-1">როლი *</label>
                <select className={inputCls} value={form.role} onChange={e => set('role', e.target.value as UserRole)} required>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">სპეციალობა</label>
                <select className={inputCls} value={form.specialty} onChange={e => set('specialty', e.target.value)}>
                  <option value="">— —</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">განყოფილება</label>
                <select className={inputCls} value={form.department} onChange={e => set('department', e.target.value)}>
                  <option value="">— —</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">თანამდებობა</label>
                <input className={inputCls} value={form.position} onChange={e => set('position', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">პირადი №</label>
                  <input className={inputCls} value={form.personalId} onChange={e => set('personalId', e.target.value)} maxLength={11} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">ლიცენზია №</label>
                  <input className={inputCls} value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} /></div>
              </div>

              {/* ხელმოწერა */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ხელმოწერა (PNG)</label>
                <input type="file" accept="image/png,image/svg+xml" ref={sigRef} onChange={e => setSigFile(e.target.files?.[0] || null)} className="hidden" />
                <button type="button" onClick={() => sigRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  <Upload size={16} />
                  {sigFile ? sigFile.name : 'ხელმოწერის ატვირთვა'}
                </button>
                {sigFile && <div className="mt-2"><img src={URL.createObjectURL(sigFile)} alt="preview" className="h-12 object-contain" /></div>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">გაუქმება</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
                  <CheckCircle2 size={16} />
                  {saving ? 'ინახება...' : (editId ? 'შენახვა' : 'შექმნა')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {credentials && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              <KeyRound size={18} className="text-green-600" />
              <h3 className="font-bold text-gray-800">წვდომის მონაცემები</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">გადაეცით ეს მონაცემები მომხმარებელს <b>{credentials.name}</b>. პაროლი ერთჯერადია — პირველ შესვლაზე შეიცვლება.</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 font-mono text-sm">
                <div><span className="text-gray-400">ელ-ფოსტა:</span> <b>{credentials.email}</b></div>
                <div><span className="text-gray-400">პაროლი:</span> <b className="text-blue-700 text-base">{credentials.password}</b></div>
              </div>
              <div className="flex gap-2">
                <button onClick={copyCreds} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                  <Copy size={15} /> კოპირება
                </button>
                <button onClick={() => setCredentials(null)} className="flex-1 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold">გასაგებია</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">სახელი</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ელ-ფოსტა</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">როლი</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">სპეც.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">სტ.</th>
              <th className="text-right px-4 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.signatureUrl && <img src={u.signatureUrl} alt="sig" className="h-8 object-contain border border-gray-200 rounded p-0.5" />}
                      <div>
                        <div className="font-medium text-gray-800">{u.displayName}</div>
                        {u.position && <div className="text-xs text-gray-400">{u.position}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.specialty || u.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.isActive ? 'აქტ.' : 'გათ.'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button title="რედაქტირება" onClick={() => openEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={15} /></button>
                      <button title="პაროლის reset" onClick={() => resetPassword(u)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><KeyRound size={15} /></button>
                      <button onClick={() => toggleActive(u)} className={`text-xs px-2 py-1 rounded ${u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {u.isActive ? 'გათ.' : 'გაქ.'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
