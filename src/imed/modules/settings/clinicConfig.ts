import { firestore, COLLECTIONS, collection, getDocs, query, limit } from '../../firebase/db';
import type { ClinicConfig } from '../../types';

let cached: ClinicConfig | null = null;

export async function loadClinicConfig(force = false): Promise<ClinicConfig | null> {
  if (cached && !force) return cached;
  if (!firestore) return null;
  const snap = await getDocs(query(collection(firestore, COLLECTIONS.CLINIC_CONFIG), limit(1)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  cached = { id: d.id, ...(d.data() as any) } as ClinicConfig;
  return cached;
}

export function clearClinicConfigCache() { cached = null; }
