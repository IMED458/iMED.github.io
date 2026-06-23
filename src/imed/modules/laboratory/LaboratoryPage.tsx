import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  firestore, COLLECTIONS, collection, query, where,
  getDocs, orderBy, limit, addDoc, updateDoc, doc, getDoc,
} from '../../firebase/db';
import type { LabOrder, LabOrderTest } from '../../types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { addAuditLog } from '../audit/auditService';
import { FlaskConical, AlertTriangle, CheckCircle2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

const FLAG_STYLES: Record<string, string> = {
  normal: 'text-gray-600',
  high: 'text-orange-600 font-bold',
  low: 'text-blue-600 font-bold',
  critical_high: 'text-red-600 font-bold animate-pulse',
  critical_low: 'text-red-600 font-bold animate-pulse',
};

const FLAG_ICONS: Record<string, React.ReactNode> = {
  high: <TrendingUp size={14} className="inline ml-1" />,
  low: <TrendingDown size={14} className="inline ml-1" />,
  critical_high: <AlertTriangle size={14} className="inline ml-1" />,
  critical_low: <AlertTriangle size={14} className="inline ml-1" />,
};

export default function LaboratoryPage() {
  const { imedUser } = useAuthStore();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editResults, setEditResults] = useState<Record<string, { result: string; flag: string }>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    // Show lab orders from the general orders collection
    const snap = await getDocs(query(
      collection(firestore, COLLECTIONS.ORDERS),
      where('type', '==', 'laboratory'),
      orderBy('requestedAt', 'desc'),
      limit(100)
    ));
    // Map to LabOrder-compatible format
    const mapped: LabOrder[] = snap.docs.map(d => {
      const data = d.data() as any;
      return {
        id: d.id,
        patientId: data.patientId,
        episodeId: data.episodeId,
        orderedBy: data.requestedBy,
        orderedAt: data.requestedAt,
        tests: data.tests || [{ testId: '1', testName: data.description, status: data.status, result: data.result }],
        status: data.status,
        notes: data.notes,
        sampleId: data.sampleId,
      } as LabOrder;
    });
    setOrders(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitResults = async (orderId: string, patientId: string) => {
    if (!firestore || !imedUser) return;
    setSaving(true);
    try {
      const result = Object.values(editResults).map(r => r.result).join('; ');
      await updateDoc(doc(firestore, COLLECTIONS.ORDERS, orderId), {
        status: 'completed',
        result,
        completedAt: new Date().toISOString(),
      });
      await addAuditLog({
        userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
        action: 'update', resourceType: 'lab_order', resourceId: orderId,
        patientId,
        description: `ლაბ. შედეგები შეტანილი და ვალიდირებული`,
      });
      setExpanded(null);
      setEditResults({});
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
            <FlaskConical size={22} className="text-blue-600" /> ლაბორატორია
          </h2>
          <p className="text-sm text-gray-500">{orders.length} შეკვეთა</p>
        </div>
        <button onClick={load} className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <FlaskConical size={40} className="mx-auto mb-2 opacity-30" />
          <p>ლაბ. შეკვეთები ვერ მოიძებნა</p>
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
                    o.status === 'completed' ? 'bg-green-50 text-green-600' :
                    o.status === 'requested' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    <FlaskConical size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {o.tests.map(t => t.testName).join(', ')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(o.orderedAt).toLocaleString('ka-GE')}
                      {o.sampleId && ` · ნიმ. №${o.sampleId}`}
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
                  {/* სინჯის რეგისტრაცია */}
                  {o.status === 'requested' && (
                    <div className="flex gap-3 items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <input
                        className="px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
                        placeholder="სინჯის ბარკოდი / №..."
                        onBlur={async (e) => {
                          if (!firestore || !e.target.value) return;
                          await updateDoc(doc(firestore, COLLECTIONS.ORDERS, o.id), {
                            sampleId: e.target.value,
                            status: 'in_progress',
                          });
                          load();
                        }}
                      />
                      <span className="text-sm text-yellow-700">სინჯის რეგისტრაცია</span>
                    </div>
                  )}

                  {/* შედეგების შეტანა */}
                  {(o.status === 'in_progress' || o.status === 'requested') && (imedUser?.role === 'lab_technician' || imedUser?.role === 'super_admin') && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700 text-sm">შედეგების შეტანა</h4>
                      {o.tests.map((t, i) => (
                        <div key={t.testId || i} className="grid grid-cols-3 gap-3 items-center">
                          <div className="font-medium text-sm text-gray-700">{t.testName}</div>
                          <input
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="შედეგი / მნიშვნ."
                            value={editResults[t.testId || String(i)]?.result || ''}
                            onChange={e => setEditResults(prev => ({
                              ...prev,
                              [t.testId || String(i)]: { ...prev[t.testId || String(i)], result: e.target.value }
                            }))}
                          />
                          <select
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editResults[t.testId || String(i)]?.flag || 'normal'}
                            onChange={e => setEditResults(prev => ({
                              ...prev,
                              [t.testId || String(i)]: { ...prev[t.testId || String(i)], flag: e.target.value }
                            }))}
                          >
                            <option value="normal">ნორმ.</option>
                            <option value="high">↑ მაღ.</option>
                            <option value="low">↓ დაბ.</option>
                            <option value="critical_high">‼ კრიტ. მაღ.</option>
                            <option value="critical_low">‼ კრიტ. დაბ.</option>
                          </select>
                        </div>
                      ))}
                      <button
                        onClick={() => submitResults(o.id, o.patientId)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                        <CheckCircle2 size={15} /> {saving ? '...' : 'შედ. ვალიდაცია / შენახვა'}
                      </button>
                    </div>
                  )}

                  {/* შედეგების ჩვენება */}
                  {o.status === 'completed' && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700 text-sm">შედეგები</h4>
                      {o.tests.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                          <span className="text-gray-600">{t.testName}</span>
                          <span className={FLAG_STYLES[t.flag || 'normal']}>
                            {t.result || o.tests[0]?.result || '—'}
                            {t.flag && FLAG_ICONS[t.flag]}
                          </span>
                        </div>
                      ))}
                    </div>
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
