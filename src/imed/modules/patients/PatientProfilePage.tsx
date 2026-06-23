import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPatient } from './patientsService';
import type { Patient, Order, InpatientEpisode } from '../../types';
import {
  INSURANCE_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  EPISODE_STATUS_LABELS,
} from '../../types';
import {
  ArrowLeft, Edit2, Plus, FileText, ClipboardList,
  BedDouble, Calendar, AlertCircle, Heart,
  FlaskConical, Scan, Users, Stethoscope, ChevronDown, ChevronRight,
} from 'lucide-react';
import { DOC_GROUPS, getDocLabel } from '../documents/docTemplates';
import {
  firestore, COLLECTIONS, collection, query,
  where, getDocs, orderBy, limit,
} from '../../firebase/db';
import { useAuthStore } from '../../store/authStore';
import { addAuditLog } from '../audit/auditService';

const TAB_LABELS = ['ბარათი', 'შეკვეთები', 'სტაციონარი', 'ვიზიტები', 'დოკუმენტები'];

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { imedUser } = useAuthStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [episodes, setEpisodes] = useState<InpatientEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const p = await getPatient(id);
      setPatient(p);
      if (p && imedUser) {
        await addAuditLog({
          userId: imedUser.uid,
          userDisplayName: imedUser.displayName,
          userRole: imedUser.role,
          action: 'view',
          resourceType: 'patient',
          resourceId: id,
          patientId: id,
          patientName: `${p.lastName} ${p.firstName}`,
          description: `გაიხსნა პაციენტის ბარათი: ${p.lastName} ${p.firstName}`,
        });
      }
      if (firestore) {
        const [ordSnap, epSnap] = await Promise.all([
          getDocs(query(
            collection(firestore, COLLECTIONS.ORDERS),
            where('patientId', '==', id),
            orderBy('requestedAt', 'desc'),
            limit(20)
          )),
          getDocs(query(
            collection(firestore, COLLECTIONS.EPISODES),
            where('patientId', '==', id),
            orderBy('admissionDate', 'desc')
          )),
        ]);
        setOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        setEpisodes(epSnap.docs.map(d => ({ id: d.id, ...d.data() } as InpatientEpisode)));
      }
      setLoading(false);
    };
    load();
  }, [id, imedUser]);

  const calcAge = (bd: string) => {
    if (!bd) return '';
    return Math.floor((Date.now() - new Date(bd).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!patient) return (
    <div className="text-center py-16 text-gray-400">
      <span className="text-5xl">👤</span>
      <p className="mt-3">პაციენტი ვერ მოიძებნა</p>
    </div>
  );

  const canEdit = imedUser?.role === 'super_admin' || imedUser?.role === 'registrar';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{patient.lastName} {patient.firstName}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span>{patient.sex === 'male' ? 'მამრ.' : 'მდედ.'}</span>
                <span>·</span>
                <span>{patient.birthDate} ({calcAge(patient.birthDate)} წ.)</span>
                <span>·</span>
                <span className="font-mono">ბარათი {patient.cardNumber}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`/imed/orders/new?patientId=${patient.id}`}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                <Plus size={16} /> კვლევა / კონს.
              </Link>
              <Link to={`/imed/inpatient/admit?patientId=${patient.id}`}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                <BedDouble size={16} /> ჰოსპ.
              </Link>
              {canEdit && (
                <Link to={`/imed/patients/${patient.id}/edit`}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
                  <Edit2 size={16} /> რედ.
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert flags */}
      {(patient.allergies || patient.bloodType) && (
        <div className="flex gap-3 flex-wrap">
          {patient.allergies && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              <span><strong>ალერგია:</strong> {patient.allergies}</span>
            </div>
          )}
          {patient.bloodType && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              <Heart size={16} />
              <span>სისხ.ჯგ: <strong>{patient.bloodType} {patient.rhFactor === 'positive' ? 'Rh(+)' : patient.rhFactor === 'negative' ? 'Rh(-)' : ''}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* ხელსაწყოები — პაციენტზე პირდაპირი დამატება */}
      <PatientToolbar patientId={patient.id} navigate={navigate} />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {TAB_LABELS.map((t, i) => (
            <button
              key={t}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: ბარათი */}
      {activeTab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard title="პირადი მონაცემები">
            <InfoRow label="გვარი, სახელი" value={`${patient.lastName} ${patient.firstName}`} />
            <InfoRow label="დ/თ" value={patient.birthDate} />
            <InfoRow label="სქესი" value={patient.sex === 'male' ? 'მამრობითი' : 'მდედრობითი'} />
            <InfoRow label="პირადი №" value={patient.personalId} mono />
            <InfoRow label="ბარათი №" value={patient.cardNumber} mono />
            {patient.isForigner && <InfoRow label="პასპორტი" value={patient.passportNumber || '—'} />}
          </InfoCard>

          <InfoCard title="საკონტაქტო">
            <InfoRow label="ტელ." value={patient.phone} />
            {patient.phone2 && <InfoRow label="ტელ. 2" value={patient.phone2} />}
            <InfoRow label="რეგ. მისამართი" value={patient.registrationAddress} />
            <InfoRow label="ფაქტ. მისამართი" value={patient.actualAddress} />
          </InfoCard>

          <InfoCard title="სამედიცინო">
            <InfoRow label="სისხლის ჯგ." value={patient.bloodType ? `${patient.bloodType} ${patient.rhFactor === 'positive' ? 'Rh(+)' : patient.rhFactor === 'negative' ? 'Rh(-)' : ''}` : '—'} />
            <InfoRow label="ალერგიები" value={patient.allergies || '—'} />
            <InfoRow label="ქრონ. დაავ." value={patient.chronicDiseases || '—'} />
          </InfoCard>

          <InfoCard title="დაზღვევა">
            <InfoRow label="სტატუსი" value={INSURANCE_LABELS[patient.insuranceStatus]} />
            {patient.insuranceNumber && <InfoRow label="პოლისი №" value={patient.insuranceNumber} />}
          </InfoCard>

          {patient.legalRepresentative && (
            <InfoCard title="კანონიერი წარმომადგენელი">
              <InfoRow label="სახელი/გვარი" value={patient.legalRepresentative.fullName} />
              <InfoRow label="ნათესაობა" value={patient.legalRepresentative.relationship} />
              <InfoRow label="ტელ." value={patient.legalRepresentative.phone} />
            </InfoCard>
          )}
        </div>
      )}

      {/* Tab: შეკვეთები */}
      {activeTab === 1 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link to={`/imed/orders/new?patientId=${patient.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> კვლევის / კონსულტაციის დანიშვნა
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList size={40} className="mx-auto mb-2 opacity-30" />
              <p>შეკვეთები არ გვაქვს</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ტიპი / კვლევა</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">სტატუსი</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">თარიღი</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">შედეგი</th>
                    <th className="text-right px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{o.description}</div>
                        <div className="text-xs text-gray-400 capitalize">{o.type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[o.status]}`}>
                          {ORDER_STATUS_LABELS[o.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(o.requestedAt).toLocaleDateString('ka-GE')}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">{o.result || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/imed/orders/${o.id}`} className="text-blue-600 hover:underline text-xs">გახსნა</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: სტაციონარი */}
      {activeTab === 2 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link to={`/imed/inpatient/admit?patientId=${patient.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
              <BedDouble size={16} /> ჰოსპიტალიზაცია
            </Link>
          </div>
          {episodes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BedDouble size={40} className="mx-auto mb-2 opacity-30" />
              <p>სტაციონარული ეპიზოდები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="space-y-3">
              {episodes.map(ep => (
                <Link key={ep.id} to={`/imed/inpatient/episodes/${ep.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 transition-colors shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-800">{ep.department} — პალ. {ep.ward}, საწ. {ep.bedNumber}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        მიღება: {ep.admissionDate} {ep.admissionTime}
                        {ep.dischargeDate && ` → გაწ.: ${ep.dischargeDate}`}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      ep.status === 'active' ? 'bg-green-100 text-green-700' :
                      ep.status === 'discharged' ? 'bg-gray-100 text-gray-600' :
                      ep.status === 'deceased' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {EPISODE_STATUS_LABELS[ep.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: ვიზიტები */}
      {activeTab === 3 && (
        <div className="text-center py-12 text-gray-400">
          <Calendar size={40} className="mx-auto mb-2 opacity-30" />
          <p>ვიზიტების ისტორია</p>
          <Link to={`/imed/appointments?patientId=${patient.id}`} className="mt-2 inline-block text-blue-600 text-sm hover:underline">
            ჩაწერის სიის ნახვა
          </Link>
        </div>
      )}

      {/* Tab: დოკუმენტები */}
      {activeTab === 4 && (
        <div className="text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-2 opacity-30" />
          <p>პაციენტის ყველა დოკუმენტი</p>
          <Link to={`/imed/documents?patientId=${patient.id}`} className="mt-2 inline-block text-blue-600 text-sm hover:underline">
            დოკუმენტების ნახვა
          </Link>
        </div>
      )}
    </div>
  );
}

// ── პაციენტის ხელსაწყოების პანელი ──
const ORDER_TOOLS: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'laboratory', label: 'ლაბორატორია', icon: <FlaskConical size={18} />, color: 'blue' },
  { key: 'radiology', label: 'რადიოლოგია / დიაგ.', icon: <Scan size={18} />, color: 'purple' },
  { key: 'consultation', label: 'კონსულტაცია', icon: <Users size={18} />, color: 'green' },
  { key: 'manipulation', label: 'მანიპულაცია', icon: <Stethoscope size={18} />, color: 'orange' },
  { key: 'pathology', label: 'ჰისტო/ციტოლ.', icon: <Stethoscope size={18} />, color: 'rose' },
];

function PatientToolbar({ patientId, navigate }: { patientId: string; navigate: ReturnType<typeof useNavigate> }) {
  const [openDocs, setOpenDocs] = useState(true);
  const colorCls = (c: string) => ({
    blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    purple: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100',
    green: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    orange: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  } as Record<string, string>)[c];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="text-sm font-semibold text-gray-700 mb-3">ხელსაწყოები — დაამატე პაციენტზე</div>

      {/* კვლევები/ორდერები */}
      <div className="text-xs text-gray-400 mb-2">კვლევა / კონსულტაცია (მრავალი ერთად)</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        {ORDER_TOOLS.map(t => (
          <button key={t.key} onClick={() => navigate(`/imed/orders/new?patientId=${patientId}&category=${t.key}`)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors text-xs font-medium ${colorCls(t.color)}`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* დოკუმენტები / ფურცლები */}
      <button onClick={() => setOpenDocs(!openDocs)} className="flex items-center gap-1 text-xs text-gray-400 mb-2 hover:text-gray-600">
        {openDocs ? <ChevronDown size={14} /> : <ChevronRight size={14} />} ფურცლის დამატება (დოკუმენტი)
      </button>
      {openDocs && (
        <div className="space-y-3">
          {DOC_GROUPS.map(group => (
            <div key={group.label}>
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1.5">{group.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {group.types.map(type => (
                  <button key={type} onClick={() => navigate(`/imed/documents/new?type=${type}&patientId=${patientId}`)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                    <FileText size={13} className="opacity-50" />
                    {getDocLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 min-w-[120px] flex-shrink-0">{label}:</span>
      <span className={`text-gray-800 font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}
