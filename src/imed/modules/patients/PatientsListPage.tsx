import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listPatients, searchPatients } from './patientsService';
import type { Patient } from '../../types';
import { INSURANCE_LABELS } from '../../types';
import { Search, UserPlus, Eye, Edit2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function PatientsListPage() {
  const { imedUser } = useAuthStore();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPatients(100);
      setPatients(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!searchTerm.trim()) { load(); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchPatients(searchTerm);
        setPatients(res);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm, load]);

  const canCreate = imedUser?.role === 'super_admin' || imedUser?.role === 'registrar';

  const calcAge = (birthDate: string) => {
    if (!birthDate) return '';
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">პაციენტები</h2>
          <p className="text-sm text-gray-500 mt-0.5">{patients.length} პაციენტი ნაჩვენებია</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {canCreate && (
            <Link to="/imed/patients/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
              <UserPlus size={18} />
              პაციენტის დამატება
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          placeholder="ძებნა: გვარი, სახელი, პირადი №, ბარათი №..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <span className="text-4xl mb-2">🔍</span>
            <span className="text-sm">პაციენტი ვერ მოიძებნა</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">გვარი, სახელი</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">დ/თ / ასაკი</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">პირადი №</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ბარათი №</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ტელ.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">დაზღვევა</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">ქმედება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map(p => (
                  <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.lastName} {p.firstName}</div>
                      <div className="text-xs text-gray-400">{p.sex === 'male' ? 'მამრ.' : 'მდედ.'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{p.birthDate}</div>
                      <div className="text-xs text-gray-400">{calcAge(p.birthDate)} წ.</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.personalId}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-blue-700 font-medium">{p.cardNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.insuranceStatus === 'universal' ? 'bg-green-100 text-green-700' :
                        p.insuranceStatus === 'private' ? 'bg-blue-100 text-blue-700' :
                        p.insuranceStatus === 'none' ? 'bg-gray-100 text-gray-500' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {INSURANCE_LABELS[p.insuranceStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/imed/patients/${p.id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye size={16} />
                        </Link>
                        {canCreate && (
                          <Link to={`/imed/patients/${p.id}/edit`}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </Link>
                        )}
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
