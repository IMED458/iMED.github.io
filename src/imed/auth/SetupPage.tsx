import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  firestore, firebaseAuth, COLLECTIONS,
  collection, getDocs, query, limit, setDoc, doc,
  createUserWithEmailAndPassword,
} from '../firebase/db';
import type { ImedUser } from '../types';
import { addAuditLog } from '../modules/audit/auditService';
import { Stethoscope, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function SetupPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [usersExist, setUsersExist] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!firestore) { setChecking(false); return; }
    getDocs(query(collection(firestore, COLLECTIONS.USERS), limit(1))).then(snap => {
      setUsersExist(!snap.empty);
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseAuth || !firestore) { setError('Firebase არ არის ხელმისაწვდომი'); return; }
    setSaving(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      const now = new Date().toISOString();
      const userData: Omit<ImedUser, 'uid'> = {
        email: email.trim(),
        displayName: `${firstName} ${lastName}`,
        firstName,
        lastName,
        role: 'super_admin',
        position: 'სისტემის ადმინისტრატორი',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(firestore, COLLECTIONS.USERS, cred.user.uid), userData);
      await addAuditLog({
        userId: cred.user.uid,
        userDisplayName: userData.displayName,
        userRole: 'super_admin',
        action: 'create',
        resourceType: 'user',
        resourceId: cred.user.uid,
        description: `პირველი სუპერ-ადმინი შეიქმნა: ${userData.displayName}`,
      });
      setDone(true);
      setTimeout(() => navigate('/imed/dashboard'), 1500);
    } catch (err: any) {
      const code = err?.code;
      setError(
        code === 'auth/email-already-in-use' ? 'ეს ელ-ფოსტა უკვე გამოყენებულია' :
        code === 'auth/weak-password' ? 'პაროლი ძალიან სუსტია (მინ. 6 სიმბოლო)' :
        code === 'auth/invalid-email' ? 'ელ-ფოსტა არასწორია' :
        err?.message || 'შეცდომა'
      );
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4 font-['Noto_Sans_Georgian',_sans-serif]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-blue-900 px-8 py-7 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-lg mb-3">
              <Stethoscope size={28} className="text-blue-700" />
            </div>
            <h1 className="text-xl font-bold text-white">iMED — საწყისი კონფიგურაცია</h1>
          </div>

          <div className="px-8 py-8">
            {usersExist ? (
              <div className="text-center">
                <ShieldCheck size={40} className="text-green-600 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-800 mb-2">სისტემა უკვე კონფიგურირებულია</h2>
                <p className="text-sm text-gray-500 mb-5">
                  მომხმარებლები უკვე არსებობს. გამოიყენეთ შესვლის გვერდი.
                </p>
                <button onClick={() => navigate('/imed/login')}
                  className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm">
                  შესვლის გვერდზე გადასვლა
                </button>
              </div>
            ) : done ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="text-green-600 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-800">სუპერ-ადმინი შეიქმნა!</h2>
                <p className="text-sm text-gray-500 mt-1">გადამისამართება...</p>
              </div>
            ) : (
              <>
                <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <strong>პირველი გაშვება.</strong> შექმენით სისტემის სუპერ-ადმინისტრატორი —
                  ის შემდეგ დაამატებს დანარჩენ ექიმებსა და თანამშრომლებს.
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠ {error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">გვარი *</label>
                      <input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">სახელი *</label>
                      <input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ელ-ფოსტა *</label>
                    <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@clinic.ge" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">პაროლი *</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} className={inputCls} value={password}
                        onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="მინ. 6 სიმბოლო" />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={saving}
                    className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded-lg text-sm mt-2">
                    {saving ? 'იქმნება...' : 'სუპერ-ადმინის შექმნა'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
        <p className="text-center text-blue-300 text-xs mt-4">
          ეს გვერდი ხელმისაწვდომია მხოლოდ პირველი მომხმარებლის შექმნამდე
        </p>
      </div>
    </div>
  );
}
