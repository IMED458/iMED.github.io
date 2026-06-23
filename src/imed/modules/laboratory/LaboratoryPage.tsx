import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { loadClinicConfig } from '../settings/clinicConfig';
import type { ClinicConfig, LabParameter, LabResult } from '../../types';
import { LAB_RESULT_STATUS_LABELS, LAB_RESULT_STATUS_COLORS } from '../../types';
import {
  getLabWorklist, type LabWorklistItem, buildParametersFor, recomputeFlag,
  saveLabResultDraft, confirmLabResult, correctLabResult, calcAgeYears,
} from './labService';
import LabResultSheet from '../../components/print/LabResultSheet';
import PrintButton from '../../components/print/PrintButton';
import {
  FlaskConical, Search, X, Save, CheckCircle2, Printer, Edit3, Loader2,
} from 'lucide-react';

type TabKey = 'new' | 'progress' | 'confirmed';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'new', label: 'ახალი დანიშნული' },
  { key: 'progress', label: 'პროცესში / მონახაზი' },
  { key: 'confirmed', label: 'დადასტურებული' },
];

export default function LaboratoryPage() {
  const { imedUser } = useAuthStore();
  const [worklist, setWorklist] = useState<LabWorklistItem[]>([]);
  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('new');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<LabWorklistItem | null>(null);

  const load = async () => {
    setLoading(true);
    const [wl, c] = await Promise.all([getLabWorklist(), loadClinicConfig()]);
    setWorklist(wl);
    setClinic(c);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const matchTab = (w: LabWorklistItem, k: TabKey) => {
    if (k === 'new') return !w.result || w.result.status === 'assigned';
    if (k === 'progress') return !!w.result && (w.result.status === 'draft' || w.result.status === 'in_progress');
    return !!w.result && (w.result.status === 'confirmed' || w.result.status === 'corrected');
  };

  const filtered = useMemo(() => {
    let list = worklist.filter(w => matchTab(w, tab));
    const s = search.toLowerCase().trim();
    if (s) {
      list = list.filter(w => {
        const p = w.patient;
        return w.itemName.toLowerCase().includes(s) ||
          (!!p && (`${p.lastName} ${p.firstName}`.toLowerCase().includes(s) || (p.personalId || '').includes(s) || (p.historyNumber || '').includes(s) || (p.cardNumber || '').includes(s)));
      });
    }
    return list;
  }, [worklist, tab, search]);

  const counts = useMemo(() => ({
    new: worklist.filter(w => matchTab(w, 'new')).length,
    progress: worklist.filter(w => matchTab(w, 'progress')).length,
    confirmed: worklist.filter(w => matchTab(w, 'confirmed')).length,
  }), [worklist]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FlaskConical size={22} className="text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-800">ლაბორატორია — სამუშაო სია</h2>
          <p className="text-sm text-gray-500">დანიშნული კვლევები · პასუხების შეტანა და დადასტურება</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              {t.label} <span className="ml-1 text-xs opacity-60">({(counts as any)[t.key]})</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ძებნა: გვარი, ისტ. №, პირადი №..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><FlaskConical size={36} className="mx-auto mb-2 opacity-30" /><p>კვლევები არ არის</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">პაციენტი</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">კვლევა</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">მიმართვა №</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">სტატუსი</th>
              <th className="text-right px-4 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((w, i) => (
                <tr key={i} className="hover:bg-blue-50/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{w.patient ? `${w.patient.lastName} ${w.patient.firstName}` : '—'}</div>
                    <div className="text-xs text-gray-400">ისტ. {w.patient?.historyNumber || w.patient?.cardNumber || '—'} · {w.patient?.personalId || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    {w.itemCode && <span className="font-mono text-xs text-gray-400 mr-1">{w.itemCode}</span>}
                    {w.itemName}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 hidden sm:table-cell">{w.order.referralNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.result ? LAB_RESULT_STATUS_COLORS[w.result.status] : 'bg-yellow-100 text-yellow-800'}`}>
                      {w.result ? LAB_RESULT_STATUS_LABELS[w.result.status] : 'დანიშნულია'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setActive(w)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
                      {w.result && (w.result.status === 'confirmed' || w.result.status === 'corrected') ? <><Printer size={13} /> ნახვა</> : <><Edit3 size={13} /> შევსება</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {active && imedUser && (
        <ResultEditor item={active} clinic={clinic} user={imedUser}
          onClose={() => setActive(null)}
          onSaved={() => { setActive(null); load(); }} />
      )}
    </div>
  );
}

function ResultEditor({ item, clinic, user, onClose, onSaved }: {
  item: LabWorklistItem; clinic: ClinicConfig | null; user: any;
  onClose: () => void; onSaved: () => void;
}) {
  const patient = item.patient;
  const sex = (patient?.sex || 'male') as 'male' | 'female';
  const ageY = patient ? calcAgeYears(patient.birthDate) : 30;
  const existing = item.result;
  const isConfirmed = existing?.status === 'confirmed' || existing?.status === 'corrected';

  const [params, setParams] = useState<LabParameter[]>(() => {
    if (existing && existing.parameters.length) return existing.parameters;
    const built = buildParametersFor(item.itemName, sex, ageY);
    return built.length ? built : [{ code: 'CUSTOM0', name: '', value: '', unit: '', refRange: '', flag: 'normal' }];
  });
  const [comment, setComment] = useState(existing?.comment || '');
  const [saving, setSaving] = useState(false);
  const [correctMode, setCorrectMode] = useState(false);
  const [err, setErr] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const setVal = (idx: number, value: string) => setParams(prev => prev.map((p, i) => i === idx ? recomputeFlag({ ...p, value }, sex, ageY) : p));
  const setName = (idx: number, name: string) => setParams(prev => prev.map((p, i) => i === idx ? { ...p, name } : p));
  const setUnit = (idx: number, unit: string) => setParams(prev => prev.map((p, i) => i === idx ? { ...p, unit } : p));
  const addCustom = () => setParams(prev => [...prev, { code: 'CUSTOM' + prev.length, name: '', value: '', unit: '', refRange: '', flag: 'normal' }]);

  const editable = !isConfirmed || correctMode;

  const doSave = async (confirm: boolean) => {
    if (!patient) { setErr('პაციენტი ვერ მოიძებნა'); return; }
    if (confirm && !params.some(p => p.value.trim())) { setErr('შეავსეთ მინიმუმ ერთი შედეგი დადასტურებამდე'); return; }
    setSaving(true); setErr('');
    try {
      if (isConfirmed && correctMode) {
        await correctLabResult({ resultId: existing!.id, parameters: params, comment, user });
      } else {
        const id = await saveLabResultDraft({
          patient, order: item.order, testName: item.itemName, testCode: item.itemCode,
          groupName: item.groupName, parameters: params, comment, user, existingId: existing?.id,
        });
        if (confirm) await confirmLabResult(id, user);
      }
      onSaved();
    } catch (e: any) {
      setErr(e.message || 'შეცდომა');
    } finally {
      setSaving(false);
    }
  };

  const previewResult: LabResult = {
    id: existing?.id || 'preview', patientId: patient?.id || '', patientName: patient ? `${patient.lastName} ${patient.firstName}` : '',
    orderId: item.order.id, referralNumber: item.order.referralNumber, testName: item.itemName, testCode: item.itemCode,
    groupName: item.groupName, parameters: params, comment, status: existing?.status || 'draft',
    performedByName: existing?.performedByName || user.displayName, confirmedByName: existing?.confirmedByName,
    confirmedAt: existing?.confirmedAt, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-gray-800">{item.itemName}</h3>
            <p className="text-xs text-gray-500">{patient ? `${patient.lastName} ${patient.firstName} · ${sex === 'male' ? 'მამრ.' : 'მდედ.'} · ${ageY} წ. · ისტ. ${patient.historyNumber || patient.cardNumber}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">⚠ {err}</div>}
          {isConfirmed && !correctMode && (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              <span><CheckCircle2 size={15} className="inline mr-1" /> დადასტურებული — {previewResult.confirmedByName}, {previewResult.confirmedAt && new Date(previewResult.confirmedAt).toLocaleString('ka-GE')}</span>
              <button onClick={() => setCorrectMode(true)} className="text-blue-600 hover:underline font-medium">შესწორება</button>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500">
                <th className="text-left px-3 py-2 font-medium">პარამეტრი</th>
                <th className="text-left px-3 py-2 font-medium w-32">შედეგი</th>
                <th className="text-left px-3 py-2 font-medium w-24">ერთეული</th>
                <th className="text-left px-3 py-2 font-medium w-28">ნორმა</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {params.map((p, i) => (
                  <tr key={i} className={p.flag !== 'normal' ? 'bg-red-50/40' : ''}>
                    <td className="px-3 py-1.5">
                      {p.code.startsWith('CUSTOM') ? (
                        <input value={p.name} onChange={e => setName(i, e.target.value)} disabled={!editable}
                          placeholder="პარამეტრი" className="w-full px-2 py-1 border border-gray-200 rounded text-sm disabled:bg-gray-50" />
                      ) : <span className="text-gray-700">{p.name}</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <input value={p.value} onChange={e => setVal(i, e.target.value)} disabled={!editable}
                          className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${p.flag !== 'normal' ? 'border-red-300 font-semibold text-red-700' : 'border-gray-300'} ${!editable ? 'bg-gray-50' : ''}`} />
                        {p.flag === 'high' && <span className="text-red-600 font-bold">↑</span>}
                        {p.flag === 'low' && <span className="text-blue-600 font-bold">↓</span>}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500 text-xs">
                      {p.code.startsWith('CUSTOM') && editable
                        ? <input placeholder="ერთ." value={p.unit} onChange={e => setUnit(i, e.target.value)} className="w-16 px-1 py-0.5 border border-gray-200 rounded text-xs" />
                        : p.unit}
                    </td>
                    <td className="px-3 py-1.5 text-gray-500 text-xs">{p.refRange}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editable && <button onClick={addCustom} className="text-xs text-blue-600 hover:underline">+ პარამეტრის დამატება</button>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">კომენტარი / დასკვნა</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} disabled={!editable} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50" />
          </div>

          <div className="hidden">
            <div ref={printRef}><LabResultSheet result={previewResult} patient={patient} clinic={clinic} /></div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
          {isConfirmed && <PrintButton contentRef={printRef} documentTitle={`ლაბ-${item.itemName}`} />}
          {editable && (
            <>
              {!correctMode && (
                <button onClick={() => doSave(false)} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium disabled:opacity-50">
                  <Save size={15} /> მონახაზად შენახვა
                </button>
              )}
              <button onClick={() => doSave(true)} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {correctMode ? 'შესწორების დადასტურება' : 'დადასტურება'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
