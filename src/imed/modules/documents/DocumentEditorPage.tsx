import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  firestore, COLLECTIONS, collection, doc, getDoc, addDoc, updateDoc, getDocs, query, where, limit,
} from '../../firebase/db';
import type { MedicalDocument, Patient, ClinicConfig } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { addAuditLog } from '../audit/auditService';
import { Letterhead, SignatureBlock } from '../../components/common/Letterhead';
import PrintButton from '../../components/print/PrintButton';
import {
  ArrowLeft, Save, CheckCircle2, Lock, Printer, Search,
} from 'lucide-react';
import { searchPatients } from '../patients/patientsService';


import { DOC_TEMPLATES, type Field } from './docTemplates';

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { imedUser } = useAuthStore();
  const printRef = useRef<HTMLDivElement>(null);

  const docType = sp.get('type') || 'exam_diary';
  const patientIdParam = sp.get('patientId');

  const [document, setDocument] = useState<MedicalDocument | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [patSearch, setPatSearch] = useState('');
  const [patResults, setPatResults] = useState<Patient[]>([]);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!id);

  const template = DOC_TEMPLATES[docType] || DOC_TEMPLATES.exam_diary;
  const isNew = !id;
  const isLocked = document?.status === 'locked';

  // Load existing doc
  useEffect(() => {
    if (!id || !firestore) { setLoading(false); return; }
    const load = async () => {
      const snap = await getDoc(doc(firestore!, COLLECTIONS.DOCUMENTS, id));
      if (!snap.exists()) { setLoading(false); return; }
      const d = { id: snap.id, ...snap.data() } as MedicalDocument;
      setDocument(d);
      setFormData(d.content as Record<string, string>);
      if (d.patientId && firestore) {
        const pSnap = await getDoc(doc(firestore, COLLECTIONS.PATIENTS, d.patientId));
        if (pSnap.exists()) setPatient({ id: pSnap.id, ...pSnap.data() } as Patient);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  // Load patient from URL
  useEffect(() => {
    if (patientIdParam && !patient) {
      import('../patients/patientsService').then(({ getPatient }) => {
        getPatient(patientIdParam).then(p => p && setPatient(p));
      });
    }
  }, [patientIdParam, patient]);

  // Load clinic config
  useEffect(() => {
    if (!firestore) return;
    getDocs(query(collection(firestore, COLLECTIONS.CLINIC_CONFIG), limit(1))).then(snap => {
      if (!snap.empty) setClinic({ id: snap.docs[0].id, ...snap.docs[0].data() } as ClinicConfig);
    });
  }, []);

  // Patient search
  useEffect(() => {
    if (!patSearch.trim() || patient) return;
    const t = setTimeout(async () => { setPatResults(await searchPatients(patSearch)); }, 300);
    return () => clearTimeout(t);
  }, [patSearch, patient]);

  // Norton auto-calculate
  useEffect(() => {
    if (docType !== 'norton_scale') return;
    const scores = ['physical_condition', 'mental_state', 'activity', 'mobility', 'incontinence']
      .map(k => parseInt(formData[k]?.[0] || '0') || 0);
    const total = scores.reduce((a, b) => a + b, 0);
    const risk = total <= 14 ? 'მაღალი რისკი' : total <= 17 ? 'საშ. რისკი' : 'დაბალი რისკი';
    setFormData(prev => ({ ...prev, total: String(total), risk_level: risk }));
  }, [formData.physical_condition, formData.mental_state, formData.activity, formData.mobility, formData.incontinence, docType]);

  const setField = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const save = async (sign = false) => {
    if (!patient || !imedUser || !firestore) { setError('პაციენტი არ არის არჩეული'); return; }
    if (isLocked) return;
    sign ? setSigning(true) : setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const status: MedicalDocument['status'] = sign ? 'locked' : 'signed';
      if (isNew || !id) {
        const ref = await addDoc(collection(firestore, COLLECTIONS.DOCUMENTS), {
          type: template.label,
          patientId: patient.id,
          episodeId: sp.get('episodeId') || undefined,
          status: sign ? 'locked' : 'draft',
          content: formData,
          version: 1,
          createdBy: imedUser.uid,
          signedBy: sign ? imedUser.uid : undefined,
          signedAt: sign ? now : undefined,
          createdAt: now,
          updatedAt: now,
        });
        await addAuditLog({
          userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
          action: sign ? 'sign' : 'create', resourceType: 'document', resourceId: ref.id,
          patientId: patient.id, patientName: `${patient.lastName} ${patient.firstName}`,
          documentType: template.label,
          description: `${sign ? 'დაადასტურა' : 'შექმნა'}: ${template.label}`,
        });
        navigate(`/imed/documents/${ref.id}`);
      } else {
        await updateDoc(doc(firestore, COLLECTIONS.DOCUMENTS, id), {
          status,
          content: formData,
          updatedAt: now,
          signedBy: sign ? imedUser.uid : undefined,
          signedAt: sign ? now : undefined,
        });
        setDocument(prev => prev ? { ...prev, status } : null);
        await addAuditLog({
          userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
          action: sign ? 'sign' : 'update', resourceType: 'document', resourceId: id,
          patientId: patient?.id, patientName: patient ? `${patient.lastName} ${patient.firstName}` : '',
          documentType: template.label,
          description: `${sign ? 'დაადასტურა/დაიბლოკა' : 'განახლდა'}: ${template.label}`,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
      setSigning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{template.label}</h2>
            {template.formNum && <p className="text-xs text-gray-400">ფ. №{template.formNum}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!isLocked && <button onClick={() => save(false)} disabled={saving || !patient}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium disabled:opacity-50">
            <Save size={15} /> {saving ? 'ინახება...' : 'შენახვა'}
          </button>}
          {!isLocked && <button onClick={() => save(true)} disabled={signing || !patient}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            <Lock size={15} /> {signing ? '...' : 'დადასტ. / დაბლოკვა'}
          </button>}
          <PrintButton contentRef={printRef} documentTitle={template.label}
            onBeforePrint={async () => { await addAuditLog({ userId: imedUser!.uid, userDisplayName: imedUser!.displayName, userRole: imedUser!.role, action: 'print', resourceType: 'document', resourceId: id, patientId: patient?.id, documentType: template.label, description: `დაიბეჭდა: ${template.label}` }); }}
          />
        </div>
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <Lock size={16} /> დოკუმენტი დადასტურებული და დაბლოკილია. ცვლილება შეუძლებელია.
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠ {error}</div>}

      {/* Printable area */}
      <div ref={printRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <Letterhead
          clinic={clinic}
          patient={patient || undefined}
          docTitle={template.label}
          formNumber={template.formNum}
          formLegalRef={template.legalRef}
          isLab={(template as any).isLab}
        />

        {/* Patient selector (new docs only) */}
        {!patient && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2 no-print">
            <p className="text-sm font-medium text-yellow-800">⚠ პაციენტი არ არის მითითებული</p>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ძებნა: გვარი, პირადი №..."
                value={patSearch} onChange={e => setPatSearch(e.target.value)} />
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
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          {template.fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px] ${isLocked || f.readonly ? 'bg-gray-50 border-gray-200 text-gray-700' : 'border-gray-300'}`}
                  value={formData[f.key] || ''}
                  onChange={e => setField(f.key, e.target.value)}
                  disabled={isLocked || f.readonly}
                />
              ) : f.type === 'select' ? (
                <select
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLocked ? 'bg-gray-50 border-gray-200 text-gray-700' : 'border-gray-300'}`}
                  value={formData[f.key] || ''}
                  onChange={e => setField(f.key, e.target.value)}
                  disabled={isLocked}
                >
                  <option value="">— —</option>
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'date' ? (
                <input type="date"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLocked ? 'bg-gray-50 border-gray-200' : 'border-gray-300'}`}
                  value={formData[f.key] || ''}
                  onChange={e => setField(f.key, e.target.value)}
                  disabled={isLocked}
                />
              ) : (
                <input type="text"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLocked || f.readonly ? 'bg-gray-50 border-gray-200 text-gray-700 font-medium' : 'border-gray-300'}`}
                  value={formData[f.key] || ''}
                  onChange={e => setField(f.key, e.target.value)}
                  disabled={isLocked || f.readonly}
                />
              )}
            </div>
          ))}
        </div>

        <SignatureBlock
          doctorName={imedUser?.displayName}
          doctorSignatureUrl={imedUser?.signatureUrl}
          signedAt={document?.signedAt ? new Date(document.signedAt).toLocaleDateString('ka-GE') : undefined}
        />
      </div>
    </div>
  );
}
