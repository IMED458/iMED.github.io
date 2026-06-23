import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  firestore, COLLECTIONS, collection, query, where,
  getDocs, orderBy, limit, updateDoc, doc,
} from '../../firebase/db';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, MODALITY_LABELS } from '../../types';
import type { RadioModality } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { addAuditLog } from '../audit/auditService';
import PrintButton from '../../components/print/PrintButton';
import { Letterhead, SignatureBlock } from '../../components/common/Letterhead';
import { Scan, RefreshCw, CheckCircle2, FileText } from 'lucide-react';

export default function RadiologyPage() {
  const { imedUser } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [conclusions, setConclusions] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    const snap = await getDocs(query(
      collection(firestore, COLLECTIONS.ORDERS),
      where('type', '==', 'radiology'),
      orderBy('requestedAt', 'desc'),
      limit(100)
    ));
    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitConclusion = async (orderId: string, patientId: string) => {
    if (!firestore || !imedUser) return;
    const conclusion = conclusions[orderId];
    if (!conclusion?.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, COLLECTIONS.ORDERS, orderId), {
        status: 'completed',
        result: conclusion,
        completedAt: new Date().toISOString(),
        reportedBy: imedUser.uid,
        reportedAt: new Date().toISOString(),
      });
      await addAuditLog({
        userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
        action: 'update', resourceType: 'radio_order', resourceId: orderId,
        patientId,
        description: 'რადიოლოგიური დასკვნა შეტანილი',
      });
      setExpanded(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Scan size={22} className="text-purple-600" /> რადიოლოგია
          </h2>
          <p className="text-sm text-gray-500">{orders.length} შეკვეთა</p>
        </div>
        <button onClick={load} className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <Scan size={40} className="mx-auto mb-2 opacity-30" />
          <p>რადიოლოგიური შეკვეთები ვერ მოიძებნა</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    o.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    <Scan size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{o.description}</div>
                    <div className="text-xs text-gray-400">
                      {o.subType && MODALITY_LABELS[o.subType as RadioModality] ? MODALITY_LABELS[o.subType as RadioModality] : o.subType}
                      {' · '}{new Date(o.requestedAt).toLocaleString('ka-GE')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[o.status]}`}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                  <Link to={`/imed/patients/${o.patientId}`} onClick={e => e.stopPropagation()}
                    className="text-blue-600 text-xs hover:underline">პაციენტი</Link>
                  <span className="text-gray-400">{expanded === o.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === o.id && (
                <div className="border-t border-gray-100 p-5 space-y-4">
                  {/* კვლევის სტატუს ცვლილება */}
                  {o.status === 'requested' && (
                    <button
                      onClick={async () => {
                        if (!firestore) return;
                        await updateDoc(doc(firestore, COLLECTIONS.ORDERS, o.id), { status: 'in_progress' });
                        load();
                      }}
                      className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      კვლევის დაწყება
                    </button>
                  )}

                  {/* დასკვნა */}
                  {(o.status === 'in_progress' || o.status === 'requested') &&
                    (imedUser?.role === 'radiologist' || imedUser?.role === 'super_admin') && (
                    <div ref={printRef} className="space-y-3">
                      <h4 className="font-medium text-gray-700 text-sm">რადიოლოგიური დასკვნა</h4>
                      <div className="text-xs text-gray-500 mb-2">კვლევა: <strong>{o.description}</strong></div>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none min-h-[120px]"
                        value={conclusions[o.id] || ''}
                        onChange={e => setConclusions(prev => ({ ...prev, [o.id]: e.target.value }))}
                        placeholder="რადიოლოგიური დასკვნა, ნაპოვნი ცვლილებები, კომენტარი..."
                      />
                      <button
                        onClick={() => submitConclusion(o.id, o.patientId)}
                        disabled={saving || !conclusions[o.id]?.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                        <CheckCircle2 size={15} /> {saving ? '...' : 'დასკვნის შენახვა'}
                      </button>
                    </div>
                  )}

                  {/* შედეგი */}
                  {o.status === 'completed' && o.result && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={16} className="text-green-600" />
                        <span className="font-medium text-green-800 text-sm">დასკვნა</span>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-line">{o.result}</p>
                    </div>
                  )}

                  {/* შენიშვნები */}
                  {o.notes && (
                    <div className="text-sm text-gray-500"><strong>კლინ. ინფ.:</strong> {o.notes}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
