import {
  firestore,
  COLLECTIONS,
  collection,
  addDoc,
} from '../../firebase/db';
import type { AuditLog, AuditAction, UserRole } from '../../types';

interface AuditInput {
  userId: string;
  userDisplayName: string;
  userRole: UserRole;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  patientId?: string;
  patientName?: string;
  documentType?: string;
  description: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

export async function addAuditLog(input: AuditInput): Promise<void> {
  if (!firestore) return;
  try {
    const log: Omit<AuditLog, 'id'> = {
      ...input,
      timestamp: new Date().toISOString(),
    };
    await addDoc(collection(firestore, COLLECTIONS.AUDIT_LOGS), log);
  } catch {
    // Audit log failure must not break the main flow — log to console
    console.error('[iMED Audit] Failed to write audit log');
  }
}
