import React, { useEffect, useState, useCallback } from 'react';
import {
  firestore, COLLECTIONS, collection, query, where,
  getDocs, orderBy, limit,
} from '../../firebase/db';
import type { AuditLog } from '../../types';
import { AUDIT_ACTION_LABELS } from '../../types';
import { ShieldCheck, Download, RefreshCw, Filter } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  view: 'bg-gray-100 text-gray-600',
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  sign: 'bg-purple-100 text-purple-700',
  print: 'bg-yellow-100 text-yellow-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-teal-100 text-teal-700',
  logout: 'bg-orange-100 text-orange-700',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const constraints: any[] = [orderBy('timestamp', 'desc'), limit(500)];
      if (actionFilter !== 'all') constraints.unshift(where('action', '==', actionFilter));
      const snap = await getDocs(query(collection(firestore, COLLECTIONS.AUDIT_LOGS), ...constraints));
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      if (dateFrom) data = data.filter(l => l.timestamp >= dateFrom);
      if (dateTo) data = data.filter(l => l.timestamp <= dateTo + 'T23:59:59');
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const rows = [
      ['ID', 'თარიღი', 'მომხმარებელი', 'როლი', 'მოქმედება', 'ობიექტი', 'პაციენტი', 'აღწერა'],
      ...logs.map(l => [
        l.id, l.timestamp, l.userDisplayName, l.userRole,
        AUDIT_ACTION_LABELS[l.action], l.resourceType,
        l.patientName || '', l.description,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imed_audit_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShieldCheck size={22} className="text-blue-600" /> აუდიტ-ლოგი
          </h2>
          <p className="text-sm text-gray-500">{logs.length} ჩანაწერი (append-only)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">მოქმედება</label>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="all">ყველა</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">თარიღიდან</label>
          <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">თარიღამდე</label>
          <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Filter size={15} /> ფილტრი
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <ShieldCheck size={40} className="mx-auto mb-2 opacity-30" />
            <p>ლოგები ვერ მოიძებნა</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">თარიღი / დრო</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">მომხმარებელი</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">მოქმ.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ტიპი</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">პაციენტი</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 max-w-xs">აღწერა</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono">
                      {new Date(l.timestamp).toLocaleString('ka-GE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{l.userDisplayName}</div>
                      <div className="text-gray-400">{l.userRole}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[l.action] || 'bg-gray-100 text-gray-600'}`}>
                        {AUDIT_ACTION_LABELS[l.action]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{l.resourceType}</td>
                    <td className="px-4 py-3 text-gray-600">{l.patientName || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{l.description}</td>
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
