import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { ROLE_LABELS } from '../../types';
import {
  Users, BedDouble, Calendar, FlaskConical,
  ClipboardList, AlertCircle, CheckCircle2, Clock,
  TrendingUp, Activity,
} from 'lucide-react';
import {
  firestore, COLLECTIONS, collection, query, where,
  getDocs, orderBy, limit,
} from '../../firebase/db';
import type { Order, InpatientEpisode, Appointment, Patient } from '../../types';
import { Link } from 'react-router-dom';

interface Stats {
  totalPatients: number;
  activeInpatients: number;
  todayAppointments: number;
  pendingOrders: number;
  pendingConsults: number;
  criticalLabs: number;
}

interface PendingConsultation {
  id: string;
  description: string;
  patientId: string;
  requestedAt: string;
}

export default function DashboardPage() {
  const { imedUser } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    activeInpatients: 0,
    todayAppointments: 0,
    pendingOrders: 0,
    pendingConsults: 0,
    criticalLabs: 0,
  });
  const [myConsults, setMyConsults] = useState<PendingConsultation[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!firestore || !imedUser) { setLoading(false); return; }
    const load = async () => {
      try {
        // პაციენტების რაოდენობა
        const pSnap = await getDocs(query(
          collection(firestore!, COLLECTIONS.PATIENTS),
          where('isActive', '==', true)
        ));

        // აქტიური სტაციონარი
        const inSnap = await getDocs(query(
          collection(firestore!, COLLECTIONS.EPISODES),
          where('status', '==', 'active')
        ));

        // დღის ჩაწერა
        const apSnap = await getDocs(query(
          collection(firestore!, COLLECTIONS.APPOINTMENTS),
          where('dateTime', '>=', today + 'T00:00:00'),
          where('dateTime', '<=', today + 'T23:59:59'),
          ...(imedUser.role === 'doctor' || imedUser.role === 'consultant'
            ? [where('doctorId', '==', imedUser.uid)]
            : [])
        ));

        // შეკვეთები მოლოდინში
        let ordQ = query(
          collection(firestore!, COLLECTIONS.ORDERS),
          where('status', '==', 'requested')
        );
        if (imedUser.role === 'lab_technician') {
          ordQ = query(collection(firestore!, COLLECTIONS.ORDERS),
            where('status', '==', 'requested'),
            where('type', '==', 'laboratory')
          );
        } else if (imedUser.role === 'radiologist') {
          ordQ = query(collection(firestore!, COLLECTIONS.ORDERS),
            where('status', '==', 'requested'),
            where('type', '==', 'radiology')
          );
        }
        const ordSnap = await getDocs(ordQ);

        // ჩემი კონსულტაციები (კონსულტანტი/ექიმი)
        if (imedUser.role === 'consultant' || imedUser.role === 'doctor') {
          const consultQ = query(
            collection(firestore!, COLLECTIONS.ORDERS),
            where('type', '==', 'consultation'),
            where('assignedDoctorId', '==', imedUser.uid),
            where('status', '==', 'requested'),
            limit(10)
          );
          const cSnap = await getDocs(consultQ);
          setMyConsults(cSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        }

        setStats({
          totalPatients: pSnap.size,
          activeInpatients: inSnap.size,
          todayAppointments: apSnap.size,
          pendingOrders: ordSnap.size,
          pendingConsults: myConsults.length,
          criticalLabs: 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [imedUser, today]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'დილა მშვიდობისა';
    if (h < 17) return 'შუადღე მშვიდობისა';
    return 'საღამო მშვიდობისა';
  };

  const statCards = [
    { label: 'პაციენტები (სულ)', value: stats.totalPatients, icon: <Users size={24} />, color: 'blue', to: '/imed/patients' },
    { label: 'სტაციონარი (აქტ.)', value: stats.activeInpatients, icon: <BedDouble size={24} />, color: 'purple', to: '/imed/inpatient' },
    { label: 'დღევანდელი ვიზიტები', value: stats.todayAppointments, icon: <Calendar size={24} />, color: 'green', to: '/imed/appointments' },
    { label: 'შეკვეთები მოლოდინში', value: stats.pendingOrders, icon: <ClipboardList size={24} />, color: 'orange', to: '/imed/orders' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <Activity size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{greeting()}, {imedUser?.firstName}!</h2>
            <p className="text-blue-200 text-sm mt-0.5">
              {ROLE_LABELS[imedUser?.role!]} ·{' '}
              {imedUser?.specialty || imedUser?.department || ''} ·{' '}
              {new Date().toLocaleDateString('ka-GE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
          >
            <div className={`inline-flex p-3 rounded-lg mb-3 ${
              card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              card.color === 'purple' ? 'bg-purple-50 text-purple-600' :
              card.color === 'green' ? 'bg-green-50 text-green-600' :
              'bg-orange-50 text-orange-600'
            }`}>
              {card.icon}
            </div>
            <div className="text-2xl font-bold text-gray-800">{card.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* კონსულტაციების შეტყობინება */}
      {myConsults.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={20} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800">
              გელოდებათ {myConsults.length} კონსულტაცია
            </h3>
          </div>
          <div className="space-y-2">
            {myConsults.map(c => (
              <Link
                key={c.id}
                to={`/imed/orders/${c.id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-100 hover:border-amber-300 transition-colors text-sm"
              >
                <Clock size={16} className="text-amber-500 flex-shrink-0" />
                <span className="text-gray-700 flex-1">{c.description}</span>
                <span className="text-xs text-gray-400">
                  {new Date(c.requestedAt).toLocaleDateString('ka-GE')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* სწრაფი წვდომა */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">სწრაფი ქმედებები</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/imed/patients/new', label: 'პაციენტის რეგისტრაცია', icon: '➕', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
            { to: '/imed/appointments/new', label: 'ჩაწერა', icon: '📅', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
            { to: '/imed/inpatient/admit', label: 'ჰოსპიტალიზაცია', icon: '🏥', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
            { to: '/imed/orders/new', label: 'კვლევის დანიშვნა', icon: '🔬', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700' },
          ].map(a => (
            <Link
              key={a.to}
              to={a.to}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${a.color} transition-colors text-center`}
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
