/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArticleTypeConfig, Manuscript, User, SystemAuditLog, JournalSettings, AuthorDetails } from './types';
import { firebaseEnabled, firestore } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export const ARTICLE_TYPES: { [key: string]: ArticleTypeConfig } = {
  'clinical-cases': {
    key: 'clinical-cases',
    name: 'CLINICAL CASES',
    description: 'Brief Report or Clinical Problem Solving. Describes 1–3 patients, one family, or step-by-step clinical reasoning. Maximum words: 2000–2500. Up to 3 tables/figures and 15–25 references.',
    maxWordCount: 2500,
    maxReferences: 25,
    maxFiguresTables: 3,
    requiredSections: ['Introduction', 'Case Presentation', 'Clinical Reasoning', 'Discussion', 'Conclusions', 'Notes on Patient Consent', 'Acknowledgments', 'Keywords'],
    abstractType: 'unstructured',
    submissionFeeUSD: 0,
  },
  'original-research': {
    key: 'original-research',
    name: 'ORIGINAL RESEARCH',
    description: 'Original Article or Special Article. Reports scientific results of original clinical research, policy, ethics, law, or health care delivery. Maximum words: 2700. Maximum of 5 tables/figures. Up to 40 references.',
    maxWordCount: 2700,
    maxReferences: 40,
    maxFiguresTables: 5,
    requiredSections: ['Introduction', 'Materials and Methods', 'Results', 'Discussion', 'Conclusions', 'Acknowledgments', 'Keywords'],
    abstractType: 'unstructured',
    submissionFeeUSD: 0,
  },
  'review-articles': {
    key: 'review-articles',
    name: 'REVIEW ARTICLES',
    description: 'Clinical Practice Review or Other Review. Evidence-based review for clinical or mechanistic topics. Maximum words: 2500–3000. Up to 5 tables/figures and 50–55 references.',
    maxWordCount: 3000,
    maxReferences: 55,
    maxFiguresTables: 5,
    requiredSections: ['Introduction', 'Methods', 'Evidence Review', 'Clinical Implications', 'Discussion', 'Conclusions', 'Acknowledgments', 'Keywords'],
    abstractType: 'unstructured',
    submissionFeeUSD: 0,
  },
  'commentary': {
    key: 'commentary',
    name: 'COMMENTARY',
    description: 'Editorial, Perspective, Clinical Implications of Basic Research, or Letter to the Editor. Maximum words: 400–1200 depending on format. Usually no abstract.',
    maxWordCount: 1200,
    maxReferences: 10,
    maxFiguresTables: 1,
    requiredSections: ['Commentary', 'Conclusions', 'Keywords'],
    abstractType: 'none',
    submissionFeeUSD: 0,
  },
  'other': {
    key: 'other',
    name: 'OTHER',
    description: 'Special Report, Health Law/Ethics/Human Rights or Health Policy Report, Medicine and Society, or Sounding Board. Maximum words: 2000–2700.',
    maxWordCount: 2700,
    maxReferences: 40,
    maxFiguresTables: 5,
    requiredSections: ['Introduction', 'Background', 'Report', 'Analysis', 'Discussion', 'Conclusions', 'Acknowledgments', 'Keywords'],
    abstractType: 'unstructured',
    submissionFeeUSD: 0,
  },
};

// Generates an AMA (American Medical Association) formatting string on the fly for preview purposes
export function formatAMAReference(ref: any): string {
  if (!ref.authors || !ref.title || !ref.journalOrBook || !ref.year) {
    return 'Incomplete citation data provided';
  }

  // Ensure authors end with a period
  let authorsFormatted = ref.authors.trim();
  if (!authorsFormatted.endsWith('.')) {
    authorsFormatted += '.';
  }

  const titleFormatted = ref.title.trim();
  const volume = ref.volume ? ` ${ref.volume}` : '';
  const issue = ref.issue ? `(${ref.issue})` : '';
  const pages = ref.pages ? `:${ref.pages}` : '';
  const suffix = ref.doi ? ` doi:${ref.doi}` : ref.url ? ` Available at: ${ref.url}` : '';

  if (ref.type === 'journal') {
    return `${authorsFormatted} ${titleFormatted}. *${ref.journalOrBook}*. ${ref.year};${volume}${issue}${pages}.${suffix}`;
  } else if (ref.type === 'book') {
    return `${authorsFormatted} *${ref.journalOrBook}*. ${ref.year}${volume ? `, Vol ${volume}` : ''}${pages ? `, p. ${pages}` : ''}.${suffix}`;
  } else {
    return `${authorsFormatted} ${titleFormatted}. *${ref.journalOrBook}*. Published ${ref.year}.${suffix}`;
  }
}

// Full, rich default users list
export const DEFAULT_USERS: User[] = [
  {
    id: 'user-auth-1',
    email: 'author@gbmn.edu',
    firstName: 'Ioseb',
    lastName: 'Kavtaradze',
    orcidId: '0000-0002-1823-4412',
    role: 'Author',
    institution: 'Tbilisi State Medical University',
    isVerified: true,
    joinedDate: '2026-01-15',
  },
  {
    id: 'user-editor-2',
    email: 'editor@gbmn.edu',
    firstName: 'Dr. David',
    lastName: 'Gureshidze',
    role: 'Editor',
    institution: 'Georgian National Center of Biomedical Nexus',
    isVerified: true,
    joinedDate: '2025-05-10',
  },
  {
    id: 'user-maged-3',
    email: 'managing.editor@gbmn.edu',
    firstName: 'Prof. Helen',
    lastName: 'Khachidze',
    role: 'Managing Editor',
    institution: 'Ivane Javakhishvili Tbilisi State University',
    isVerified: true,
    joinedDate: '2025-01-01',
  },
  {
    id: 'user-rev-4',
    email: 'reviewer@gbmn.edu',
    firstName: 'Prof. Robert',
    lastName: 'Sterner',
    role: 'Reviewer',
    institution: 'Harvard Medical School / Division of Biochemistry',
    isVerified: true,
    joinedDate: '2025-11-20',
  },
  {
    id: 'user-admin-5',
    email: 'admin@gbmn.org',
    firstName: 'Giorgi',
    lastName: 'Adminadze',
    role: 'Administrator',
    institution: 'TSMU & GBMN IT Board',
    isVerified: true,
    joinedDate: '2024-12-01',
  }
];

// Rich, high-fidelity sample manuscript prefilled for Georgia Biomedical News
export const SAMPLE_MANUSCRIPT: Manuscript = {
  id: 'GBMN-2026-0142',
  status: 'Under Review',
  authorId: 'user-auth-1',
  createdAt: '2026-04-12T10:30:00Z',
  updatedAt: '2026-05-18T14:22:00Z',
  title: 'Biochemical Assessment of Mitochondrial Complex II Activity and Pro-Inflammatory Cytokines in Diabetic Cardiomyopathy Patients across Eastern Georgia',
  runningTitle: 'Mitochondrial Deficits in Georgian Diabetic Myopathy',
  specialty: 'Clinical Biochemistry & Cardiology',
  articleType: 'original-research',
  publicationInfo: {
    doi: '10.52340/GBMN.2026.01.01.167',
    volumeIssue: 'VOLUME 4 ISSUE 2. APR-JUN 2026'
  },
  checklistAgreed: true,
  checklistAgreedAt: '2026-04-12T10:15:00Z',
  authors: [
    {
      id: 'a1',
      firstName: 'Ioseb',
      lastName: 'Kavtaradze',
      email: 'i.kavtaradze@tsmu.edu',
      phone: '+995 599 123456',
      orcidId: '0000-0002-1823-4412',
      specialty: 'Clinical Biochemistry',
      country: 'Georgia',
      city: 'Tbilisi',
      institution: 'Tbilisi State Medical University',
      department: 'Department of Medical Biochemistry',
      affiliation: 'Tbilisi State Medical University, Tbilisi, Georgia',
      affiliations: ['Tbilisi State Medical University, Tbilisi, Georgia'],
      academicTitle: 'Associate Professor, MD, PhD',
      contributionRole: 'Study Conception, Laboratory Diagnostics, Manuscript Compilation',
      contributionTags: ['Substantial contributions to concept or design', 'Drafting of the manuscript', 'Agreed to be accountable for all aspects of the work', 'Will review the final version to be published'],
      isCorresponding: true
    },
    {
      id: 'a2',
      firstName: 'Lali',
      lastName: 'Gegeshidze',
      email: 'l.gegeshidze@caridology.ge',
      phone: '+995 591 987654',
      orcidId: '0000-0003-4951-8812',
      specialty: 'Cardiology',
      country: 'Georgia',
      city: 'Kutaisi',
      institution: 'Cardiology Center of Western Georgia',
      department: 'Ischemic Heart Disease Ward',
      affiliation: 'Kutaisi Cardiology Center, Kutaisi, Georgia',
      affiliations: ['Kutaisi Cardiology Center, Kutaisi, Georgia'],
      academicTitle: 'Consultant Cardiologist, MD',
      contributionRole: 'Clinical Diagnosis, Sample Collection, Patient Enrolment',
      contributionTags: ['Acquisition, analysis, or interpretation of data', 'Critical review of the manuscript for important intellectual content', 'Agreed to be accountable for all aspects of the work', 'Will review the final version to be published'],
      isCorresponding: false
    },
    {
      id: 'a3',
      firstName: 'Tamaz',
      lastName: 'Abashidze',
      email: 't.abashidze@bme.tsu.ge',
      phone: '+995 555 456789',
      orcidId: '0000-0001-9253-114X',
      specialty: 'Biomedical Science',
      country: 'Georgia',
      city: 'Tbilisi',
      institution: 'Ivane Javakhishvili Tbilisi State University',
      department: 'Institute of Translational Medicine',
      affiliation: 'TSU Institute of Translational Medicine, Tbilisi, Georgia',
      affiliations: ['TSU Institute of Translational Medicine, Tbilisi, Georgia'],
      academicTitle: 'Professor, PhD',
      contributionRole: 'Statistical Analysis, Biomarker Profiling, Funding Acquisition',
      contributionTags: ['Acquisition, analysis, or interpretation of data', 'Drafting of the manuscript', 'Supervised the work', 'Agreed to be accountable for all aspects of the work', 'Will review the final version to be published'],
      isCorresponding: false
    }
  ],
  abstractContents: {
    'Background': 'Diabetic cardiomyopathy is associated with unexplained metabolic dysfunction and heart failure. Mitochondrial oxidative impairment, specifically involving enzymatic complexes, has been postulated to drive pathological remodeling. Here, we evaluate the systemic and regional biomedical profile of Mitochondrial Respiratory Complex II (Succinate Dehydrogenase) in patients diagnosed with diabetic cardiomyopathy in Eastern Georgian urban cohorts, correlating enzymatic deficiencies with elevated pro-inflammatory biomarkers.',
    'Materials and Methods': 'A single-center clinical study was performed at Tbilisi State Medical University Clinics. Sixty (60) clinical subjects were recruited, comprising 30 Type-2 Diabetic Cardiomyopathy patients and 30 matched diabetic controls without cardiomyopathy. Peripheral blood mononuclear cells (PBMC) were parsed to isolate active mitochondria. Succinate dehydrogenase (Complex II) activity was assayed spectrophotometrically. Systemic cytokine levels (IL-6, TNF-alpha, and hs-CRP) were measured via high-sensitivity sandwich ELISA.',
    'Results': 'A significant 42.5% reduction in Mitochondrial Complex II activity was observed in the diabetic cardiomyopathy cohort compared to the diabetic control group (p < 0.001). This enzymatic deficit demonstrated a severe negative correlation with systemic IL-6 levels (r = -0.68, p < 0.01) and TNF-alpha (r = -0.61, p < 0.01). Multiple regression modeling indicated that peripheral Complex II enzymatic activity can serve as an independent surrogate biomarker of adverse left ventricular diastolic dysfunction (E/e\' ratio) in Georgian populations.',
    'Conclusions': 'This biomedical investigation provides the first direct evidence linking peripheral blood Mitochondrial Complex II insufficiency with active systemic neuro-humoral inflammation in Georgian diabetic cardiomyopathy patients. Elevated IL-6 and impaired Succinate Dehydrogenase activities present potential translational targets for metabolic stabilization.'
  },
  sections: {
    'Introduction': 'Diabetic cardiomyopathy is defined as the presence of myocardial dysfunction in individuals with diabetes mellitus in the definitive absence of coronary artery disease, valvular abnormalities, or congenital cardiovascular pathology. Extensive research points to cellular energetics as a critical driver of early diastolic impairment, yet cellular biomarker correlations in East-European and Caucasus populations remain sparse. The Georgian population shows specific nutritional and life-style profiles that may influence metabolic remodeling. Thus, determining the precise biochemical nexus of mitochondrial respiration indices with systemic inflammation cytokine concentrations represents an essential medical challenge.',
    'Materials and Methods': 'Patient samples were procured with strict adherence to the Helsinki Declaration. Written informed consent was received from all clinical subjects. Mitochondrial isolation from PBMC was carried out within two hours of blood collection. Enzymatic Succinate Dehydrogenase performance was assayed by recording the reduction of 2,6-dichlorophenolindophenol (DCPIP) at 600 nm. Statistics were computed in SPSS version 26 using robust Student\'s t-tests and Pearson regression matrices.',
    'Results': 'Quantification revealed that diabetic cardiomyopathy subjects suffered a highly significant reduction in Mitochondrial Complex II activity (1.24 ± 0.18 nmol/min/mg protein) compared to diabetic controls (2.16 ± 0.31 nmol/min/mg protein; p < 0.001). Correspondingly, average serum IL-6 concentrations were robustly elevated in cardiomyopathy patients (5.86 ± 1.12 pg/mL vs. 2.11 ± 0.45 pg/mL, p < 0.001), indicating a highly active inflammatory systemic micro-milieu.',
    'Discussion': 'Our study confirms that the compromised bioenergetic activity of Mitochondrial Complex II in blood mononuclear cells mimics the metabolic strain observed in myocardial tissues of diabetic subjects. The strong inverse correlation between cytokine storm parameters (IL-6/TNF-alpha) and Succinate Dehydrogenase activity underlines the complex biological feedback loop where chronic sterile inflammation exacerbates mitochondrial oxidative stress, culminating in progressive heart failure.',
    'Conclusions': 'We conclude that peripheral Mitochondrial Complex II activity is severely compromised in Georgian patients with diabetic cardiomyopathy. This bioenergetic impairment aligns tightly with systemic cytokine elevation, indicating that mitochondrial integrity and inflammatory signals are biochemically intertwined. Further studies should seek to determine whether targeted antioxidants improve clinical outcomes in these populations.',
    'Acknowledgments': 'We warmly thank the clinical laboratory technicians at Tbilisi State Medical University (TSMU) Clinics for their invaluable technical assistance with ELISA determinations.'
  },
  figuresAndTables: [
    {
      id: 'f1',
      type: 'figure',
      title: 'Figure 1: Complex II Mitochondrial Activity Decimation',
      caption: 'Spectrophotometric activity assays of Succinate Dehydrogenase demonstrating a substantial biochemical decline in peripheral blood mononuclear cells of the cardiomyopathy group compared to control groups.',
      fileName: 'mitochondrial_complex2_decline.png'
    },
    {
      id: 't1',
      type: 'table',
      title: 'Table 1: Baseline Biomedical Characteristics of the Patient Cohort',
      caption: 'Detailed comparison of demographic, metabolic, and clinical indices across cardiomyopathy and control subjects, incorporating Georgian cardiac regional standards.',
      tableData: [
        ['Biochemical Marker', 'Diabetic Cardiomyopathy (n=30)', 'Diabetic Controls (n=30)', 'p-Value'],
        ['Age (years)', '58.4 ± 6.2', '57.9 ± 5.8', '0.732'],
        ['HbA1c (%)', '8.2 ± 1.1', '7.7 ± 0.9', '0.043'],
        ['Mitochondrial Complex II (nmol/min/mg)', '1.24 ± 0.18', '2.16 ± 0.31', '< 0.001'],
        ['Serum IL-6 (pg/mL)', '5.86 ± 1.12', '2.11 ± 0.45', '< 0.001'],
        ['hs-CRP (mg/L)', '4.12 ± 0.95', '1.67 ± 0.32', '< 0.001']
      ]
    }
  ],
  references: [
    {
      id: 'r1',
      type: 'journal',
      authors: 'Anichkov MN, Lobjanidze TI',
      title: 'Bioenergetic profiling in clinical cardiology and regional metabolic cohorts of the Caucasus',
      journalOrBook: 'Georgian Medical News',
      year: '2023',
      volume: '334',
      issue: '1',
      pages: '22-29',
      doi: '10.5126/gmn.2023.334.22'
    },
    {
      id: 'r2',
      type: 'journal',
      authors: 'Murphy MP, O\'Neill LA',
      title: 'Krebs cycle metabolites as intracellular signaling molecules in immunity and cardiovascular pathology',
      journalOrBook: 'Nature',
      year: '2018',
      volume: '556',
      issue: '7701',
      pages: '331-340',
      doi: '10.1038/nature25930'
    },
    {
      id: 'r3',
      type: 'journal',
      authors: 'Tsintsadze MK, Shengelia NL, Kipiani DA',
      title: 'Statistical analysis of diabetic complications and metabolic syndromes in Tbilisi metropolitan hospitals',
      journalOrBook: 'Georgian Biomedical and Medical Nexus',
      year: '2025',
      volume: '2',
      issue: '4',
      pages: '411-419',
      doi: '10.5426/gbmn.2025.2.411'
    }
  ],
  supplementaryFiles: [
    {
      id: 's1',
      fileName: 'elisa_raw_spectrophotometry_data.xlsx',
      description: 'Raw microplate optical density values for cytokine quantification.',
      fileSize: '185 KB',
      uploadedAt: '2026-04-12T10:20:00Z'
    }
  ],
  ethics: {
    humanSubjectsApproved: 'yes',
    irbApprovalNumber: 'IRB-TSMU-2026-88',
    irbInstitution: 'Tbilisi State Medical University Biomedical Ethics Committee',
    animalSubjectsUsed: 'no',
    animalEthicsStatement: '',
    informedConsentObtained: 'yes',
    ethicsStatementFileName: 'signed_ethics_approval_tsmu_88.pdf'
  },
  conflictDisclosure: {
    hasConflict: false,
    conflictDetails: 'The authors declare that the research was conducted in the absence of any commercial or financial relationships that could be construed as a potential conflict of interest.',
    hasReceivedFunding: true,
    fundingSource: 'Shota Rustaveli National Science Foundation of Georgia (Grant FR-24-9128)',
    hasIndustryRelation: false,
    industryRelationDetails: '',
    signedCoiFormName: 'signed_authorship_coi_disclosure_package.pdf'
  },
  fundingDetails: {
    fundingAgency: 'Shota Rustaveli National Science Foundation of Georgia',
    grantNumber: 'FR-24-9128',
    explanation: 'Sustenance and biochemical reagents funding was funded exclusively by Rustaveli Scientific Grant FR-24-9128.'
  },
  payment: {
    invoiceNumber: '',
    referenceId: '',
    paymentNote: '',
    fileName: '',
    status: 'pending',
    uploadedAt: ''
  },
  editorFiles: [],
  reviewerAssignments: [
    {
      reviewerId: 'user-rev-4',
      reviewerName: 'Prof. Robert Sterner',
      status: 'completed',
      assignedAt: '2026-04-14T09:00:00Z',
      comments: {
        id: 'cm1',
        reviewerId: 'user-rev-4',
        reviewerName: 'Prof. Robert Sterner',
        ethicalConcerns: 'None identified. Human subjects approval is properly sourced from Tbilisi State Medical University Committee.',
        methodologyScore: 4,
        originalityScore: 5,
        scientificMeritScore: 5,
        constructiveComments: 'This study describes an exceptionally novel approach regarding local Georgian diabetes cardiogenetics and biomarker tracking. The methodology is scientifically rigorous, using spectrophotometry for PBMC mitochondrial integrity. I suggest clarifying the specific centrifugation parameters for the separation. The correlations with IL-6 are robustly demonstrated, backed by proper statistics. I recommend acceptance with minor revisions to address the laboratory spin rates.',
        confidentialToEditor: 'This is a beautifully drafted paper. Outstanding relevance to region-specific clinical biochemistry in the Caucasus. I urge acceptance after simple review.',
        recommendation: 'minor-revision',
        submittedAt: '2026-05-10T11:45:00Z'
      }
    }
  ],
  editorDecisionLog: [
    {
      editorId: 'user-editor-2',
      decision: 'minor-revision',
      comments: 'Please revise the isolation parameters as requested by Reviewer 1 (centrifugation speeds). Re-upload your draft when finished.',
      timestamp: '2026-05-12T08:00:00Z'
    }
  ]
};

function mirrorToFirestore(collectionName: string, id: string, data: unknown) {
  if (!firebaseEnabled || !firestore) return;
  void setDoc(doc(firestore, collectionName, id), {
    payload: data,
    updatedAt: new Date().toISOString(),
  }).catch((error) => {
    console.warn(`Firebase mirror failed for ${collectionName}/${id}`, error);
  });
}

function mirrorArrayToFirestore<T extends { id: string }>(collectionName: string, rows: T[]) {
  rows.forEach(row => mirrorToFirestore(collectionName, row.id, row));
  mirrorToFirestore('snapshots', collectionName, rows);
}

// Local-first database layer with Firebase Firestore mirroring.
export const DB = {
  getUsers(): User[] {
    const data = localStorage.getItem('gbmn_users');
    if (!data) {
      localStorage.setItem('gbmn_users', JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(data);
  },

  setUsers(users: User[]) {
    localStorage.setItem('gbmn_users', JSON.stringify(users));
    mirrorArrayToFirestore('users', users);
  },

  getManuscripts(): Manuscript[] {
    const data = localStorage.getItem('gbmn_manuscripts');
    if (!data) {
      // Default to initial sample manuscript
      localStorage.setItem('gbmn_manuscripts', JSON.stringify([SAMPLE_MANUSCRIPT]));
      return [SAMPLE_MANUSCRIPT];
    }
    return JSON.parse(data);
  },

  setManuscripts(manuscripts: Manuscript[]) {
    localStorage.setItem('gbmn_manuscripts', JSON.stringify(manuscripts));
    mirrorArrayToFirestore('manuscripts', manuscripts);
  },

  getCurrentUser(): User | null {
    const data = localStorage.getItem('gbmn_current_user');
    if (!data) {
      return null;
    }
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem('gbmn_current_user', JSON.stringify(user));
      mirrorToFirestore('sessions', user.id, user);
    } else {
      localStorage.removeItem('gbmn_current_user');
    }
  },

  getAuditLogs(): SystemAuditLog[] {
    const data = localStorage.getItem('gbmn_audit_logs');
    if (!data) {
      const initialLogs: SystemAuditLog[] = [
        {
          id: 'log-1',
          timestamp: '2026-04-12T10:14:00Z',
          userId: 'user-auth-1',
          userEmail: 'author@gbmn.edu',
          action: 'MANUSCRIPT_DRAFT_CREATED',
          targetId: 'GBMN-2026-0142',
          details: 'Author created an original article draft and started submission metadata review.'
        },
        {
          id: 'log-2',
          timestamp: '2026-04-12T10:30:00Z',
          userId: 'user-auth-1',
          userEmail: 'author@gbmn.edu',
          action: 'MANUSCRIPT_SUBMITTED',
          targetId: 'GBMN-2026-0142',
          details: 'Manuscript package fully assembled, evaluated, and sent to reviewer queue successfully.'
        },
        {
          id: 'log-3',
          timestamp: '2026-04-14T09:00:00Z',
          userId: 'user-editor-2',
          userEmail: 'editor@gbmn.edu',
          action: 'REVIEWER_ASSIGNED',
          targetId: 'GBMN-2026-0142',
          details: 'Assigned manuscript ID to Reviewer Prof. Robert Sterner.'
        },
        {
          id: 'log-4',
          timestamp: '2026-05-10T11:45:00Z',
          userId: 'user-rev-4',
          userEmail: 'reviewer@gbmn.edu',
          action: 'REVIEW_COMPLETED',
          targetId: 'GBMN-2026-0142',
          details: 'Submitted review matrix, scoring original research a 5/5 in scientific merit.'
        }
      ];
      localStorage.setItem('gbmn_audit_logs', JSON.stringify(initialLogs));
      return initialLogs;
    }
    return JSON.parse(data);
  },

  addAuditLog(log: Omit<SystemAuditLog, 'id' | 'timestamp'>) {
    const logs = this.getAuditLogs();
    const newLog: SystemAuditLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog); // Put new actions on top
    localStorage.setItem('gbmn_audit_logs', JSON.stringify(logs));
    mirrorToFirestore('auditLogs', newLog.id, newLog);
    mirrorToFirestore('snapshots', 'auditLogs', logs);
  },

  getJournalSettings(): JournalSettings {
    const data = localStorage.getItem('gbmn_settings');
    if (!data) {
      const defaults: JournalSettings = {
        journalNameFull: 'Georgian Biomedical and Medical Nexus (GBMN)',
        journalNameShort: 'Georgian Biomedical News',
        contactEmail: 'nexus@gbmn.org',
        submissionFeeUSD: 250,
        openAccessPolicy: 'Creative Commons Attribution (CC BY 4.0) International License. Authors retain copyright and grant the journal right of first publication.',
        editorGuidelines: 'Maintain peer review timelines under 14 days, utilize dual-blind referee assessment.'
      };
      localStorage.setItem('gbmn_settings', JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(data);
  },

  setJournalSettings(settings: JournalSettings) {
    localStorage.setItem('gbmn_settings', JSON.stringify(settings));
    mirrorToFirestore('settings', 'journal', settings);
  }
};
