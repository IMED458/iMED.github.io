import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  firestore, COLLECTIONS, collection, query, where,
  getDocs, orderBy, limit, addDoc, updateDoc, doc, getDoc,
} from '../../firebase/db';
import type { InpatientEpisode } from '../../types';
import { EPISODE_STATUS_LABELS, DEPARTMENTS } from '../../types';
import { BedDouble, Plus, Search, RefreshCw } from 'lucide-react';

export default function InpatientPage() {
  const { imedUser } = useAuthStore();
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState<InpatientEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');

  const load = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const constraints: any[] = [orderBy('admissionDate', 'desc'), limit(100)];
      if (statusFilter === 'active') constraints.unshift(where('status', '==', 'active'));
      if (deptFilter !== 'all') constraints.unshift(where('department', '==', deptFilter));
      const snap = await getDocs(query(collection(firestore, COLLECTIONS.EPISODES), ...constraints));
      setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() } as InpatientEpisode)));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, deptFilter]);

  useEffect(() => { load(); }, [load]);

  // დეპ-ების ჯგუფი
  const byDept: Record<string, InpatientEpisode[]> = {};
  episodes.forEach(ep => {
    if (!byDept[ep.department]) byDept[ep.department] = [];
    byDept[ep.department].push(ep);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">სტაციონარი</h2>
          <p className="text-sm text-gray-500">{episodes.length} პაციენტი ნაჩვენებია</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link to="/imed/inpatient/admit"
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors">
            <Plus size={18} /> ჰოსპიტალიზაცია
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="active">მხოლოდ აქტიური</option>
          <option value="all">ყველა ეპიზოდი</option>
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="all">ყველა განყოფილება</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Beds overview */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : episodes.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <BedDouble size={40} className="mx-auto mb-2 opacity-30" />
          <p>სტაციონარული პაციენტი ვერ მოიძებნა</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDept).map(([dept, eps]) => (
            <div key={dept} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BedDouble size={18} className="text-purple-600" />
                  <span className="font-semibold text-purple-800">{dept}</span>
                </div>
                <span className="text-sm text-purple-600 font-medium">{eps.length} პაც.</span>
              </div>
              <div className="divide-y divide-gray-100">
                {eps.map(ep => (
                  <EpisodeRow key={ep.id} episode={ep} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EpisodeRow({ episode: ep }: { episode: InpatientEpisode }) {
  const [patientName, setPatientName] = useState('...');

  useEffect(() => {
    if (!firestore) return;
    getDoc(doc(firestore, COLLECTIONS.PATIENTS, ep.patientId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setPatientName(`${d.lastName} ${d.firstName}`);
      }
    });
  }, [ep.patientId]);

  const daysSince = Math.floor((Date.now() - new Date(ep.admissionDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Link to={`/imed/inpatient/episodes/${ep.id}`}
      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[50px]">
          <div className="text-xs text-gray-400">საწ.</div>
          <div className="font-bold text-gray-800">{ep.bedNumber}</div>
        </div>
        <div>
          <div className="font-medium text-gray-800">{patientName}</div>
          <div className="text-xs text-gray-400">
            {ep.admissionDate} · პალ. {ep.ward} · {daysSince} დ.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          ep.status === 'active' ? 'bg-green-100 text-green-700' :
          ep.status === 'discharged' ? 'bg-gray-100 text-gray-600' :
          ep.status === 'deceased' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {EPISODE_STATUS_LABELS[ep.status]}
        </span>
        <span className="text-blue-600 text-xs">→</span>
      </div>
    </Link>
  );
}
