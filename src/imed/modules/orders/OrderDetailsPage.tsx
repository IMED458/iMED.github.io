import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  firestore, COLLECTIONS, doc, getDoc, updateDoc,
} from '../../firebase/db';
import type { Order, Patient, ClinicConfig, OrderStatus } from '../../types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../types';
import { getPatient } from '../patients/patientsService';
import { loadClinicConfig } from '../settings/clinicConfig';
import { useAuthStore } from '../../store/authStore';
import { addAuditLog } from '../audit/auditService';
import OrderReceipt from '../../components/print/OrderReceipt';
import PrintButton from '../../components/print/PrintButton';
import { ArrowLeft, Printer, CheckCircle2 } from 'lucide-react';

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { imedUser } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef<HTMLDivElement>(null);
  const autoPrintRef = useRef(false);

  useEffect(() => {
    if (!id || !firestore) return;
    (async () => {
      const snap = await getDoc(doc(firestore, COLLECTIONS.ORDERS, id));
      if (snap.exists()) {
        const o = { id: snap.id, ...snap.data() } as Order;
        setOrder(o);
        const [p, c] = await Promise.all([getPatient(o.patientId), loadClinicConfig()]);
        setPatient(p);
        setClinic(c);
      }
      setLoading(false);
    })();
  }, [id]);

  const updateStatus = async (status: OrderStatus) => {
    if (!order || !firestore || !imedUser) return;
    await updateDoc(doc(firestore, COLLECTIONS.ORDERS, order.id), {
      status, completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    });
    setOrder({ ...order, status });
    await addAuditLog({
      userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
      action: 'update', resourceType: 'order', resourceId: order.id,
      patientId: order.patientId,
      description: `შეკვეთის სტატუსი → ${ORDER_STATUS_LABELS[status]} (№${order.referralNumber || order.id})`,
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!order || !patient) return <div className="text-center py-16 text-gray-400">შეკვეთა ვერ მოიძებნა</div>;

  const items = order.items && order.items.length ? order.items : [{ name: order.description, code: order.serviceCode }];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3 no-print">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800">მიმართვა №{order.referralNumber || order.id.slice(-8).toUpperCase()}</h2>
          <p className="text-sm text-gray-500">{patient.lastName} {patient.firstName} · ბარათი {patient.cardNumber}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
      </div>

      {/* დეტალები */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">მონიშნული სერვისები ({items.length})</h3>
          <div className="divide-y divide-gray-100">
            {items.map((it, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {it.code && <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{it.code}</span>}
                  <span className="text-sm text-gray-800">{it.name}</span>
                </div>
                <span className="text-xs text-gray-400">{(it as any).status ? ORDER_STATUS_LABELS[(it as any).status as OrderStatus] : ''}</span>
              </div>
            ))}
          </div>
          {order.diagnosisName && <div className="mt-3 text-sm"><span className="text-gray-500">დიაგნოზი:</span> <b>{order.diagnosisName}</b></div>}
          {order.notes && <div className="mt-1 text-sm"><span className="text-gray-500">შენიშვნა:</span> {order.notes}</div>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="text-sm"><span className="text-gray-500">ტიპი:</span> <b className="capitalize">{order.type}</b></div>
          <div className="text-sm"><span className="text-gray-500">პრიორიტეტი:</span> <b>{order.priority === 'stat' ? 'STAT' : order.priority === 'urgent' ? 'გადაუდებელი' : 'ჩვეულებრივი'}</b></div>
          <div className="text-sm"><span className="text-gray-500">მომთხოვნი:</span> {order.requestedByName || '—'}</div>
          {order.assignedTo && <div className="text-sm"><span className="text-gray-500">კონსულტანტი:</span> {order.assignedTo}</div>}
          <div className="text-sm"><span className="text-gray-500">თარიღი:</span> {new Date(order.requestedAt).toLocaleString('ka-GE')}</div>

          <div className="pt-3 border-t border-gray-100 space-y-2">
            <PrintButton contentRef={receiptRef} documentTitle={`მიმართვა-${order.referralNumber || order.id}`} className="w-full justify-center"
              onBeforePrint={() => imedUser && addAuditLog({
                userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
                action: 'print', resourceType: 'order', resourceId: order.id, patientId: order.patientId,
                description: `დაიბეჭდა მიმართვის ქვითარი №${order.referralNumber || order.id}`,
              })} />
            {order.status !== 'completed' && (
              <button onClick={() => updateStatus(order.status === 'requested' ? 'received' : 'completed')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
                <CheckCircle2 size={16} /> {order.status === 'requested' ? 'მიღება' : 'შესრულებულად მონიშვნა'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ქვითარი (ბეჭდვადი) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3 text-gray-500 text-sm no-print"><Printer size={16} /> ბეჭდვადი ქვითარი (3 ეგზემპლარი):</div>
        <div ref={receiptRef} className="receipt-print">
          <OrderReceipt order={order} patient={patient} clinic={clinic}
            doctorName={order.requestedByName}
            formCode={order.type === 'laboratory' ? 'F-SOP-024A-001-01' : undefined} />
        </div>
      </div>

      {/* auto print */}
      <AutoPrint enabled={sp.get('print') === '1'} contentRef={receiptRef} flag={autoPrintRef} title={`მიმართვა-${order.referralNumber || order.id}`} />
    </div>
  );
}

// მცირე helper auto-print-ისთვის
function AutoPrint({ enabled, contentRef, flag, title }: { enabled: boolean; contentRef: React.RefObject<HTMLDivElement | null>; flag: React.MutableRefObject<boolean>; title: string }) {
  useEffect(() => {
    if (!enabled || flag.current) return;
    const t = setTimeout(() => {
      flag.current = true;
      window.print();
    }, 600);
    return () => clearTimeout(t);
  }, [enabled]);
  return null;
}
