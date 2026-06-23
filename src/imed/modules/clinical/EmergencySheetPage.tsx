import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getPatient } from '../patients/patientsService';
import { loadClinicConfig } from '../settings/clinicConfig';
import type { Patient, ClinicConfig } from '../../types';
import {
  getEmergencySheet, saveEmergencySheet, type EmergencySheet, type DiagnosisEntry,
  type DiagnosisKind, DIAGNOSIS_KIND_LABELS,
} from './clinicalService';
import { Letterhead, SignatureBlock } from '../../components/common/Letterhead';
import PrintButton from '../../components/print/PrintButton';
import EmergencyPrintView from './EmergencyPrintView';
import ICD10Picker from '../../components/icd10/ICD10Picker';
import { ArrowLeft, Save, Loader2, X, Plus, CheckCircle2 } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const KINDS: DiagnosisKind[] = ['acute', 'concomitant', 'chronic', 'subacute', 'complication'];

export default function EmergencySheetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { imedUser } = useAuthStore();
  const printRef = useRef<HTMLDivElement>(null);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const now = new Date();
  const [sheet, setSheet] = useState<EmergencySheet>({
    patientId: id || '', complaints: '', anamnesis: '', statusLocalis: '',
    examDate: now.toISOString().slice(0, 10), examTime: now.toTimeString().slice(0, 5),
    diagnoses: [], doctorId: '', doctorName: '',
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [p, c, existing] = await Promise.all([getPatient(id), loadClinicConfig(), getEmergencySheet(id)]);
      setPatient(p);
      setClinic(c);
      if (existing) setSheet(existing);
      else if (imedUser) setSheet(s => ({ ...s, doctorId: imedUser.uid, doctorName: imedUser.displayName }));
      setLoading(false);
    })();
  }, [id, imedUser]);

  const set = (k: keyof EmergencySheet, v: any) => setSheet(prev => ({ ...prev, [k]: v }));
  const addDiag = (code: string, name: string) => set('diagnoses', [...sheet.diagnoses, { code, name, kind: 'acute' as DiagnosisKind }]);
  const setDiagKind = (i: number, kind: DiagnosisKind) => set('diagnoses', sheet.diagnoses.map((d, j) => j === i ? { ...d, kind } : d));
  const removeDiag = (i: number) => set('diagnoses', sheet.diagnoses.filter((_, j) => j !== i));

  const save = async () => {
    if (!imedUser) return;
    if (!sheet.complaints.trim() && !sheet.diagnoses.length) { setErr('შეავსეთ მინიმუმ ჩივილები ან დიაგნოზი'); return; }
    setSaving(true); setErr('');
    try {
      const newId = await saveEmergencySheet({ ...sheet, doctorId: sheet.doctorId || imedUser.uid, doctorName: sheet.doctorName || imedUser.displayName }, imedUser);
      setSheet(s => ({ ...s, id: newId }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setErr(e.message || 'შეცდომა'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!patient) return <div className="text-center py-16 text-gray-400">პაციენტი ვერ მოიძებნა</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">ემერჯენსის გასინჯვის ფურცელი</h2>
            <p className="text-xs text-gray-500">{patient.lastName} {patient.firstName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} შენახვა
          </button>
          <PrintButton contentRef={printRef} documentTitle="ემერჯენსის გასინჯვის ფურცელი" />
        </div>
      </div>

      {saved && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm no-print"><CheckCircle2 size={15} /> შენახულია</div>}
      {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm no-print">⚠ {err}</div>}

      {/* ბეჭდვადი ხედი — ეკრანზე გადამალული */}
      <div ref={printRef} className="imed-print-source">
        <EmergencyPrintView sheet={sheet} patient={patient} clinic={clinic} doctor={imedUser} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <Letterhead clinic={clinic} patient={patient} docTitle="ემერჯენსის გასინჯვის ფურცელი"
          formLegalRef="გადაუდებელი დახმარების სამედიცინო დოკუმენტაცია — №108/ნ" />

        <Field label="ჩივილები">
          <textarea className={`${inputCls} resize-none`} rows={2} value={sheet.complaints} onChange={e => set('complaints', e.target.value)} />
        </Field>
        <Field label="დაავადების ანამნეზი">
          <textarea className={`${inputCls} resize-none`} rows={3} value={sheet.anamnesis} onChange={e => set('anamnesis', e.target.value)} />
        </Field>
        <Field label="ობიექტური გასინჯვა — Status localis">
          <textarea className={`${inputCls} resize-none`} rows={3} value={sheet.statusLocalis} onChange={e => set('statusLocalis', e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="თარიღი"><input type="date" className={inputCls} value={sheet.examDate} onChange={e => set('examDate', e.target.value)} /></Field>
          <Field label="დრო"><input type="time" className={inputCls} value={sheet.examTime} onChange={e => set('examTime', e.target.value)} /></Field>
        </div>

        {/* დიაგნოზი — ICD-10 მრავალი */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">დიაგნოზი — Diagnosis (ICD-10)</label>
          <div className="no-print mb-2">
            <ICD10Picker onSelect={(it) => addDiag(it.code, it.name)} placeholder="ICD-10: კოდი ან დიაგნოზი + Enter არჩევაზე..." />
          </div>
          {sheet.diagnoses.length === 0 ? (
            <div className="text-sm text-gray-400 py-2">დიაგნოზი არ არის დამატებული</div>
          ) : (
            <div className="space-y-1.5">
              {sheet.diagnoses.map((d, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{d.code}</span>
                  <span className="flex-1 text-sm text-gray-800">{d.name}</span>
                  <select value={d.kind} onChange={e => setDiagKind(i, e.target.value as DiagnosisKind)}
                    className="text-xs border border-gray-300 rounded px-1.5 py-1 no-print">
                    {KINDS.map(k => <option key={k} value={k}>{DIAGNOSIS_KIND_LABELS[k]}</option>)}
                  </select>
                  <span className="text-xs text-gray-500 print-only hidden">{DIAGNOSIS_KIND_LABELS[d.kind]}</span>
                  <button onClick={() => removeDiag(i)} className="text-gray-400 hover:text-red-500 no-print"><X size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <SignatureBlock doctorName={sheet.doctorName || imedUser?.displayName} doctorSignatureUrl={imedUser?.signatureUrl}
          signedAt={`${sheet.examDate} ${sheet.examTime}`} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
