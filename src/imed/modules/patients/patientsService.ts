import {
  firestore,
  COLLECTIONS,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from '../../firebase/db';
import type { Patient } from '../../types';
import { addAuditLog } from '../audit/auditService';
import type { ImedUser } from '../../types';

// ბარათის ნომრის გენერაცია (NNNNN/YY)
export function generateCardNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `${rand}/${year}`;
}

export async function createPatient(
  data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'cardNumber' | 'historyNumber'>,
  actor: ImedUser
): Promise<string> {
  if (!firestore) throw new Error('Firestore არ არის ხელმისაწვდომი');

  const cardNumber = generateCardNumber();
  const historyNumber = cardNumber;
  const now = new Date().toISOString();

  const ref = await addDoc(collection(firestore, COLLECTIONS.PATIENTS), {
    ...data,
    cardNumber,
    historyNumber,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.uid,
    isActive: true,
  });

  await addAuditLog({
    userId: actor.uid,
    userDisplayName: actor.displayName,
    userRole: actor.role,
    action: 'create',
    resourceType: 'patient',
    resourceId: ref.id,
    patientId: ref.id,
    patientName: `${data.lastName} ${data.firstName}`,
    description: `პაციენტი ${data.lastName} ${data.firstName} დარეგისტრირდა (ბარათი №${cardNumber})`,
  });

  return ref.id;
}

export async function updatePatient(
  id: string,
  data: Partial<Patient>,
  actor: ImedUser
): Promise<void> {
  if (!firestore) throw new Error('Firestore არ არის ხელმისაწვდომი');
  const ref = doc(firestore, COLLECTIONS.PATIENTS, id);
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  await addAuditLog({
    userId: actor.uid,
    userDisplayName: actor.displayName,
    userRole: actor.role,
    action: 'update',
    resourceType: 'patient',
    resourceId: id,
    patientId: id,
    description: `პაციენტის მონაცემები განახლდა`,
  });
}

export async function getPatient(id: string): Promise<Patient | null> {
  if (!firestore) return null;
  const snap = await getDoc(doc(firestore, COLLECTIONS.PATIENTS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Patient;
}

export async function searchPatients(searchTerm: string, maxResults = 20): Promise<Patient[]> {
  if (!firestore) return [];
  // Firestore full-text search limitation — we load recent patients and filter client-side
  const snap = await getDocs(query(
    collection(firestore, COLLECTIONS.PATIENTS),
    where('isActive', '==', true),
    orderBy('lastName'),
    limit(200)
  ));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
  if (!searchTerm.trim()) return all.slice(0, maxResults);
  const term = searchTerm.toLowerCase().trim();
  return all.filter(p =>
    p.lastName?.toLowerCase().includes(term) ||
    p.firstName?.toLowerCase().includes(term) ||
    p.personalId?.includes(term) ||
    p.cardNumber?.includes(term) ||
    p.historyNumber?.includes(term)
  ).slice(0, maxResults);
}

export async function listPatients(limitN = 50): Promise<Patient[]> {
  if (!firestore) return [];
  const snap = await getDocs(query(
    collection(firestore, COLLECTIONS.PATIENTS),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limit(limitN)
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
}
