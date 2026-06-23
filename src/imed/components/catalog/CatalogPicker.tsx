import React, { useMemo, useState } from 'react';
import { CATALOG, searchCatalog } from '../../data/catalog';
import type { FlatCatalogItem, CatalogCategory } from '../../data/catalog';
import { Search, Check, X, FlaskConical, Scan, Users, Stethoscope, Microscope, BedDouble } from 'lucide-react';

export interface PickedItem {
  name: string;
  code?: string;
  categoryKey: string;
  categoryLabel: string;
  subKey: string;
  subLabel: string;
  type: string;
}

interface Props {
  selected: PickedItem[];
  onChange: (items: PickedItem[]) => void;
  /** მხოლოდ ამ კატეგორიის ჩვენება (key); თუ არ არის — ყველა */
  restrictCategory?: string;
}

const CAT_ICONS: Record<string, React.ReactNode> = {
  laboratory: <FlaskConical size={16} />,
  radiology: <Scan size={16} />,
  consultation: <Users size={16} />,
  manipulation: <Stethoscope size={16} />,
  pathology: <Microscope size={16} />,
  inpatient: <BedDouble size={16} />,
};

export default function CatalogPicker({ selected, onChange, restrictCategory }: Props) {
  const cats = useMemo<CatalogCategory[]>(
    () => restrictCategory ? CATALOG.filter(c => c.key === restrictCategory) : CATALOG,
    [restrictCategory]
  );
  const [activeCat, setActiveCat] = useState(cats[0]?.key || '');
  const [activeSub, setActiveSub] = useState(cats[0]?.subcategories[0]?.key || '');
  const [term, setTerm] = useState('');

  const isSelected = (name: string) => selected.some(s => s.name === name);

  const toggle = (item: { name: string; code?: string; categoryKey: string; categoryLabel: string; subKey: string; subLabel: string; type: string }) => {
    if (isSelected(item.name)) {
      onChange(selected.filter(s => s.name !== item.name));
    } else {
      onChange([...selected, item]);
    }
  };

  const currentCat = cats.find(c => c.key === activeCat);
  const currentSub = currentCat?.subcategories.find(s => s.key === activeSub);

  const searchResults: FlatCatalogItem[] = term.trim()
    ? searchCatalog(term, 80).filter(r => !restrictCategory || r.categoryKey === restrictCategory)
    : [];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* ძებნა */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={term}
            onChange={e => setTerm(e.target.value)}
            placeholder="ძებნა მთელ კატალოგში (კვლევა, კონსულტაცია, მანიპულაცია)..."
            className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {term && (
            <button onClick={() => setTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {term.trim() ? (
        // ძებნის შედეგები
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
          {searchResults.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">ვერაფერი მოიძებნა „{term}"-ზე</div>
          ) : searchResults.map((r, i) => (
            <button key={i} type="button" onClick={() => toggle(r)}
              className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-blue-50 ${isSelected(r.name) ? 'bg-blue-50' : ''}`}>
              <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected(r.name) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {isSelected(r.name) && <Check size={12} className="text-white" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="text-sm text-gray-800 block">{r.name}</span>
                <span className="text-xs text-gray-400">{r.categoryLabel} › {r.subLabel}{r.code ? ` · ${r.code}` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex" style={{ minHeight: 340 }}>
          {/* კატეგორიები */}
          <div className="w-44 border-r border-gray-200 bg-gray-50 overflow-y-auto" style={{ maxHeight: 420 }}>
            {cats.map(c => (
              <button key={c.key} type="button"
                onClick={() => { setActiveCat(c.key); setActiveSub(c.subcategories[0]?.key || ''); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm border-l-2 transition-colors ${
                  activeCat === c.key ? 'border-blue-600 bg-white text-blue-700 font-medium' : 'border-transparent text-gray-600 hover:bg-gray-100'
                }`}>
                {CAT_ICONS[c.key] || <FlaskConical size={16} />}
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>

          {/* ქვეკატეგორიები + items */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 bg-white">
              {currentCat?.subcategories.map(s => (
                <button key={s.key} type="button" onClick={() => setActiveSub(s.key)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    activeSub === s.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {s.label} <span className="opacity-60">({s.items.length})</span>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50" style={{ maxHeight: 380 }}>
              {currentSub?.items.map((item, i) => {
                const full = {
                  name: item.name, code: item.code,
                  categoryKey: currentCat!.key, categoryLabel: currentCat!.label,
                  subKey: currentSub!.key, subLabel: currentSub!.label, type: currentCat!.type,
                };
                const sel = isSelected(item.name);
                return (
                  <button key={i} type="button" onClick={() => toggle(full)}
                    className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-blue-50 ${sel ? 'bg-blue-50' : ''}`}>
                    <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {sel && <Check size={12} className="text-white" />}
                    </span>
                    <span className="flex-1 text-sm text-gray-800">
                      {item.code && <span className="font-mono text-xs text-gray-400 mr-1.5">{item.code}</span>}
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* მონიშნულები */}
      {selected.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-blue-50/50">
          <div className="text-xs font-medium text-gray-600 mb-2">მონიშნულია {selected.length}:</div>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-white border border-blue-200 text-blue-800 rounded-full pl-2.5 pr-1 py-1">
                {s.name}
                <button type="button" onClick={() => onChange(selected.filter(x => x.name !== s.name))}
                  className="w-4 h-4 rounded-full hover:bg-blue-100 flex items-center justify-center">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
