import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getPatient, searchPatients } from '../patients/patientsService';
import type { Patient, ImedUser } from '../../types';
import { DEPARTMENTS } from '../../types';
import {
  firestore, COLLECTIONS, collection, addDoc, getDocs, query, where, limit,
} from '../../firebase/db';
import { addAuditLog } from '../audit/auditService';
import { ArrowLeft, Search, Save, BedDouble } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const now = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().split('T')[0];
const currentTime = () => new Date().toTimeString().slice(0, 5);

export default function AdmitPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { imedUser } = useAuthStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<ImedUser[]>([]);

  const [dept, setDept] = useState('');
  const [ward, setWard] = useState('');
  const [bed, setBed] = useState('');
  const [attendingId, setAttendingId] = useState('');
  const [admDate, setAdmDate] = useState(todayDate());
  const [admTime, setAdmTime] = useState(currentTime());
  const [icd10, setIcd10] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pid = sp.get('patientId');
    if (pid) getPatient(pid).then(p => p && setPatient(p));
  }, [sp]);

  useEffect(() => {
    if (!firestore) return;
    getDocs(query(
      collection(firestore, COLLECTIONS.USERS),
      where('isActive', '==', true),
      where('role', 'in', ['doctor', 'department_head']),
      limit(50)
    )).then(snap => setDoctors(snap.docs.map(d => ({ uid: d.id, ...d.data() } as ImedUser))));
  }, []);

  useEffect(() => {
    if (!patientSearch.trim() || patient) return;
    const t = setTimeout(async () => {
      setPatientResults(await searchPatients(patientSearch));
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch, patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !imedUser || !firestore) { setError('პაციენტი ან ექიმი არ არის არჩეული'); return; }
    if (!dept || !bed) { setError('გთხოვთ, შეავსოთ განყოფილება და საწოლი'); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(firestore, COLLECTIONS.EPISODES), {
        patientId: patient.id,
        episodeType: 'inpatient',
        admissionDate: admDate,
        admissionTime: admTime,
        department: dept,
        ward: ward,
        bedNumber: bed,
        attendingDoctorId: attendingId || imedUser.uid,
        status: 'active',
        diagnoses: [],
        icd10Primary: icd10 || undefined,
        notes: notes || undefined,
        createdAt: now(),
        createdBy: imedUser.uid,
        updatedAt: now(),
      });
      await addAuditLog({
        userId: imedUser.uid,
        userDisplayName: imedUser.displayName,
        userRole: imedUser.role,
        action: 'create',
        resourceType: 'episode',
        resourceId: ref.id,
        patientId: patient.id,
        patientName: `${patient.lastName} ${patient.firstName}`,
        description: `ჰოსპიტალიზაცია: ${patient.lastName} ${patient.firstName} → ${dept}, საწ.${bed}`,
      });
      navigate(`/imed/inpatient/episodes/${ref.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">ჰოსპიტალიზაცია</h2>
          <p className="text-sm text-gray-500">სტაციონარული ეპიზოდის გახსნა</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠ {error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* პაციენტი */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">პაციენტი *</h3>
          {patient ? (
            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div>
                <div className="font-semibold text-gray-800">{patient.lastName} {patient.firstName}</div>
                <div className="text-xs text-gray-500">ბარათი: {patient.cardNumber} · {patient.birthDate}</div>
              </div>
              <button type="button" onClick={() => setPatient(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ძებნა: გვარი, პირადი №..."
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
              />
              {patientResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {patientResults.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setPatient(p); setPatientSearch(''); setPatientResults([]); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm">
                      <div className="font-medium">{p.lastName} {p.firstName}</div>
                      <div className="text-xs text-gray-400">{p.personalId} · {p.cardNumber}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* განყოფილება / საწოლი */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
            <BedDouble size={16} className="text-purple-600" /> განყოფილება და საწოლი
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">განყოფილება *</label>
              <select className={inputCls} value={dept} onChange={e => setDept(e.target.value)} required>
                <option value="">— განყოფილება —</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">პალატა</label>
              <input className={inputCls} value={ward} onChange={e => setWard(e.target.value)} placeholder="მაგ. 3A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">საწოლი № *</label>
              <input className={inputCls} value={bed} onChange={e => setBed(e.target.value)} placeholder="მაგ. 12" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">მიღების თარიღი *</label>
              <input type="date" className={inputCls} value={admDate} onChange={e => setAdmDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">დრო *</label>
              <input type="time" className={inputCls} value={admTime} onChange={e => setAdmTime(e.target.value)} required />
            </div>
          </div>
        </div>

        {/* ექიმი */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">მკურნალი ექიმი</h3>
          <select className={inputCls} value={attendingId} onChange={e => setAttendingId(e.target.value)}>
            <option value="">— {imedUser?.displayName} (ჩემი) —</option>
            {doctors.map(d => (
              <option key={d.uid} value={d.uid}>{d.displayName} — {d.specialty || d.department || ''}</option>
            ))}
          </select>
        </div>

        {/* დიაგნოზი */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">წინასწარი დიაგნოზი</h3>
          <input
            className={inputCls}
            value={icd10}
            onChange={e => setIcd10(e.target.value)}
            placeholder="ICD-10 კოდი ან დიაგნოზი..."
          />
          <textarea
            className={`${inputCls} mt-3 resize-none`}
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="მიღების შენიშვნა, კლინიკური ინფ..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            გაუქმება
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm">
            <Save size={16} />
            {saving ? 'ინახება...' : 'ჰოსპიტალიზაცია'}
          </button>
        </div>
      </form>
    </div>
  );
}
