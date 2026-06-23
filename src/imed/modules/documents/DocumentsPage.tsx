import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import {
  firestore, COLLECTIONS, collection, query, where,
  getDocs, orderBy, limit, addDoc, updateDoc, doc, getDoc,
} from '../../firebase/db';
import type { MedicalDocument, Patient } from '../../types';
import { DOCUMENT_STATUS_LABELS } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { addAuditLog } from '../audit/auditService';
import { Letterhead, SignatureBlock } from '../../components/common/Letterhead';
import PrintButton from '../../components/print/PrintButton';
import { FileText, Plus, ArrowLeft, CheckCircle2, Lock, Edit2, X } from 'lucide-react';

const DOCUMENT_TYPES = [
  { key: 'exam_diary', label: 'პაციენტის გასინჯვის დღიური', formNum: 'IV-300/ა', legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009 — ფორმა №IV-300/ა' },
  { key: 'ambulatory_card', label: 'ამბულატორიული ბარათი', formNum: 'IV-200/ა', legalRef: 'დამტკიცებულია №01-41/ნ, 15.08.2011 — ფორმა №IV-200/ა' },
  { key: 'consultation_card', label: 'კონსულტაციის ბარათი', formNum: 'IV-006/ა', legalRef: 'ფორმა №IV-006/ა — კონსულტაციის ბარათი' },
  { key: 'discharge_epicrisis', label: 'გაწერის ეპიკრიზი', formNum: 'IV-300/ა', legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009 — ფორმა №IV-300/ა' },
  { key: 'stage_epicrisis', label: 'ეტაპური ეპიკრიზი', formNum: 'IV-300/ა', legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009' },
  { key: 'transfer_epicrisis', label: 'გადაყვანის ეპიკრიზი', formNum: 'IV-300/ა', legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009' },
  { key: 'death_epicrisis', label: 'გარდაცვალების ეპიკრიზი', formNum: 'IV-300/ა', legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009' },
  { key: 'form100', label: 'ჯანმრთელობის მდგომარეობის ცნობა (ფორმა 100)', formNum: 'IV-100/ა', legalRef: 'დამტკიცებულია №338/ნ, 09.08.2007 — ფორმა №IV-100/ა' },
  { key: 'preop_epicrisis', label: 'წინასაოპერაციო ეპიკრიზი', formNum: 'IV-300-5/ა', legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009 — ფორმა №IV-300-5/ა' },
  { key: 'operation_protocol', label: 'ოპერაციის ოქმი', formNum: 'IV-300/ა', legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009' },
  { key: 'anesthesia_map', label: 'ანესთეზიის რუქა (ზოგადი ანესთეზია)', formNum: 'IV-300-5/ა', legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009 — ფორმა №IV-300-5/ა' },
  { key: 'pain_protocol', label: 'გაუტკივარების ოქმი', formNum: 'IV-300/ა', legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009' },
  { key: 'informed_consent', label: 'ინფორმირებული თანხმობა', formNum: '', legalRef: 'პაციენტის უფლებების შესახებ საქართველოს კანონი' },
  { key: 'refuse_service', label: 'უარი სამედიცინო მომსახურებაზე', formNum: '', legalRef: 'პაციენტის უფლებების შესახებ საქართველოს კანონი' },
  { key: 'blood_consent', label: 'სისხლის გადასხმის თანხმობა', formNum: '', legalRef: 'საქართველოს სამედიცინო კანონმდებლობა' },
  { key: 'er_form', label: 'ER — გასინჯვის ფურცელი', formNum: 'IV-300/ა', legalRef: 'გადაუდებელი სამედიცინო დახმარება — №108/ნ, 19.03.2009' },
  { key: 'cvk_protocol', label: 'ც.ვ.კ. ოქმი', formNum: '', legalRef: 'სტაციონარული მანიპულაცია — №108/ნ, 19.03.2009' },
  { key: 'pleural_drain', label: 'პლევრის ღრუს დრენირება', formNum: '', legalRef: 'სტაციონარული მანიპულაცია — №108/ნ, 19.03.2009' },
  { key: 'norton_scale', label: 'ნაწოლის რისკი — ნორტონის შკალა', formNum: '', legalRef: 'სამედიცინო მომსახურების სტანდარტი' },
  { key: 'fall_risk', label: 'დაცემის რისკის შეფასების ფურცელი', formNum: '', legalRef: 'სამედიცინო მომსახურების სტანდარტი' },
  { key: 'thrombosis_risk', label: 'თრომბოემბოლიის რისკის შეფასება', formNum: '', legalRef: 'სამედიცინო მომსახურების სტანდარტი' },
  { key: 'who_checklist', label: 'უსაფრთხო ქირურგიის სია (WHO)', formNum: '', legalRef: 'WHO Surgical Safety Checklist' },
  { key: 'suicide_risk', label: 'სუიციდის რისკი', formNum: '', legalRef: 'სამედიცინო მომსახურების სტანდარტი' },
  { key: 'violence_screen_women', label: 'ქალთა მიმართ ძალადობის სკრინინგი', formNum: '', legalRef: 'საქართველოს კანონი ძალადობის შესახებ' },
  { key: 'violence_screen_children', label: 'ბავშვთა მიმართ ძალადობის სკრინინგი', formNum: '', legalRef: 'საქართველოს კანონი ბავშვის უფლებათა შესახებ' },
  { key: 'medication_reconciliation', label: 'მედიკამენტის შეჯერება', formNum: '', legalRef: 'სამედიცინო მომსახურების სტანდარტი' },
  { key: 'ct_questionnaire', label: 'CT ანკეტა', formNum: '', legalRef: 'რადიოლოგიური კვლევის პროტოკოლი' },
  { key: 'mri_questionnaire', label: 'MRI ანკეტა', formNum: '', legalRef: 'რადიოლოგიური კვლევის პროტოკოლი' },
  { key: 'coronarography', label: 'კორონაროგრაფია', formNum: '', legalRef: 'სპეც. ჩარევის ოქმი' },
  { key: 'brain_angio', label: 'თავ. ტვ. სისხლძ. დიგ. ანგიოგრაფია', formNum: '', legalRef: 'სპეც. ჩარევის ოქმი' },
];

export default function DocumentsPage() {
  const { imedUser } = useAuthStore();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const patientIdFilter = sp.get('patientId');
  const [docs, setDocs] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    const constraints: any[] = [orderBy('createdAt', 'desc'), limit(100)];
    if (patientIdFilter) constraints.unshift(where('patientId', '==', patientIdFilter));
    const snap = await getDocs(query(collection(firestore, COLLECTIONS.DOCUMENTS), ...constraints));
    setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalDocument)));
    setLoading(false);
  }, [patientIdFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">დოკუმენტები</h2>
          <p className="text-sm text-gray-500">{docs.length} დოკუმენტი</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm">
          <Plus size={18} /> ახალი დოკუმენტი
        </button>
      </div>

      {/* Doc type chooser */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">დოკუმენტის ტიპი</h3>
              <button onClick={() => setShowNew(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {DOCUMENT_TYPES.map(dt => (
                <button key={dt.key}
                  onClick={() => { setShowNew(false); navigate(`/imed/documents/new?type=${dt.key}${patientIdFilter ? `&patientId=${patientIdFilter}` : ''}`); }}
                  className="text-left px-4 py-3 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <div className="font-medium text-gray-800 text-sm">{dt.label}</div>
                  {dt.formNum && <div className="text-xs text-gray-400 mt-0.5">ფ. №{dt.formNum}</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <FileText size={40} className="mx-auto mb-2 opacity-30" />
            <p>დოკუმენტები ვერ მოიძებნა</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {docs.map(d => (
              <Link key={d.id} to={`/imed/documents/${d.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    d.status === 'locked' ? 'bg-green-50 text-green-600' :
                    d.status === 'signed' ? 'bg-blue-50 text-blue-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {d.status === 'locked' ? <Lock size={18} /> : <FileText size={18} />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{d.type}</div>
                    <div className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleString('ka-GE')}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  d.status === 'locked' ? 'bg-green-100 text-green-700' :
                  d.status === 'signed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {DOCUMENT_STATUS_LABELS[d.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
