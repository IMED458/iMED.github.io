/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Manuscript, AuthorDetails, ReferenceItem, FigureTableItem, SupplementaryFile } from '../types';
import { ARTICLE_TYPES, createManuscriptId, formatAMAReference, SAMPLE_MANUSCRIPT } from '../utils';
import ManuscriptPreview from './ManuscriptPreview';
import RichTextEditor from './RichTextEditor';
import { sendEmail, submissionConfirmation } from '../emailTemplates';
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

  useEffect(() => {
    if (activeStep === 'payment') {
      onStepChange('editor-files');
    }
  }, [activeStep, onStepChange]);

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
      id: createManuscriptId(),
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
  const [authorAffiliations, setAuthorAffiliations] = useState<string[]>([]);
  const [newAffiliation, setNewAffiliation] = useState('');
  const [authorContributionTags, setAuthorContributionTags] = useState<string[]>([]);
  const [authorIsCorr, setAuthorIsCorr] = useState(false);
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);
  const [isAuthorOrcidLookup, setIsAuthorOrcidLookup] = useState(false);

  // 3. Figures/Table temporary state
  const [mediaType, setMediaType] = useState<'figure' | 'table' | 'diagram'>('figure');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [mediaFileUrl, setMediaFileUrl] = useState('');
  const [mediaPasteContent, setMediaPasteContent] = useState('');
  const [mediaLayout, setMediaLayout] = useState<'two-column' | 'one-column'>('two-column');
  
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

  const contributionOptions = [
    'Substantial contributions to concept or design',
    'Acquisition, analysis, or interpretation of data',
    'Drafting of the manuscript',
    'Critical review of the manuscript for important intellectual content',
    'Agreed to be accountable for all aspects of the work',
    'Will review the final version to be published',
    'Supervised the work'
  ];

  const savedAffiliations = Array.from(new Set(
    manuscript.authors
      .flatMap(author => author.affiliations?.length ? author.affiliations : [author.affiliation])
      .filter(Boolean)
  ));

  const toggleContributionTag = (tag: string) => {
    setAuthorContributionTags(prev => prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]);
  };

  const addAuthorAffiliation = (value: string) => {
    const clean = value.trim();
    if (!clean || authorAffiliations.includes(clean)) return;
    setAuthorAffiliations(prev => [...prev, clean]);
    setAuthorAffil(prev => prev || clean);
    setNewAffiliation('');
  };

  const normalizeOrcid = (value: string) => value.replace(/^https?:\/\/orcid\.org\//i, '').trim();

  const autofillAuthorFromOrcid = async () => {
    const clean = normalizeOrcid(authorOrcid);
    if (!clean) return;
    setIsAuthorOrcidLookup(true);
    try {
      const response = await fetch(`https://pub.orcid.org/v3.0/${clean}/record`, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('ORCID lookup failed');
      const record = await response.json();
      const name = record?.person?.name;
      const given = name?.['given-names']?.value || '';
      const family = name?.['family-name']?.value || '';
      const emails = record?.person?.emails?.email || [];
      const employments = record?.['activities-summary']?.employments?.['affiliation-group'] || [];
      const org = employments?.[0]?.summaries?.[0]?.['employment-summary']?.organization;
      if (given && !authorFirst) setAuthorFirst(given);
      if (family && !authorLast) setAuthorLast(family);
      if (emails[0]?.email && !authorEmail) setAuthorEmail(emails[0].email);
      if (org?.name && !authorInst) setAuthorInst(org.name);
      if (org?.address?.city && !authorCity) setAuthorCity(org.address.city);
      if (org?.address?.country && !authorCountry) setAuthorCountry(org.address.country);
      if (org?.name) addAuthorAffiliation([authorDept, org.name, org?.address?.city, org?.address?.country].filter(Boolean).join(', '));
      setAuthorOrcid(clean);
      onShowNotification('ORCID author metadata imported where available.', 'success');
    } catch {
      onShowNotification('ORCID metadata could not be imported. You can complete author fields manually.', 'error');
    } finally {
      setIsAuthorOrcidLookup(false);
    }
  };

  const normalizeKeywords = (value: string) => {
    const keywords = value.split(/[;,]/).map(item => item.trim()).filter(Boolean);
    return keywords.length ? `${keywords.join('; ')}.` : '';
  };

  const handleMediaFileSelected = (file: File) => {
    setMediaFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setMediaFileUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });

  const fileSizeLabel = (file: File) => {
    if (file.size < 1024 * 1024) return `${Math.max(1, Math.round(file.size / 1024))} KB`;
    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadWordTemplate = (fileName: string, title: string, body: string) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Calibri,Arial,sans-serif;line-height:1.5">${body}</body></html>`;
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const attachEditorFile = async (file: File, type: string) => {
    const fileUrl = URL.createObjectURL(file);
    const item = { id: `${type}-${Date.now()}`, fileName: file.name, type, fileUrl, uploadedAt: new Date().toISOString(), fileSize: fileSizeLabel(file) };
    const editorFiles = manuscript.editorFiles.filter(existing => existing.type !== type);
    updateField('editorFiles', [...editorFiles, item]);
    onShowNotification(`${type.replace('-', ' ')} uploaded: ${file.name}`, 'success');
  };

  const removeEditorFile = (type: string) => {
    updateField('editorFiles', manuscript.editorFiles.filter(existing => existing.type !== type));
    onShowNotification(`${type.replace('-', ' ')} removed.`, 'success');
  };

  const openEditorFile = (type: string) => {
    const file = manuscript.editorFiles.find(existing => existing.type === type);
    if (!file?.fileUrl) return;
    const tab = window.open();
    if (tab) {
      tab.document.write(`<iframe src="${file.fileUrl}" style="border:0;width:100%;height:100vh"></iframe>`);
    }
  };

  const renderEditorFileControls = (type: string, inputId: string) => {
    const file = manuscript.editorFiles.find(existing => existing.type === type);
    if (!file) return null;
    return (
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-teal-100 bg-teal-50 p-2">
        <span className="font-semibold text-teal-900">{file.fileName}{file.fileSize ? ` · ${file.fileSize}` : ''}</span>
        <button type="button" onClick={() => openEditorFile(type)} className="px-2 py-1 rounded border bg-white text-[10px] font-bold text-slate-700">Preview</button>
        <a href={file.fileUrl} download={file.fileName} className="px-2 py-1 rounded border bg-white text-[10px] font-bold text-slate-700">Open</a>
        <button type="button" onClick={() => document.getElementById(inputId)?.click()} className="px-2 py-1 rounded border bg-white text-[10px] font-bold text-slate-700">Replace</button>
        <button type="button" onClick={() => removeEditorFile(type)} className="px-2 py-1 rounded border bg-white text-[10px] font-bold text-red-700">Delete</button>
      </div>
    );
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
    const affiliations = authorAffiliations.length
      ? authorAffiliations
      : [authorAffil || `${authorDept}, ${authorInst}, ${authorCity}, ${authorCountry}`].filter(Boolean);
    if (!authorFirst || !authorLast || !authorOrcid || (!authorInst && affiliations.length === 0)) {
      onShowNotification('First name, Last Name, Affiliation, and Mandated ORCID iD are required.', 'error');
      return;
    }
    const hasCoreContribution = authorContributionTags.some(tag => [
      'Substantial contributions to concept or design',
      'Acquisition, analysis, or interpretation of data'
    ].includes(tag));
    const hasWritingContribution = authorContributionTags.some(tag => [
      'Drafting of the manuscript',
      'Critical review of the manuscript for important intellectual content'
    ].includes(tag));
    const hasRequiredContribution = [
      'Agreed to be accountable for all aspects of the work',
      'Will review the final version to be published'
    ].every(tag => authorContributionTags.includes(tag));
    if (!hasCoreContribution || !hasWritingContribution || !hasRequiredContribution) {
      onShowNotification('Each author must have concept/data, writing/review, accountability, and final review contributions checked.', 'error');
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
      affiliation: affiliations[0],
      affiliations,
      academicTitle: authorTitle,
      contributionRole: authorContrib || authorContributionTags.join('; '),
      contributionTags: authorContributionTags,
      isCorresponding: authorIsCorr
    };

    let updatedAuthors = editingAuthorId
      ? manuscript.authors.filter(a => a.id !== editingAuthorId)
      : [...manuscript.authors];
    if (authorIsCorr) {
      // Toggle all other corresponding off
      updatedAuthors = updatedAuthors.map(a => ({ ...a, isCorresponding: false }));
    }

    updatedAuthors.push({ ...newAuthor, id: editingAuthorId || newAuthor.id });
    updateField('authors', updatedAuthors);
    onShowNotification(`Author ${authorFirst} ${authorLast} successfully ${editingAuthorId ? 'updated' : 'added'}!`, 'success');

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
    setAuthorAffiliations([]);
    setNewAffiliation('');
    setAuthorIsCorr(false);
    setAuthorContributionTags([]);
    setEditingAuthorId(null);
  };

  const handleEditAuthor = (auth: AuthorDetails) => {
    setEditingAuthorId(auth.id);
    setAuthorFirst(auth.firstName);
    setAuthorMiddle(auth.middleInitial || '');
    setAuthorLast(auth.lastName);
    setAuthorEmail(auth.email);
    setAuthorPhone(auth.phone);
    setAuthorOrcid(auth.orcidId);
    setAuthorSpec(auth.specialty);
    setAuthorCountry(auth.country);
    setAuthorCity(auth.city);
    setAuthorInst(auth.institution);
    setAuthorDept(auth.department);
    setAuthorAffil(auth.affiliation);
    setAuthorAffiliations(auth.affiliations?.length ? auth.affiliations : [auth.affiliation].filter(Boolean));
    setAuthorTitle(auth.academicTitle);
    setAuthorContrib(auth.contributionRole);
    setAuthorContributionTags(auth.contributionTags || []);
    setAuthorIsCorr(auth.isCorresponding);
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
      ,
      layout: mediaLayout
    };

    updateField('figuresAndTables', [...manuscript.figuresAndTables, newItem]);
    onShowNotification(`${mediaType === 'figure' ? 'Figure' : 'Dynamic Table'} registered to paper content!`, 'success');

    // Reset fields
    setMediaTitle('');
    setMediaCaption('');
    setMediaFileName('');
    setMediaFileUrl('');
    setMediaPasteContent('');
    setMediaLayout('two-column');
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

  const [suppFileUrl, setSuppFileUrl] = useState('');
  const [suppFileSize, setSuppFileSize] = useState('');

  const handleAddSupplementary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName) return;

    const newSupp: SupplementaryFile = {
      id: `supp-${Date.now()}`,
      fileName: suppName,
      description: suppDesc,
      fileSize: suppFileSize || 'Attached',
      fileUrl: suppFileUrl,
      uploadedAt: new Date().toISOString()
    };

    updateField('supplementaryFiles', [...manuscript.supplementaryFiles, newSupp]);
    onShowNotification('Dataset supplementary file registered.', 'success');
    setSuppName('');
    setSuppDesc('');
    setSuppFileUrl('');
    setSuppFileSize('');
  };

  const articleConfig = ARTICLE_TYPES[manuscript.articleType];
  const manuscriptSectionNames = (articleConfig?.requiredSections || []).filter(section => section !== 'Keywords');
  const sectionNamesKey = manuscriptSectionNames.join('|');
  const [activeManuscriptSection, setActiveManuscriptSection] = useState('');
  const activeSectionIndex = Math.max(0, manuscriptSectionNames.indexOf(activeManuscriptSection));
  const activeSectionName = manuscriptSectionNames[activeSectionIndex] || manuscriptSectionNames[0] || '';
  const workflowSteps = [
    'getting-started', 'policies', 'checklist', 'title-meta', 'authors', 'article-type',
    'abstract', 'keywords', 'sections', 'references', 'supplementary',
    'ethics', 'conflicts', 'funding', 'editor-files', 'preview', 'summary-submit'
  ];

  useEffect(() => {
    if (activeStep !== 'sections' || !manuscriptSectionNames.length) return;
    if (!activeManuscriptSection || !manuscriptSectionNames.includes(activeManuscriptSection)) {
      setActiveManuscriptSection(manuscriptSectionNames[0]);
    }
  }, [activeStep, sectionNamesKey, activeManuscriptSection, manuscriptSectionNames]);

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
            {activeStep === 'authors' && '5. GBMN Author Roster Management'}
            {activeStep === 'article-type' && '6. Article Type Quota Configuration'}
            {activeStep === 'abstract' && '7. Structured abstract compilation'}
            {activeStep === 'keywords' && '8. Indexed indexing Keywords'}
            {activeStep === 'sections' && '9. Structured Manuscript Body Segments'}
            {activeStep === 'references' && '10. AMA Bibliography Reference Library'}
            {activeStep === 'supplementary' && '11. Optional Appendix Datasets & Protocols'}
            {activeStep === 'ethics' && '12. Institutional Review Board (IRB) Clearance'}
            {activeStep === 'conflicts' && '13. Disclosure of Financial Conflicts (COI)'}
            {activeStep === 'funding' && '14. Rustaveli & Global Research Grants'}
            {activeStep === 'editor-files' && '15. Cover Letter & Referee Guidelines'}
            {activeStep === 'preview' && '16. Pre-Publication Live Watermarked proof'}
            {activeStep === 'summary-submit' && '17. Final Integrity Evaluation & Submitting'}
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
                    onUpdateManuscript({
                      ...manuscript,
                      checklistAgreed: e.target.checked,
                      checklistAgreedAt: e.target.checked ? new Date().toISOString() : undefined,
                      updatedAt: new Date().toISOString()
                    });
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
                          onClick={() => handleEditAuthor(auth)}
                          className="px-2 py-1 border border-teal-200 bg-teal-50 text-teal-800 rounded hover:bg-teal-100 text-[10px] font-bold"
                          title="Edit author"
                        >
                          Edit
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
              <h4 className="font-bold text-slate-850 text-xs uppercase tracking-wider">{editingAuthorId ? 'Edit Author credentials' : 'Add Co-Author credentials'}</h4>
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
	                    type="text" required value={authorOrcid} onChange={(e) => setAuthorOrcid(e.target.value)} onBlur={autofillAuthorFromOrcid}
	                    placeholder="0000-0002-1823-4412" className="w-full bg-slate-100 border p-1.5 rounded font-mono text-teal-800 focus:outline-hidden"
	                  />
                    <button
                      type="button"
                      onClick={autofillAuthorFromOrcid}
                      disabled={!authorOrcid.trim() || isAuthorOrcidLookup}
                      className="mt-1 text-[10px] font-bold text-teal-700 disabled:text-slate-400 hover:underline"
                    >
                      {isAuthorOrcidLookup ? 'Importing ORCID...' : 'Auto-fill author'}
                    </button>
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

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-64">
                    <label className="block font-semibold mb-1">Affiliations for this author</label>
                    <select
                      value=""
                      onChange={(event) => addAuthorAffiliation(event.target.value)}
                      className="w-full bg-white border p-1.5 rounded"
                    >
                      <option value="">Choose saved affiliation...</option>
                      {savedAffiliations.map(affiliation => (
                        <option key={affiliation} value={affiliation}>{affiliation}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-64">
                    <label className="block font-semibold mb-1">Add new affiliation</label>
                    <input
                      value={newAffiliation}
                      onChange={(event) => setNewAffiliation(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addAuthorAffiliation(newAffiliation);
                        }
                      }}
                      placeholder="Department, Institution, City, Country"
                      className="w-full bg-white border p-1.5 rounded"
                    />
                  </div>
                  <button type="button" onClick={() => addAuthorAffiliation(newAffiliation)} className="bg-teal-700 text-white font-bold px-3 py-1.5 rounded">
                    Add
                  </button>
                </div>
                {authorAffiliations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {authorAffiliations.map(affiliation => (
                      <button
                        type="button"
                        key={affiliation}
                        onClick={() => setAuthorAffiliations(prev => prev.filter(item => item !== affiliation))}
                        className="px-2 py-1 rounded bg-white border text-slate-700 text-[10px]"
                        title="Click to remove"
                      >
                        {affiliation} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                <h5 className="font-bold text-slate-800">Contributions. How did each listed author contribute?</h5>
                <p className="text-[10px] text-slate-500">Contributions (please check all that apply). All authors must contribute to at least one concept/data item, one writing/review item, and both required items.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {contributionOptions.map(option => (
                    <label key={option} className="flex items-start gap-2 text-[11px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={authorContributionTags.includes(option)}
                        onChange={() => toggleContributionTag(option)}
                        className="mt-0.5"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
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
                {editingAuthorId ? 'Save Author Changes' : '+ Link Author Affiliate to Manuscript'}
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
                  <button
                    type="button"
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
                  </button>
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
              <label htmlFor="input-m-keywords" className="block font-bold text-slate-805">Academic Indexing Keywords (3 to 6 MeSH terms, semicolon separated) *</label>
              <input
                id="input-m-keywords"
                type="text"
                value={manuscript.sections['Keywords'] || ''}
	                onChange={(e) => {
	                  const updatedSecs = { ...manuscript.sections, Keywords: e.target.value.replace(/,/g, ';') };
	                  updateField('sections', updatedSecs);
	                }}
	                onBlur={(e) => {
	                  const updatedSecs = { ...manuscript.sections, Keywords: normalizeKeywords(e.target.value) };
	                  updateField('sections', updatedSecs);
	                }}
	                placeholder="e.g., Diabetes Mellitus; Cardiomyopathies; Cytokines"
                className="w-full bg-white border border-slate-350 p-2 text-sm rounded-lg focus:outline-hidden"
              />
            </div>
            <p className="text-slate-400 italic text-[11px]">
              Use semicolons between terms. Commas are converted automatically, and the final period is added on save. Number of tags entered:{' '}
              <strong>{(manuscript.sections['Keywords'] || '').split(/[;,]/).map(k => k.trim()).filter(Boolean).length}</strong>
            </p>
          </div>
        )}

        {/* 9. MANUSCRIPT SECTIONS */}
        {activeStep === 'sections' && (
          <div className="space-y-5 text-xs animate-fade-in">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Manuscript subsections</h4>
                  <p className="text-slate-500 italic mt-1">Fill one subsection at a time for {articleConfig?.name}. Preview generation keeps the journal order unchanged.</p>
                </div>
                {activeSectionName && (
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-100 rounded-full px-3 py-1">
                    {activeSectionIndex + 1} / {manuscriptSectionNames.length}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {manuscriptSectionNames.map((section, index) => {
                  const savedText = (manuscript.sections[section] || '').replace(/<[^>]*>/g, ' ').trim();
                  const isActive = section === activeSectionName;
                  return (
                    <button
                      key={section}
                      type="button"
                      onClick={() => setActiveManuscriptSection(section)}
                      className={`text-left rounded-lg border px-3 py-2 transition-all ${
                        isActive
                          ? 'border-teal-600 bg-white shadow-sm text-teal-900'
                          : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Section {index + 1}</span>
                      <span className="block font-bold text-xs">{section}</span>
                      <span className={`block text-[10px] mt-1 ${savedText ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {savedText ? 'Saved content' : 'Empty'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeSectionName && (
              <RichTextEditor
                key={activeSectionName}
                label={`${activeSectionName} *`}
                value={manuscript.sections[activeSectionName] || ''}
                onChange={(val) => {
                  const updatedSecs = { ...manuscript.sections, [activeSectionName]: val };
                  updateField('sections', updatedSecs);
                }}
                placeholder={`Write the full structured ${activeSectionName.toLowerCase()} of the study...`}
                showWordCount
              />
            )}
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
                  {manuscript.references.map((item, index) => (
                    <li key={item.id} className="text-[11px] pl-1 font-medium text-slate-700">
                      <span>{formatAMAReference(item)}</span>
                      <button
                        disabled={index === 0}
                        onClick={() => {
                          const updated = [...manuscript.references];
                          [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                          updateField('references', updated);
                        }}
                        className="text-teal-750 font-bold ml-2 hover:underline disabled:text-slate-300 disabled:no-underline"
                      >
                        [Up]
                      </button>
                      <button
                        disabled={index === manuscript.references.length - 1}
                        onClick={() => {
                          const updated = [...manuscript.references];
                          [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                          updateField('references', updated);
                        }}
                        className="text-teal-750 font-bold ml-2 hover:underline disabled:text-slate-300 disabled:no-underline"
                      >
                        [Down]
                      </button>
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
                        const newRef: ReferenceItem = {
                          id: `ref-${Date.now()}`,
                          type: 'journal',
                          authors: authList,
                          title: w.title?.[0] || '',
                          journalOrBook: w['container-title']?.[0] || w.publisher || '',
                          year: String(w.published?.['date-parts']?.[0]?.[0] || ''),
                          volume: w.volume || undefined,
                          issue: w.issue || undefined,
                          pages: w.page || undefined,
                          doi: citeDoi.trim()
                        };
                        if (newRef.authors && newRef.title && newRef.journalOrBook && newRef.year) {
                          updateField('references', [...manuscript.references, newRef]);
                          setCiteAuthors('');
                          setCiteTitle('');
                          setCiteBookOrJournal('');
                          setCiteYear('');
                          setCiteVolume('');
                          setCiteIssue('');
                          setCitePages('');
                          setCiteDoi('');
                          setCiteUrl('');
                          onShowNotification('DOI metadata loaded and reference added.', 'success');
                        } else {
                          onShowNotification('DOI metadata loaded. Review fields and click Add Reference.', 'info');
                        }
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
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSuppName(file.name);
                        setSuppFileSize(fileSizeLabel(file));
                        setSuppFileUrl(await readFileAsDataUrl(file));
                      }
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
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const ethics = { ...manuscript.ethics, ethicsStatementFileName: file.name, ethicsStatementUploadedUrl: await readFileAsDataUrl(file) };
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
              <h4 className="font-bold text-slate-800">GBMN Conflict of Interest disclosures</h4>
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
            {manuscript.conflictDisclosure.hasConflict ? (
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
                  type="button"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = `${import.meta.env.BASE_URL}forms/GBMN-Copyright-form.docx`;
                    a.download = 'GBMN-Copyright-form.docx';
                    a.click();
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
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const updated = { ...manuscript.conflictDisclosure, signedCoiFormName: file.name, signedCoiFormUrl: await readFileAsDataUrl(file) };
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
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900">
                <strong>No Conflicts to declare</strong> selected. A signed COI upload is not required for this manuscript.
              </div>
            )}
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

        {/* 15. FILES FOR EDITOR REVIEW */}
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
                    const a = document.createElement('a');
                    a.href = `${import.meta.env.BASE_URL}forms/GBMN-Cover-letter.docx`;
                    a.download = 'GBMN-Cover-letter.docx';
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
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await attachEditorFile(file, 'cover-letter');
                    }
                  }}
                />
	                <button
	                  type="button"
	                  onClick={() => document.getElementById('cover-letter-upload')?.click()}
	                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border font-bold px-3 py-1.5 rounded"
	                >
	                  {manuscript.editorFiles.find(f => f.type === 'cover-letter')?.fileName || 'Upload File'}
	                </button>
                  {renderEditorFileControls('cover-letter', 'cover-letter-upload')}
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
                    const a = document.createElement('a');
                    a.href = `${import.meta.env.BASE_URL}forms/GBMN-Copyright-form.docx`;
                    a.download = 'GBMN-Copyright-form.docx';
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
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await attachEditorFile(file, 'copyright-transfer');
                    }
                  }}
                />
	                <button
	                  type="button"
	                  onClick={() => document.getElementById('copyright-form-upload')?.click()}
	                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border font-bold px-3 py-1.5 rounded"
	                >
	                  {manuscript.editorFiles.find(f => f.type === 'copyright-transfer')?.fileName || 'Upload File'}
	                </button>
                  {renderEditorFileControls('copyright-transfer', 'copyright-form-upload')}
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

              </div>
            </div>

            {/* Submission button */}
            <div className="pt-2 text-center">
              <div className="flex flex-col items-center gap-3">
                <button
                  id="final-package-submit-btn"
                  onClick={async () => {
                    if (!manuscript.title.trim()) {
                      onShowNotification('Submission error: Full title is missing from metadata.', 'error');
                      return;
                    }
                    if (manuscript.authors.length === 0) {
                      onShowNotification('Submission error: Minimum of 1 author affiliate matching credentials required.', 'error');
                      return;
                    }
                    const now = new Date().toISOString();
                    onUpdateManuscript({ ...manuscript, status: 'Submitted', submittedAt: now, updatedAt: now });
                    const email = submissionConfirmation(manuscript);
                    await sendEmail('submission', manuscript, email.subject, email.body);
                    onStepChange('getting-started');
                    onShowNotification('Manuscript submitted and confirmation email processed.', 'success');
                  }}
                  className="inline-flex items-center gap-2 bg-teal-900 hover:bg-teal-800 text-white font-bold py-4 px-8 rounded-xl shadow-lg cursor-pointer transition-all text-sm uppercase tracking-wide"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Save & Submit to Editorial Office
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateManuscript({ ...manuscript, updatedAt: new Date().toISOString() });
                    onShowNotification('Draft saved. You can return to continue editing.', 'success');
                  }}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold py-2 px-6 rounded-xl cursor-pointer text-xs"
                >
                  Save as Draft
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                A confirmation notification will be routed to your academic mailbox credentials.
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
            if (activeStep === 'sections' && activeSectionIndex > 0) {
              setActiveManuscriptSection(manuscriptSectionNames[activeSectionIndex - 1]);
              return;
            }
            const currentIdx = workflowSteps.indexOf(activeStep);
            if (currentIdx > 0) onStepChange(workflowSteps[currentIdx - 1]);
          }}
          className="text-xs font-semibold px-4 py-2 border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-all disabled:opacity-45"
        >
          &larr; Save and Back
        </button>

        <button
          id="save-current-draft-btn"
          type="button"
          onClick={() => {
            onUpdateManuscript({ ...manuscript, updatedAt: new Date().toISOString() });
            onShowNotification('Draft saved. You can safely continue later.', 'success');
          }}
          className="text-xs font-bold px-5 py-2.5 bg-white hover:bg-slate-50 text-teal-800 rounded-lg border border-teal-200 shadow-xs cursor-pointer transition-all"
        >
          Save
        </button>

        <button
          id="next-nav-step-btn"
          disabled={activeStep === 'summary-submit'}
          onClick={() => {
            if (activeStep === 'sections' && activeSectionIndex < manuscriptSectionNames.length - 1) {
              onUpdateManuscript({ ...manuscript, updatedAt: new Date().toISOString() });
              const nextSection = manuscriptSectionNames[activeSectionIndex + 1];
              setActiveManuscriptSection(nextSection);
              onShowNotification(`${activeSectionName} saved. Continue with ${nextSection}.`, 'success');
              return;
            }
            const currentIdx = workflowSteps.indexOf(activeStep);
            if (currentIdx < workflowSteps.length - 1) onStepChange(workflowSteps[currentIdx + 1]);
          }}
          className="text-xs font-bold px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg shadow-xs cursor-pointer transition-all disabled:opacity-45"
        >
          {activeStep === 'sections' && activeSectionIndex < manuscriptSectionNames.length - 1 ? 'Save and Continue Section →' : 'Save and Continue →'}
        </button>
      </div>

    </div>
  );
}
