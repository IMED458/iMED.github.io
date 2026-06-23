// ============================================================
// iMED — კლინიკური დოკუმენტების სერვისი
// ემერჯენსის ფურცელი + ფორმა 100, პაციენტთან მიბმული (patientId)
// ============================================================

import {
  firestore, COLLECTIONS, collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where,
} from '../../firebase/db';
import type { ImedUser, LabResult } from '../../types';
import { addAuditLog } from '../audit/auditService';
import { getConfirmedResultsForPatient } from '../laboratory/labService';

export const EMERGENCY_TYPE = 'ემერჯენსის გასინჯვის ფურცელი';
export const FORM100_TYPE = 'ფორმა IV-100/ა';

export type DiagnosisKind = 'acute' | 'concomitant' | 'chronic' | 'subacute' | 'complication';
export const DIAGNOSIS_KIND_LABELS: Record<DiagnosisKind, string> = {
  acute: 'მწვავე',
  concomitant: 'თანმხლები',
  chronic: 'ქრონიკული',
  subacute: 'ქვემწვავე',
  complication: 'გართულება',
};

export interface DiagnosisEntry {
  code: string;
  name: string;
  kind: DiagnosisKind;
}

export interface EmergencySheet {
  id?: string;
  patientId: string;
  complaints: string;
  anamnesis: string;
  statusLocalis: string;
  examDate: string;
  examTime: string;
  diagnoses: DiagnosisEntry[];
  doctorId: string;
  doctorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Form100Data {
  id?: string;
  patientId: string;
  issuer: string;           // 1. ცნობის გამცემი დაწესებულება
  sentTo: string;           // 2. ცნობა იგზავნება
  workplace: string;        // 7. სამუშაო ადგილი
  // 8. თარიღები
  dateAmbulatory: string;
  dateSentStationar: string;
  dateAdmission: string;
  dateDischarge: string;
  // 9. დიაგნოზი
  diagMain: DiagnosisEntry[];
  diagSecondary: DiagnosisEntry[];
  complications: string;
  pastDiseases: string;     // 10
  briefAnamnesis: string;   // 11
  investigations: string;   // 12 (auto ლაბ.)
  courseOfDisease: string;  // 13
  treatment: string;        // 14
  stateOnAdmission: string; // 15
  stateOnDischarge: string; // 16
  recommendations: string;  // 17
  doctorId: string;         // 18
  doctorName: string;
  issueDate: string;        // 20
  createdAt: string;
  updatedAt: string;
}

// ── გენერიკი: ბოლო დოკ. ტიპით ──
async function getLatestDoc(patientId: string, typeLabel: string): Promise<{ id: string; content: any } | null> {
  if (!firestore) return null;
  const snap = await getDocs(query(
    collection(firestore, COLLECTIONS.DOCUMENTS),
    where('patientId', '==', patientId),
    where('type', '==', typeLabel),
  ));
  if (snap.empty) return null;
  const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  docs.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  return { id: docs[0].id, content: docs[0].content };
}

// ── ემერჯენსი ──
export async function getEmergencySheet(patientId: string): Promise<EmergencySheet | null> {
  const d = await getLatestDoc(patientId, EMERGENCY_TYPE);
  if (!d) return null;
  return { id: d.id, ...(d.content as EmergencySheet) };
}

export async function saveEmergencySheet(sheet: EmergencySheet, user: ImedUser): Promise<string> {
  if (!firestore) throw new Error('ბაზა მიუწვდომელია');
  const now = new Date().toISOString();
  const content = { ...sheet, updatedAt: now };
  if (sheet.id) {
    await updateDoc(doc(firestore, COLLECTIONS.DOCUMENTS, sheet.id), {
      content, updatedAt: now, status: 'signed',
    });
    await addAuditLog({
      userId: user.uid, userDisplayName: user.displayName, userRole: user.role,
      action: 'update', resourceType: 'document', resourceId: sheet.id,
      patientId: sheet.patientId, documentType: EMERGENCY_TYPE,
      description: 'ემერჯენსის ფურცელი განახლდა',
    });
    return sheet.id;
  }
  const ref = await addDoc(collection(firestore, COLLECTIONS.DOCUMENTS), {
    type: EMERGENCY_TYPE, patientId: sheet.patientId, status: 'signed',
    content: { ...content, createdAt: now }, version: 1,
    createdBy: user.uid, createdAt: now, updatedAt: now,
  });
  await addAuditLog({
    userId: user.uid, userDisplayName: user.displayName, userRole: user.role,
    action: 'create', resourceType: 'document', resourceId: ref.id,
    patientId: sheet.patientId, documentType: EMERGENCY_TYPE,
    description: 'ემერჯენსის ფურცელი შეიქმნა',
  });
  return ref.id;
}

// ── ლაბ. პასუხების ტექსტად აწყობა ფორმა 100-ის მე-12 ნაწილისთვის ──
export function buildInvestigationsText(results: LabResult[]): string {
  if (!results.length) return '';
  return results.map(r => {
    const date = r.confirmedAt ? new Date(r.confirmedAt).toLocaleDateString('ka-GE') : '';
    const params = r.parameters
      .filter(p => p.value)
      .map(p => `${p.name}: ${p.value}${p.unit ? ' ' + p.unit : ''}${p.flag !== 'normal' ? (p.flag === 'high' ? ' ↑' : ' ↓') : ''} (ნორმა: ${p.refRange})`)
      .join('; ');
    return `• ${r.testName}${date ? ` (${date})` : ''}: ${params}${r.comment ? `. ${r.comment}` : ''}`;
  }).join('\n');
}

// ── ფორმა 100 ──
export async function getForm100(patientId: string): Promise<Form100Data | null> {
  const d = await getLatestDoc(patientId, FORM100_TYPE);
  if (!d) return null;
  return { id: d.id, ...(d.content as Form100Data) };
}

// ── ფორმა 100-ის ავტო-აგება პაციენტი + ემერჯენსი + ლაბ. ──
export async function buildForm100Autofill(patientId: string, existing: Form100Data | null): Promise<Form100Data> {
  const [emergency, results] = await Promise.all([
    getEmergencySheet(patientId),
    getConfirmedResultsForPatient(patientId),
  ]);
  const now = new Date().toISOString();
  const investigations = buildInvestigationsText(results);

  const base: Form100Data = existing || {
    patientId,
    issuer: '', sentTo: '', workplace: '',
    dateAmbulatory: '', dateSentStationar: '', dateAdmission: '', dateDischarge: '',
    diagMain: [], diagSecondary: [], complications: '',
    pastDiseases: '', briefAnamnesis: '', investigations: '',
    courseOfDisease: '', treatment: '', stateOnAdmission: '', stateOnDischarge: '',
    recommendations: '', doctorId: '', doctorName: '',
    issueDate: now.slice(0, 10), createdAt: now, updatedAt: now,
  };

  // ემერჯენსიდან სინქი — მხოლოდ ცარიელ ველებში (ხელით შეცვლილს არ ვშლით)
  if (emergency) {
    if (base.diagMain.length === 0 && emergency.diagnoses.length) {
      base.diagMain = emergency.diagnoses.filter(d => d.kind === 'acute' || d.kind === 'subacute');
      base.diagSecondary = emergency.diagnoses.filter(d => d.kind === 'concomitant' || d.kind === 'chronic');
      const comp = emergency.diagnoses.filter(d => d.kind === 'complication');
      if (comp.length && !base.complications) base.complications = comp.map(c => `${c.code} ${c.name}`).join('; ');
    }
    if (!base.briefAnamnesis) {
      base.briefAnamnesis = [emergency.complaints, emergency.anamnesis].filter(Boolean).join('\n');
    }
    if (!base.courseOfDisease && emergency.statusLocalis) {
      base.courseOfDisease = emergency.statusLocalis;
    }
    if (!base.doctorName && emergency.doctorName) {
      base.doctorName = emergency.doctorName;
      base.doctorId = emergency.doctorId;
    }
  }

  // ლაბ. გამოკვლევები — ყოველთვის ვაახლებთ (ეს auto-ნაწილია), მაგრამ თუ ექიმს დაუმატებია ხელით ტექსტი, ვინარჩუნებთ
  if (investigations) {
    if (!base.investigations) base.investigations = investigations;
    else if (!base.investigations.includes(investigations.split('\n')[0])) {
      // ახალი პასუხები დაემატა — განვაახლოთ auto-ბლოკი
      base.investigations = investigations;
    }
  }

  return base;
}

export async function saveForm100(form: Form100Data, user: ImedUser): Promise<string> {
  if (!firestore) throw new Error('ბაზა მიუწვდომელია');
  const now = new Date().toISOString();
  const content = { ...form, updatedAt: now };
  if (form.id) {
    await updateDoc(doc(firestore, COLLECTIONS.DOCUMENTS, form.id), { content, updatedAt: now, status: 'signed' });
    await addAuditLog({
      userId: user.uid, userDisplayName: user.displayName, userRole: user.role,
      action: 'update', resourceType: 'document', resourceId: form.id,
      patientId: form.patientId, documentType: FORM100_TYPE, description: 'ფორმა 100 განახლდა',
    });
    return form.id;
  }
  const ref = await addDoc(collection(firestore, COLLECTIONS.DOCUMENTS), {
    type: FORM100_TYPE, patientId: form.patientId, status: 'signed',
    content: { ...content, createdAt: now }, version: 1,
    createdBy: user.uid, createdAt: now, updatedAt: now,
  });
  await addAuditLog({
    userId: user.uid, userDisplayName: user.displayName, userRole: user.role,
    action: 'create', resourceType: 'document', resourceId: ref.id,
    patientId: form.patientId, documentType: FORM100_TYPE, description: 'ფორმა 100 შეიქმნა',
  });
  return ref.id;
}
