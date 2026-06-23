import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  firestore, COLLECTIONS, collection, query, where,
  getDocs, orderBy, limit, addDoc, updateDoc, doc,
} from '../../firebase/db';
import type { Appointment, AppointmentStatus, Patient, ImedUser } from '../../types';
import {
  APPOINTMENT_STATUS_LABELS, VISIT_TYPE_LABELS,
} from '../../types';
import { useAuthStore } from '../../store/authStore';
import { getPatient, searchPatients } from '../patients/patientsService';
import { addAuditLog } from '../audit/auditService';
import { Calendar, Plus, Clock, CheckCircle2, X, Search, Save } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  arrived: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AppointmentsPage() {
  const { imedUser } = useAuthStore();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(sp.get('new') === '1');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');

  // New appointment form
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patSearch, setPatSearch] = useState('');
  const [patResults, setPatResults] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<ImedUser[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(imedUser?.role === 'doctor' ? imedUser.uid : '');
  const [apptDate, setApptDate] = useState(dateFilter);
  const [apptTime, setApptTime] = useState('09:00');
  const [visitType, setVisitType] = useState<Appointment['visitType']>('primary');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSetAnyDoctor = imedUser?.role === 'registrar' || imedUser?.role === 'super_admin';

  const load = useCallback(async () => {
    if (!firestore || !imedUser) return;
    setLoading(true);
    try {
      const constraints: any[] = [orderBy('dateTime'), limit(200)];
      if (dateFilter) {
        constraints.unshift(where('dateTime', '>=', dateFilter + 'T00:00:00'));
        constraints.unshift(where('dateTime', '<=', dateFilter + 'T23:59:59'));
      }
      if (!canSetAnyDoctor) constraints.unshift(where('doctorId', '==', imedUser.uid));
      if (statusFilter !== 'all') constraints.unshift(where('status', '==', statusFilter));
      const snap = await getDocs(query(collection(firestore, COLLECTIONS.APPOINTMENTS), ...constraints));
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, imedUser, canSetAnyDoctor]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canSetAnyDoctor || !firestore) return;
    getDocs(query(
      collection(firestore, COLLECTIONS.USERS),
      where('isActive', '==', true),
      where('role', 'in', ['doctor', 'consultant', 'department_head']),
      limit(50)
    )).then(snap => setDoctors(snap.docs.map(d => ({ uid: d.id, ...d.data() } as ImedUser))));
  }, [canSetAnyDoctor]);

  useEffect(() => {
    if (!patSearch.trim() || patient) return;
    const t = setTimeout(async () => { setPatResults(await searchPatients(patSearch)); }, 300);
    return () => clearTimeout(t);
  }, [patSearch, patient]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !imedUser || !firestore) { setError('პაციენტი არ არის არჩეული'); return; }
    setSaving(true);
    setError('');
    try {
      const doctorId = canSetAnyDoctor ? (selectedDoctorId || imedUser.uid) : imedUser.uid;
      const ref = await addDoc(collection(firestore, COLLECTIONS.APPOINTMENTS), {
        patientId: patient.id,
        doctorId,
        dateTime: `${apptDate}T${apptTime}:00`,
        visitType,
        status: 'scheduled' as AppointmentStatus,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
        createdBy: imedUser.uid,
      });
      await addAuditLog({
        userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
        action: 'create', resourceType: 'appointment', resourceId: ref.id,
        patientId: patient.id, patientName: `${patient.lastName} ${patient.firstName}`,
        description: `ჩაწერა: ${patient.lastName} ${patient.firstName} — ${apptDate} ${apptTime}`,
      });
      setShowNew(false);
      setPatient(null);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    if (!firestore || !imedUser) return;
    await updateDoc(doc(firestore, COLLECTIONS.APPOINTMENTS, id), { status });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ჩაწერა (Scheduling)</h2>
          <p className="text-sm text-gray-500">{appointments.length} ვიზიტი</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors">
          <Plus size={18} /> ახალი ჩაწერა
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">ყველა სტატუსი</option>
          {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* New form modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">ახალი ჩაწერა</h3>
              <button onClick={() => setShowNew(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠ {error}</div>}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">პაციენტი *</label>
                {patient ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <div>
                      <div className="font-medium">{patient.lastName} {patient.firstName}</div>
                      <div className="text-xs text-gray-400">{patient.cardNumber}</div>
                    </div>
                    <button type="button" onClick={() => setPatient(null)} className="text-gray-400 p-1"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ძებნა..." value={patSearch} onChange={e => setPatSearch(e.target.value)} />
                    {patResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {patResults.map(p => (
                          <button key={p.id} type="button"
                            onClick={() => { setPatient(p); setPatSearch(''); setPatResults([]); }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm">
                            <div className="font-medium">{p.lastName} {p.firstName}</div>
                            <div className="text-xs text-gray-400">{p.personalId}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {canSetAnyDoctor && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ექიმი</label>
                  <select className={inputCls} value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
                    <option value="">— {imedUser?.displayName} (ჩემი) —</option>
                    {doctors.map(d => <option key={d.uid} value={d.uid}>{d.displayName} — {d.specialty || ''}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">თარიღი *</label>
                  <input type="date" className={inputCls} value={apptDate} onChange={e => setApptDate(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">დრო *</label>
                  <input type="time" className={inputCls} value={apptTime} onChange={e => setApptTime(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ვიზიტის ტიპი</label>
                <select className={inputCls} value={visitType} onChange={e => setVisitType(e.target.value as any)}>
                  {Object.entries(VISIT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">შენიშვნა</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">გაუქმება</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
                  <Save size={15} /> {saving ? 'ინახება...' : 'ჩაწერა'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointments */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <Calendar size={40} className="mx-auto mb-2 opacity-30" />
            <p>ვიზიტები ვერ მოიძებნა</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map(a => <AppointmentRow key={a.id} appt={a} onStatusChange={updateStatus} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentRow({ appt, onStatusChange }: { appt: Appointment; onStatusChange: (id: string, s: AppointmentStatus) => void }) {
  const [patName, setPatName] = useState('...');
  useEffect(() => {
    if (!firestore) return;
    import('../../firebase/db').then(({ doc: docFn, getDoc: getDocFn, firestore: fs, COLLECTIONS: C }) => {
      if (!fs) return;
      getDocFn(docFn(fs, C.PATIENTS, appt.patientId)).then(snap => {
        if (snap.exists()) { const d = snap.data() as any; setPatName(`${d.lastName} ${d.firstName}`); }
      });
    });
  }, [appt.patientId]);

  const time = new Date(appt.dateTime).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
      <div className="text-center min-w-[50px]">
        <Clock size={16} className="mx-auto text-blue-400 mb-0.5" />
        <div className="font-bold text-gray-800 text-sm">{time}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800">{patName}</div>
        <div className="text-xs text-gray-400">{VISIT_TYPE_LABELS[appt.visitType]}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[appt.status]}`}>
          {APPOINTMENT_STATUS_LABELS[appt.status]}
        </span>
        {appt.status === 'scheduled' && (
          <>
            <button onClick={() => onStatusChange(appt.id, 'arrived')}
              className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">
              მოვიდა
            </button>
            <button onClick={() => onStatusChange(appt.id, 'completed')}
              className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100">
              <CheckCircle2 size={13} className="inline" />
            </button>
            <button onClick={() => onStatusChange(appt.id, 'cancelled')}
              className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">
              <X size={13} className="inline" />
            </button>
          </>
        )}
        <Link to={`/imed/patients/${appt.patientId}`} className="text-blue-600 text-xs hover:underline">
          ბარათი
        </Link>
      </div>
    </div>
  );
}
