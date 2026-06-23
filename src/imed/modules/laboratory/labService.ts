// ============================================================
// iMED — ლაბორატორიის სერვისი
// დანიშვნა → შესრულება → მონახაზი → დადასტურება → ექიმთან ჩვენება
// ============================================================

import {
  firestore, COLLECTIONS, collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy,
} from '../../firebase/db';
import type {
  LabResult, LabResultStatus, LabParameter, Order, Patient,
} from '../../types';
import { PANEL_ANALYTES, LAB_ANALYTES, findAnalyte, getReference, formatRange, flagValue } from '../../data/labReferences';
import { addAuditLog } from '../audit/auditService';
import type { ImedUser } from '../../types';

// ── პარამეტრების აგება პანელის/ანალიზის სახელიდან + პაციენტის სქესი/ასაკი ──
export function buildParametersFor(testName: string, sex: 'male' | 'female', ageYears: number): LabParameter[] {
  // პანელის key-ის ამოცნობა
  let panelKey: string | undefined;
  const t = testName.toUpperCase();
  if (t.includes('CBC+5DIFF') || t.includes('5DIFF') || t.includes('ხუთმაგი')) panelKey = 'CBC+5DIFF';
  else if (t.includes('CBC') || t.includes('საერთო ანალიზი')) panelKey = 'CBC';
  else if (t.includes('გაზები') || t.includes('BLOOD') || t.includes('ელექტროლიტ')) panelKey = 'BLOOD_GAS';
  else if (t.includes('კოაგულ') || t.includes('PT/INR') || t.includes('APTT')) panelKey = 'COAG';
  else if (t.includes('ფარისებ') || t.includes('TSH')) panelKey = 'THYROID';

  let codes: string[] = panelKey ? PANEL_ANALYTES[panelKey] : [];
  // თუ პანელი ვერ ვიპოვეთ — ვცადოთ ცალკეული ანალიტი სახელით
  if (codes.length === 0) {
    const single = LAB_ANALYTES.find(a => testName.toLowerCase().includes(a.name.toLowerCase().split(' ')[0]));
    if (single) codes = [single.code];
  }

  return codes.map(code => {
    const a = findAnalyte(code);
    if (!a) return { code, name: code, value: '', unit: '', refRange: '', flag: 'normal' as const };
    const rule = getReference(a, sex, ageYears);
    return {
      code: a.code,
      name: a.name,
      value: '',
      unit: a.unit,
      refRange: formatRange(rule),
      flag: 'normal' as const,
    };
  });
}

// რიცხვითი მნიშვნელობის flag-ის გადათვლა refRange-ის მიხედვით
export function recomputeFlag(param: LabParameter, sex: 'male' | 'female', ageYears: number): LabParameter {
  const a = findAnalyte(param.code);
  const num = parseFloat((param.value || '').replace(',', '.'));
  if (!a || isNaN(num)) return { ...param, flag: 'normal' };
  const rule = getReference(a, sex, ageYears);
  const f = flagValue(num, rule);
  return { ...param, flag: f };
}

// ── ლაბ. სამუშაო სია: ლაბორატორიული orders, რომლებზეც პასუხი ჯერ არ დადასტურდა ──
export interface LabWorklistItem {
  order: Order;
  patient: Patient | null;
  result: LabResult | null;   // არსებული პასუხი (draft/in_progress) თუ აქვს
  itemName: string;
  itemCode?: string;
  groupName: string;
}

export async function getLabResultForOrderItem(orderId: string, testName: string): Promise<LabResult | null> {
  if (!firestore) return null;
  const snap = await getDocs(query(
    collection(firestore, COLLECTIONS.LAB_RESULTS),
    where('orderId', '==', orderId),
  ));
  const found = snap.docs.map(d => ({ id: d.id, ...d.data() } as LabResult)).find(r => r.testName === testName);
  return found || null;
}

// ── პასუხის შექმნა/განახლება (მონახაზად) ──
export async function saveLabResultDraft(params: {
  patient: Patient;
  order: Order;
  testName: string;
  testCode?: string;
  groupName: string;
  parameters: LabParameter[];
  comment?: string;
  user: ImedUser;
  existingId?: string;
}): Promise<string> {
  if (!firestore) throw new Error('ბაზა მიუწვდომელია');
  const { patient, order, testName, testCode, groupName, parameters, comment, user, existingId } = params;
  const now = new Date().toISOString();

  if (existingId) {
    await updateDoc(doc(firestore, COLLECTIONS.LAB_RESULTS, existingId), {
      parameters, comment: comment || '', status: 'draft',
      performedById: user.uid, performedByName: user.displayName, updatedAt: now,
    });
    await addAuditLog({
      userId: user.uid, userDisplayName: user.displayName, userRole: user.role,
      action: 'update', resourceType: 'lab_result', resourceId: existingId,
      patientId: patient.id, patientName: `${patient.lastName} ${patient.firstName}`,
      description: `ლაბ. პასუხი (მონახაზი): ${testName}`,
    });
    return existingId;
  }

  const data: Omit<LabResult, 'id'> = {
    patientId: patient.id,
    patientName: `${patient.lastName} ${patient.firstName}`,
    orderId: order.id,
    referralNumber: order.referralNumber,
    episodeId: order.episodeId,
    testName, testCode, groupName,
    parameters, comment: comment || '',
    status: 'draft',
    performedById: user.uid, performedByName: user.displayName,
    createdAt: now, updatedAt: now,
    versions: [],
  };
  const ref = await addDoc(collection(firestore, COLLECTIONS.LAB_RESULTS), data);
  await addAuditLog({
    userId: user.uid, userDisplayName: user.displayName, userRole: user.role,
    action: 'create', resourceType: 'lab_result', resourceId: ref.id,
    patientId: patient.id, patientName: `${patient.lastName} ${patient.firstName}`,
    description: `ლაბ. პასუხი დაიწყო: ${testName}`,
  });
  return ref.id;
}

// ── პასუხის დადასტურება ──
export async function confirmLabResult(resultId: string, user: ImedUser): Promise<void> {
  if (!firestore) throw new Error('ბაზა მიუწვდომელია');
  const snap = await getDoc(doc(firestore, COLLECTIONS.LAB_RESULTS, resultId));
  if (!snap.exists()) throw new Error('პასუხი ვერ მოიძებნა');
  const r = { id: snap.id, ...snap.data() } as LabResult;
  const now = new Date().toISOString();
  await updateDoc(doc(firestore, COLLECTIONS.LAB_RESULTS, resultId), {
    status: 'confirmed',
    confirmedById: user.uid, confirmedByName: user.displayName, confirmedAt: now, updatedAt: now,
  });
  // order item / order სტატუსის განახლება
  await markOrderItemDone(r.orderId, r.testName);
  await addAuditLog({
    userId: user.uid, userDisplayName: user.displayName, userRole: user.role,
    action: 'sign', resourceType: 'lab_result', resourceId: resultId,
    patientId: r.patientId, patientName: r.patientName,
    description: `ლაბ. პასუხი დადასტურდა: ${r.testName}`,
  });
}

// ── დადასტურებული პასუხის შესწორება (ძველი ვერსია ინახება) ──
export async function correctLabResult(params: {
  resultId: string; parameters: LabParameter[]; comment?: string; user: ImedUser;
}): Promise<void> {
  if (!firestore) throw new Error('ბაზა მიუწვდომელია');
  const { resultId, parameters, comment, user } = params;
  const snap = await getDoc(doc(firestore, COLLECTIONS.LAB_RESULTS, resultId));
  if (!snap.exists()) throw new Error('პასუხი ვერ მოიძებნა');
  const r = { id: snap.id, ...snap.data() } as LabResult;
  const now = new Date().toISOString();
  const versions = [...(r.versions || [])];
  // ძველი ვერსიის შენახვა
  versions.push({
    parameters: r.parameters, comment: r.comment,
    editedById: r.confirmedById || r.performedById || '', editedByName: r.confirmedByName || r.performedByName || '',
    editedAt: r.confirmedAt || r.updatedAt, status: r.status,
  });
  await updateDoc(doc(firestore, COLLECTIONS.LAB_RESULTS, resultId), {
    parameters, comment: comment || '', status: 'corrected',
    confirmedById: user.uid, confirmedByName: user.displayName, confirmedAt: now, updatedAt: now,
    versions,
  });
  await addAuditLog({
    userId: user.uid, userDisplayName: user.displayName, userRole: user.role,
    action: 'update', resourceType: 'lab_result', resourceId: resultId,
    patientId: r.patientId, patientName: r.patientName,
    description: `ლაბ. პასუხი შესწორდა: ${r.testName} (ძველი ვერსია შენახულია)`,
  });
}

async function markOrderItemDone(orderId: string, testName: string) {
  if (!firestore) return;
  const snap = await getDoc(doc(firestore, COLLECTIONS.ORDERS, orderId));
  if (!snap.exists()) return;
  const order = { id: snap.id, ...snap.data() } as Order;
  let allDone = true;
  const items = (order.items || []).map(it => {
    if (it.name === testName) return { ...it, status: 'completed' as const };
    if (it.status !== 'completed') allDone = false;
    return it;
  });
  await updateDoc(doc(firestore, COLLECTIONS.ORDERS, orderId), {
    items,
    status: allDone ? 'completed' : 'in_progress',
    completedAt: allDone ? new Date().toISOString() : undefined,
  });
}

// ── ლაბორანტის სამუშაო სია (დანიშნული ლაბ. orders) ──
export async function getLabWorklist(): Promise<LabWorklistItem[]> {
  if (!firestore) return [];
  const ordSnap = await getDocs(query(
    collection(firestore, COLLECTIONS.ORDERS),
    where('type', '==', 'laboratory'),
  ));
  const orders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
  // ყველა lab_result-ის წინასწარ წამოღება orderId-ების მიხედვით
  const resSnap = await getDocs(collection(firestore, COLLECTIONS.LAB_RESULTS));
  const allResults = resSnap.docs.map(d => ({ id: d.id, ...d.data() } as LabResult));

  const out: LabWorklistItem[] = [];
  for (const order of orders) {
    const items = order.items && order.items.length ? order.items : [{ name: order.description, code: order.serviceCode, subKey: order.subCategoryKey || '', categoryKey: 'laboratory', type: 'laboratory' as const, status: 'requested' as const }];
    let patient: Patient | null = null;
    const pSnap = await getDoc(doc(firestore, COLLECTIONS.PATIENTS, order.patientId));
    if (pSnap.exists()) patient = { id: pSnap.id, ...pSnap.data() } as Patient;
    for (const it of items) {
      const result = allResults.find(r => r.orderId === order.id && r.testName === it.name) || null;
      out.push({
        order, patient, result,
        itemName: it.name, itemCode: it.code,
        groupName: (it as any).subKey || order.subCategoryKey || 'ლაბორატორია',
      });
    }
  }
  // დალაგება: ჯერ დაუმთავრებელი
  return out.sort((a, b) => {
    const ra = a.result?.status === 'confirmed' ? 1 : 0;
    const rb = b.result?.status === 'confirmed' ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return new Date(b.order.requestedAt).getTime() - new Date(a.order.requestedAt).getTime();
  });
}

// ── ექიმისთვის: პაციენტის დადასტურებული ლაბ. პასუხები ──
export async function getConfirmedResultsForPatient(patientId: string): Promise<LabResult[]> {
  if (!firestore) return [];
  const snap = await getDocs(query(
    collection(firestore, COLLECTIONS.LAB_RESULTS),
    where('patientId', '==', patientId),
  ));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as LabResult))
    .filter(r => r.status === 'confirmed' || r.status === 'corrected')
    .sort((a, b) => new Date(b.confirmedAt || b.updatedAt).getTime() - new Date(a.confirmedAt || a.updatedAt).getTime());
}

// ── ყველა პასუხი პაციენტზე (სტატუსის ფილტრით) ──
export async function getResultsForPatient(patientId: string): Promise<LabResult[]> {
  if (!firestore) return [];
  const snap = await getDocs(query(
    collection(firestore, COLLECTIONS.LAB_RESULTS),
    where('patientId', '==', patientId),
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as LabResult));
}

export async function getLabResult(id: string): Promise<LabResult | null> {
  if (!firestore) return null;
  const snap = await getDoc(doc(firestore, COLLECTIONS.LAB_RESULTS, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as LabResult) : null;
}

export function calcAgeYears(birthDate: string): number {
  if (!birthDate) return 30;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}
