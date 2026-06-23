import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus } from 'lucide-react';

export interface ICD10Code { code: string; name: string; }

let _cache: Record<string, string> | null = null;
let _loading: Promise<Record<string, string>> | null = null;

export function loadICD10(): Promise<Record<string, string>> {
  if (_cache) return Promise.resolve(_cache);
  if (_loading) return _loading;
  _loading = import('../../data/icd10Data').then(m => {
    _cache = m.ICD10_KA;
    return _cache;
  });
  return _loading;
}

export function icd10Name(code: string): string {
  return _cache?.[code] || '';
}

interface Props {
  /** არჩევისას — კოდი + სახელი */
  onSelect: (item: ICD10Code) => void;
  placeholder?: string;
  /** ღილაკის ვარიანტი — inline trigger */
  buttonLabel?: string;
}

// ICD-10 ძებნის input/dropdown
export default function ICD10Picker({ onSelect, placeholder = 'ICD-10: კოდი ან დიაგნოზი...', buttonLabel }: Props) {
  const [open, setOpen] = useState(!buttonLabel);
  const [term, setTerm] = useState('');
  const [data, setData] = useState<Record<string, string> | null>(_cache);
  const [results, setResults] = useState<ICD10Code[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !data) {
      setLoadingData(true);
      loadICD10().then(d => { setData(d); setLoadingData(false); });
    }
  }, [open, data]);

  useEffect(() => {
    if (!data || !term.trim()) { setResults([]); return; }
    const t = term.toLowerCase().trim();
    const out: ICD10Code[] = [];
    for (const code in data) {
      const name = data[code];
      if (code.toLowerCase().includes(t) || name.toLowerCase().includes(t)) {
        out.push({ code, name });
        if (out.length >= 60) break;
      }
    }
    setResults(out);
  }, [term, data]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node) && buttonLabel) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, buttonLabel]);

  if (buttonLabel && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50">
        <Plus size={13} /> {buttonLabel}
      </button>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus={!!buttonLabel}
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder={loadingData ? 'იტვირთება ICD-10 ბაზა...' : placeholder}
          className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {term && (
          <button type="button" onClick={() => setTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        )}
      </div>
      {term.trim() && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">{loadingData ? 'იტვირთება...' : 'ვერ მოიძებნა'}</div>
          ) : results.map(r => (
            <button key={r.code} type="button"
              onClick={() => { onSelect(r); setTerm(''); if (buttonLabel) setOpen(false); }}
              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-50 last:border-0">
              <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">{r.code}</span>
              <span className="text-sm text-gray-800">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
