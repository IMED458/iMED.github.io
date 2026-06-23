import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  firestore, COLLECTIONS, collection, query, where,
  getDocs, orderBy, limit, addDoc, updateDoc, doc,
} from '../../firebase/db';
import type { Order, OrderType, OrderStatus, Patient } from '../../types';
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
} from '../../types';
import { useAuthStore } from '../../store/authStore';
import { getPatient, searchPatients } from '../patients/patientsService';
import { addAuditLog } from '../audit/auditService';
import { Plus, ArrowLeft, Search, CheckCircle2, Clock, X, FlaskConical, Scan, Users, Clipboard } from 'lucide-react';

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  laboratory: 'ლაბორატორია',
  radiology: 'რადიოლოგია',
  consultation: 'კონსულტაცია',
  procedure: 'მანიპულაცია / პროცედურა',
};

const ORDER_TYPE_ICONS: Record<OrderType, React.ReactNode> = {
  laboratory: <FlaskConical size={16} />,
  radiology: <Scan size={16} />,
  consultation: <Users size={16} />,
  procedure: <Clipboard size={16} />,
};

export default function OrdersPage() {
  const { imedUser } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientIdFilter = searchParams.get('patientId');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');
  const [showNewForm, setShowNewForm] = useState(searchParams.get('new') === '1');

  const load = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const constraints: any[] = [orderBy('requestedAt', 'desc'), limit(100)];
      if (patientIdFilter) constraints.unshift(where('patientId', '==', patientIdFilter));
      if (statusFilter !== 'all') constraints.unshift(where('status', '==', statusFilter));
      const snap = await getDocs(query(collection(firestore, COLLECTIONS.ORDERS), ...constraints));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } finally {
      setLoading(false);
    }
  }, [patientIdFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!firestore || !imedUser) return;
    await updateDoc(doc(firestore, COLLECTIONS.ORDERS, orderId), {
      status: newStatus,
      ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {}),
    });
    await addAuditLog({
      userId: imedUser.uid,
      userDisplayName: imedUser.displayName,
      userRole: imedUser.role,
      action: 'update',
      resourceType: 'order',
      resourceId: orderId,
      description: `შეკვეთის სტატუსი შეიცვალა: ${ORDER_STATUS_LABELS[newStatus]}`,
    });
    load();
  };

  const filtered = orders.filter(o =>
    (typeFilter === 'all' || o.type === typeFilter)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">შეკვეთები / კვლევები</h2>
        <button
          onClick={() => navigate('/imed/orders/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Plus size={18} /> შეკვეთის დამატება
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">ყველა სტატუსი</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
          <option value="all">ყველა ტიპი</option>
          {Object.entries(ORDER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <Clipboard size={40} className="mx-auto mb-2 opacity-30" />
            <p>შეკვეთები ვერ მოიძებნა</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ტიპი</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">კვლევა / აღწერა</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">პაციენტი</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">სტატუსი</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">პრიორიტ.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">თარიღი</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">ქმედება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        o.type === 'laboratory' ? 'bg-blue-50 text-blue-700' :
                        o.type === 'radiology' ? 'bg-purple-50 text-purple-700' :
                        o.type === 'consultation' ? 'bg-green-50 text-green-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {ORDER_TYPE_ICONS[o.type]}
                        {ORDER_TYPE_LABELS[o.type]}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{o.description}</div>
                      {o.subType && <div className="text-xs text-gray-400">{o.subType}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/imed/patients/${o.patientId}`} className="text-blue-600 hover:underline text-xs">
                        პაციენტი
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[o.status]}`}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        o.priority === 'stat' ? 'text-red-600' :
                        o.priority === 'urgent' ? 'text-orange-600' :
                        'text-gray-500'
                      }`}>
                        {o.priority === 'stat' ? 'STAT' : o.priority === 'urgent' ? 'გადაუდ.' : 'ჩვეულ.'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(o.requestedAt).toLocaleDateString('ka-GE')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {o.status === 'requested' && (
                          <button
                            onClick={() => updateStatus(o.id, 'in_progress')}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                            მიღება
                          </button>
                        )}
                        {o.status === 'in_progress' && (
                          <button
                            onClick={() => updateStatus(o.id, 'completed')}
                            className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                            შესრულება
                          </button>
                        )}
                        <Link to={`/imed/orders/${o.id}`} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">
                          გახსნა
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
