import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getPatient, searchPatients } from '../patients/patientsService';
import type { Patient, OrderType, OrderItem, ImedUser } from '../../types';
import {
  firestore, COLLECTIONS, collection, addDoc, getDocs, query, where, limit,
} from '../../firebase/db';
import { addAuditLog } from '../audit/auditService';
import CatalogPicker, { type PickedItem } from '../../components/catalog/CatalogPicker';
import { ArrowLeft, Search, Save, Printer } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export function generateReferralNumber(): string {
  return 'IG' + Math.floor(100000 + Math.random() * 900000).toString();
}

// კატალოგის ServiceType → Order.type
function toOrderType(t: string): OrderType {
  if (t === 'laboratory') return 'laboratory';
  if (t === 'radiology') return 'radiology';
  if (t === 'consultation') return 'consultation';
  return 'procedure';
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { imedUser } = useAuthStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [picked, setPicked] = useState<PickedItem[]>([]);
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [assignedDoctorId, setAssignedDoctorId] = useState('');
  const [assignedDoctorName, setAssignedDoctorName] = useState('');
  const [doctors, setDoctors] = useState<ImedUser[]>([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pid = sp.get('patientId');
    if (pid) getPatient(pid).then(p => p && setPatient(p));
    const restrict = sp.get('category');
    if (restrict) setRestrictCategory(restrict);
  }, [sp]);

  const [restrictCategory, setRestrictCategory] = useState<string | undefined>(undefined);

  const hasConsultation = picked.some(p => p.categoryKey === 'consultation');

  useEffect(() => {
    if (!hasConsultation || !firestore) return;
    getDocs(query(
      collection(firestore, COLLECTIONS.USERS),
      where('isActive', '==', true),
      where('role', 'in', ['doctor', 'consultant']),
      limit(80)
    )).then(snap => setDoctors(snap.docs.map(d => ({ uid: d.id, ...d.data() } as ImedUser))));
  }, [hasConsultation]);

  useEffect(() => {
    if (!patientSearch.trim() || patient) return;
    const t = setTimeout(async () => setPatientResults(await searchPatients(patientSearch)), 300);
    return () => clearTimeout(t);
  }, [patientSearch, patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !imedUser || !firestore) { setError('პაციენტი არ არის არჩეული'); return; }
    if (picked.length === 0) { setError('მონიშნეთ მინიმუმ ერთი კვლევა/კონსულტაცია'); return; }
    setSaving(true);
    setError('');
    try {
      const referralNumber = generateReferralNumber();
      // პირველი მონიშნულის ტიპი — მთავარი ტიპი
      const mainType = toOrderType(picked[0].type);
      const items: OrderItem[] = picked.map(p => ({
        code: p.code,
        name: p.name,
        categoryKey: p.categoryKey,
        subKey: p.subKey,
        type: toOrderType(p.type),
        status: 'requested',
      }));
      const ref = await addDoc(collection(firestore, COLLECTIONS.ORDERS), {
        referralNumber,
        patientId: patient.id,
        type: mainType,
        categoryKey: picked[0].categoryKey,
        subCategoryKey: picked[0].subKey,
        description: picked.length === 1 ? picked[0].name : `${picked[0].name} (+${picked.length - 1})`,
        items,
        priority,
        assignedDoctorId: hasConsultation ? assignedDoctorId || undefined : undefined,
        assignedTo: hasConsultation ? assignedDoctorName || undefined : undefined,
        status: 'requested',
        requestedBy: imedUser.uid,
        requestedByName: imedUser.displayName,
        requestedAt: new Date().toISOString(),
        diagnosisName: diagnosis || undefined,
        notes: notes || undefined,
      });
      await addAuditLog({
        userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
        action: 'create', resourceType: 'order', resourceId: ref.id,
        patientId: patient.id, patientName: `${patient.lastName} ${patient.firstName}`,
        description: `მიმართვა №${referralNumber}: ${items.length} სერვისი (${patient.lastName} ${patient.firstName})`,
      });
      // გადავდივართ შეკვეთის დეტალებზე — იქ იბეჭდება ქვითარი
      navigate(`/imed/orders/${ref.id}?print=1`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20} /></button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">კვლევის / კონსულტაციის მიმართვა</h2>
          <p className="text-sm text-gray-500">მონიშნეთ რამდენიმე სერვისი ერთდროულად — გაიცემა ერთი მიმართვის № და ქვითარი</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠ {error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* პაციენტი */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">პაციენტი</h3>
          {patient ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <div className="font-semibold text-gray-800">{patient.lastName} {patient.firstName}</div>
                <div className="text-xs text-gray-500">ბარათი: {patient.cardNumber} · პირ. №: {patient.personalId}</div>
              </div>
              <button type="button" onClick={() => setPatient(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ძებნა: გვარი, პირადი №, ბარათი №..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
              {patientResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {patientResults.map(p => (
                    <button key={p.id} type="button" onClick={() => { setPatient(p); setPatientSearch(''); setPatientResults([]); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm">
                      <div className="font-medium text-gray-800">{p.lastName} {p.firstName}</div>
                      <div className="text-xs text-gray-400">{p.personalId} · {p.cardNumber}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* კატალოგი — მრავალმონიშვნა */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-2 text-sm">აირჩიეთ კვლევები / კონსულტაციები / მანიპულაციები</h3>
          <CatalogPicker selected={picked} onChange={setPicked} restrictCategory={restrictCategory} />
        </div>

        {/* დიაგნოზი */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">დიაგნოზი / კლინიკური ინფ.</h3>
          <input className={inputCls} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="დიაგნოზი (ICD-10 ან ტექსტი)..." />
        </div>

        {/* კონსულტანტი */}
        {hasConsultation && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">კონსულტანტი ექიმი (კონსულტაციისთვის)</h3>
            <select className={inputCls} value={assignedDoctorId} onChange={e => {
              const doc = doctors.find(d => d.uid === e.target.value);
              setAssignedDoctorId(e.target.value); setAssignedDoctorName(doc?.displayName || '');
            }}>
              <option value="">— ექიმის არჩევა (არასავალდებულო) —</option>
              {doctors.map(d => <option key={d.uid} value={d.uid}>{d.displayName} ({d.specialty || ''})</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-2">⚠ მითითებულ ექიმს dashboard-ზე გაეგზავნება შეტყობინება</p>
          </div>
        )}

        {/* პრიორიტეტი */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">პრიორიტეტი</h3>
          <div className="flex gap-3">
            {(['routine', 'urgent', 'stat'] as const).map(p => (
              <label key={p} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border-2 transition-all flex-1 justify-center ${
                priority === p ? p === 'stat' ? 'border-red-500 bg-red-50 text-red-700' : p === 'urgent' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
              }`}>
                <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} className="sr-only" />
                <span className="text-sm font-medium">{p === 'stat' ? '🔴 STAT' : p === 'urgent' ? '🟠 გადაუდებელი' : '🟢 ჩვეულებრივი'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* შენიშვნა */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">შენიშვნა</h3>
          <textarea className={`${inputCls} resize-none`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="დამატებითი ინფ..." />
        </div>

        <div className="flex justify-end gap-3 sticky bottom-0 bg-gradient-to-t from-white to-transparent py-3">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">გაუქმება</button>
          <button type="submit" disabled={saving || picked.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm">
            <Printer size={16} />
            {saving ? 'იგზავნება...' : `მიმართვის გაგზავნა და ბეჭდვა${picked.length ? ` (${picked.length})` : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}
