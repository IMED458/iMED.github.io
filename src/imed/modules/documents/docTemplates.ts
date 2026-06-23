// ============================================================
// iMED — დოკუმენტების შაბლონები (Forms Engine)
// ============================================================

export interface Field {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date';
  options?: string[];
  readonly?: boolean;
}

export interface DocTemplate {
  label: string;
  formNum: string;
  legalRef: string;
  /** true — ლაბორატორიული ბლანკი (ცალკე სატიტულე) */
  isLab?: boolean;
  fields: Field[];
}

export const DOC_TEMPLATES: Record<string, DocTemplate> = {
  exam_diary: {
    label: 'პაციენტის გასინჯვის დღიური',
    formNum: 'IV-300/ა',
    legalRef: 'დამტკიცებულია საქართველოს შრომის, ჯანმრთელობისა და სოციალური დაცვის მინისტრის 2009 წ. 19 მარტის №108/ნ ბრძანებით — ფორმა №IV-300/ა',
    fields: [
      { key: 'complaint', label: 'ჩივილები', type: 'textarea' },
      { key: 'anamnesis', label: 'ანამნეზი (ავადმყოფობის)', type: 'textarea' },
      { key: 'life_history', label: 'ცხოვრების ანამნეზი', type: 'textarea' },
      { key: 'objective', label: 'ობიექტური სტატუსი', type: 'textarea' },
      { key: 'diagnosis', label: 'დიაგნოზი (ICD-10)', type: 'text' },
      { key: 'treatment', label: 'მკურნალობის გეგმა / დანიშნულება', type: 'textarea' },
      { key: 'notes', label: 'შენიშვნა', type: 'textarea' },
    ],
  },
  consultation_card: {
    label: 'პაციენტის გასინჯვის ფურცელი (კონსულტაცია)',
    formNum: 'IV-300/ა',
    legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009 — ფორმა №IV-300/ა · დანართი N1',
    fields: [
      { key: 'consultation_type', label: 'კონსულტაციის სახეობა', type: 'text' },
      { key: 'reason', label: 'კონსულტაციის ტექსტი / დასკვნა', type: 'textarea' },
      { key: 'diagnosis_code', label: 'დიაგნოზი (ICD-10 კოდი)', type: 'text' },
      { key: 'diagnosis', label: 'დიაგნოზის დასახელება', type: 'text' },
      { key: 'recommendation', label: 'დანიშნულება და რეკომენდაციები', type: 'textarea' },
    ],
  },
  form100: {
    label: 'ჯანმრთ. მდგ-ის ცნობა (ფ.100 / IV-100/ა)',
    formNum: 'IV-100/ა',
    legalRef: 'დამტკიცებულია საქართველოს შრომის, ჯანმრთელობისა და სოციალური დაცვის მინისტრის 2007 წ. 09 აგვისტოს №338/ნ ბრძანებით — ფორმა №IV-100/ა',
    fields: [
      { key: 'complaints', label: 'ჩივილები', type: 'textarea' },
      { key: 'diagnosis', label: 'ძირითადი დიაგნოზი', type: 'text' },
      { key: 'icd10', label: 'ICD-10 კოდი', type: 'text' },
      { key: 'complication', label: 'გართულება', type: 'text' },
      { key: 'concomitant', label: 'თანმხლები დაავ.', type: 'text' },
      { key: 'outcome', label: 'შედეგი', type: 'select', options: ['გამოჯანმრთელდა', 'გაუმჯობესება', 'მდგ. უცვლელი', 'გარდაცვლილია', 'სხვა'] },
      { key: 'treatment_done', label: 'ჩატარებული მკურნალობა', type: 'textarea' },
      { key: 'recommendations', label: 'რეკომენდაციები', type: 'textarea' },
      { key: 'work_capacity', label: 'შრომის უნარი', type: 'select', options: ['შრომის უნარი შენარჩუნებული', 'დროებით შეზღუდული', 'მუდმივად შეზღუდული', 'დასასრულებელია'] },
    ],
  },
  informed_consent: {
    label: 'ინფორმირებული თანხმობა',
    formNum: '',
    legalRef: '„პაციენტის უფლებების შესახებ" საქართველოს კანონი, მ. 27; „ჯანმრთელობის დაცვის შესახებ" საქართველოს კანონი',
    fields: [
      { key: 'procedure', label: 'სამედიცინო ჩარევის / მანიპულაციის დასახელება', type: 'text' },
      { key: 'explained_by', label: 'განუმარტა ექიმმა (სახელი/გვარი)', type: 'text' },
      { key: 'risks_explained', label: 'განმარტებული რისკები', type: 'textarea' },
      { key: 'alternatives', label: 'ალტერნატიული მეთოდები', type: 'textarea' },
      { key: 'patient_agrees', label: 'პაციენტი ეთანხმება', type: 'select', options: ['დიახ, ვეთანხმები', 'უარს ვამბობ'] },
      { key: 'consent_date', label: 'თანხმობის თარიღი', type: 'date' },
    ],
  },
  norton_scale: {
    label: 'ნაწოლის რისკი — ნორტონის შკალა',
    formNum: '',
    legalRef: 'სამედიცინო მომსახურების ეროვნული სტანდარტი',
    fields: [
      { key: 'physical_condition', label: 'ფიზიკური მდგომარეობა (1-4)', type: 'select', options: ['1 — ძალიან ცუდი', '2 — ცუდი', '3 — საშუალო', '4 — კარგი'] },
      { key: 'mental_state', label: 'გონებრივი მდგომარეობა (1-4)', type: 'select', options: ['1 — სტუპოროზი/კომა', '2 — კონფუზია', '3 — აპათია', '4 — ნათელი'] },
      { key: 'activity', label: 'აქტივობა (1-4)', type: 'select', options: ['1 — მწოლიარე', '2 — სკამზე ზის', '3 — ამოდის დახმარებით', '4 — მოდის თავისით'] },
      { key: 'mobility', label: 'მობილობა (1-4)', type: 'select', options: ['1 — არ მოძრაობს', '2 — ძლიერ შეზღ.', '3 — ოდნავ შეზღ.', '4 — ნორმ.'] },
      { key: 'incontinence', label: 'შარდ./განავ. შეუკავებლობა (1-4)', type: 'select', options: ['1 — ორივე', '2 — შარდის', '3 — ზოგჯერ', '4 — არ აქვს'] },
      { key: 'total', label: 'სულ ქულა (ავტო-ჯამი)', type: 'text', readonly: true },
      { key: 'risk_level', label: 'რისკის დონე', type: 'text', readonly: true },
    ],
  },
  fall_risk: {
    label: 'დაცემის რისკის შეფასება',
    formNum: '',
    legalRef: 'სამედიცინო მომსახურების ეროვნული სტანდარტი',
    fields: [
      { key: 'history_of_falls', label: 'დაცემის ისტორია (ბოლო 3 თვე)', type: 'select', options: ['0 — არა', '25 — დიახ'] },
      { key: 'diagnosis', label: 'მეორადი დიაგნოზი', type: 'select', options: ['0 — ერთი', '15 — ერთზე მეტი'] },
      { key: 'ambulatory_aid', label: 'სიარულის საშუალება', type: 'select', options: ['0 — არა/ექთანი', '15 — ჯოხი/ვარჯ. ბარი', '30 — ავეჯი'] },
      { key: 'iv_therapy', label: 'ინტრავენური თერაპია', type: 'select', options: ['0 — არა', '20 — დიახ'] },
      { key: 'gait', label: 'სიარული/ბალანსი', type: 'select', options: ['0 — ნორმ.', '10 — სუსტი', '20 — დ/მ'] },
      { key: 'mental_status', label: 'სულიერი მდგ.', type: 'select', options: ['0 — შესაბ.', '15 — შეუსაბ.'] },
      { key: 'total', label: 'სულ ქულა', type: 'text', readonly: true },
    ],
  },
  who_checklist: {
    label: 'WHO უსაფრთხო ქირურგიის სია',
    formNum: '',
    legalRef: 'WHO Surgical Safety Checklist (2009) — Georgia Adaptation',
    fields: [
      { key: 'sign_in_patient_confirmed', label: '✓ SIGN IN: პაციენტი დადასტურებული', type: 'select', options: ['დიახ', 'არა'] },
      { key: 'sign_in_site_marked', label: '✓ ოპ. ადგილი მონიშნული', type: 'select', options: ['დიახ', 'არა', 'გამოუყ.'] },
      { key: 'sign_in_anesthesia_check', label: '✓ ანე. აპარ. შემოწმებული', type: 'select', options: ['დიახ', 'არა'] },
      { key: 'sign_in_pulse_ox', label: '✓ პულსოქსი ფუნქ.', type: 'select', options: ['დიახ', 'არა'] },
      { key: 'sign_in_allergies', label: '✓ ალერგ. სტატ. ცნობილი', type: 'select', options: ['არ აქვს', 'აქვს'] },
      { key: 'time_out_confirm', label: '✓ TIME OUT: გუნდი ადასტ. პაც/პროც', type: 'select', options: ['დიახ', 'არა'] },
      { key: 'time_out_antibiotics', label: '✓ ანტ. პროფ. ბოლო 60 წთ', type: 'select', options: ['დიახ', 'არა', 'გ.'] },
      { key: 'time_out_imaging', label: '✓ გამ. სურათები ნაჩვ.', type: 'select', options: ['დიახ', 'არა', 'გ.'] },
      { key: 'sign_out_instrument', label: '✓ SIGN OUT: ინსტ. დათვლ.', type: 'select', options: ['დიახ', 'არა', 'გ.'] },
      { key: 'sign_out_specimen', label: '✓ ნიმ. ეტიკ.', type: 'select', options: ['დიახ', 'არა', 'გ.'] },
      { key: 'sign_out_concerns', label: '✓ გუნდის შენიშვნები', type: 'textarea' },
    ],
  },
  preop_epicrisis: {
    label: 'წინასაოპერაციო ეპიკრიზი',
    formNum: 'IV-300-5/ა',
    legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009 — ფორმა №IV-300-5/ა',
    fields: [
      { key: 'diagnosis', label: 'წინაოპ. დიაგნოზი', type: 'text' },
      { key: 'indication', label: 'ოპ. ჩვენება', type: 'textarea' },
      { key: 'planned_op', label: 'დაგეგმილი ოპერაცია', type: 'text' },
      { key: 'anesthesia_type', label: 'ანესთ. ტიპი', type: 'select', options: ['ზოგადი', 'ეპ./სპ.', 'ადგ.', 'სხვა'] },
      { key: 'risk', label: 'ოპ. რისკი (ASA)', type: 'select', options: ['ASA I', 'ASA II', 'ASA III', 'ASA IV', 'ASA V'] },
      { key: 'allergies', label: 'ალერგ. ანამნ.', type: 'text' },
      { key: 'consent_obtained', label: 'ინფ. თანხ. მიღ.', type: 'select', options: ['დიახ', 'არა'] },
    ],
  },
  prescription: {
    label: 'ექიმის დანიშნულების ფურცელი',
    formNum: 'IV-300/ა',
    legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009 — ფორმა №IV-300/ა',
    fields: [
      { key: 'diagnosis', label: 'დიაგნოზი', type: 'text' },
      { key: 'regimen', label: 'რეჟიმი', type: 'select', options: ['თავისუფალი', 'ნახევრად-წოლითი', 'მკაცრი წოლითი', 'პალატური'] },
      { key: 'diet', label: 'დიეტა (მაგიდა №)', type: 'text' },
      { key: 'medications', label: 'მედიკამენტური დანიშნულება (პრეპარატი, დოზა, სიხშირე, გზა)', type: 'textarea' },
      { key: 'infusions', label: 'ინფუზიური თერაპია', type: 'textarea' },
      { key: 'procedures', label: 'პროცედურები / მანიპულაციები', type: 'textarea' },
      { key: 'monitoring', label: 'მონიტორინგი', type: 'select', options: ['24-საათიანი', 'ჩვეულებრივი'] },
      { key: 'notes', label: 'შენიშვნა', type: 'textarea' },
    ],
  },
  nurse_expense: {
    label: 'ექთნის ხარჯი (შესრულებული სამედიცინო სამუშაო)',
    formNum: '',
    legalRef: 'სტაციონარული სამედიცინო დოკუმენტაცია — №108/ნ',
    fields: [
      { key: 'date', label: 'თარიღი', type: 'date' },
      { key: 'shift', label: 'ცვლა', type: 'select', options: ['დღის', 'ღამის'] },
      { key: 'materials', label: 'გახარჯული მასალა / მედიკამენტი (დასახ., რაოდ.)', type: 'textarea' },
      { key: 'manipulations', label: 'შესრულებული მანიპულაციები', type: 'textarea' },
      { key: 'injections', label: 'ინექციები / ინფუზიები', type: 'textarea' },
      { key: 'nurse_notes', label: 'ექთნის შენიშვნა', type: 'textarea' },
    ],
  },
  emergency_exam: {
    label: 'ემერჯენსის გასინჯვის ფურცელი',
    formNum: 'IV-300/ა',
    legalRef: 'გადაუდებელი დახმარების სამედიცინო დოკუმენტაცია — №108/ნ',
    fields: [
      { key: 'arrival_time', label: 'მოსვლის დრო', type: 'text' },
      { key: 'arrival_mode', label: 'მოყვანის გზა', type: 'select', options: ['სასწრაფო', 'თვითდინებით', 'სხვა დაწესებულებიდან'] },
      { key: 'complaints', label: 'ჩივილები', type: 'textarea' },
      { key: 'anamnesis', label: 'დაავადების ანამნეზი', type: 'textarea' },
      { key: 'vitals', label: 'სასიცოცხლო ნიშნები (АД, პულსი, t°, SpO₂, GCS)', type: 'textarea' },
      { key: 'objective', label: 'ობიექტური სტატუსი', type: 'textarea' },
      { key: 'triage', label: 'ტრიაჟის კატეგორია', type: 'select', options: ['🔴 წითელი (1)', '🟠 ნარინჯისფერი (2)', '🟡 ყვითელი (3)', '🟢 მწვანე (4)', '🔵 ლურჯი (5)'] },
      { key: 'diagnosis', label: 'წინასწარი დიაგნოზი (ICD-10)', type: 'text' },
      { key: 'actions', label: 'ჩატარებული ღონისძიებები', type: 'textarea' },
      { key: 'disposition', label: 'გადაწყვეტილება', type: 'select', options: ['ჰოსპიტალიზაცია', 'ამბ. მკურნ. გაწერა', 'გადაყვანა', 'უარი მკურნ.'] },
    ],
  },
  triage: {
    label: 'TRIAGE — ტრიაჟის ფურცელი',
    formNum: '',
    legalRef: 'გადაუდებელი დახმარების ტრიაჟის სტანდარტი',
    fields: [
      { key: 'time', label: 'ტრიაჟის დრო', type: 'text' },
      { key: 'main_complaint', label: 'მთავარი ჩივილი', type: 'text' },
      { key: 'airway', label: 'სასუნთქი გზები (A)', type: 'select', options: ['გამავალი', 'საფრთხე'] },
      { key: 'breathing', label: 'სუნთქვა (B) — RR, SpO₂', type: 'text' },
      { key: 'circulation', label: 'სისხლის მიმოქცევა (C) — პულსი, АД', type: 'text' },
      { key: 'disability', label: 'ნევროლოგია (D) — GCS / AVPU', type: 'text' },
      { key: 'category', label: 'ტრიაჟის კატეგორია', type: 'select', options: ['🔴 1 — რეანიმაცია', '🟠 2 — გადაუდებელი', '🟡 3 — სასწრაფო', '🟢 4 — ნაკლებად სასწრ.', '🔵 5 — არა-სასწრ.'] },
    ],
  },
  service_consent: {
    label: 'თანხმობა სამედიცინო მომსახურებაზე', formNum: '',
    legalRef: '„პაციენტის უფლებების შესახებ" საქართველოს კანონი',
    fields: [
      { key: 'service', label: 'სამედიცინო მომსახურების დასახელება', type: 'text' },
      { key: 'explained_by', label: 'განმარტა ექიმმა', type: 'text' },
      { key: 'understood', label: 'პაციენტი გაეცნო და გაიგო', type: 'select', options: ['დიახ', 'არა'] },
      { key: 'agrees', label: 'თანხმობა', type: 'select', options: ['ვეთანხმები', 'უარს ვამბობ'] },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  transfusion_consent: {
    label: 'სისხლის გადასხმის თანხმობა', formNum: '',
    legalRef: '„პაციენტის უფლებების შესახებ" კანონი; ტრანსფუზიოლოგიის სტანდარტი',
    fields: [
      { key: 'indication', label: 'გადასხმის ჩვენება', type: 'textarea' },
      { key: 'components', label: 'კომპონენტი (ერით. მასა, პლაზმა, თრომბ.)', type: 'text' },
      { key: 'risks_explained', label: 'განმარტებული რისკები', type: 'textarea' },
      { key: 'agrees', label: 'თანხმობა', type: 'select', options: ['ვეთანხმები', 'უარს ვამბობ'] },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  anesthesia_consent: {
    label: 'გაუტკივარების (ანესთეზიის) თანხმობა', formNum: 'IV-300-5/ა',
    legalRef: 'დამტკიცებულია №108/ნ, 19.03.2009 — ფორმა №IV-300-5/ა',
    fields: [
      { key: 'anesthesia_type', label: 'ანესთეზიის ტიპი', type: 'select', options: ['ზოგადი', 'სპინალური', 'ეპიდურალური', 'ადგილობრივი', 'სედაცია'] },
      { key: 'risks_explained', label: 'განმარტებული რისკები', type: 'textarea' },
      { key: 'fasting_confirmed', label: 'შიმშილობა დადასტურებული', type: 'select', options: ['დიახ', 'არა'] },
      { key: 'agrees', label: 'თანხმობა', type: 'select', options: ['ვეთანხმები', 'უარს ვამბობ'] },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  cvk_consent: {
    label: 'ც.ვ.კ. (ცენტრალური ვენური კათეტერი) — თანხმობა', formNum: '',
    legalRef: '„პაციენტის უფლებების შესახებ" კანონი',
    fields: [
      { key: 'site', label: 'ჩადგმის ადგილი', type: 'select', options: ['v. subclavia', 'v. jugularis int.', 'v. femoralis'] },
      { key: 'indication', label: 'ჩვენება', type: 'textarea' },
      { key: 'risks_explained', label: 'განმარტებული რისკები', type: 'textarea' },
      { key: 'agrees', label: 'თანხმობა', type: 'select', options: ['ვეთანხმები', 'უარს ვამბობ'] },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  hepc_consent: {
    label: 'თანხმობა C ჰეპატიტის სკრინინგზე', formNum: '',
    legalRef: 'C ჰეპატიტის ელიმინაციის სახელმწიფო პროგრამა',
    fields: [
      { key: 'agrees', label: 'თანხმობა სკრინინგზე', type: 'select', options: ['ვეთანხმები', 'უარს ვამბობ'] },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  bonemarrow_consent: {
    label: 'თანხმობა ძვლის ტვინის პუნქცია/ბიოფსიაზე', formNum: '',
    legalRef: '„პაციენტის უფლებების შესახებ" კანონი',
    fields: [
      { key: 'procedure', label: 'პროცედურა', type: 'select', options: ['ასპირაცია', 'ტრეპანობიოფსია'] },
      { key: 'risks_explained', label: 'განმარტებული რისკები', type: 'textarea' },
      { key: 'agrees', label: 'თანხმობა', type: 'select', options: ['ვეთანხმები', 'უარს ვამბობ'] },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  service_refusal: {
    label: 'უარი სამედიცინო მომსახურებაზე', formNum: '',
    legalRef: '„პაციენტის უფლებების შესახებ" საქართველოს კანონი, მ. 23',
    fields: [
      { key: 'refused_service', label: 'უარყოფილი მომსახურება', type: 'text' },
      { key: 'consequences_explained', label: 'განმარტებული შედეგები', type: 'textarea' },
      { key: 'refused_by', label: 'უარი განაცხადა', type: 'select', options: ['პაციენტმა', 'კანონიერმა წარმომადგენელმა'] },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  continuation_refusal: {
    label: 'უარი სამედიცინო მომსახურების გაგრძელებაზე', formNum: '',
    legalRef: '„პაციენტის უფლებების შესახებ" კანონი',
    fields: [
      { key: 'reason', label: 'უარის მიზეზი', type: 'textarea' },
      { key: 'consequences_explained', label: 'განმარტებული შედეგები', type: 'textarea' },
      { key: 'refused_by', label: 'უარი განაცხადა', type: 'select', options: ['პაციენტმა', 'ნათესავმა / წარმომადგენელმა'] },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  hepc_refusal: {
    label: 'უარი C ჰეპატიტის სკრინინგზე', formNum: '',
    legalRef: 'C ჰეპატიტის ელიმინაციის სახელმწიფო პროგრამა',
    fields: [
      { key: 'reason', label: 'უარის მიზეზი', type: 'textarea' },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  autopsy_refusal: {
    label: 'უარი გვამის გაკვეთაზე', formNum: '',
    legalRef: '„ჯანმრთელობის დაცვის შესახებ" საქართველოს კანონი',
    fields: [
      { key: 'deceased_relation', label: 'განმცხადებლის ნათესაობა', type: 'text' },
      { key: 'reason', label: 'უარის საფუძველი', type: 'textarea' },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
  tetanus_refusal: {
    label: 'უარი ანტიტეტანურ იმუნიზაციაზე', formNum: '',
    legalRef: 'იმუნიზაციის ეროვნული კალენდარი',
    fields: [
      { key: 'consequences_explained', label: 'განმარტებული შედეგები', type: 'textarea' },
      { key: 'date', label: 'თარიღი', type: 'date' },
    ],
  },
};

export const DOC_GROUPS: { label: string; types: string[] }[] = [
  { label: 'ამბულატორია / გასინჯვა', types: ['exam_diary', 'consultation_card', 'emergency_exam', 'triage'] },
  { label: 'დანიშნულება / ექთანი', types: ['prescription', 'nurse_expense'] },
  { label: 'ეპიკრიზი / ოპერაცია', types: ['preop_epicrisis', 'who_checklist', 'form100'] },
  { label: 'რისკის შკალები', types: ['norton_scale', 'fall_risk'] },
  { label: 'თანხმობები', types: ['informed_consent', 'service_consent', 'transfusion_consent', 'anesthesia_consent', 'cvk_consent', 'hepc_consent', 'bonemarrow_consent'] },
  { label: 'უარები', types: ['service_refusal', 'continuation_refusal', 'hepc_refusal', 'autopsy_refusal', 'tetanus_refusal'] },
];

export function getDocLabel(type: string): string {
  return DOC_TEMPLATES[type]?.label || type;
}
