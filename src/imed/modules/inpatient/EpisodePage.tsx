import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  firestore, COLLECTIONS, doc, getDoc, updateDoc, addDoc, collection,
  getDocs, query, where, orderBy, limit,
} from '../../firebase/db';
import type { InpatientEpisode, Patient, Order, MedicalDocument } from '../../types';
import { EPISODE_STATUS_LABELS, DOCUMENT_STATUS_LABELS } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { addAuditLog } from '../audit/auditService';
import PrintButton from '../../components/print/PrintButton';
import { Letterhead, SignatureBlock } from '../../components/common/Letterhead';
import {
  ArrowLeft, BedDouble, Plus, FileText, Edit2,
  CheckCircle2, ClipboardList, Activity, Printer,
} from 'lucide-react';

const TABS = ['ეპიზოდი', 'კურსუსები', 'დანიშვნები', 'ეპიკრიზი', 'დოკუმენტები'];

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function EpisodePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { imedUser } = useAuthStore();
  const [episode, setEpisode] = useState<InpatientEpisode | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [docs, setDocs] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [kursusList, setKursusList] = useState<any[]>([]);
  const [newKursus, setNewKursus] = useState('');
  const [addingKursus, setAddingKursus] = useState(false);
  const [savingKursus, setSavingKursus] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !firestore) return;
    const load = async () => {
      const epSnap = await getDoc(doc(firestore!, COLLECTIONS.EPISODES, id));
      if (!epSnap.exists()) { setLoading(false); return; }
      const ep = { id: epSnap.id, ...epSnap.data() } as InpatientEpisode;
      setEpisode(ep);
      const pSnap = await getDoc(doc(firestore!, COLLECTIONS.PATIENTS, ep.patientId));
      if (pSnap.exists()) setPatient({ id: pSnap.id, ...pSnap.data() } as Patient);
      const [ordSnap, docSnap] = await Promise.all([
        getDocs(query(collection(firestore!, COLLECTIONS.ORDERS), where('episodeId', '==', id), orderBy('requestedAt', 'desc'))),
        getDocs(query(collection(firestore!, COLLECTIONS.DOCUMENTS), where('episodeId', '==', id), orderBy('createdAt', 'desc'))),
      ]);
      setOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setDocs(docSnap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalDocument)));
      // კურსუსები
      const kSnap = await getDocs(query(
        collection(firestore!, 'imed_kursus'),
        where('episodeId', '==', id),
        orderBy('createdAt', 'desc')
      ));
      setKursusList(kSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, [id]);

  const saveKursus = async () => {
    if (!newKursus.trim() || !id || !imedUser || !firestore) return;
    setSavingKursus(true);
    try {
      const ref = await addDoc(collection(firestore, 'imed_kursus'), {
        episodeId: id,
        patientId: episode?.patientId,
        text: newKursus,
        createdBy: imedUser.uid,
        createdByName: imedUser.displayName,
        createdAt: new Date().toISOString(),
        status: 'draft',
      });
      setKursusList(prev => [{ id: ref.id, text: newKursus, createdByName: imedUser.displayName, createdAt: new Date().toISOString() }, ...prev]);
      setNewKursus('');
      setAddingKursus(false);
      await addAuditLog({
        userId: imedUser.uid,
        userDisplayName: imedUser.displayName,
        userRole: imedUser.role,
        action: 'create',
        resourceType: 'kursus',
        resourceId: ref.id,
        patientId: episode?.patientId,
        patientName: patient ? `${patient.lastName} ${patient.firstName}` : '',
        description: 'კურსუსი დაემატა',
      });
    } finally {
      setSavingKursus(false);
    }
  };

  const discharge = async (type: InpatientEpisode['dischargeType']) => {
    if (!id || !episode || !imedUser || !firestore) return;
    if (!confirm(`გსურთ პაციენტის გაწერა? (${type})`)) return;
    const now = new Date().toISOString();
    await updateDoc(doc(firestore, COLLECTIONS.EPISODES, id), {
      status: type === 'deceased' ? 'deceased' : 'discharged',
      dischargeType: type,
      dischargeDate: now.split('T')[0],
      updatedAt: now,
    });
    setEpisode(prev => prev ? { ...prev, status: type === 'deceased' ? 'deceased' : 'discharged', dischargeDate: now.split('T')[0] } : null);
    await addAuditLog({
      userId: imedUser.uid, userDisplayName: imedUser.displayName, userRole: imedUser.role,
      action: 'update', resourceType: 'episode', resourceId: id,
      patientId: episode.patientId,
      description: `პაციენტი გაიწერა: ${type}`,
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!episode) return <div className="text-center py-16 text-gray-400">ეპიზოდი ვერ მოიძებნა</div>;

  const isActive = episode.status === 'active';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={20} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {patient ? `${patient.lastName} ${patient.firstName}` : 'სტაც. ეპიზოდი'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                <BedDouble size={15} />
                <span>{episode.department} · პალ. {episode.ward} · საწ. {episode.bedNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isActive ? 'bg-green-100 text-green-700' :
                  episode.status === 'deceased' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {EPISODE_STATUS_LABELS[episode.status]}
                </span>
              </div>
            </div>
            {isActive && (
              <div className="flex gap-2">
                <Link to={`/imed/orders/new?patientId=${episode.patientId}&episodeId=${id}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
                  <Plus size={14} /> კვლევა
                </Link>
                <button onClick={() => discharge('recovered')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium">
                  <CheckCircle2 size={14} /> გაწერა
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === i ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 0: ეპიზოდი */}
      {tab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h4 className="font-semibold text-gray-700 mb-3 text-sm">მიღება</h4>
            <div className="space-y-2 text-sm">
              <Row label="მიღ. თარიღი" value={`${episode.admissionDate} ${episode.admissionTime}`} />
              <Row label="განყ." value={episode.department} />
              <Row label="პალ." value={episode.ward} />
              <Row label="საწ. №" value={episode.bedNumber} />
              {episode.dischargeDate && <Row label="გაწ. თარ." value={episode.dischargeDate} />}
              {episode.dischargeType && <Row label="გაწ. ტიპი" value={episode.dischargeType} />}
            </div>
          </div>
          {patient && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h4 className="font-semibold text-gray-700 mb-3 text-sm">პაციენტი</h4>
              <div className="space-y-2 text-sm">
                <Row label="სახელი" value={`${patient.lastName} ${patient.firstName}`} />
                <Row label="პირ. №" value={patient.personalId} />
                <Row label="ბარათი" value={patient.cardNumber} />
                <Row label="დ/თ" value={patient.birthDate} />
                {patient.allergies && <Row label="ალერ." value={patient.allergies} />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: კურსუსები */}
      {tab === 1 && (
        <div className="space-y-3">
          {isActive && (
            <div className="flex justify-end">
              <button onClick={() => setAddingKursus(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium">
                <Plus size={16} /> კურსუსის დამატება
              </button>
            </div>
          )}
          {addingKursus && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-blue-800 text-sm">ახალი კურსუსი — {new Date().toLocaleDateString('ka-GE')}</h4>
              <textarea
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                rows={5}
                value={newKursus}
                onChange={e => setNewKursus(e.target.value)}
                placeholder="გასინჯვის ჩანაწერი, მდგომარეობა, კომენტარი..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setAddingKursus(false); setNewKursus(''); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  გაუქმება
                </button>
                <button onClick={saveKursus} disabled={savingKursus || !newKursus.trim()}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                  {savingKursus ? 'ინახება...' : 'შენახვა'}
                </button>
              </div>
            </div>
          )}
          {kursusList.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Activity size={36} className="mx-auto mb-2 opacity-30" />
              <p>კურსუსები ჯერ არ გვაქვს</p>
            </div>
          ) : (
            <div className="space-y-3">
              {kursusList.map(k => (
                <div key={k.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-700 text-sm">{k.createdByName}</span>
                    <span className="text-xs text-gray-400">{new Date(k.createdAt).toLocaleString('ka-GE')}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{k.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: დანიშვნები */}
      {tab === 2 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link to={`/imed/orders/new?patientId=${episode.patientId}&episodeId=${id}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium">
              <Plus size={16} /> კვლევის / კონს. დანიშვნა
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList size={36} className="mx-auto mb-2 opacity-30" />
              <p>შეკვეთები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">კვლევა</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">სტატ.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">თარ.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">შედ.</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{o.description}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{o.status}</span></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(o.requestedAt).toLocaleDateString('ka-GE')}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[150px] truncate">{o.result || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: ეპიკრიზი */}
      {tab === 3 && (
        <EpicrisisSection episodeId={id!} episode={episode} patient={patient} imedUser={imedUser} />
      )}

      {/* Tab 4: დოკუმენტები */}
      {tab === 4 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link to={`/imed/documents/new?episodeId=${id}&patientId=${episode.patientId}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-medium">
              <Plus size={16} /> დოკუმენტი
            </Link>
          </div>
          {docs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText size={36} className="mx-auto mb-2 opacity-30" />
              <p>დოკუმენტები ვერ მოიძებნა</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(d => (
                <Link key={d.id} to={`/imed/documents/${d.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors shadow-sm">
                  <div>
                    <div className="font-medium text-gray-800">{d.type}</div>
                    <div className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleString('ka-GE')}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    d.status === 'locked' ? 'bg-green-100 text-green-700' :
                    d.status === 'signed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{DOCUMENT_STATUS_LABELS[d.status]}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 min-w-[80px]">{label}:</span>
      <span className="font-medium text-gray-800">{value || '—'}</span>
    </div>
  );
}

function EpicrisisSection({ episodeId, episode, patient, imedUser }: any) {
  const printRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);

  const save = async () => {
    if (!firestore || !imedUser || !text.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(firestore, COLLECTIONS.DOCUMENTS), {
        type: 'გაწერის ეპიკრიზი',
        patientId: episode.patientId,
        episodeId,
        status: 'draft',
        content: { text, department: episode.department, admissionDate: episode.admissionDate },
        version: 1,
        createdBy: imedUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div ref={printRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <Letterhead
          clinic={null}
          patient={patient}
          docTitle="გაწერის ეპიკრიზი"
          formNumber="IV-300/ა"
          formLegalRef="დამტკიცებულია საქართველოს შრომის, ჯანმრთელობისა და სოციალური დაცვის მინისტრის 2009 წ. 19 მარტის №108/ნ ბრძანებით — ფორმა №IV-300/ა"
        />
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">განყ.: {episode.department} | მიღ.: {episode.admissionDate} | გაწ.: {episode.dischargeDate || '—'}</div>
        </div>
        <textarea
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[200px]"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="ეპიკრიზის ტექსტი..."
          disabled={signed}
        />
        {signed && <SignatureBlock doctorName={imedUser?.displayName} signedAt={new Date().toLocaleDateString('ka-GE')} />}
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={save} disabled={saving || !text.trim() || signed}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          {saving ? 'ინახება...' : 'შენახვა'}
        </button>
        <button onClick={() => setSigned(true)} disabled={!text.trim() || signed}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          <CheckCircle2 size={15} /> დადასტურება
        </button>
        <PrintButton contentRef={printRef} documentTitle="გაწერის ეპიკრიზი" disabled={!text.trim()} />
      </div>
    </div>
  );
}
