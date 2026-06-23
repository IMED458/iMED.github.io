import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  firestore, COLLECTIONS, doc, updateDoc, adminResetPassword,
} from '../firebase/db';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

// იძულებითი პაროლის შეცვლა პირველ შესვლაზე (mustChangePassword)
export default function ChangePasswordGate({ children }: { children: React.ReactNode }) {
  const { imedUser, firebaseUser, setImedUser } = useAuthStore();
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!imedUser?.mustChangePassword) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass.length < 6) { setError('პაროლი უნდა იყოს მინ. 6 სიმბოლო'); return; }
    if (pass !== pass2) { setError('პაროლები არ ემთხვევა'); return; }
    setSaving(true);
    setError('');
    try {
      await adminResetPassword(imedUser.email, pass);
      const uid = firebaseUser?.uid;
      if (uid && firestore) {
        await updateDoc(doc(firestore, COLLECTIONS.USERS, uid), { mustChangePassword: false, updatedAt: new Date().toISOString() });
      }
      setImedUser({ ...imedUser, mustChangePassword: false });
    } catch (err: any) {
      setError(err.message || 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 p-4 font-['Noto_Sans_Georgian',_sans-serif]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-blue-900 px-8 py-6 text-center">
          <KeyRound size={32} className="text-white mx-auto mb-2" />
          <h1 className="text-lg font-bold text-white">პაროლის შეცვლა</h1>
          <p className="text-blue-200 text-sm mt-1">პირველი შესვლა — შეცვალეთ ერთჯერადი პაროლი</p>
        </div>
        <form onSubmit={submit} className="px-8 py-7 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠ {error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ახალი პაროლი *</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} className={inputCls} value={pass} onChange={e => setPass(e.target.value)} required minLength={6} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">გაიმეორეთ პაროლი *</label>
            <input type={show ? 'text' : 'password'} className={inputCls} value={pass2} onChange={e => setPass2(e.target.value)} required minLength={6} />
          </div>
          <button type="submit" disabled={saving} className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded-lg text-sm">
            {saving ? 'ინახება...' : 'პაროლის შენახვა და გაგრძელება'}
          </button>
        </form>
      </div>
    </div>
  );
}
