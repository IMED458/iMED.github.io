import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getPatient } from '../patients/patientsService';
import { loadClinicConfig } from '../settings/clinicConfig';
import type { Patient, ClinicConfig } from '../../types';
import {
  getForm100, buildForm100Autofill, saveForm100, type Form100Data,
  type DiagnosisEntry, type DiagnosisKind, DIAGNOSIS_KIND_LABELS,
} from './clinicalService';
import { Letterhead } from '../../components/common/Letterhead';
import PrintButton from '../../components/print/PrintButton';
import ICD10Picker from '../../components/icd10/ICD10Picker';
import { ArrowLeft, Save, Loader2, RefreshCw, X, CheckCircle2 } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const taCls = `${inputCls} resize-y`;

function calcAge(bd: string): number {
  if (!bd) return 0;
  return Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function Form100Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { imedUser } = useAuthStore();
  const printRef = useRef<HTMLDivElement>(null);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [form, setForm] = useState<Form100Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [p, c, existing] = await Promise.all([getPatient(id), loadClinicConfig(), getForm100(id)]);
      setPatient(p);
      setClinic(c);
      const filled = await buildForm100Autofill(id, existing);
      // ცარიელი დაწესებულება — clinic-დან
      if (!filled.issuer && c?.name) filled.issuer = c.name;
      if (!filled.doctorName && imedUser) { filled.doctorName = imedUser.displayName; filled.doctorId = imedUser.uid; }
      setForm(filled);
      setLoading(false);
    })();
  }, [id, imedUser]);

  const set = (k: keyof Form100Data, v: any) => setForm(prev => prev ? { ...prev, [k]: v } : prev);

  const reAutofill = async () => {
    if (!id || !form) return;
    setRefreshing(true);
    const filled = await buildForm100Autofill(id, form);
    setForm({ ...filled });
    setRefreshing(false);
  };

  const save = async () => {
    if (!form || !imedUser) return;
    setSaving(true); setErr('');
    try {
      const newId = await saveForm100(form, imedUser);
      setForm(f => f ? { ...f, id: newId } : f);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setErr(e.message || 'შეცდომა'); }
    finally { setSaving(false); }
  };

  if (loading || !form) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!patient) return <div className="text-center py-16 text-gray-400">პაციენტი ვერ მოიძებნა</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* მართვა */}
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">ფორმა № IV-100/ა</h2>
            <p className="text-xs text-gray-500">ცნობა ჯანმრთელობის მდგომარეობის შესახებ · {patient.lastName} {patient.firstName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={reAutofill} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-lg text-sm font-medium disabled:opacity-50">
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} ავტო-შევსება/განახლება
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} შენახვა
          </button>
          <PrintButton contentRef={printRef} documentTitle="ფორმა-100-IV-100а" />
        </div>
      </div>

      {saved && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm no-print"><CheckCircle2 size={15} /> შენახულია</div>}
      {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm no-print">⚠ {err}</div>}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 no-print">
        ⟳ ავტომატურად შევსებული ველები (პაციენტი, დიაგნოზი ემერჯენსიდან, ჩატარებული კვლევები) — შეგიძლიათ ხელით დაარედაქტიროთ, ცვლილება შეინახება.
      </div>

      {/* ბეჭდვადი ფორმა */}
      <div ref={printRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3 text-sm">
        <Letterhead clinic={clinic} patient={undefined}
          docTitle="ცნობა ჯანმრთელობის მდგომარეობის შესახებ"
          formNumber="IV-100/ა"
          formLegalRef="დამტკიცებულია საქართველოს შრომის, ჯანმრთელობისა და სოციალური დაცვის მინისტრის 2007 წ. 9 აგვისტოს №338/ნ ბრძანებით — სამედიცინო დოკუმენტაციის ფორმა № IV-100/ა" />

        <Row n="1" label="ცნობის გამცემი დაწესებულება">
          <input className={inputCls} value={form.issuer} onChange={e => set('issuer', e.target.value)} />
        </Row>
        <Row n="2" label="ცნობა იგზავნება">
          <input className={inputCls} value={form.sentTo} onChange={e => set('sentTo', e.target.value)} />
        </Row>

        {/* 3-6 პაციენტი (auto) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <KV n="3" label="პაციენტი" value={`${patient.lastName} ${patient.firstName}`} />
          <KV n="4" label="დაბადების თარიღი" value={`${patient.birthDate} (${calcAge(patient.birthDate)} წ.)`} />
          <KV n="5" label="პირადი ნომერი" value={patient.personalId} />
          <KV n="6" label="მისამართი" value={patient.actualAddress || patient.registrationAddress} />
          <KV n="—" label="ისტორიის №" value={patient.historyNumber || patient.cardNumber} />
        </div>

        <Row n="7" label="სამუშაო ადგილი / სასწავლო დაწესებულება">
          <input className={inputCls} value={form.workplace} onChange={e => set('workplace', e.target.value)} />
        </Row>

        {/* 8 თარიღები */}
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="font-semibold text-gray-700 mb-2">8. თარიღები</div>
          <div className="grid grid-cols-2 gap-3">
            <DateField label="ა) ამბულატორიაში მიმართვის" value={form.dateAmbulatory} onChange={v => set('dateAmbulatory', v)} />
            <DateField label="ბ) სტაციონარში გაგზავნის" value={form.dateSentStationar} onChange={v => set('dateSentStationar', v)} />
            <DateField label="გ) სტაციონარში მოთავსების" value={form.dateAdmission} onChange={v => set('dateAdmission', v)} />
            <DateField label="დ) გაწერის" value={form.dateDischarge} onChange={v => set('dateDischarge', v)} />
          </div>
        </div>

        {/* 9 დიაგნოზი */}
        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="font-semibold text-gray-700">9. სრული დიაგნოზი</div>
          <DiagBlock title="ძირითადი დაავადება(ები)" list={form.diagMain} onChange={v => set('diagMain', v)} />
          <DiagBlock title="თანმხლები დაავადება(ები)" list={form.diagSecondary} onChange={v => set('diagSecondary', v)} />
          <div>
            <label className="block text-xs text-gray-500 mb-1">გართულებები</label>
            <input className={inputCls} value={form.complications} onChange={e => set('complications', e.target.value)} />
          </div>
        </div>

        <Row n="10" label="გადატანილი დაავადებები">
          <textarea className={taCls} rows={2} value={form.pastDiseases} onChange={e => set('pastDiseases', e.target.value)} />
        </Row>
        <Row n="11" label="მოკლე ანამნეზი ⟳">
          <textarea className={taCls} rows={3} value={form.briefAnamnesis} onChange={e => set('briefAnamnesis', e.target.value)} />
        </Row>
        <Row n="12" label="ჩატარებული დიაგნოსტიკური გამოკვლევები და კონსულტაციები ⟳ (ლაბ. ავტომატურად)">
          <textarea className={`${taCls} font-mono text-xs`} rows={6} value={form.investigations} onChange={e => set('investigations', e.target.value)} />
        </Row>
        <Row n="13" label="ავადმყოფობის მიმდინარეობა ⟳">
          <textarea className={taCls} rows={3} value={form.courseOfDisease} onChange={e => set('courseOfDisease', e.target.value)} />
        </Row>
        <Row n="14" label="ჩატარებული მკურნალობა">
          <textarea className={taCls} rows={3} value={form.treatment} onChange={e => set('treatment', e.target.value)} />
        </Row>
        <Row n="15" label="მდგომარეობა სტაციონარში გაგზავნისას">
          <textarea className={taCls} rows={2} value={form.stateOnAdmission} onChange={e => set('stateOnAdmission', e.target.value)} />
        </Row>
        <Row n="16" label="მდგომარეობა სტაციონარიდან გაწერისას">
          <textarea className={taCls} rows={2} value={form.stateOnDischarge} onChange={e => set('stateOnDischarge', e.target.value)} />
        </Row>
        <Row n="17" label="სამკურნალო და შრომითი რეკომენდაციები">
          <textarea className={taCls} rows={2} value={form.recommendations} onChange={e => set('recommendations', e.target.value)} />
        </Row>

        {/* 18-20 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-300 mt-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">18. მკურნალი ექიმი</div>
            <input className={inputCls} value={form.doctorName} onChange={e => set('doctorName', e.target.value)} />
            {imedUser?.signatureUrl && <img src={imedUser.signatureUrl} alt="ხელმოწერა" className="h-10 mt-2" />}
            <div className="text-xs text-gray-400 mt-1">ხელმოწერა / ბეჭედი</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">20. ცნობის გაცემის თარიღი</div>
            <input type="date" className={inputCls} value={form.issueDate} onChange={e => set('issueDate', e.target.value)} />
            <div className="text-xs text-gray-400 mt-6">დაწესებულების ხელმძღვანელი / მოადგილე ___________</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ n, label, children }: { n: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{n}. {label}</label>
      {children}
    </div>
  );
}
function KV({ n, label, value }: { n: string; label: string; value?: string }) {
  return (
    <div className="text-sm">
      <span className="text-gray-500">{n}. {label}:</span>{' '}
      <span className="font-medium text-gray-800">{value || '—'}</span>
    </div>
  );
}
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="date" className={inputCls} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
function DiagBlock({ title, list, onChange }: { title: string; list: DiagnosisEntry[]; onChange: (v: DiagnosisEntry[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-500">{title}</label>
      </div>
      <div className="no-print mb-1.5">
        <ICD10Picker buttonLabel="დიაგნოზის დამატება (ICD-10)" onSelect={(it) => onChange([...list, { code: it.code, name: it.name, kind: 'acute' }])} />
      </div>
      {list.length === 0 ? <div className="text-xs text-gray-400">—</div> : (
        <div className="space-y-1">
          {list.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{d.code}</span>
              <span className="flex-1">{d.name}</span>
              <button onClick={() => onChange(list.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 no-print"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
