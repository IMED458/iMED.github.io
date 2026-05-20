/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Manuscript, AuthorDetails, ReferenceItem, FigureTableItem, SupplementaryFile } from '../types';
import { ARTICLE_TYPES, formatAMAReference, SAMPLE_MANUSCRIPT } from '../utils';
import ManuscriptPreview from './ManuscriptPreview';
import RichTextEditor from './RichTextEditor';
import { 
  Users, 
  FileText, 
  ShieldAlert, 
  CheckSquare, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  FileCheck2, 
  Info, 
  HelpCircle, 
  DollarSign, 
  Layers, 
  BookOpen, 
  FileCode, 
  CheckCircle2
} from 'lucide-react';

interface SubmissionWorkflowProps {
  manuscript: Manuscript;
  onUpdateManuscript: (updated: Manuscript) => void;
  activeStep: string;
  onStepChange: (stepId: string) => void;
  onShowNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export default function SubmissionWorkflow({
  manuscript,
  onUpdateManuscript,
  activeStep,
  onStepChange,
  onShowNotification
}: SubmissionWorkflowProps) {

  // Auto-Save interval simulation
  useEffect(() => {
    const saver = setInterval(() => {
      // Just visually alert about background sync to make it feel premium
      console.log('Autosaving draft state locally...');
    }, 45000);
    return () => clearInterval(saver);
  }, [manuscript]);

  const updateField = (field: keyof Manuscript, value: any) => {
    onUpdateManuscript({
      ...manuscript,
      [field]: value,
      updatedAt: new Date().toISOString()
    });
  };

  const loadSampleSubmissionModel = () => {
    onUpdateManuscript({
      ...SAMPLE_MANUSCRIPT,
      id: `GBMN-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    onShowNotification('Prefilled Georgian Diabetic Cardiomyopathy submission templates loaded!', 'success');
  };

  // 1. Title / metadata Form states
  const runningTitleLimit = 50;

  // 2. Author item builder states
  const [authorFirst, setAuthorFirst] = useState('');
  const [authorMiddle, setAuthorMiddle] = useState('');
  const [authorLast, setAuthorLast] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorPhone, setAuthorPhone] = useState('');
  const [authorOrcid, setAuthorOrcid] = useState('');
  const [authorSpec, setAuthorSpec] = useState('Biochemistry');
  const [authorCountry, setAuthorCountry] = useState('Georgia');
  const [authorCity, setAuthorCity] = useState('Tbilisi');
  const [authorInst, setAuthorInst] = useState('');
  const [authorDept, setAuthorDept] = useState('');
  const [authorAffil, setAuthorAffil] = useState('');
  const [authorTitle, setAuthorTitle] = useState('MD, PhD');
  const [authorContrib, setAuthorContrib] = useState('Draft Writing & Methodology');
  const [authorIsCorr, setAuthorIsCorr] = useState(false);

  // 3. Figures/Table temporary state
  const [mediaType, setMediaType] = useState<'figure' | 'table' | 'diagram'>('figure');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [mediaFileUrl, setMediaFileUrl] = useState('');
  const [mediaPasteContent, setMediaPasteContent] = useState('');
  
  // Custom Table cells creator state
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tempTableData, setTempTableData] = useState<string[][]>([
    ['Parameter', 'Group A', 'Group B'],
    ['P-value', '0.01', '0.04'],
    ['SD', '±0.5', '±1.2'],
  ]);

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    const updated = [...tempTableData];
    if (!updated[rIdx]) {
      updated[rIdx] = [];
    }
    updated[rIdx][cIdx] = val;
    setTempTableData(updated);
  };

  const escapeHtml = (text: string) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const tableFromDelimitedText = (text: string) => {
    const rows = text.trim().split(/\r?\n/).filter(Boolean).map(row => row.split(/\t|,/).map(cell => cell.trim()));
    if (rows.length === 0) return '';
    return `<table class="gbmn-inline-table"><tbody>${rows.map((row, rIdx) => (
      `<tr>${row.map(cell => rIdx === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )).join('')}</tbody></table>`;
  };

  const handleMediaFileSelected = (file: File) => {
    setMediaFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setMediaFileUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  // 4. Citation Form States
  const [citationType, setCitationType] = useState<'journal' | 'book' | 'web'>('journal');
  const [citeAuthors, setCiteAuthors] = useState('');
  const [citeTitle, setCiteTitle] = useState('');
  const [citeBookOrJournal, setCiteBookOrJournal] = useState('');
  const [citeYear, setCiteYear] = useState('');
  const [citeVolume, setCiteVolume] = useState('');
  const [citeIssue, setCiteIssue] = useState('');
  const [citePages, setCitePages] = useState('');
  const [citeDoi, setCiteDoi] = useState('');
  const [citeUrl, setCiteUrl] = useState('');

  // 5. Supplementary files state
  const [suppName, setSuppName] = useState('');
  const [suppDesc, setSuppDesc] = useState('');

  // 6. Cover letter
  const [coverLetter, setCoverLetter] = useState('');

  const handleAddAuthor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorFirst || !authorLast || !authorOrcid || !authorInst) {
      onShowNotification('First name, Last Name, Affiliation, and Mandated ORCID iD are required.', 'error');
      return;
    }

    const newAuthor: AuthorDetails = {
      id: `auth-${Date.now()}`,
      firstName: authorFirst,
      middleInitial: authorMiddle || undefined,
      lastName: authorLast,
      email: authorEmail,
      phone: authorPhone,
      orcidId: authorOrcid,
      specialty: authorSpec,
      country: authorCountry,
      city: authorCity,
      institution: authorInst,
      department: authorDept,
      affiliation: authorAffil || `${authorDept}, ${authorInst}, ${authorCity}, ${authorCountry}`,
      academicTitle: authorTitle,
      contributionRole: authorContrib,
      isCorresponding: authorIsCorr
    };

    let updatedAuthors = [...manuscript.authors];
    if (authorIsCorr) {
      // Toggle all other corresponding off
      updatedAuthors = updatedAuthors.map(a => ({ ...a, isCorresponding: false }));
    }

    updatedAuthors.push(newAuthor);
    updateField('authors', updatedAuthors);
    onShowNotification(`Author ${authorFirst} ${authorLast} successfully added!`, 'success');

    // Reset author inputs
    setAuthorFirst('');
    setAuthorMiddle('');
    setAuthorLast('');
    setAuthorEmail('');
    setAuthorPhone('');
    setAuthorOrcid('');
    setAuthorInst('');
    setAuthorDept('');
    setAuthorAffil('');
    setAuthorIsCorr(false);
  };

  const handleRemoveAuthor = (authId: string) => {
    const filtered = manuscript.authors.filter(a => a.id !== authId);
    updateField('authors', filtered);
    onShowNotification('Author removed from draft lists.', 'info');
  };

  const moveAuthor = (idx: number, direction: 'up' | 'down') => {
    const list = [...manuscript.authors];
    if (direction === 'up' && idx > 0) {
      const tmp = list[idx];
      list[idx] = list[idx - 1];
      list[idx - 1] = tmp;
    } else if (direction === 'down' && idx < list.length - 1) {
      const tmp = list[idx];
      list[idx] = list[idx + 1];
      list[idx + 1] = tmp;
    }
    updateField('authors', list);
  };

  const handleAddMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle) {
      onShowNotification('Item identifier title required.', 'error');
      return;
    }

    const pastedHtml = mediaPasteContent.trim().includes('<table') || mediaPasteContent.trim().includes('<svg') || mediaPasteContent.trim().includes('<img')
      ? mediaPasteContent.trim()
      : mediaType === 'table' && mediaPasteContent.trim()
        ? tableFromDelimitedText(mediaPasteContent)
        : mediaType === 'diagram' && mediaPasteContent.trim()
          ? `<pre>${escapeHtml(mediaPasteContent)}</pre>`
          : undefined;

    const newItem: FigureTableItem = {
      id: `media-${Date.now()}`,
      type: mediaType,
      title: mediaTitle,
      caption: mediaCaption,
      fileName: mediaType === 'figure' ? (mediaFileName || 'clinical_plate_chart.png') : undefined,
      fileUrl: mediaType === 'figure' ? mediaFileUrl : undefined,
      tableData: mediaType === 'table' && !pastedHtml ? tempTableData : undefined,
      htmlContent: pastedHtml
    };

    updateField('figuresAndTables', [...manuscript.figuresAndTables, newItem]);
    onShowNotification(`${mediaType === 'figure' ? 'Figure' : 'Dynamic Table'} registered to paper content!`, 'success');

    // Reset fields
    setMediaTitle('');
    setMediaCaption('');
    setMediaFileName('');
    setMediaFileUrl('');
    setMediaPasteContent('');
  };

  const handleAddCitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citeAuthors || !citeTitle || !citeBookOrJournal || !citeYear) {
      onShowNotification('Please specify standard Authors, Title, Source, and Year.', 'error');
      return;
    }

    const newRef: ReferenceItem = {
      id: `ref-${Date.now()}`,
      type: citationType,
      authors: citeAuthors,
      title: citeTitle,
      journalOrBook: citeBookOrJournal,
      year: citeYear,
      volume: citeVolume || undefined,
      issue: citeIssue || undefined,
      pages: citePages || undefined,
      doi: citeDoi || undefined,
      url: citeUrl || undefined
    };

    updateField('references', [...manuscript.references, newRef]);
    onShowNotification('AMA Reference indexed successfully!', 'success');

    // Reset fields
    setCiteAuthors('');
    setCiteTitle('');
    setCiteBookOrJournal('');
    setCiteYear('');
    setCiteVolume('');
    setCiteIssue('');
    setCitePages('');
    setCiteDoi('');
    setCiteUrl('');
  };

  const handleAddSupplementary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName) return;

    const newSupp: SupplementaryFile = {
      id: `supp-${Date.now()}`,
      fileName: suppName,
      description: suppDesc,
      fileSize: '1.2 MB',
      uploadedAt: new Date().toISOString()
    };

    updateField('supplementaryFiles', [...manuscript.supplementaryFiles, newSupp]);
    onShowNotification('Dataset supplementary file registered.', 'success');
    setSuppName('');
    setSuppDesc('');
  };

  const articleConfig = ARTICLE_TYPES[manuscript.articleType];

  return (
    <div id="author-submission-panel" className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
      
      {/* Dynamic step headers */}
      <div className="border-b border-slate-100 pb-4 flex flex-wrap justify-between items-center gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider font-display">
            Step Profile - {activeStep.replace('-', ' ')}
          </span>
          <h2 className="text-xl font-display font-bold text-slate-800">
            {activeStep === 'getting-started' && '1. Complete Manuscript Generation Core'}
            {activeStep === 'policies' && '2. GBMN Ethics & Open Access Declarations'}
            {activeStep === 'checklist' && '3. Mandatory Peer Submitting Checklist'}
            {activeStep === 'title-meta' && '4. Title and Clinical Specialty Scope'}
            {activeStep === 'authors' && '5. Cureus-Style Author Roster Management'}
            {activeStep === 'article-type' && '6. Article Type Quota Configuration'}
            {activeStep === 'abstract' && '7. Structured abstract compilation'}
            {activeStep === 'keywords' && '8. Indexed indexing Keywords'}
            {activeStep === 'sections' && '9. Structured Manuscript Body Segments'}
            {activeStep === 'figures' && '10. Interactive Scientific Figures & Tables'}
            {activeStep === 'references' && '11. AMA Bibliography Reference Library'}
            {activeStep === 'supplementary' && '12. Optional Appendix Datasets & Protocols'}
            {activeStep === 'ethics' && '13. Institutional Review Board (IRB) Clearance'}
            {activeStep === 'conflicts' && '14. Disclosure of Financial Conflicts (COI)'}
            {activeStep === 'funding' && '15. Rustaveli & Global Research Grants'}
            {activeStep === 'payment' && '16. Author APC processing wire receipt'}
            {activeStep === 'editor-files' && '17. Cover Letter & Referee Guidelines'}
            {activeStep === 'preview' && '18. Pre-Publication Live Watermarked proof'}
            {activeStep === 'summary-submit' && '19. Final Integrity Evaluation & Submitting'}
          </h2>
        </div>

        {activeStep === 'getting-started' && (
          <button
            id="quick-demo-seed-btn"
            onClick={loadSampleSubmissionModel}
            className="flex items-center gap-1.5 bg-indigo-900 hover:bg-indigo-950 text-indigo-200 border border-indigo-700 text-xs font-bold py-2 px-4 rounded-lg shadow-sm cursor-pointer transition-all"
          >
            <Layers className="h-4, w-4" /> Load Sample Medical Paper
          </button>
        )}
      </div>

      {/* CORE DISPLAY WORKPLAY BY ID */}
      <div id="workflow-step-contents" className="space-y-6">

        {/* 1. GETTING STARTED */}
        {activeStep === 'getting-started' && (
          <div className="space-y-4 animate-fade-in text-slate-705 text-sm">
            <div className="bg-teal-50 border-l-4 border-teal-700 p-4 rounded-r-lg">
              <h4 className="font-bold text-teal-900 text-sm flex items-center gap-2">
                <Info className="h-5 w-5" /> Online Academic Journal submission & peer system
              </h4>
              <p className="text-xs text-teal-800 mt-1">
                You are submitting to the official publication of <strong className="font-sans">Georgian Biomedical and Medical Nexus (GBMN)</strong>, representing elite biomedical research indices.
              </p>
            </div>

            <p className="leading-relaxed">
              We leverage an advanced **Structured Entry Engine** inspired by top biomedical journals. Instead of submitting clumsy formatted Word documents containing styles errors, you enter your findings into structured databases. 
            </p>
            <p>
              The system then processes, validates, indexes, and compiles your paper into a beautiful pre-publication layout automatically, reducing editorial errors by up to **85%**.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
              <h5 className="font-bold text-slate-800 text-xs">Aesthetic Journal Guidelines Overview</h5>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>References must use standard <strong className="font-mono text-[10px]">AMA (American Medical Association)</strong> style.</li>
                <li>MANDATED: Every author entered must have a linked, verified <strong className="text-lime-700 font-mono">ORCID iD</strong>.</li>
                <li>All submissions are backed by the **Creative Commons Attribution (CC BY 4.0)** license.</li>
              </ul>
            </div>
          </div>
        )}

        {/* 2. JOURNAL POLICIES */}
        {activeStep === 'policies' && (
          <div className="space-y-4 text-xs animate-fade-in text-slate-700">
            <div className="border p-4 rounded-xl space-y-3 bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm">CC-BY Open Access License</h4>
              <p className="leading-relaxed">
                Georgian Biomedical and Medical Nexus complies with global open-access initiatives. Authors retain copyright and grant the journal first publication privileges. The CC BY 4.0 license permits free dissemination, reading, indexing, and downloading provided authentic citations are preserved.
              </p>
            </div>

            <div className="border p-4 rounded-xl space-y-3 bg-slate-50">
              <h4 className="font-bold text-slate-800 text-sm font-sans">Authorship Qualifications (ICMJE Rules)</h4>
              <p className="leading-relaxed">
                All listed authors must meet the four requirements set by the International Committee of Medical Journal Editors:
                (1) Substantial contributions to conception, design, or acquisition of studies;
                (2) Drafting or revising the intellectual content;
                (3) Final approval of the published copy;
                (4) Agree to be accountable for all aspects of work.
              </p>
            </div>

            <div className="flex items-start gap-2.5 pt-2">
              <input
                id="policy-ack-cbox"
                type="checkbox"
                defaultChecked
                className="h-4.5 w-4.5 text-teal-600 border-slate-350 rounded-sm mt-0.5"
              />
              <label htmlFor="policy-ack-cbox" className="text-slate-600 font-medium">
                I hereby certify that all co-authors agree to the open-access CC-BY policies and ICMJE authorship rules.
              </label>
            </div>
          </div>
        )}

        {/* 3. MANUSCRIPT CHECKLIST */}
        {activeStep === 'checklist' && (
          <div className="space-y-4 text-xs animate-fade-in">
            <p className="text-slate-600">Please confirm each of primary submission criteria checkboxes before completing the structured fields:</p>
            
            <div className="space-y-2.5 bg-slate-50 p-4 border rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manuscript.checklistAgreed}
                  onChange={(e) => {
                    updateField('checklistAgreed', e.target.checked);
                    updateField('checklistAgreedAt', new Date().toISOString());
                  }}
                  className="h-5 w-5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 mt-0.5"
                />
                <span className="text-slate-700 font-medium">
                  <strong>Manuscript Integrity Assurance Checklist:</strong> I declare that this scientific paper represents original, authentic scientific laboratory/clinical findings that are not currently under appraisal or draft review by other medical or publisher editorial boards. All corresponding authors endorse the data. We declare full IRB consent.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* 4. TITLE & METADATA */}
        {activeStep === 'title-meta' && (
          <div className="space-y-4 text-xs animate-fade-in">
            <div className="space-y-1">
              <label htmlFor="input-m-title" className="block font-bold text-slate-700">Full Scientific Title *</label>
              <input
                id="input-m-title"
                type="text"
                value={manuscript.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Clinical trial of..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 font-semibold focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label htmlFor="input-m-running-title" className="block font-bold text-slate-700">Running Title (Abbreviated, Max 50 chars) *</label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {manuscript.runningTitle.length} / {runningTitleLimit}
                  </span>
                </div>
                <input
                  id="input-m-running-title"
                  type="text"
                  maxLength={runningTitleLimit}
                  value={manuscript.runningTitle}
                  onChange={(e) => updateField('runningTitle', e.target.value)}
                  placeholder="e.g., Mitochondrial Deficits in Georgian Diabetes"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="select-m-specialty" className="block font-bold text-slate-700">Primary Medical Specialty *</label>
                <input
                  id="select-m-specialty"
                  type="text"
                  value={manuscript.specialty}
                  onChange={(e) => updateField('specialty', e.target.value)}
                  placeholder="e.g., Medical Biochemistry & Cardiology"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. AUTHORS - ROSTER */}
        {activeStep === 'authors' && (
          <div className="space-y-6 text-xs animate-fade-in">
            {/* Added Authors display in priority indexing */}
            <div className="space-y-2 border p-4 bg-slate-50 rounded-xl">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b pb-2">
                <Users className="h-4 w-4 text-teal-700" />
                Indexed Manuscript Authors roster ({manuscript.authors.length})
              </h4>

              {manuscript.authors.length === 0 ? (
                <p className="text-slate-400 italic py-3 text-center">No author affiliations linked. Use creation card below to append.</p>
              ) : (
                <div className="space-y-2">
                  {manuscript.authors.map((auth, idx) => (
                    <div key={auth.id} className="bg-white p-3 border border-slate-200 rounded-lg flex flex-wrap justify-between items-center gap-2">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">
                          {idx + 1}. {auth.firstName} {auth.lastName} 
                          {auth.isCorresponding && <span className="ml-1 px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[9px] rounded font-bold">Corresponding</span>}
                        </p>
                        <p className="text-slate-500 font-medium text-[10px]">{auth.affiliation}</p>
                        <p className="text-lime-700 font-mono text-[9px]">Linked ORCID: {auth.orcidId}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => moveAuthor(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 border bg-slate-50 rounded hover:bg-slate-100 disabled:opacity-40"
                          title="Move priority Up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => moveAuthor(idx, 'down')}
                          disabled={idx === manuscript.authors.length - 1}
                          className="p-1 border bg-slate-50 rounded hover:bg-slate-100 disabled:opacity-40"
                          title="Move priority Down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleRemoveAuthor(auth.id)}
                          className="p-1 border border-red-200 bg-red-50 text-red-700 rounded hover:bg-red-100 ml-1.5"
                          title="Exclude Affiliation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Creation Card */}
            <form onSubmit={handleAddAuthor} className="bg-white border p-5 rounded-xl space-y-4">
              <h4 className="font-bold text-slate-850 text-xs uppercase tracking-wider">Add Co-Author credentials</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold mb-1">First Name *</label>
                  <input
                    type="text" required value={authorFirst} onChange={(e) => setAuthorFirst(e.target.value)}
                    placeholder="e.g., Ioseb" className="w-full bg-slate-50 border p-1.5 rounded focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Middle Init.</label>
                  <input
                    type="text" value={authorMiddle} onChange={(e) => setAuthorMiddle(e.target.value)}
                    placeholder="T." className="w-full bg-slate-50 border p-1.5 rounded focus:outline-hidden animate-fade-in"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Last Name *</label>
                  <input
                    type="text" required value={authorLast} onChange={(e) => setAuthorLast(e.target.value)}
                    placeholder="Kavtaradze" className="w-full bg-slate-50 border p-1.5 rounded focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mandatory ORCID iD *</label>
                  <input
                    type="text" required value={authorOrcid} onChange={(e) => setAuthorOrcid(e.target.value)}
                    placeholder="0000-0002-1823-4412" className="w-full bg-slate-100 border p-1.5 rounded font-mono text-teal-800 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Academic Title (e.g., PhD) *</label>
                  <input
                    type="text" value={authorTitle} onChange={(e) => setAuthorTitle(e.target.value)}
                    className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email *</label>
                  <input
                    type="email" value={authorEmail} onChange={(e) => setAuthorEmail(e.target.value)}
                    placeholder="author@tsmu.edu" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone number</label>
                  <input
                    type="text" value={authorPhone} onChange={(e) => setAuthorPhone(e.target.value)}
                    placeholder="+995 599..." className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Institutional Location *</label>
                  <input
                    type="text" required value={authorInst} onChange={(e) => setAuthorInst(e.target.value)}
                    placeholder="Tbilisi State Medical University" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Department</label>
                  <input
                    type="text" value={authorDept} onChange={(e) => setAuthorDept(e.target.value)}
                    placeholder="Department of Medical Biochemistry" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Specific scientific contributions *</label>
                  <input
                    type="text" value={authorContrib} onChange={(e) => setAuthorContrib(e.target.value)}
                    placeholder="e.g., Conception, Biochemical Assays" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  id="author-corres-toggle"
                  type="checkbox"
                  checked={authorIsCorr}
                  onChange={(e) => setAuthorIsCorr(e.target.checked)}
                  className="h-4.5 w-4.5 text-teal-600 rounded"
                />
                <label htmlFor="author-corres-toggle" className="font-bold text-slate-700">Designate as corresponding author</label>
              </div>

              <button
                type="submit"
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2 px-4 rounded-lg shadow-xs cursor-pointer"
              >
                + Link Author Affiliate to Manuscript
              </button>
            </form>
          </div>
        )}

        {/* 6. ARTICLE TYPE */}
        {activeStep === 'article-type' && (
          <div className="space-y-4 text-xs animate-fade-in">
            <p className="text-slate-600">Select the article profile category that corresponds with the scope of your investigation:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(ARTICLE_TYPES).map((type) => {
                const isSelected = manuscript.articleType === type.key;
                return (
                  <div
                    key={type.key}
                    onClick={() => updateField('articleType', type.key)}
                    className={`p-4 border-2 rounded-xl text-left cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-teal-700 bg-teal-50 shadow-md' 
                        : 'border-slate-200 bg-slate-50 hover:border-slate-350 hover:bg-white'
                    }`}
                  >
                    <span className="font-bold text-slate-800 font-sans text-sm">{type.name}</span>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-tight">{type.description}</p>
                    <div className="border-t pt-2.5 mt-3 flex flex-wrap justify-between text-[10px] text-teal-850 font-mono">
                      <span>Max Words: <strong>{type.maxWordCount}</strong></span>
                      <span>Max Refs: <strong>{type.maxReferences}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7. ABSTRACT */}
        {activeStep === 'abstract' && (
          <div className="space-y-4 text-xs animate-fade-in">
            {articleConfig?.abstractType === 'none' ? (
              <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-500 text-sm">
                Abstract is not required for this article type. Proceed to next step.
              </div>
            ) : (
              <RichTextEditor
                label="Abstract *"
                hint="Maximum 250 words. Use the toolbar for bold, italic, and lists."
                value={manuscript.abstractContents['text'] || ''}
                onChange={(val) => {
                  updateField('abstractContents', { text: val });
                }}
                placeholder="Enter your abstract here..."
              />
            )}
          </div>
        )}

        {/* 8. KEYWORDS */}
        {activeStep === 'keywords' && (
          <div className="space-y-3 text-xs animate-fade-in">
            <div className="bg-slate-50 p-4 border rounded-xl space-y-1">
              <label htmlFor="input-m-keywords" className="block font-bold text-slate-805">Academic Indexing Keywords (3 to 6 tags, comma separated) *</label>
              <input
                id="input-m-keywords"
                type="text"
                value={manuscript.sections['Keywords'] || ''}
                onChange={(e) => {
                  const updatedSecs = { ...manuscript.sections, Keywords: e.target.value };
                  updateField('sections', updatedSecs);
                }}
                placeholder="e.g., mitochondrial disease, biochemistry, Georgia, diabetes"
                className="w-full bg-white border border-slate-350 p-2 text-sm rounded-lg focus:outline-hidden"
              />
            </div>
            <p className="text-slate-400 italic text-[11px]">
              Use standardized MeSH (Medical Subject Headings) terms where possible. Number of tags entered:{' '}
              <strong>{(manuscript.sections['Keywords'] || '').split(',').map(k => k.trim()).filter(Boolean).length}</strong>
            </p>
          </div>
        )}

        {/* 9. MANUSCRIPT SECTIONS */}
        {activeStep === 'sections' && (
          <div className="space-y-5 text-xs animate-fade-in">
            <p className="text-slate-500 italic">Dynamically loaded segments based on your article constraints ({articleConfig?.name}):</p>
            {articleConfig?.requiredSections.filter(s => s !== 'Keywords').map((section) => (
              <RichTextEditor
                key={section}
                label={`${section} *`}
                value={manuscript.sections[section] || ''}
                onChange={(val) => {
                  const updatedSecs = { ...manuscript.sections, [section]: val };
                  updateField('sections', updatedSecs);
                }}
                placeholder={`Write the full structured ${section.toLowerCase()} of the study...`}
                showWordCount
              />
            ))}
          </div>
        )}

        {/* 10. FIGURES & TABLES */}
        {activeStep === 'figures' && (
          <div className="space-y-6 text-xs animate-fade-in">
            
            {/* Registered list review */}
            <div className="bg-slate-50 p-4 border rounded-xl space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase">Uploaded materials list ({manuscript.figuresAndTables.length})</h4>
              {manuscript.figuresAndTables.length === 0 ? (
                <p className="text-slate-400 italic">No illustration uploads or charts built yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3">
                  {manuscript.figuresAndTables.map((item, idx) => (
                    <div key={item.id} className="bg-white p-3 border rounded-lg flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-teal-800 uppercase block">[{item.type.toUpperCase()}]: {item.title}</span>
                        <p className="text-slate-550 truncate max-w-xs">{item.caption}</p>
                      </div>
                      <button
                        onClick={() => {
                          const updated = manuscript.figuresAndTables.filter(ft => ft.id !== item.id);
                          updateField('figuresAndTables', updated);
                          onShowNotification('Scientific item removed.', 'info');
                        }}
                        className="text-red-650 hover:underline font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload console or table-builder */}
            <form onSubmit={handleAddMedia} className="bg-white border p-5 rounded-xl space-y-4">
              <h4 className="font-bold text-slate-850 text-sm border-b pb-1.5">Asset Registration console</h4>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="radio" name="media-type-sel" checked={mediaType === 'figure'} onChange={() => setMediaType('figure')}
                  />
                  <span>Figure Asset (Image/TIFF)</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="radio" name="media-type-sel" checked={mediaType === 'table'} onChange={() => setMediaType('table')}
                  />
                  <span>Table / Paste from Excel</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="radio" name="media-type-sel" checked={mediaType === 'diagram'} onChange={() => setMediaType('diagram')}
                  />
                  <span>Diagram Paste</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Illustration/Table numbering Title *</label>
                  <input
                    type="text" required value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="e.g., Figure 1: Cytokine Concentration profiles" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                {mediaType === 'figure' ? (
                  <div>
                    <label className="block font-semibold mb-1">Upload File</label>
                    <input
                      id={`fig-upload-${Date.now()}`}
                      type="file"
                      accept="image/*,.tiff,.tif,.pdf"
                      className="w-full bg-slate-50 border p-1.5 rounded text-slate-700 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMediaFileSelected(file);
                      }}
                    />
                    {mediaFileName && <p className="text-[10px] text-teal-700 mt-1 font-mono">{mediaFileName}</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Rows quota</label>
                      <input
                        type="number" value={tableRows} onChange={(e) => setTableRows(Math.max(2, Number(e.target.value)))}
                        className="w-full bg-slate-50 border p-1 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Columns quota</label>
                      <input
                        type="number" value={tableCols} onChange={(e) => setTableCols(Math.max(2, Number(e.target.value)))}
                        className="w-full bg-slate-50 border p-1 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>

              {mediaType === 'table' && (
                <div className="bg-slate-50 p-3 rounded border space-y-3">
                  <div>
                    <span className="font-bold text-[11px] block text-slate-700">Paste table from Excel, Word, PowerPoint, or HTML:</span>
                    <textarea
                      rows={4}
                      value={mediaPasteContent}
                      onChange={(e) => setMediaPasteContent(e.target.value)}
                      placeholder="Paste copied cells here. If empty, the grid below will be used."
                      className="mt-1 w-full bg-white border border-slate-300 rounded p-2 font-mono text-[11px]"
                    />
                  </div>
                  <span className="font-bold text-[11px] block text-slate-700">Fill Scientific data directly into cells matrix:</span>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left border-collapse border border-slate-300 bg-white">
                      <tbody>
                        {Array.from({ length: tableRows }).map((_, rIdx) => (
                          <tr key={rIdx}>
                            {Array.from({ length: tableCols }).map((_, cIdx) => (
                              <td key={cIdx} className="p-1.5 border border-slate-300">
                                <input
                                  type="text"
                                  value={tempTableData[rIdx]?.[cIdx] || ''}
                                  onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                  className="w-full bg-slate-50 p-0.5 border-none outline-hidden"
                                  placeholder={`Row_${rIdx} Col_${cIdx}`}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {mediaType === 'diagram' && (
                <div className="bg-slate-50 p-3 rounded border space-y-2">
                  <span className="font-bold text-[11px] block text-slate-700">Paste diagram content:</span>
                  <textarea
                    rows={6}
                    value={mediaPasteContent}
                    onChange={(e) => setMediaPasteContent(e.target.value)}
                    placeholder="Paste SVG/HTML exported from PowerPoint, Word, charts, or any diagram text here..."
                    className="w-full bg-white border border-slate-300 rounded p-2 font-mono text-[11px]"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Caption subtitle / descriptive legend *</label>
                <textarea
                  rows={2} required value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="Summarize variables and statistics representativeness in index legends..."
                  className="w-full bg-slate-50 border p-2 rounded"
                />
              </div>

              <button
                type="submit"
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2 px-4 rounded-lg shadow-xs cursor-pointer"
              >
                + Append Illustration asset
              </button>
            </form>
          </div>
        )}

        {/* 11. REFERENCES (AMA) */}
        {activeStep === 'references' && (
          <div className="space-y-6 text-xs animate-fade-in">

            <div className="bg-slate-50 p-4 border rounded-xl space-y-2">
              <h4 className="font-bold text-slate-805 text-xs uppercase">Manuscript Reference Library ({manuscript.references.length})</h4>
              {manuscript.references.length === 0 ? (
                <p className="text-slate-400 italic">No citations cataloged yet.</p>
              ) : (
                <ol className="list-decimal pl-5 space-y-2 max-h-48 overflow-y-auto font-sans">
                  {manuscript.references.map((item) => (
                    <li key={item.id} className="text-[11px] pl-1 font-medium text-slate-700">
                      <span>{formatAMAReference(item)}</span>
                      <button
                        onClick={() => {
                          const updated = manuscript.references.filter(r => r.id !== item.id);
                          updateField('references', updated);
                        }}
                        className="text-rose-750 font-bold ml-2 hover:underline"
                      >
                        [Delete]
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Creator form */}
            <form onSubmit={handleAddCitation} className="bg-white border p-5 rounded-xl space-y-4">
              <h4 className="font-bold text-slate-850 text-xs uppercase tracking-wider">Add Reference</h4>
              
              {/* DOI auto-fill */}
              <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg space-y-2">
                <label className="block font-bold text-teal-900">Quick fill via DOI</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={citeDoi}
                    onChange={(e) => setCiteDoi(e.target.value)}
                    placeholder="e.g., 10.1056/NEJMoa2026816"
                    className="flex-1 bg-white border p-1.5 rounded font-mono text-teal-800"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!citeDoi.trim()) return;
                      onShowNotification('Looking up DOI metadata...', 'info');
                      try {
                        const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(citeDoi.trim())}`);
                        const data = await res.json();
                        const w = data.message;
                        const authList = (w.author || []).map((a: any) => `${a.family || ''} ${(a.given || '').split(' ').map((n: string) => n[0] || '').join('')}`).join(', ');
                        setCiteAuthors(authList);
                        setCiteTitle(w.title?.[0] || '');
                        setCiteBookOrJournal(w['container-title']?.[0] || w.publisher || '');
                        setCiteYear(String(w.published?.['date-parts']?.[0]?.[0] || ''));
                        setCiteVolume(w.volume || '');
                        setCiteIssue(w.issue || '');
                        setCitePages(w.page || '');
                        setCitationType('journal');
                        onShowNotification('DOI metadata loaded successfully!', 'success');
                      } catch {
                        onShowNotification('Could not fetch DOI. Fill fields manually.', 'error');
                      }
                    }}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-3 py-1.5 rounded text-xs"
                  >
                    Auto-fill
                  </button>
                </div>
                <p className="text-[10px] text-teal-700">Enter DOI and click Auto-fill, or fill fields manually below.</p>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={citationType === 'journal'} onChange={() => setCitationType('journal')} />
                  <span>Medical Journal</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={citationType === 'book'} onChange={() => setCitationType('book')} />
                  <span>Book Publication</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" checked={citationType === 'web'} onChange={() => setCitationType('web')} />
                  <span>Website</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Authors (Surname Initials) *</label>
                  <input
                    type="text" required value={citeAuthors} onChange={(e) => setCiteAuthors(e.target.value)}
                    placeholder="Smith AJ, Jones BJ" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1">Article / Chapter Title *</label>
                  <input
                    type="text" required value={citeTitle} onChange={(e) => setCiteTitle(e.target.value)}
                    placeholder="Title of the article..." className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1">Journal / Book Publisher *</label>
                  <input
                    type="text" required value={citeBookOrJournal} onChange={(e) => setCiteBookOrJournal(e.target.value)}
                    placeholder="Journal or Publisher name" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Year *</label>
                  <input
                    type="text" required value={citeYear} onChange={(e) => setCiteYear(e.target.value)}
                    placeholder="2024" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Volume</label>
                  <input
                    type="text" value={citeVolume} onChange={(e) => setCiteVolume(e.target.value)}
                    placeholder="34" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Issue</label>
                  <input
                    type="text" value={citeIssue} onChange={(e) => setCiteIssue(e.target.value)}
                    placeholder="1" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Pages</label>
                  <input
                    type="text" value={citePages} onChange={(e) => setCitePages(e.target.value)}
                    placeholder="22-29" className="w-full bg-slate-50 border p-1.5 rounded"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1">URL (for websites)</label>
                  <input
                    type="text" value={citeUrl} onChange={(e) => setCiteUrl(e.target.value)}
                    placeholder="https://..." className="w-full bg-slate-50 border p-1.5 rounded font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2 px-4 rounded-lg shadow-xs cursor-pointer"
              >
                + Add Reference
              </button>
            </form>
          </div>
        )}

        {/* 12. SUPPLEMENTARY */}
        {activeStep === 'supplementary' && (
          <div className="space-y-4 text-xs animate-fade-in">
            <p className="text-slate-600">Register supplementary files such as massive biochemical spreadsheets, sequence datasets, of MRI imagery:</p>
            
            <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
              <h5 className="font-bold text-slate-800">Appendix attachments ({manuscript.supplementaryFiles.length})</h5>
              {manuscript.supplementaryFiles.length === 0 ? (
                <p className="text-slate-400 italic">None attached.</p>
              ) : (
                <div className="space-y-2">
                  {manuscript.supplementaryFiles.map((file) => (
                    <div key={file.id} className="bg-white p-2 border rounded flex justify-between">
                      <div>
                        <span className="font-bold block text-slate-800 font-mono text-[10px]">{file.fileName}</span>
                        <span className="text-[10px] text-slate-400">{file.description}</span>
                      </div>
                      <span className="font-mono text-slate-500 font-bold text-[10px]">{file.fileSize}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddSupplementary} className="bg-white border p-4 rounded-xl space-y-3">
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Upload File *</label>
                  <input
                    type="file"
                    className="w-full bg-slate-50 border p-1.5 rounded cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setSuppName(file.name);
                    }}
                  />
                  {suppName && <p className="text-[10px] text-teal-700 mt-1 font-mono">{suppName}</p>}
                </div>
                <div>
                  <label className="block font-semibold mb-1 font-sans">Description</label>
                  <input
                    type="text" value={suppDesc} onChange={(e) => setSuppDesc(e.target.value)}
                    placeholder="Describe the supplementary material..." className="w-full bg-slate-50 border p-1.5 rounded font-sans"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-teal-700 hover:bg-teal-850 text-white font-semibold py-1.5 px-3 rounded text-xs"
              >
                + Add Supplementary File
              </button>
            </form>
          </div>
        )}

        {/* 13. ETHICS STATEMENTS */}
        {activeStep === 'ethics' && (
          <div className="space-y-4 text-xs animate-fade-in text-slate-700">
            <div className="bg-slate-50 p-4 border rounded-xl space-y-3">
              <h4 className="font-bold text-slate-800">Human subjects approval and IRB clearance *</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Involved testing approved?</label>
                  <select
                    value={manuscript.ethics.humanSubjectsApproved}
                    onChange={(e) => {
                      const ethics = { ...manuscript.ethics, humanSubjectsApproved: e.target.value as any };
                      updateField('ethics', ethics);
                    }}
                    className="w-full bg-white border p-1.5 rounded"
                  >
                    <option value="yes">Yes - Formal approval obtained</option>
                    <option value="no">No - Not approved</option>
                    <option value="exempt">Exempt by ethics board</option>
                    <option value="not-applicable">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 font-sans">IRB Approval reference ID</label>
                  <input
                    type="text"
                    value={manuscript.ethics.irbApprovalNumber}
                    onChange={(e) => {
                      const ethics = { ...manuscript.ethics, irbApprovalNumber: e.target.value };
                      updateField('ethics', ethics);
                    }}
                    placeholder="e.g., IRB-TSMU-22-88"
                    className="w-full bg-white border p-1.5 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Instituting Board / University</label>
                  <input
                    type="text"
                    value={manuscript.ethics.irbInstitution}
                    onChange={(e) => {
                      const ethics = { ...manuscript.ethics, irbInstitution: e.target.value };
                      updateField('ethics', ethics);
                    }}
                    placeholder="Tbilisi State Medical University Committee"
                    className="w-full bg-white border p-1.5 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border rounded-xl space-y-3">
              <h4 className="font-bold text-slate-800">Informed Patient Consent statement *</h4>
              <select
                value={manuscript.ethics.informedConsentObtained}
                onChange={(e) => {
                  const ethics = { ...manuscript.ethics, informedConsentObtained: e.target.value as any };
                  updateField('ethics', ethics);
                }}
                className="w-full bg-white border p-2 rounded"
              >
                <option value="yes">Yes - Written informed consent obtained from all subjects</option>
                <option value="no">No - Consent omitted</option>
                <option value="not-applicable">Not applicable</option>
              </select>
            </div>

            <div className="bg-white border-2 border-dashed border-slate-300 p-5 rounded-lg text-center space-y-2">
              <span className="font-bold block text-slate-800">1. Upload Signed IRB/Ethics Statement Approval PDF</span>
              <p className="text-[11px] text-slate-400">Drag & drop or select signed laboratory authorization form</p>
              <input
                id="ethics-statement-file-input"
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const ethics = { ...manuscript.ethics, ethicsStatementFileName: file.name };
                    updateField('ethics', ethics);
                    onShowNotification('Signed Ethics IRB approval registered!', 'success');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('ethics-statement-file-input')?.click()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-4 rounded border"
              >
                {manuscript.ethics.ethicsStatementFileName ? `Change file (${manuscript.ethics.ethicsStatementFileName})` : 'Attach IRB document'}
              </button>
            </div>
          </div>
        )}

        {/* 14. CONFLICT OF INTEREST DISCLOSURES */}
        {activeStep === 'conflicts' && (
          <div className="space-y-4 text-xs animate-fade-in text-slate-700">
            <div className="bg-slate-50 p-4 border rounded-xl space-y-3">
              <h4 className="font-bold text-slate-800">Cureus-style Conflict of Interest disclosures</h4>
              <p className="leading-snug">
                You must disclose all conflicts. Select the corresponding option:
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-1 font-bold cursor-pointer">
                  <input
                    type="radio" 
                    checked={!manuscript.conflictDisclosure.hasConflict} 
                    onChange={() => {
                      const updated = { ...manuscript.conflictDisclosure, hasConflict: false };
                      updateField('conflictDisclosure', updated);
                    }}
                  />
                  <span>No Conflicts to declare</span>
                </label>
                <label className="flex items-center gap-1 font-bold cursor-pointer">
                  <input
                    type="radio" 
                    checked={manuscript.conflictDisclosure.hasConflict} 
                    onChange={() => {
                      const updated = { ...manuscript.conflictDisclosure, hasConflict: true };
                      updateField('conflictDisclosure', updated);
                    }}
                  />
                  <span>Yes - I have conflicts to declare</span>
                </label>
              </div>

              {manuscript.conflictDisclosure.hasConflict && (
                <div className="space-y-1 animate-fade-in">
                  <label className="block font-semibold">Enter details of interests / industry sponsorship ties:</label>
                  <textarea
                    rows={3}
                    value={manuscript.conflictDisclosure.conflictDetails || ''}
                    onChange={(e) => {
                      const updated = { ...manuscript.conflictDisclosure, conflictDetails: e.target.value };
                      updateField('conflictDisclosure', updated);
                    }}
                    placeholder="Enter details..."
                    className="w-full bg-white border p-2 rounded"
                  />
                </div>
              )}
            </div>

            {/* Form download */}
            <div className="bg-slate-50 p-4 border rounded-xl space-y-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileCode className="h-4 w-4 text-teal-700" />
                Mandatory Conflict of Interest Form Verification
              </h4>
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <div>
                  <span className="font-bold text-slate-800 block">GBMN COI form document package</span>
                  <p className="text-[10px] text-slate-400">Download, complete, sign, and upload proof</p>
                </div>
                <button
                  onClick={() => {
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent("Georgian Biomedical News - Conflicts of Interest Mandate form"));
                    downloadAnchor.setAttribute("download", "GBMN_COI_Form.txt");
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    onShowNotification('Downloaded GBMN Conflict Disclosure Template form.', 'success');
                  }}
                  className="bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border px-3 py-1.5 rounded text-[11px]"
                >
                  Download template form
                </button>
              </div>

              <div className="border-2 border-dashed p-4 text-center rounded bg-white">
                <span className="font-bold block text-slate-700 mb-1.5">Upload completed and signed Conflict statement</span>
                <input
                  id="coi-file-upload-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const updated = { ...manuscript.conflictDisclosure, signedCoiFormName: file.name };
                      updateField('conflictDisclosure', updated);
                      onShowNotification('Signed COI form registered.', 'success');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('coi-file-upload-input')?.click()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border font-bold px-3 py-1.5 rounded"
                >
                  {manuscript.conflictDisclosure.signedCoiFormName ? `Change COI file (${manuscript.conflictDisclosure.signedCoiFormName})` : 'Attach signed PDF form'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 15. FUNDING INFORMATION */}
        {activeStep === 'funding' && (
          <div className="space-y-4 text-xs animate-fade-in">
            <div className="bg-slate-50 border-l-4 border-slate-300 p-3 rounded-r-lg text-slate-600">
              Funding information is <strong>optional</strong>. Fill in only if your research received external funding.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">Sponsoring Research Foundation / Agency</label>
                <input
                  type="text"
                  value={manuscript.fundingDetails.fundingAgency}
                  onChange={(e) => {
                    const f = { ...manuscript.fundingDetails, fundingAgency: e.target.value };
                    updateField('fundingDetails', f);
                  }}
                  placeholder="e.g., Shota Rustaveli National Science Foundation"
                  className="w-full bg-slate-50 border p-2 rounded"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">Funding reference Grant Identification ID</label>
                <input
                  type="text"
                  value={manuscript.fundingDetails.grantNumber}
                  onChange={(e) => {
                    const f = { ...manuscript.fundingDetails, grantNumber: e.target.value };
                    updateField('fundingDetails', f);
                  }}
                  placeholder="e.g., FR-24-9128"
                  className="w-full bg-slate-50 border p-2 rounded"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block font-semibold">Describe specific allocation of funding resources:</label>
              <textarea
                rows={3}
                value={manuscript.fundingDetails.explanation}
                onChange={(e) => {
                  const f = { ...manuscript.fundingDetails, explanation: e.target.value };
                  updateField('fundingDetails', f);
                }}
                className="w-full bg-slate-50 border p-2 rounded"
              />
            </div>
          </div>
        )}

        {/* 16. PAYMENT RECEIPT */}
        {activeStep === 'payment' && (
          <div className="space-y-4 text-xs animate-fade-in text-slate-700">
            <div className="bg-teal-50 border-l-4 border-teal-700 p-4 rounded-r-lg space-y-1">
              <h4 className="font-bold text-teal-900">Georgian Biomedical News — Article Processing</h4>
              <p className="leading-snug text-xs text-teal-850">
                If an article processing charge (APC) applies to your submission, please transfer the payment and upload the receipt below.
              </p>
            </div>

            {/* Ledger wire details */}
            <div className="bg-slate-50 border p-4 rounded-xl space-y-2 font-mono text-[11px] leading-relaxed text-slate-650">
              <span className="font-bold font-sans text-xs text-slate-800 block mb-1">Central Journal wire instructions:</span>
              <p>Beneficiary: Georgian Medical News and Biomedical Nexus board</p>
              <p>Bank: Bank of Georgia CORP / TBC Bank Tbilisi</p>
              <p>IBAN: GE98BG000000088192834</p>
              <p>Swift code: BAGAGE22</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Invoice Code identifier *</label>
                <input
                  type="text"
                  value={manuscript.payment.invoiceNumber}
                  onChange={(e) => {
                    const p = { ...manuscript.payment, invoiceNumber: e.target.value };
                    updateField('payment', p);
                  }}
                  placeholder="GBMN-INV-2026-xxxxx"
                  className="w-full bg-slate-50 border p-1.5 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 col-span-1">Bank transaction Reference Code *</label>
                <input
                  type="text"
                  value={manuscript.payment.referenceId}
                  onChange={(e) => {
                    const p = { ...manuscript.payment, referenceId: e.target.value };
                    updateField('payment', p);
                  }}
                  placeholder="TXN-BANKGEO-XXXXXX"
                  className="w-full bg-slate-50 border p-1.5 rounded"
                />
              </div>
            </div>

            {/* Bill upload */}
            <div className="border-2 border-dashed p-4 text-center rounded bg-white">
              <span className="font-bold block text-slate-700 mb-1.5">Attach Bank Wire transfer proof receipt *</span>
              <input
                id="payment-receipt-upload"
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const p = { 
                      ...manuscript.payment, 
                      fileName: file.name,
                      status: 'pending' as any,
                      uploadedAt: new Date().toISOString()
                    };
                    updateField('payment', p);
                    onShowNotification('Payment receipt draft linked successfully.', 'success');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('payment-receipt-upload')?.click()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-705 border font-bold px-3 py-1.5 rounded"
              >
                {manuscript.payment.fileName ? `Change attachment (${manuscript.payment.fileName})` : 'Attach PDF/Copy of wire transaction'}
              </button>
            </div>
          </div>
        )}

        {/* 17. FILES FOR EDITOR REVIEW */}
        {activeStep === 'editor-files' && (
          <div className="space-y-5 text-xs animate-fade-in text-slate-700">
            
            {/* Cover Letter */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm">Cover Letter</h4>
              <p className="text-slate-500">Download the cover letter template, fill it in, sign it, and upload the completed version.</p>
              <div className="flex flex-wrap gap-3 items-center p-3 bg-slate-50 border rounded-lg">
                <div className="flex-1">
                  <span className="font-bold text-slate-800 block text-xs">GBMN Cover Letter Template</span>
                  <p className="text-[10px] text-slate-400">Download, complete, sign, and upload</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const content = `COVER LETTER\n\nGeorgian Biomedical News (GBMN)\nEditorial Office\n\nDate: ${new Date().toLocaleDateString()}\n\nDear Editor,\n\nWe are pleased to submit our manuscript entitled "[MANUSCRIPT TITLE]" for consideration for publication in the Georgian Biomedical News.\n\n[Describe the significance of your work, why it is suitable for GBMN, and any other relevant information for the editors.]\n\nWe confirm that this manuscript has not been published elsewhere and is not under consideration by another journal. All authors have approved the manuscript and agree with its submission to GBMN.\n\nCorresponding Author:\nName:\nAffiliation:\nEmail:\nPhone:\n\nSincerely,\n[Author Name(s)]`;
                    const a = document.createElement('a');
                    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
                    a.download = 'GBMN_Cover_Letter_Template.txt';
                    a.click();
                    onShowNotification('Cover letter template downloaded.', 'success');
                  }}
                  className="bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 px-3 py-1.5 rounded text-[11px]"
                >
                  Download Template
                </button>
              </div>
              <div className="border-2 border-dashed p-4 text-center rounded bg-white">
                <span className="font-bold block text-slate-700 mb-1.5">Upload Completed Cover Letter</span>
                <input
                  id="cover-letter-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onShowNotification(`Cover letter uploaded: ${file.name}`, 'success');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('cover-letter-upload')?.click()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border font-bold px-3 py-1.5 rounded"
                >
                  Upload File
                </button>
              </div>
            </div>

            {/* Copyright Form */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-sm">Copyright Transfer Form</h4>
              <p className="text-slate-500">Download the copyright form, fill it in, sign it, and upload the completed version.</p>
              <div className="flex flex-wrap gap-3 items-center p-3 bg-slate-50 border rounded-lg">
                <div className="flex-1">
                  <span className="font-bold text-slate-800 block text-xs">GBMN Copyright Transfer Agreement</span>
                  <p className="text-[10px] text-slate-400">Required for all submissions — download, sign, upload</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const content = `COPYRIGHT TRANSFER FORM\n\nGeorgian Biomedical News (GBMN)\n\nManuscript Title: ________________________________\n\nThe undersigned Author(s) hereby transfer(s) to the Georgian Biomedical News (GBMN) all copyright ownership of the manuscript identified above. The Author(s) warrant(s) that the article is original, is not under consideration elsewhere, has not been previously published, and that the Author(s) have full power to make this transfer.\n\nIn accordance with the Creative Commons Attribution (CC BY 4.0) license, authors retain the right to:\n- Share and adapt the material for any purpose\n- Use the work for teaching purposes\n- Include the work in a thesis or dissertation\n\nAuthor Signatures:\n\n1. _________________________ Date: ____________\n   (Print Name): _________________________\n\n2. _________________________ Date: ____________\n   (Print Name): _________________________\n\n3. _________________________ Date: ____________\n   (Print Name): _________________________`;
                    const a = document.createElement('a');
                    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
                    a.download = 'GBMN_Copyright_Form.txt';
                    a.click();
                    onShowNotification('Copyright form downloaded.', 'success');
                  }}
                  className="bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 px-3 py-1.5 rounded text-[11px]"
                >
                  Download Form
                </button>
              </div>
              <div className="border-2 border-dashed p-4 text-center rounded bg-white">
                <span className="font-bold block text-slate-700 mb-1.5">Upload Signed Copyright Form</span>
                <input
                  id="copyright-form-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onShowNotification(`Copyright form uploaded: ${file.name}`, 'success');
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('copyright-form-upload')?.click()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border font-bold px-3 py-1.5 rounded"
                >
                  Upload File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 18. PREVIEW */}
        {activeStep === 'preview' && (
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 animate-fade-in">
            <ManuscriptPreview manuscript={manuscript} onShowNotification={onShowNotification} />
          </div>
        )}

        {/* 19. SUMMARY & SUBMIT */}
        {activeStep === 'summary-submit' && (
          <div className="space-y-6 text-xs animate-fade-in">
            
            <div className="bg-amber-50 border border-amber-250 p-4 rounded-xl space-y-1 flex items-start gap-2.5 text-amber-900">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-bold">Final Pre-Submission integrity analysis</h4>
                <p className="leading-snug text-xs">
                  Once submitted, authors cannot modify structure of the study independently unless editors grant revision permissions. Please review your content diagnostics summary.
                </p>
              </div>
            </div>

            {/* Checklists results */}
            <div className="border rounded-xl bg-slate-50 p-4 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase">Mandatory Components appraisal:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                
                <div className="flex items-center gap-2">
                  <CheckSquare className={manuscript.title.trim() ? 'text-green-600 h-4 w-4' : 'text-slate-300 h-4 w-4'} />
                  <span className={manuscript.title.trim() ? 'text-slate-750 font-semibold' : 'text-slate-400'}>Paper Title completed</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckSquare className={manuscript.authors.length > 0 ? 'text-green-600 h-4 w-4' : 'text-slate-300 h-4 w-4'} />
                  <span className={manuscript.authors.length > 0 ? 'text-slate-750 font-semibold' : 'text-slate-400'}>Authors affil roster linked</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckSquare className={manuscript.authors.some(a => a.isCorresponding) ? 'text-green-600 h-4 w-4' : 'text-slate-300 h-4 w-4'} />
                  <span className={manuscript.authors.some(a => a.isCorresponding) ? 'text-slate-755 font-semibold' : 'text-slate-400'}>Corresponding author selected</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckSquare className={manuscript.references.length > 0 ? 'text-green-600 h-4 w-4' : 'text-slate-300 h-4 w-4'} />
                  <span className={manuscript.references.length > 0 ? 'text-slate-750 font-semibold' : 'text-slate-400'}>AMA references bibliographic data filled</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckSquare className={manuscript.ethics.humanSubjectsApproved ? 'text-green-600 h-4 w-4' : 'text-slate-300 h-4 w-4'} />
                  <span className={manuscript.ethics.humanSubjectsApproved ? 'text-slate-750 font-semibold' : 'text-slate-400'}>IRB statement of subjects disclosure</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckSquare className={manuscript.payment.fileName ? 'text-green-600 h-4 w-4' : 'text-slate-300 h-4 w-4'} />
                  <span className={manuscript.payment.fileName ? 'text-slate-750 font-semibold' : 'text-slate-400'}>Invoice Wire transfer receipts attached</span>
                </div>

              </div>
            </div>

            {/* Submission button */}
            <div className="pt-2 text-center">
              <button
                id="final-package-submit-btn"
                onClick={() => {
                  if (!manuscript.title.trim()) {
                    onShowNotification('Submission error: Full title is missing from metadata.', 'error');
                    return;
                  }
                  if (manuscript.authors.length === 0) {
                    onShowNotification('Submission error: Minimum of 1 author affiliate matching credentials required.', 'error');
                    return;
                  }
                  if (!manuscript.payment.fileName) {
                    onShowNotification('Submission error: Proof of open access submission invoice payment receipt mandatory.', 'error');
                    return;
                  }

                  updateField('status', 'Submitted');
                  onStepChange('getting-started');
                  onShowNotification('Manuscript GBMN Submission Successful! Transmitting to referee queue.', 'success');
                }}
                className="inline-flex items-center gap-1.5 bg-teal-850 hover:bg-teal-900 text-white font-bold py-3 px-8 rounded-xl shadow-lg cursor-pointer transition-all text-sm uppercase tracking-wide"
              >
                <CheckCircle2 className="h-5 w-5" />
                Submit Manuscript Package to Editorial office
              </button>
              <p className="text-[10px] text-slate-400 mt-2">
                A confirmation automated receipt notification will be routed to your academic mailbox credentials.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* CORE WORKFLOW STEER BAR */}
      <div id="author-step-navigation-bar" className="flex justify-between items-center pt-4 border-t border-slate-100 no-print">
        <button
          id="prev-nav-step-btn"
          disabled={activeStep === 'getting-started'}
          onClick={() => {
            const steps = [
              'getting-started', 'policies', 'checklist', 'title-meta', 'authors', 'article-type',
              'abstract', 'keywords', 'sections', 'figures', 'references', 'supplementary',
              'ethics', 'conflicts', 'funding', 'payment', 'editor-files', 'preview', 'summary-submit'
            ];
            const currentIdx = steps.indexOf(activeStep);
            if (currentIdx > 0) onStepChange(steps[currentIdx - 1]);
          }}
          className="text-xs font-semibold px-4 py-2 border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-all disabled:opacity-45"
        >
          &larr; Save and Back
        </button>

        <button
          id="next-nav-step-btn"
          disabled={activeStep === 'summary-submit'}
          onClick={() => {
            const steps = [
              'getting-started', 'policies', 'checklist', 'title-meta', 'authors', 'article-type',
              'abstract', 'keywords', 'sections', 'figures', 'references', 'supplementary',
              'ethics', 'conflicts', 'funding', 'payment', 'editor-files', 'preview', 'summary-submit'
            ];
            const currentIdx = steps.indexOf(activeStep);
            if (currentIdx < steps.length - 1) onStepChange(steps[currentIdx + 1]);
          }}
          className="text-xs font-bold px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg shadow-xs cursor-pointer transition-all disabled:opacity-45"
        >
          Save and Continue &rarr;
        </button>
      </div>

    </div>
  );
}
