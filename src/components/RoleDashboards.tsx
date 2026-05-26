/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, FormEvent } from 'react';
import { User, UserRole, Manuscript, ManuscriptStatus, SystemAuditLog, JournalSettings, ReviewHighlight } from '../types';
import { DB, ARTICLE_TYPES } from '../utils';
import React, { useEffect, useState, FormEvent } from 'react';
import { User, UserRole, Manuscript, ManuscriptStatus, SystemAuditLog, JournalSettings, ReferenceItem, FigureTableItem } from '../types';
import { DB, ARTICLE_TYPES, createManuscriptId } from '../utils';
import ManuscriptPreview from './ManuscriptPreview';
import SubmissionWorkflow from './SubmissionWorkflow';
import RichTextEditor from './RichTextEditor';
import { acceptanceNotice, paymentRequest, publishedNotice, sendEmail } from '../emailTemplates';
import {
  Users,
  FileText,
  Settings2,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Search,
  BadgeAlert,
  Database,
  Sliders,
  AlertCircle,
  LayoutDashboard,
  Send,
  Edit3,
  Highlighter,
  Star,
  ChevronRight,
  Plus,
  Eye,
  Save,
  X,
  Download,
  User as UserIcon,
  Award,
  MessageSquare,
} from 'lucide-react';

interface RoleDashboardsProps {
  currentUser: User;
  manuscripts: Manuscript[];
  onUpdateManuscripts: (newManuscripts: Manuscript[]) => void;
  onShowNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

// Sort manuscripts newest-first
function sortNewest(list: Manuscript[]): Manuscript[] {
  return [...list].sort(
    (a, b) =>
      new Date(b.submittedAt || b.updatedAt || b.createdAt).getTime() -
      new Date(a.submittedAt || a.updatedAt || a.createdAt).getTime()
  );
}

export default function RoleDashboards({ currentUser, manuscripts, onUpdateManuscripts, onShowNotification }: RoleDashboardsProps) {
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor nav
  const [editorNavSection, setEditorNavSection] = useState('Dashboard');
  const [officeEditMode, setOfficeEditMode] = useState(false);
  const [officeEditStep, setOfficeEditStep] = useState('title-meta');

  // Editor comments / decision
  const [editorCommentHtml, setEditorCommentHtml] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<'accept' | 'minor-revision' | 'major-revision' | 'reject' | 'publish'>('minor-revision');
  const [showDecisionPanel, setShowDecisionPanel] = useState(false);

  // Editor assignment
  const [assignEditorId, setAssignEditorId] = useState('');

  // Reviewer form
  const [reviewScoreEthical, setReviewScoreEthical] = useState('None identified');
  const [reviewScoreMethod, setReviewScoreMethod] = useState(5);
  const [reviewScoreOrig, setReviewScoreOrig] = useState(5);
  const [reviewScoreMerit, setReviewScoreMerit] = useState(5);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewPrivate, setReviewPrivate] = useState('');
  const [reviewRecommend, setReviewRecommend] = useState<'accept' | 'minor-revision' | 'major-revision' | 'reject'>('accept');
  const [reviewDraftSaved, setReviewDraftSaved] = useState(false);
  const [reviewHighlights, setReviewHighlights] = useState<ReviewHighlight[]>([]);
  const [showHighlightNote, setShowHighlightNote] = useState(false);
  const [pendingHighlightText, setPendingHighlightText] = useState('');
  const [highlightNote, setHighlightNote] = useState('');
  const [reviewPdf, setReviewPdf] = useState<{ fileName: string; fileUrl: string } | null>(null);

  // Admin
  const [adminMode, setAdminMode] = useState<'editorial' | 'finance' | 'users'>('editorial');
  const [editorialSection, setEditorialSection] = useState('Dashboard');
  const [emailDraft, setEmailDraft] = useState<{ open: boolean; manuscript: Manuscript | null; subject: string; body: string }>({ open: false, manuscript: null, subject: '', body: '' });
  const [adminUsers, setAdminUsers] = useState<User[]>(() => DB.getUsers());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    firstName: '', lastName: '', email: '', institution: '',
    role: 'Author' as UserRole, orcidId: '', isVerified: true,
  });
  const [journalSettings, setJournalSettings] = useState<JournalSettings>(() => DB.getJournalSettings());

  // "My Manuscripts" for editors who also submit
  const editorOwnManuscripts = manuscripts.filter(m => m.authorId === currentUser.id);
  const [editorMyMsStep, setEditorMyMsStep] = useState('title-meta');
  const [editorMyMsSelected, setEditorMyMsSelected] = useState<string | null>(null);

  // Stats
  const totalSubmissions = manuscripts.filter(m => m.status !== 'Draft').length;
  const underReviewCount = manuscripts.filter(m => ['Under Review', 'In Review', 'Reviewer Assigned'].includes(m.status)).length;
  const decisionPendingCount = manuscripts.filter(m => m.status === 'Submitted').length;
  const acceptedCount = manuscripts.filter(m => ['Accepted', 'Published'].includes(m.status)).length;
  const manuscriptStatuses: ManuscriptStatus[] = [
    'Draft', 'Submitted', 'Reviewer Assigned', 'Under Review', 'In Review',
    'Revision Requested', 'Editorial Decision', 'Accepted', 'In Production',
    'Completed', 'Rejected', 'Published',
  ];

  useEffect(() => {
    DB.getUsersAsync().then(setAdminUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedManuscript) return;
    const latest = manuscripts.find(item => item.id === selectedManuscript.id);
    if (latest && latest !== selectedManuscript) setSelectedManuscript(latest);
  }, [manuscripts, selectedManuscript]);

  // Load existing highlights when manuscript selected
  useEffect(() => {
    if (!selectedManuscript) return;
    const myAssignment = selectedManuscript.reviewerAssignments.find(ra => ra.reviewerId === currentUser.id);
    if (myAssignment?.highlights) setReviewHighlights(myAssignment.highlights);
    if (myAssignment?.draftReview) setReviewComments(myAssignment.draftReview);
  }, [selectedManuscript?.id]);

  const updateSelectedManuscript = (updated: Manuscript) => {
    const list = manuscripts.map(item => item.id === updated.id ? updated : item);
    onUpdateManuscripts(list);
    setSelectedManuscript(updated);
  };

  const allEditors = DB.getUsers().filter(u => u.role === 'Editor' || u.role === 'Managing Editor');

  // ─── STATUS BADGE ────────────────────────────────────────────────────────────
  const renderStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Draft': 'bg-slate-100 text-slate-700 border-slate-300',
      'Submitted': 'bg-blue-50 text-blue-800 border-blue-200',
      'Reviewer Assigned': 'bg-cyan-50 text-cyan-800 border-cyan-200',
      'Under Review': 'bg-yellow-50 text-yellow-800 border-yellow-200',
      'In Review': 'bg-orange-50 text-orange-800 border-orange-200',
      'Revision Requested': 'bg-amber-50 text-amber-800 border-amber-200',
      'Editorial Decision': 'bg-purple-50 text-purple-800 border-purple-200',
      'Accepted': 'bg-emerald-50 text-emerald-800 border-emerald-200',
      'In Production': 'bg-lime-50 text-lime-800 border-lime-200',
      'Completed': 'bg-green-50 text-green-800 border-green-200',
      'Rejected': 'bg-rose-50 text-rose-800 border-rose-200',
      'Published': 'bg-teal-50 text-teal-800 border-teal-200',
    };
    const cls = map[status] || 'bg-slate-50 text-slate-500';
    return <span className={`${cls} border text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm`}>{status}</span>;
  };

  // ─── EMAIL ───────────────────────────────────────────────────────────────────
  const createEditorialDraft = () => {
    const base = manuscripts[0];
    if (!base) return;
    const draft: Manuscript = {
      ...base,
      id: createManuscriptId(),
      status: 'Draft',
      authorId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: undefined,
      title: '',
      runningTitle: '',
      authors: [{
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        phone: '',
        orcidId: currentUser.orcidId || '',
        specialty: '',
        country: '',
        city: '',
        institution: currentUser.institution,
        department: '',
        affiliation: currentUser.institution,
        academicTitle: '',
        contributionRole: '',
        contributionTags: ['Agreed to be accountable for all aspects of the work', 'Will review the final version to be published'],
        isCorresponding: true,
      }],
      abstractContents: {},
      sections: {},
      figuresAndTables: [],
      references: [],
      supplementaryFiles: [],
      editorFiles: [],
      reviewerAssignments: [],
      editorDecisionLog: [],
    };
    const list = [...manuscripts, draft];
    onUpdateManuscripts(list);
    setSelectedManuscript(draft);
    setOfficeEditMode(true);
    setOfficeEditStep('title-meta');
    onShowNotification('Editorial draft created. You can submit it as your own manuscript.', 'success');
  };

  const sendTemplateEmail = async (manuscript: Manuscript, template: 'acceptance' | 'payment' | 'published') => {
    const email = template === 'acceptance' ? acceptanceNotice(manuscript)
      : template === 'payment' ? paymentRequest(manuscript)
      : publishedNotice(manuscript);
    await sendEmail(template === 'published' ? 'published' : 'accepted', manuscript, email.subject, email.body);
    onShowNotification('Email processed through EmailJS.', 'success');
  };

  const openAuthorEmailModal = (manuscript: Manuscript, preset: 'custom' | 'acceptance' | 'payment' | 'published' = 'custom') => {
    const email = preset === 'acceptance' ? acceptanceNotice(manuscript)
      : preset === 'payment' ? paymentRequest(manuscript)
      : preset === 'published' ? publishedNotice(manuscript)
      : { subject: `GBMN Manuscript ${manuscript.id}`, body: `Dear Author,\n\n\n\nRegards,\nGBMN Editorial Office` };
    setEmailDraft({ open: true, manuscript, subject: email.subject, body: email.body });
  };

  // ─── SEND TO AUTHOR (editor decision) ────────────────────────────────────────
  const handleSendToAuthor = async (manuscript: Manuscript) => {
    if (!editorCommentHtml.trim()) {
      onShowNotification('Please add a comment before sending.', 'error');
      return;
    }
    const plainText = editorCommentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const statusMap: Record<string, ManuscriptStatus> = {
      'accept': 'Accepted',
      'minor-revision': 'Revision Requested',
      'major-revision': 'Revision Requested',
      'reject': 'Rejected',
      'publish': 'Published',
    };
    const updated: Manuscript = {
      ...manuscript,
      status: statusMap[selectedDecision],
      updatedAt: new Date().toISOString(),
      editorDecisionLog: [
        ...manuscript.editorDecisionLog,
        {
          editorId: currentUser.id,
          decision: selectedDecision,
          comments: plainText,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    updateSelectedManuscript(updated);

    const authorEmail = manuscript.authors.find(a => a.isCorresponding)?.email || manuscript.authors[0]?.email || '';
    const subject = `GBMN Editorial Decision — ${manuscript.id}`;
    try {
      await sendEmail('generic', updated, subject, plainText);
      onShowNotification('Decision sent to author via EmailJS.', 'success');
    } catch {
      onShowNotification('Email failed — decision saved locally.', 'error');
    }
    setShowDecisionPanel(false);
    setEditorCommentHtml('');
    DB.addAuditLog({ userId: currentUser.id, userEmail: currentUser.email, action: `DECISION_${selectedDecision.toUpperCase()}`, targetId: manuscript.id, details: plainText.slice(0, 120) });
  };

  // ─── ASSIGN EDITOR ────────────────────────────────────────────────────────────
  const handleAssignEditor = (manuscript: Manuscript, editorId: string) => {
    if (!editorId) return;
    const editorObj = allEditors.find(u => u.id === editorId);
    if (!editorObj) return;
    const updated: Manuscript = {
      ...manuscript,
      assignedEditorId: editorObj.id,
      assignedEditorName: `${editorObj.firstName} ${editorObj.lastName}`,
      assignedEditorEmail: editorObj.email,
      editorAssignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateSelectedManuscript(updated);
    onShowNotification(`Editor ${editorObj.firstName} ${editorObj.lastName} assigned.`, 'success');
    DB.addAuditLog({ userId: currentUser.id, userEmail: currentUser.email, action: 'EDITOR_ASSIGNED', targetId: manuscript.id, details: `Assigned editor: ${editorObj.email}` });
  };

  // ─── ASSIGN REVIEWER ─────────────────────────────────────────────────────────
  const handleAssignReviewer = (manuscript: Manuscript, reviewerId: string) => {
    const reviewerObj = DB.getUsers().find(u => u.id === reviewerId);
    if (!reviewerObj) return;
    const exists = manuscript.reviewerAssignments.some(ra => ra.reviewerId === reviewerId);
    if (exists) { onShowNotification('Reviewer already assigned.', 'error'); return; }
    const updated: Manuscript = {
      ...manuscript,
      status: 'Reviewer Assigned',
      updatedAt: new Date().toISOString(),
      reviewerAssignments: [
        ...manuscript.reviewerAssignments,
        { reviewerId, reviewerName: `${reviewerObj.firstName} ${reviewerObj.lastName}`, status: 'assigned', assignedAt: new Date().toISOString() },
      ],
    };
    updateSelectedManuscript(updated);
    onShowNotification(`Reviewer ${reviewerObj.firstName} ${reviewerObj.lastName} assigned.`, 'success');
    DB.addAuditLog({ userId: currentUser.id, userEmail: currentUser.email, action: 'REVIEWER_ASSIGNED', targetId: manuscript.id, details: `Dispatched to ${reviewerObj.email}` });
  };

  // ─── EDITOR DECISION (modal) ─────────────────────────────────────────────────
  const handleCommitEditorialDecision = (manuscript: Manuscript, decision: 'accept' | 'minor-revision' | 'major-revision' | 'reject' | 'publish') => {
    const statusMap: Record<string, ManuscriptStatus> = {
      'accept': 'Accepted', 'minor-revision': 'Revision Requested',
      'major-revision': 'Revision Requested', 'reject': 'Rejected', 'publish': 'Published',
    };
    const updated: Manuscript = {
      ...manuscript,
      status: statusMap[decision],
      updatedAt: new Date().toISOString(),
      editorDecisionLog: [
        ...manuscript.editorDecisionLog,
        { editorId: currentUser.id, decision, comments: editorCommentHtml.replace(/<[^>]+>/g, ' ').trim() || 'No remarks.', timestamp: new Date().toISOString() },
      ],
    };
    updateSelectedManuscript(updated);
    setShowDecisionPanel(false);
    setEditorCommentHtml('');
    onShowNotification(`Decision: ${decision.toUpperCase()} recorded.`, 'success');
    DB.addAuditLog({ userId: currentUser.id, userEmail: currentUser.email, action: `DECISION_${decision.toUpperCase()}`, targetId: manuscript.id, details: `Status → ${statusMap[decision]}` });
  };

  // ─── REVIEWER SUBMIT ─────────────────────────────────────────────────────────
  const handleReviewerSubmit = (manuscript: Manuscript, isDraft = false) => {
    const updated = manuscripts.map(item => {
      if (item.id !== manuscript.id) return item;
      const updatedAssignments = item.reviewerAssignments.map(ra => {
        if (ra.reviewerId !== currentUser.id) return ra;
        return {
          ...ra,
          status: isDraft ? 'assigned' as const : 'completed' as const,
          draftReview: reviewComments,
          highlights: reviewHighlights,
          comments: isDraft ? ra.comments : {
            id: `rev-${Date.now()}`,
            reviewerId: currentUser.id,
            reviewerName: `${currentUser.firstName} ${currentUser.lastName}`,
            ethicalConcerns: reviewScoreEthical,
            methodologyScore: reviewScoreMethod,
            originalityScore: reviewScoreOrig,
            scientificMeritScore: reviewScoreMerit,
            constructiveComments: reviewComments || 'See attached evaluation.',
            confidentialToEditor: reviewPrivate,
            recommendation: reviewRecommend,
            submittedAt: new Date().toISOString(),
            highlights: reviewHighlights,
            status: 'submitted' as const,
          },
        };
      });
      return {
        ...item,
        status: isDraft ? item.status : ('Under Review' as ManuscriptStatus),
        updatedAt: new Date().toISOString(),
        reviewerAssignments: updatedAssignments,
      };
    });
    onUpdateManuscripts(updated);
    if (isDraft) {
      setReviewDraftSaved(true);
      onShowNotification('Review draft saved.', 'success');
    } else {
      onShowNotification('Review submitted successfully!', 'success');
      setSelectedManuscript(updated.find(m => m.id === manuscript.id) || null);
      DB.addAuditLog({ userId: currentUser.id, userEmail: currentUser.email, action: 'REVIEW_SUBMITTED', targetId: manuscript.id, details: `Recommendation: ${reviewRecommend}` });
    }
  };

  // ─── HIGHLIGHT ────────────────────────────────────────────────────────────────
  const handleTextHighlight = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text) return;
    setPendingHighlightText(text);
    setShowHighlightNote(true);
    sel.removeAllRanges();
  };

  const confirmHighlight = () => {
    const h: ReviewHighlight = {
      id: `hl-${Date.now()}`,
      text: pendingHighlightText,
      note: highlightNote,
      color: '#fef08a',
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    setReviewHighlights(prev => [...prev, h]);
    setShowHighlightNote(false);
    setHighlightNote('');
    setPendingHighlightText('');
    onShowNotification('Highlight saved.', 'success');
  };

  // ─── ADMIN USERS ─────────────────────────────────────────────────────────────
  const resetUserForm = () => { setEditingUserId(null); setUserForm({ firstName: '', lastName: '', email: '', institution: '', role: 'Author', orcidId: '', isVerified: true }); };
  const handleEditUser = (user: User) => { setEditingUserId(user.id); setUserForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, institution: user.institution, role: user.role, orcidId: user.orcidId || '', isVerified: user.isVerified }); };
  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    const updated = adminUsers.map(u => u.id === userId ? { ...u, role: newRole } : u);
    setAdminUsers(updated); DB.setUsers(updated);
    onShowNotification(`Role updated to ${newRole}.`, 'success');
  };
  const handleSaveAdminUser = (e: FormEvent) => {
    e.preventDefault();
    if (!userForm.firstName || !userForm.lastName || !userForm.email || !userForm.institution) {
      onShowNotification('Fill all required fields.', 'error'); return;
    }
    const dup = adminUsers.some(u => u.email.toLowerCase() === userForm.email.toLowerCase() && u.id !== editingUserId);
    if (dup) { onShowNotification('Email already exists.', 'error'); return; }
    const updated = editingUserId
      ? adminUsers.map(u => u.id === editingUserId ? { ...u, ...userForm } : u)
      : [...adminUsers, { id: `user-${Date.now()}`, ...userForm, orcidId: userForm.orcidId || undefined, joinedDate: new Date().toISOString().split('T')[0] }];
    setAdminUsers(updated); DB.setUsers(updated); resetUserForm();
    onShowNotification(editingUserId ? 'User updated.' : 'User created.', 'success');
  };
  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser.id) { onShowNotification('Cannot delete your own account.', 'error'); return; }
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}?`)) return;
    const updated = adminUsers.filter(u => u.id !== user.id);
    setAdminUsers(updated); DB.setUsers(updated);
    if (editingUserId === user.id) resetUserForm();
    onShowNotification('User deleted.', 'success');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MANUSCRIPT LIST ITEM
  // ════════════════════════════════════════════════════════════════════════════
  const renderManuscriptListItem = (m: Manuscript, isSelected: boolean, onClick: () => void) => {
    const isNew = m.status === 'Submitted' && m.reviewerAssignments.length === 0 && m.editorDecisionLog.length === 0;
    const assignedMs = new Date(m.submittedAt || m.createdAt).getTime();
    const daysSince = Math.floor((Date.now() - assignedMs) / 86400000);
    return (
      <div
        key={m.id}
        onClick={onClick}
        className={`p-3 border rounded-xl cursor-pointer transition-all text-xs ${isSelected ? 'bg-teal-50 border-teal-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
      >
        <div className="flex justify-between items-center gap-1 mb-1">
          <span className="font-mono font-bold text-teal-800 text-[10px]">{m.id}</span>
          <div className="flex gap-1 items-center">
            {isNew && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">NEW</span>}
            {renderStatusBadge(m.status)}
          </div>
        </div>
        <p className="font-bold text-slate-800 line-clamp-2 leading-snug">{m.title || 'Untitled'}</p>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
          <span>{m.authors[0]?.lastName || '—'}, {m.authors[0]?.firstName?.charAt(0)}.</span>
          <span>{daysSince === 0 ? 'Today' : `${daysSince}d ago`}</span>
        </div>
        {m.assignedEditorName && (
          <p className="text-[10px] text-teal-700 font-semibold mt-1">Editor: {m.assignedEditorName}</p>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // EDITOR MANUSCRIPT DETAIL PANEL (right side)
  // ════════════════════════════════════════════════════════════════════════════
  const renderEditorManuscriptPanel = (manuscript: Manuscript) => {
    const reviewers = DB.getUsers().filter(u => u.role === 'Reviewer');
    const latestDecision = manuscript.editorDecisionLog[manuscript.editorDecisionLog.length - 1];

    return (
      <div className="flex flex-col gap-4 h-full">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 border-b pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm leading-snug">{manuscript.title || manuscript.id}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {manuscript.authors[0]?.firstName} {manuscript.authors[0]?.lastName} · {manuscript.authors[0]?.email}
            </p>
          </div>
          <button onClick={() => setOfficeEditMode(!officeEditMode)} className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition ${officeEditMode ? 'bg-teal-700 text-white border-teal-700' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}`}>
            {officeEditMode ? 'Preview mode' : 'Edit article'}
          </button>
        </div>

        {/* Actions row */}
        <div className="grid grid-cols-2 gap-2 no-print text-xs">
          {/* Status */}
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">Status</label>
              <select
                value={manuscript.status}
                onChange={e => updateSelectedManuscript({ ...manuscript, status: e.target.value as ManuscriptStatus, updatedAt: new Date().toISOString() })}
                className="w-full border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-800 text-xs bg-white"
              >
                {manuscriptStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
      <div className="min-h-[calc(100vh-88px)] bg-slate-50 overflow-hidden">
        <div className="grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-[280px_1fr]">
          <aside className="bg-slate-950 p-4 text-white">
            <h2 className="text-sm font-black">GBMN Editorial</h2>
            <p className="mb-5 text-[11px] text-slate-400">{currentUser.role}</p>
            {nav.map(item => (
              <button key={item} onClick={() => setEditorialSection(item)} className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-xs font-bold ${editorialSection === item ? 'bg-teal-600' : 'text-slate-300 hover:bg-white/10'}`}>{item}</button>
            ))}
          </aside>
          <main className="space-y-5 p-4 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h1 className="text-xl font-black">{editorialSection}</h1><p className="text-xs text-slate-500">Clean editorial workflow and action center.</p></div>
              <div className="flex w-full flex-wrap justify-end gap-2 md:w-auto">
                <button onClick={createEditorialDraft} className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-black text-white">Submit Own Manuscript</button>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search title, ID, author email..." className="w-full max-w-sm rounded-xl border bg-white px-4 py-2 text-xs" />
              </div>
            </div>
            {/* Assign Editor */}
            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">Assign Editor</label>
              <div className="flex gap-1">
                <select
                  value={assignEditorId}
                  onChange={e => setAssignEditorId(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
                >
                  <option value="">— Select Editor —</option>
                  {allEditors.map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
                <button
                  onClick={() => { handleAssignEditor(manuscript, assignEditorId); setAssignEditorId(''); }}
                  disabled={!assignEditorId}
                  className="bg-teal-700 disabled:opacity-40 text-white font-bold px-2 rounded-lg text-[11px] hover:bg-teal-800"
                >
                  Assign
                </button>
              </div>
              {manuscript.assignedEditorName && (
                <p className="text-[10px] text-teal-700 mt-0.5 font-semibold">Current: {manuscript.assignedEditorName}</p>
              )}
            </div>
          </div>

          {/* Assign Reviewer */}
          <div className="col-span-2">
            <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">Assign Reviewer</label>
            <select
              onChange={e => { if (e.target.value) { handleAssignReviewer(manuscript, e.target.value); e.target.value = ''; } }}
              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
            >
              <option value="">— Choose Reviewer —</option>
              {reviewers.map(r => (
                <option key={r.id} value={r.id}>{r.firstName} {r.lastName} ({r.institution})</option>
              ))}
            </select>
            {manuscript.reviewerAssignments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {manuscript.reviewerAssignments.map(ra => (
                  <span key={ra.reviewerId} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ra.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ra.status === 'declined' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {ra.reviewerName} · {ra.status}
                  </span>
                ))}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <section className="rounded-2xl border bg-white shadow-xs overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Manuscript</th><th>Author</th><th>Status</th><th>Payment</th><th>DOI</th><th>Submitted</th><th>Action</th></tr></thead>
                  <tbody>{visible.map(m => (
                    <tr key={m.id} onClick={() => setSelectedManuscript(m)} className={`cursor-pointer border-t hover:bg-teal-50 ${selected?.id === m.id ? 'bg-teal-50' : ''}`}>
                      <td className="p-3"><b className="font-mono text-teal-800">{m.id}</b><div className="font-bold line-clamp-1">{m.title || 'Untitled'}</div><div className="text-[10px] text-slate-400">{m.articleType}</div></td>
                      <td>{m.authors[0]?.firstName} {m.authors[0]?.lastName}<div className="text-[10px] text-slate-400">{m.authors[0]?.email}</div></td>
                      <td>{renderStatusBadge(m.status)}</td><td>{m.payment?.status || 'Pending'}</td><td>{m.publicationInfo?.doi ? 'Assigned' : 'Pending'}</td><td>{new Date(m.submittedAt || m.createdAt).toLocaleDateString()}</td>
                      <td><button onClick={(e) => { e.stopPropagation(); openAuthorEmailModal(m); }} className="rounded bg-teal-700 px-3 py-1.5 font-bold text-white">Email</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </section>
              <aside className="space-y-3 rounded-2xl border bg-white p-4 shadow-xs xl:sticky xl:top-24 xl:self-start">
                {selected ? <>
                  <h3 className="text-sm font-black">{selected.title || selected.id}</h3>
                  <p className="text-xs text-slate-500">{selected.authors[0]?.email}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <button onClick={() => openAuthorEmailModal(selected)} className="rounded-lg bg-teal-700 px-3 py-2 font-bold text-white">Email Author</button>
                    <button onClick={() => setOfficeEditMode(!officeEditMode)} className="rounded-lg bg-slate-900 px-3 py-2 font-bold text-white">Edit Article</button>
                    <button onClick={() => setStatus('Revision Requested')} className="rounded-lg bg-amber-600 px-3 py-2 font-bold text-white">Revision</button>
                    <button onClick={() => setStatus('Accepted')} className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white">Accept</button>
                    <button onClick={() => setStatus('Rejected')} className="rounded-lg bg-rose-700 px-3 py-2 font-bold text-white">Reject</button>
                    <button onClick={() => setStatus('Published')} className="rounded-lg bg-teal-950 px-3 py-2 font-bold text-white">Publish</button>
                  </div>
                  <input value={selected.publicationInfo?.volumeIssue || ''} onChange={e => updateSelectedManuscript({ ...selected, publicationInfo: { ...(selected.publicationInfo || {}), volumeIssue: e.target.value }, updatedAt: new Date().toISOString() })} placeholder="VOLUME 4 ISSUE 2. APR-JUN 2026" className="w-full rounded border p-2 text-xs" />
                  <input value={selected.publicationInfo?.doi || ''} onChange={e => updateSelectedManuscript({ ...selected, publicationInfo: { ...(selected.publicationInfo || {}), doi: e.target.value }, updatedAt: new Date().toISOString() })} placeholder="10.52340/GBMN..." className="w-full rounded border p-2 text-xs font-mono" />
                  <button onClick={() => { onUpdateManuscripts(manuscripts.map(m => m.id === selected.id ? selected : m)); onShowNotification('Saved.', 'success'); }} className="w-full rounded bg-teal-700 px-3 py-2 text-xs font-bold text-white">Save Changes</button>
                  {/* Author-uploaded files */}
                  {selected.editorFiles && selected.editorFiles.length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Author Files</p>
                      {selected.editorFiles.map(f => (
                        <a key={f.id} href={f.fileUrl} download={f.fileName} className="block text-[11px] font-bold text-teal-700 hover:underline truncate">{f.fileName}</a>
                      ))}
                    </div>
                  )}
                  <button onClick={() => openAuthorEmailModal(selected, 'acceptance')} className="w-full rounded border p-2 text-xs font-bold text-emerald-800">Acceptance Email</button>
                  <button onClick={() => openAuthorEmailModal(selected, 'payment')} className="w-full rounded border p-2 text-xs font-bold text-amber-800">Payment Email</button>
                  <button onClick={() => openAuthorEmailModal(selected, 'published')} className="w-full rounded border p-2 text-xs font-bold text-teal-800">Published Email</button>
                </> : <p className="text-xs text-slate-500">Select a manuscript.</p>}
              </aside>
            </div>
            {selected && (
              <section className="rounded-2xl border bg-white p-4 shadow-xs">
                {officeEditMode ? (
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-48 shrink-0">
                      <div className="bg-slate-900 rounded-xl p-3 text-white text-xs space-y-1">
                        <p className="font-black text-[10px] uppercase text-slate-400 mb-2">Sections</p>
                        {['title-meta','authors','abstract','keywords','sections','references','ethics','conflicts','funding','editor-files','preview'].map(step => (
                          <button key={step} onClick={() => setOfficeEditStep(step)}
                            className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-bold capitalize ${officeEditStep === step ? 'bg-teal-600' : 'text-slate-300 hover:bg-white/10'}`}>
                            {step.replace(/-/g,' ')}
                          </button>
                        ))}
                        <div className="border-t border-slate-700 pt-2 mt-2 space-y-1">
                          <button onClick={() => { updateSelectedManuscript({ ...selected, updatedAt: new Date().toISOString() }); onShowNotification('Saved.', 'success'); }} className="w-full bg-teal-700 text-white font-bold px-2 py-1.5 rounded text-[11px]">Save Draft</button>
                          <button onClick={() => { updateSelectedManuscript({ ...selected, updatedAt: new Date().toISOString() }); setOfficeEditMode(false); onShowNotification('Saved and closed.', 'success'); }} className="w-full bg-slate-600 text-white font-bold px-2 py-1.5 rounded text-[11px]">Save & Close</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <SubmissionWorkflow manuscript={selected} onUpdateManuscript={updateSelectedManuscript} activeStep={officeEditStep} onStepChange={setOfficeEditStep} onShowNotification={onShowNotification} />
                    </div>
                  </div>
                ) : (
                  <ManuscriptPreview manuscript={selected} onShowNotification={onShowNotification} />
                )}
              </section>
            )}
            {emailDraft.open && emailDraft.manuscript && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
                <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
                  <h3 className="text-sm font-black">Email Author</h3><p className="text-xs text-slate-500">{emailDraft.manuscript.authors[0]?.email}</p>
                  <input value={emailDraft.subject} onChange={e => setEmailDraft(prev => ({ ...prev, subject: e.target.value }))} className="mt-3 w-full rounded border p-2 text-sm" />
                  <textarea value={emailDraft.body} onChange={e => setEmailDraft(prev => ({ ...prev, body: e.target.value }))} rows={12} className="mt-3 w-full rounded border p-3 text-sm" />
                  <div className="mt-4 flex justify-end gap-2"><button onClick={() => setEmailDraft(prev => ({ ...prev, open: false }))} className="rounded border px-4 py-2 text-xs font-bold">Cancel</button><button onClick={async () => { await sendEmail('generic', emailDraft.manuscript!, emailDraft.subject, emailDraft.body); setEmailDraft(prev => ({ ...prev, open: false })); onShowNotification('Email sent.', 'success'); }} className="rounded bg-teal-700 px-4 py-2 text-xs font-bold text-white">Send Email</button></div>
                </div>
              </div>
            )}
          </div>

          {/* Publication info */}
          <div>
            <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">Volume / Issue</label>
            <input
              value={manuscript.publicationInfo?.volumeIssue || ''}
              onChange={e => updateSelectedManuscript({ ...manuscript, publicationInfo: { ...(manuscript.publicationInfo || {}), volumeIssue: e.target.value }, updatedAt: new Date().toISOString() })}
              placeholder="VOL 4 ISSUE 2. APR-JUN 2026"
              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">DOI</label>
            <input
              value={manuscript.publicationInfo?.doi || ''}
              onChange={e => updateSelectedManuscript({ ...manuscript, publicationInfo: { ...(manuscript.publicationInfo || {}), doi: e.target.value }, updatedAt: new Date().toISOString() })}
              placeholder="10.52340/GBMN..."
              className="w-full border border-slate-300 rounded-lg p-1.5 font-mono text-xs"
            />
          </div>

          {/* Save row */}
          <div className="col-span-2 flex gap-2">
            <button onClick={() => { updateSelectedManuscript({ ...manuscript, updatedAt: new Date().toISOString() }); onShowNotification('Saved.', 'success'); }} className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-1.5 rounded-lg text-xs">Save Changes</button>
            <button onClick={() => openAuthorEmailModal(manuscript)} className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-4 py-1.5 rounded-lg text-xs">Email Author</button>
            <button onClick={() => setShowDecisionPanel(!showDecisionPanel)} className={`font-bold px-4 py-1.5 rounded-lg text-xs ${showDecisionPanel ? 'bg-purple-700 text-white' : 'bg-purple-50 border border-purple-300 text-purple-800 hover:bg-purple-100'}`}>
              {showDecisionPanel ? 'Close Decision' : 'Issue Decision'}
            </button>
          </div>
        </div>

        {/* Reviewer feedback visible to editor */}
        {manuscript.reviewerAssignments.some(ra => ra.comments) && (
          <div className="no-print border rounded-xl p-3 bg-amber-50 space-y-2 text-xs">
            <p className="font-bold text-amber-900 uppercase text-[10px]">Reviewer Feedback</p>
            {manuscript.reviewerAssignments.filter(ra => ra.comments).map(ra => (
              <div key={ra.reviewerId} className="bg-white border border-amber-200 rounded-lg p-2.5 space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-800">{ra.reviewerName}</span>
                  <span className="font-bold text-teal-700 uppercase text-[10px]">{ra.comments!.recommendation}</span>
                </div>
                <p className="text-slate-600 italic">"{ra.comments!.constructiveComments}"</p>
                {ra.comments!.confidentialToEditor && (
                  <p className="text-slate-500 text-[10px]">Confidential: {ra.comments!.confidentialToEditor}</p>
                )}
                {ra.highlights && ra.highlights.length > 0 && (
                  <div className="pt-1 border-t border-amber-100">
                    <p className="text-[10px] font-bold text-amber-700 mb-1">Highlights ({ra.highlights.length})</p>
                    {ra.highlights.map(h => (
                      <div key={h.id} className="text-[10px] bg-yellow-50 border border-yellow-200 rounded px-2 py-1 mb-1">
                        <span className="font-semibold">"{h.text}"</span>
                        {h.note && <span className="text-slate-500"> — {h.note}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Decision panel */}
        {showDecisionPanel && (
          <div className="no-print border border-purple-300 rounded-xl p-4 bg-white space-y-3 text-xs shadow-lg">
            <div className="flex justify-between items-center border-b pb-2">
              <h5 className="font-black text-purple-900 text-sm">Editorial Decision Form</h5>
              <button onClick={() => setShowDecisionPanel(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            {/* Auto-populated info */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-2 text-[10px]">
              <span><b>Manuscript:</b> {manuscript.id}</span>
              <span><b>Title:</b> {(manuscript.title || '').slice(0, 40)}…</span>
              <span><b>Author:</b> {manuscript.authors[0]?.firstName} {manuscript.authors[0]?.lastName}</span>
              <span><b>Submitted:</b> {new Date(manuscript.submittedAt || manuscript.createdAt).toLocaleDateString()}</span>
              <span><b>Reviewers:</b> {manuscript.reviewerAssignments.map(r => r.reviewerName).join(', ') || 'None'}</span>
              <span><b>Date:</b> {new Date().toLocaleDateString()}</span>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Decision</label>
              <select value={selectedDecision} onChange={e => setSelectedDecision(e.target.value as any)} className="w-full border border-slate-300 rounded-lg p-2 font-bold text-teal-800 bg-teal-50">
                <option value="accept">Accept Manuscript</option>
                <option value="minor-revision">Minor Revision Required</option>
                <option value="major-revision">Major Revision Required</option>
                <option value="reject">Reject</option>
                <option value="publish">Publish Online</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Comments to Author (rich text)</label>
              <RichTextEditor
                value={editorCommentHtml}
                onChange={setEditorCommentHtml}
                placeholder="Provide detailed editorial comments, revision requests, or acceptance rationale..."
                minHeight="200px"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <button onClick={() => { updateSelectedManuscript({ ...manuscript, updatedAt: new Date().toISOString() }); onShowNotification('Draft saved.', 'success'); }} className="border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50">Save Draft</button>
              <button onClick={() => { updateSelectedManuscript({ ...manuscript, updatedAt: new Date().toISOString() }); setShowDecisionPanel(false); onShowNotification('Saved & closed.', 'success'); }} className="border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50">Save Draft & Close</button>
              <button onClick={() => handleSendToAuthor(manuscript)} className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-1.5 rounded-lg">Send to Author</button>
              <button onClick={() => { handleCommitEditorialDecision(manuscript, selectedDecision); }} className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-1.5 rounded-lg">Commit Decision</button>
            </div>
            {/* Email quick-actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => openAuthorEmailModal(manuscript, 'acceptance')} className="border px-3 py-1 rounded text-[10px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50">Acceptance Email</button>
              <button onClick={() => openAuthorEmailModal(manuscript, 'payment')} className="border px-3 py-1 rounded text-[10px] font-bold text-amber-700 border-amber-200 hover:bg-amber-50">Payment Email</button>
              <button onClick={() => openAuthorEmailModal(manuscript, 'published')} className="border px-3 py-1 rounded text-[10px] font-bold text-teal-700 border-teal-200 hover:bg-teal-50">Published Email</button>
            </div>
          </div>
        )}

        {/* Article view: edit or preview */}
        <div className="rounded-xl border overflow-hidden">
          {officeEditMode ? (
            <div className="flex flex-col md:flex-row gap-0">
              <div className="w-full md:w-44 shrink-0 bg-slate-900 p-3 text-white text-xs space-y-1">
                <p className="font-black text-[10px] uppercase text-slate-400 mb-2">Sections</p>
                {['title-meta','authors','article-type','abstract','keywords','sections','references','supplementary','ethics','conflicts','funding','editor-files','preview'].map(step => (
                  <button key={step} onClick={() => setOfficeEditStep(step)}
                    className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-bold capitalize ${officeEditStep === step ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                    {step.replace(/-/g, ' ')}
                  </button>
                ))}
                <div className="border-t border-slate-700 pt-2 space-y-1">
                  <button onClick={() => { updateSelectedManuscript({ ...manuscript, updatedAt: new Date().toISOString() }); onShowNotification('Draft saved.', 'success'); }} className="w-full bg-teal-700 text-white font-bold px-2 py-1.5 rounded text-[11px]">Save Draft</button>
                  <button onClick={() => { updateSelectedManuscript({ ...manuscript, updatedAt: new Date().toISOString() }); setOfficeEditMode(false); onShowNotification('Saved & closed.', 'success'); }} className="w-full bg-slate-600 text-white font-bold px-2 py-1.5 rounded text-[11px]">Save & Close</button>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <SubmissionWorkflow manuscript={manuscript} onUpdateManuscript={updateSelectedManuscript} activeStep={officeEditStep} onStepChange={setOfficeEditStep} onShowNotification={onShowNotification} />
              </div>
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto">
              <ManuscriptPreview manuscript={manuscript} onShowNotification={onShowNotification} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // EDITOR WORKSPACE (Editor role + Managing Editor + Admin editorial mode)
  // ════════════════════════════════════════════════════════════════════════════
  const renderEditorWorkspace = () => {
    const isEditor = currentUser.role === 'Editor';

    // Nav items for Editor
    const editorNavItems = [
      { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'Assigned Manuscripts', icon: FileText, label: 'Assigned Manuscripts' },
      { id: 'All Manuscripts', icon: BookOpen, label: 'All Manuscripts' },
      { id: 'My Manuscripts', icon: UserIcon, label: 'My Manuscripts' },
      { id: 'Submit Manuscript', icon: Plus, label: 'Submit Manuscript' },
      { id: 'Reviews', icon: Star, label: 'Reviews' },
      { id: 'Profile', icon: UserIcon, label: 'Profile' },
      { id: 'Settings', icon: Settings2, label: 'Settings' },
    ];

    // Admin nav (extended)
    const adminNavItems = [
      { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'Manuscripts', icon: FileText, label: 'All Manuscripts' },
      { id: 'Awaiting Action', icon: AlertCircle, label: 'Awaiting Action' },
      { id: 'Under Review', icon: Clock, label: 'Under Review' },
      { id: 'Revisions', icon: Edit3, label: 'Revisions' },
      { id: 'Accepted', icon: CheckCircle, label: 'Accepted' },
      { id: 'Published', icon: Award, label: 'Published' },
      { id: 'Rejected', icon: XCircle, label: 'Rejected' },
      { id: 'Reviewers', icon: Users, label: 'Reviewers' },
      { id: 'Payments', icon: TrendingUp, label: 'Payments' },
      { id: 'Emails', icon: MessageSquare, label: 'Emails' },
      { id: 'Settings', icon: Settings2, label: 'Settings' },
    ];

    const navItems = isEditor ? editorNavItems : adminNavItems;
    const activeSection = isEditor ? editorNavSection : editorialSection;
    const setActiveSection = isEditor ? setEditorNavSection : setEditorialSection;

    // Filter manuscripts based on section
    const getFilteredManuscripts = () => {
      const q = searchQuery.toLowerCase();
      return sortNewest(manuscripts.filter(m => {
        const matchSearch = !q || m.title.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.authors.some(a => a.email.toLowerCase().includes(q));
        if (!matchSearch) return false;
        if (activeSection === 'Awaiting Action') return m.status === 'Submitted';
        if (activeSection === 'Under Review') return ['Under Review', 'Reviewer Assigned', 'In Review'].includes(m.status);
        if (activeSection === 'Revisions') return m.status === 'Revision Requested';
        if (activeSection === 'Accepted') return m.status === 'Accepted';
        if (activeSection === 'Published') return m.status === 'Published';
        if (activeSection === 'Rejected') return m.status === 'Rejected';
        if (activeSection === 'Payments') return m.payment?.status !== 'verified';
        if (activeSection === 'Assigned Manuscripts') return m.assignedEditorId === currentUser.id;
        if (activeSection === 'All Manuscripts' || activeSection === 'Manuscripts') return m.status !== 'Draft';
        return m.status !== 'Draft';
      }));
    };

    const visibleManuscripts = getFilteredManuscripts();
    const reviewerStatusBadge = (status?: string) => {
      if (status === 'completed') return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Completed</span>;
      if (status === 'declined') return <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Declined</span>;
      return <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">New / Pending</span>;
    };

    const handleInviteAction = (m: Manuscript, statusUpdate: 'completed' | 'declined') => {
      const updated: Manuscript[] = manuscripts.map(item => {
        if (item.id === m.id) {
          const updatedAssignments = item.reviewerAssignments.map(ra => {
            if (ra.reviewerId === currentUser.id) {
              return { 
                ...ra, 
                status: statusUpdate as 'assigned' | 'completed' | 'declined',
                comments: statusUpdate === 'completed' ? {
                  id: `rev-com-${Date.now()}`,
                  reviewerId: currentUser.id,
                  reviewerName: `${currentUser.firstName} ${currentUser.lastName}`,
                  ethicalConcerns: reviewScoreEthical,
                  methodologyScore: reviewScoreMethod,
                  originalityScore: reviewScoreOrig,
                  scientificMeritScore: reviewScoreMerit,
                  constructiveComments: reviewComments || 'Study is of superior design. Suggested minor linguistic improvements.',
                  confidentialToEditor: reviewPrivate,
                  recommendation: reviewRecommend,
                  submittedAt: new Date().toISOString()
                } : undefined
              };
            }
            return ra;
          });
          
          return { 
            ...item, 
            status: statusUpdate === 'completed' ? 'Submitted' as any : item.status, 
            reviewerAssignments: updatedAssignments,
            editorFiles: reviewPdf && statusUpdate === 'completed'
              ? [
                  ...item.editorFiles.filter(file => file.id !== `review-pdf-${currentUser.id}`),
                  {
                    id: `review-pdf-${currentUser.id}`,
                    fileName: reviewPdf.fileName,
                    fileUrl: reviewPdf.fileUrl,
                    type: 'peer-review-pdf',
                    uploadedAt: new Date().toISOString(),
                  }
                ]
              : item.editorFiles
          };
        }
        return item;
      });
      onUpdateManuscripts(updated);
      onShowNotification('Structured reviewer evaluation matrix recorded!', 'success');
      setReviewPdf(null);
      setSelectedManuscript(null);

      DB.addAuditLog({
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'REVIEW_SUBMITTED',
        targetId: m.id,
        details: `Submitting referee response. Recommendation target: ${reviewRecommend}`
      });
    };

    return (
      <div className="min-h-[calc(100vh-88px)] bg-slate-50">
        <div className="grid min-h-[calc(100vh-88px)]" style={{ gridTemplateColumns: '220px 1fr' }}>
          {/* ── Sidebar nav ── */}
          <aside className="bg-slate-950 text-white flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <p className="text-xs font-black text-white">GBMN Editorial</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-[10px] text-teal-400 font-semibold">{currentUser.role}</p>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => { setActiveSection(id); setSelectedManuscript(null); setOfficeEditMode(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold transition ${activeSection === id ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Main content ── */}
          <main className="flex flex-col overflow-hidden">
            {/* Header bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-base font-black text-slate-900">{activeSection}</h1>
                <p className="text-[11px] text-slate-400">Clean editorial workflow.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search title, ID, email…" className="border rounded-lg pl-8 pr-3 py-1.5 text-xs w-60 bg-slate-50" />
                </div>
              </div>
            </div>

            {/* Dashboard overview */}
            {activeSection === 'Dashboard' && (
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Total', value: totalSubmissions, color: 'text-slate-900', onClick: () => setActiveSection('Manuscripts') },
                    { label: 'Awaiting', value: decisionPendingCount, color: 'text-blue-700', onClick: () => setActiveSection('Awaiting Action') },
                    { label: 'Under Review', value: underReviewCount, color: 'text-amber-700', onClick: () => setActiveSection('Under Review') },
                    { label: 'Accepted', value: acceptedCount, color: 'text-emerald-700', onClick: () => setActiveSection('Accepted') },
                  ].map(({ label, value, color, onClick }) => (
                    <button key={label} onClick={onClick} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-teal-400 shadow-xs">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">{label}</span>
                      <span className={`mt-1 block text-2xl font-black ${color}`}>{value}</span>
                    </button>
                  ))}
                </div>
                <div className="bg-white border rounded-2xl p-4 shadow-xs">
                  <h3 className="font-bold text-sm mb-3 text-slate-800">Recent Submissions</h3>
                  <div className="space-y-2">
                    {sortNewest(manuscripts.filter(m => m.status !== 'Draft')).slice(0, 8).map(m =>
                      renderManuscriptListItem(m, selectedManuscript?.id === m.id, () => { setSelectedManuscript(m); setActiveSection('All Manuscripts'); })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* My Manuscripts (editor as author) */}
            {activeSection === 'My Manuscripts' && (
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="flex justify-between items-center">
                  <h2 className="font-black text-slate-900">My Manuscripts</h2>
                  <button
                    onClick={() => { setActiveSection('Submit Manuscript'); }}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> New Manuscript
                  </button>
                </div>
                {editorOwnManuscripts.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-10 text-center text-slate-400 text-sm">
                    No manuscripts yet. <button onClick={() => setActiveSection('Submit Manuscript')} className="text-teal-700 font-bold underline">Submit your first manuscript.</button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {sortNewest(editorOwnManuscripts).map(m => (
                      <div key={m.id} className={`bg-white border rounded-xl p-4 cursor-pointer hover:border-teal-400 ${editorMyMsSelected === m.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}`}
                        onClick={() => setEditorMyMsSelected(editorMyMsSelected === m.id ? null : m.id)}>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] text-teal-800 font-bold">{m.id}</span>
                          {renderStatusBadge(m.status)}
                        </div>
                        <p className="font-bold text-slate-800 mt-1">{m.title || 'Untitled'}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{new Date(m.createdAt).toLocaleDateString()} · {m.articleType}</p>
                        {editorMyMsSelected === m.id && (
                          <div className="mt-3 border-t pt-3">
                            <ManuscriptPreview manuscript={m} onShowNotification={onShowNotification} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit Manuscript */}
            {activeSection === 'Submit Manuscript' && (
              <div className="flex flex-col md:flex-row gap-0 flex-1 overflow-hidden">
                {/* Section sidebar */}
                <div className="w-full md:w-52 shrink-0 bg-slate-900 text-white p-3 overflow-y-auto">
                  <p className="font-black text-[10px] uppercase text-slate-400 mb-3">Submission Steps</p>
                  {['getting-started','policies','checklist','title-meta','authors','article-type','abstract','keywords','sections','references','supplementary','ethics','conflicts','funding','editor-files','payment','preview','submit'].map(step => (
                    <button key={step} onClick={() => setEditorMyMsStep(step)}
                      className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-bold capitalize mb-0.5 ${editorMyMsStep === step ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                      {step.replace(/-/g, ' ')}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {(() => {
                    const myDraft = editorOwnManuscripts.find(m => m.status === 'Draft') || null;
                    if (!myDraft) {
                      return (
                        <div className="text-center py-16">
                          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500 mb-4">No draft in progress.</p>
                          <button
                            onClick={() => {
                              const draft: Manuscript = {
                                id: `GBMN-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
                                status: 'Draft', authorId: currentUser.id,
                                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                                title: '', runningTitle: '', specialty: 'Clinical Medicine', articleType: 'original-research',
                                publicationInfo: { doi: '', volumeIssue: '' }, checklistAgreed: false,
                                authors: [{ id: `auth-${currentUser.id}`, firstName: currentUser.firstName, lastName: currentUser.lastName, email: currentUser.email, phone: '', orcidId: currentUser.orcidId || '', specialty: 'Clinical Medicine', country: 'Georgia', city: 'Tbilisi', institution: currentUser.institution, department: '', affiliation: currentUser.institution, affiliations: [currentUser.institution], academicTitle: '', contributionRole: 'Corresponding Author', contributionTags: [], isCorresponding: true }],
                                abstractContents: {}, sections: {}, figuresAndTables: [], references: [], supplementaryFiles: [],
                                ethics: { humanSubjectsApproved: 'no', irbApprovalNumber: '', irbInstitution: '', animalSubjectsUsed: 'no', animalEthicsStatement: '', informedConsentObtained: 'no' },
                                conflictDisclosure: { hasConflict: false, conflictDetails: '', hasReceivedFunding: false, fundingSource: '', hasIndustryRelation: false, industryRelationDetails: '' },
                                fundingDetails: { fundingAgency: '', grantNumber: '', explanation: '' },
                                payment: { invoiceNumber: `GBMN-INV-${Date.now().toString().slice(-4)}`, referenceId: '', paymentNote: '', fileName: '', status: 'pending', uploadedAt: '' },
                                editorFiles: [], reviewerAssignments: [], editorDecisionLog: [],
                              };
                              onUpdateManuscripts([...manuscripts, draft]);
                              onShowNotification('New draft created.', 'success');
                            }}
                            className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-5 py-2.5 rounded-xl"
                          >
                            Create New Manuscript Draft
                          </button>
                        </div>
                      );
                    }
                    return <SubmissionWorkflow manuscript={myDraft} onUpdateManuscript={m => onUpdateManuscripts(manuscripts.map(x => x.id === m.id ? m : x))} activeStep={editorMyMsStep} onStepChange={setEditorMyMsStep} onShowNotification={onShowNotification} />;
                  })()}
                </div>
              </div>
            )}

            {/* Reviews section */}
            {activeSection === 'Reviews' && (
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <h2 className="font-black text-slate-900">Reviewer Feedback</h2>
                {manuscripts.filter(m => m.reviewerAssignments.some(ra => ra.status === 'completed')).length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-10 text-center text-slate-400 text-sm">No completed reviews yet.</div>
                ) : (
                  sortNewest(manuscripts.filter(m => m.reviewerAssignments.some(ra => ra.status === 'completed'))).map(m => (
                    <div key={m.id} className="bg-white border rounded-xl p-4 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[10px] text-teal-800 font-bold">{m.id}</span>
                          <p className="font-bold text-slate-800">{m.title}</p>
                        </div>
                        {renderStatusBadge(m.status)}
                      </div>
                      {m.reviewerAssignments.filter(ra => ra.comments).map(ra => (
                        <div key={ra.reviewerId} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="font-bold">{ra.reviewerName}</span>
                            <span className="font-bold text-teal-800 uppercase">{ra.comments!.recommendation}</span>
                          </div>
                          <p className="italic text-slate-600">"{ra.comments!.constructiveComments}"</p>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Settings */}
            {activeSection === 'Settings' && (
              <div className="p-6 overflow-y-auto flex-1">
                <form onSubmit={e => { e.preventDefault(); DB.setJournalSettings(journalSettings); onShowNotification('Settings saved.', 'success'); }} className="max-w-2xl space-y-4">
                  <h2 className="font-black text-slate-900 mb-4">Journal Settings</h2>
                  {[
                    { key: 'journalNameFull', label: 'Journal Full Name' },
                    { key: 'journalNameShort', label: 'Journal Short Name' },
                    { key: 'contactEmail', label: 'Contact Email' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
                      <input value={(journalSettings as any)[key] || ''} onChange={e => setJournalSettings(prev => ({ ...prev, [key]: e.target.value }))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                    </div>
                  ))}
                  <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-5 py-2 rounded-lg text-sm">Save Settings</button>
                </form>
              </div>
            )}

            {/* Profile */}
            {activeSection === 'Profile' && (
              <div className="p-6 overflow-y-auto flex-1">
                <div className="max-w-md bg-white border rounded-2xl p-5 shadow-xs space-y-3 text-sm">
                  <h2 className="font-black text-slate-900 border-b pb-2">Profile</h2>
                  <div><b>Name:</b> {currentUser.firstName} {currentUser.lastName}</div>
                  <div><b>Email:</b> {currentUser.email}</div>
                  <div><b>Role:</b> {currentUser.role}</div>
                  <div><b>Institution:</b> {currentUser.institution}</div>
                  {currentUser.orcidId && <div><b>ORCID:</b> <span className="font-mono">{currentUser.orcidId}</span></div>}
                </div>
              </div>
            )}

            {/* Manuscript list + detail (main editorial view) */}
            {!['Dashboard', 'My Manuscripts', 'Submit Manuscript', 'Reviews', 'Settings', 'Profile'].includes(activeSection) && (
              <div className="flex-1 flex overflow-hidden">
                {/* Left: manuscript list */}
                <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
                  <div className="p-3 border-b">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-[10px] font-bold">
                      {(['all', 'pending', 'reviewed'] as const).map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-1 rounded-md capitalize ${activeTab === t ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:bg-white/60'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {visibleManuscripts.filter(m => {
                      if (activeTab === 'pending') return m.status === 'Submitted';
                      if (activeTab === 'reviewed') return m.reviewerAssignments.some(ra => ra.status === 'completed');
                      return true;
                    }).map(m =>
                      renderManuscriptListItem(m, selectedManuscript?.id === m.id, () => { setSelectedManuscript(m); setOfficeEditMode(false); setShowDecisionPanel(false); })
                    )}
                    {visibleManuscripts.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-8">No manuscripts in this view.</p>
                    )}
                  </div>
                </div>

                {/* Right: detail panel */}
                <div className="flex-1 overflow-y-auto p-5">
                  {selectedManuscript ? (
                    renderEditorManuscriptPanel(selectedManuscript)
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                      <FileText className="h-12 w-12 mb-3 opacity-40" />
                      <p className="text-sm">Select a manuscript from the list</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Email modal */}
        {emailDraft.open && emailDraft.manuscript && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-900">Email Author</h3>
                <button onClick={() => setEmailDraft(p => ({ ...p, open: false }))}><X className="h-5 w-5 text-slate-400" /></button>
              </div>
              <p className="text-xs text-slate-500">{emailDraft.manuscript.authors[0]?.email}</p>
              <input value={emailDraft.subject} onChange={e => setEmailDraft(p => ({ ...p, subject: e.target.value }))} className="w-full border rounded-lg p-2 text-sm" placeholder="Subject" />
              <textarea value={emailDraft.body} onChange={e => setEmailDraft(p => ({ ...p, body: e.target.value }))} rows={10} className="w-full border rounded-lg p-2 text-sm font-mono" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEmailDraft(p => ({ ...p, open: false }))} className="border px-4 py-2 rounded-lg text-xs font-bold text-slate-600">Cancel</button>
                <button onClick={async () => { await sendEmail('generic', emailDraft.manuscript!, emailDraft.subject, emailDraft.body); setEmailDraft(p => ({ ...p, open: false })); onShowNotification('Email sent.', 'success'); }} className="bg-teal-700 text-white font-bold px-4 py-2 rounded-lg text-xs">Send Email</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // REVIEWER DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════
  const renderReviewerDashboard = () => {
    const assignedManuscripts = sortNewest(manuscripts.filter(m =>
      m.reviewerAssignments.some(ra => ra.reviewerId === currentUser.id)
    ));

    return (
      <div id="reviewer-dashboard" className="min-h-[calc(100vh-88px)] flex flex-col md:flex-row bg-slate-50">
        {/* Left: list */}
        <div className="w-full md:w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b bg-white">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-teal-700" />
              <h3 className="font-bold text-sm text-slate-800">Reviewer Queue</h3>
            </div>
            <p className="text-[11px] text-slate-500">Welcome, {currentUser.firstName}. Your assigned manuscripts:</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {assignedManuscripts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed rounded-xl">No assigned manuscripts.</div>
            ) : assignedManuscripts.map(m => {
              const ra = m.reviewerAssignments.find(r => r.reviewerId === currentUser.id);
              const isSelected = selectedManuscript?.id === m.id;
              return (
                <div key={m.id} onClick={() => setSelectedManuscript(m)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all text-xs ${isSelected ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100' : ra?.status === 'completed' ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50 hover:border-blue-400'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono font-bold text-teal-800 text-[10px]">{m.id}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${ra?.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : ra?.status === 'declined' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                      {ra?.status === 'completed' ? 'Completed' : ra?.status === 'declined' ? 'Declined' : 'Pending'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 line-clamp-2 leading-snug">{m.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{m.specialty} · Assigned {ra?.assignedAt ? new Date(ra.assignedAt).toLocaleDateString() : 'N/A'}</p>
                  {ra?.comments && (
                    <p className="mt-1 text-[10px] text-emerald-700 font-semibold">Recommendation: {ra.comments.recommendation.toUpperCase()}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: review panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedManuscript ? (
            <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-3">
              <BookOpen className="h-12 w-12 opacity-40" />
              <p>Select a manuscript to review</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col gap-0">
              {/* Top: preview panel */}
              <div className="border-b border-slate-200">
                <div className="bg-white px-4 py-2 flex items-center justify-between border-b">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-teal-700" />
                    <span className="text-xs font-bold text-slate-800">Manuscript Preview — {selectedManuscript.id}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleTextHighlight} className="text-[11px] flex items-center gap-1 bg-yellow-100 border border-yellow-300 text-yellow-800 font-bold px-3 py-1 rounded-lg hover:bg-yellow-200">
                      <Highlighter className="h-3.5 w-3.5" /> Highlight selected text
                    </button>
                    <button onClick={() => setSelectedManuscript(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Close ×</button>
                  </div>
                </div>
                <div className="max-h-[45vh] overflow-y-auto bg-slate-50 p-4">
                  <ManuscriptPreview manuscript={selectedManuscript} onShowNotification={onShowNotification} />
                </div>
              </div>

              {/* Highlights panel */}
              {reviewHighlights.length > 0 && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
                  <p className="text-[10px] font-bold text-yellow-800 uppercase mb-1.5">Highlights ({reviewHighlights.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {reviewHighlights.map(h => (
                      <div key={h.id} className="bg-yellow-100 border border-yellow-300 rounded-lg px-2 py-1 text-[10px] flex items-start gap-1.5 max-w-xs">
                        <span className="font-semibold">"{h.text.slice(0, 60)}{h.text.length > 60 ? '…' : ''}"</span>
                        {h.note && <span className="text-yellow-700">— {h.note}</span>}
                        <button onClick={() => setReviewHighlights(prev => prev.filter(x => x.id !== h.id))} className="text-red-400 hover:text-red-600 ml-1"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlight note dialog */}
              {showHighlightNote && (
                <div className="bg-yellow-50 border-b border-yellow-300 px-4 py-3 flex items-center gap-3 text-xs">
                  <Highlighter className="h-4 w-4 text-yellow-700 shrink-0" />
                  <p className="font-semibold text-yellow-800 shrink-0">Highlight: "{pendingHighlightText.slice(0, 40)}…"</p>
                  <input value={highlightNote} onChange={e => setHighlightNote(e.target.value)} placeholder="Add note (optional)" className="flex-1 border border-yellow-300 rounded px-2 py-1 bg-white" />
                  <button onClick={confirmHighlight} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-3 py-1 rounded-lg">Save</button>
                  <button onClick={() => { setShowHighlightNote(false); setPendingHighlightText(''); }} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
              )}

              {/* Review form */}
              <div className="bg-white p-5 space-y-4 flex-1 overflow-y-auto">
                <div className="border-b pb-3">
                  <h4 className="font-black text-teal-900 text-sm">Peer Review Form</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Manuscript ID: {selectedManuscript.id} · {selectedManuscript.title?.slice(0, 60)}</p>
                </div>

                {/* Auto-info */}
                <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-[11px] border">
                  <div><b className="text-slate-500">Title:</b> <span className="text-slate-700">{selectedManuscript.title}</span></div>
                  <div><b className="text-slate-500">Article Type:</b> <span className="text-slate-700">{selectedManuscript.articleType}</span></div>
                  <div><b className="text-slate-500">Author:</b> <span className="text-slate-700">{selectedManuscript.authors[0]?.firstName} {selectedManuscript.authors[0]?.lastName}</span></div>
                  <div><b className="text-slate-500">Specialty:</b> <span className="text-slate-700">{selectedManuscript.specialty}</span></div>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Section 1: Ethics */}
                  <div className="border rounded-xl p-4 space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">1. Ethical Concerns</h5>
                    <textarea value={reviewScoreEthical} onChange={e => setReviewScoreEthical(e.target.value)} rows={2} placeholder="Describe any ethical concerns, IRB issues, or write 'None identified'…" className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 resize-none" />
                  </div>

                  {/* Section 2: Scores */}
                  <div className="border rounded-xl p-4 space-y-3">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">2. Scientific Assessment</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { label: 'Methodology (1-5)', value: reviewScoreMethod, setter: setReviewScoreMethod, options: [['5', '5 — Pristine & Robust'], ['4', '4 — Good design'], ['3', '3 — Satisfactory'], ['2', '2 — Needs controls'], ['1', '1 — Fatally flawed']] },
                        { label: 'Originality (1-5)', value: reviewScoreOrig, setter: setReviewScoreOrig, options: [['5', '5 — Novel breakthrough'], ['4', '4 — Significant update'], ['3', '3 — Confirms paradigms'], ['2', '2 — Incremental'], ['1', '1 — Repetitive']] },
                        { label: 'Scientific Merit (1-5)', value: reviewScoreMerit, setter: setReviewScoreMerit, options: [['5', '5 — Decisive impact'], ['4', '4 — High value'], ['3', '3 — Average relevance'], ['2', '2 — Minor worth'], ['1', '1 — Deficient']] },
                      ].map(({ label, value, setter, options }) => (
                        <div key={label}>
                          <label className="block font-semibold text-slate-700 mb-1">{label}</label>
                          <select value={value} onChange={e => setter(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50">
                            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Constructive comments */}
                  <div className="border rounded-xl p-4 space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">3. Constructive Comments to Authors *</h5>
                    <p className="text-[10px] text-slate-400">These comments will be shared with the author. Be specific and actionable.</p>
                    <textarea rows={6} value={reviewComments} onChange={e => { setReviewComments(e.target.value); setReviewDraftSaved(false); }}
                      placeholder="Provide detailed commentary on methodology, results interpretation, statistical analysis, writing clarity, and required revisions…"
                      className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 resize-y font-sans" />
                  </div>

                  {/* Section 4: Confidential */}
                  <div className="border rounded-xl p-4 space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">4. Confidential Comments to Editor</h5>
                    <textarea rows={3} value={reviewPrivate} onChange={e => setReviewPrivate(e.target.value)}
                      placeholder="Private insights for the editorial office only. Not visible to author…"
                      className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 resize-y font-sans" />
                  </div>

                  {/* Section 5: Recommendation */}
                  <div className="border rounded-xl p-4 space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">5. Recommendation *</h5>
                    <select value={reviewRecommend} onChange={e => setReviewRecommend(e.target.value as any)} className="w-full bg-teal-50 border border-teal-300 rounded-lg p-2.5 font-bold text-teal-800">
                      <option value="accept">Accept Manuscript Unedited</option>
                      <option value="minor-revision">Accept with Minor Revisions</option>
                      <option value="major-revision">Re-evaluate after Major Revisions</option>
                      <option value="reject">Decline / Reject Submission</option>
                    </select>
                  </div>

                  {/* Highlights summary in form */}
                  {reviewHighlights.length > 0 && (
                    <div className="border rounded-xl p-4 bg-yellow-50">
                      <h5 className="font-bold text-yellow-800 uppercase text-[10px] tracking-wide mb-2">Text Highlights ({reviewHighlights.length})</h5>
                      <div className="space-y-1.5">
                        {reviewHighlights.map((h, i) => (
                          <div key={h.id} className="text-[11px] bg-white border border-yellow-200 rounded-lg px-3 py-1.5">
                            <span className="text-slate-500 font-bold">[{i + 1}]</span>{' '}
                            <span className="font-semibold">"{h.text}"</span>
                            {h.note && <span className="text-slate-500 ml-2">— {h.note}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleReviewerSubmit(selectedManuscript, true)}
                      className="border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" /> Save Draft
                    </button>
                    <button
                      onClick={() => { handleReviewerSubmit(selectedManuscript, true); setSelectedManuscript(null); }}
                      className="border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs hover:bg-slate-50"
                    >
                      Save Draft & Close
                    </button>
                    <button
                      onClick={() => handleReviewerSubmit(selectedManuscript, false)}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-5 py-2 rounded-lg text-xs flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Submit Review
                    </button>
                    <button
                      onClick={() => {
                        const ra = selectedManuscript.reviewerAssignments.find(r => r.reviewerId === currentUser.id);
                        const updated = manuscripts.map(item => item.id === selectedManuscript.id ? {
                          ...item,
                          reviewerAssignments: item.reviewerAssignments.map(r => r.reviewerId === currentUser.id ? { ...r, status: 'declined' as const } : r)
                        } : item);
                        onUpdateManuscripts(updated);
                        setSelectedManuscript(null);
                        onShowNotification('Review invitation declined.', 'info');
                      }}
                      className="border border-rose-200 text-rose-700 font-bold px-4 py-2 rounded-lg text-xs hover:bg-rose-50"
                    >
                      Decline Invitation
                    </button>
                  </div>
                  {reviewDraftSaved && <p className="text-[11px] text-teal-700 font-semibold">✓ Draft saved</p>}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Constructive Comments to Authors *</label>
                  <textarea
                    rows={4}
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Enter detailed paragraph reviewing biochemical, methodological, or editorial adjustments required..."
                    className="w-full bg-slate-50 border border-slate-350 rounded-lg p-2.5 font-sans"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Private Comments to Editor (Confidential)</label>
                  <input
                    type="text"
                    value={reviewPrivate}
                    onChange={(e) => setReviewPrivate(e.target.value)}
                    placeholder="Add direct recommendation insights for editorial eyes only..."
                    className="w-full bg-slate-50 border border-slate-350 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peer Review PDF Upload (optional)</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setReviewPdf({ fileName: file.name, fileUrl: String(reader.result || '') });
                      reader.readAsDataURL(file);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs"
                  />
                  {reviewPdf && <p className="mt-1 text-[10px] font-bold text-teal-700">{reviewPdf.fileName} ready.</p>}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Referee Consensus Recommendation *</label>
                  <select
                    value={reviewRecommend}
                    onChange={(e) => setReviewRecommend(e.target.value as any)}
                    className="w-full bg-teal-50 border border-teal-350 rounded-lg p-2.5 font-bold text-teal-800"
                  >
                    <option value="accept">Accept Manuscript Unedited</option>
                    <option value="minor-revision">Accept with Minor Revisions</option>
                    <option value="major-revision">Re-evaluate after Major Revisions</option>
                    <option value="reject">Decline / Reject Submission</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => handleInviteAction(selectedManuscript, 'completed')}
                    className="flex-1 bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2 rounded-lg text-xs"
                  >
                    Submit Advisory Review Block
                  </button>
                  <button
                    onClick={() => handleInviteAction(selectedManuscript, 'declined')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border p-2 rounded-lg text-xs font-semibold"
                  >
                    Decline Review Invitation
                  </button>
                </div>
              </div>

              {/* View inline paper button */}
              <div className="border-t pt-3">
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const selection = window.getSelection();
                      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
                      const range = selection.getRangeAt(0);
                      const mark = document.createElement('mark');
                      mark.className = 'bg-yellow-200 px-0.5';
                      try {
                        range.surroundContents(mark);
                        selection.removeAllRanges();
                      } catch {
                        onShowNotification('Select a clean text fragment to highlight.', 'error');
                      }
                    }}
                    className="rounded bg-yellow-100 px-3 py-1.5 text-[11px] font-bold text-yellow-900"
                  >
                    Highlight selected text
                  </button>
                </div>
                <div className="max-h-[760px] overflow-y-auto rounded-xl border bg-white p-3">
                  <ManuscriptPreview manuscript={selectedManuscript} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MANAGING EDITOR (audit logs)
  // ════════════════════════════════════════════════════════════════════════════
  const renderManagingEditorWorkspace = () => (
    <div id="managing-editor-dash" className="space-y-6">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Database className="h-5 w-5 text-teal-700" /> Platform Audit Console
        </h3>
      </div>
      <div className="bg-white border p-5 rounded-2xl shadow-xs space-y-4">
        <h4 className="font-bold text-sm text-slate-700 flex items-center gap-1.5 border-b pb-2">
          <AlertCircle className="h-4 w-4 text-red-500" /> Secure Event Stream
        </h4>
        <div className="bg-slate-900 text-emerald-400 font-mono text-[10px] p-4 rounded-xl h-64 overflow-y-auto space-y-2 select-text">
          <div className="text-white border-b border-slate-700 pb-1 mb-2">SECURE SHA-256 EVENT STREAM</div>
          {DB.getAuditLogs().map(log => (
            <div key={log.id} className="leading-snug">
              <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
              <span className="text-teal-400 font-bold">{log.action}</span> —{' '}
              <span className="text-slate-300">{log.details}</span>{' '}
              <span className="text-slate-500 font-bold">(ID: {log.targetId})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ADMINISTRATOR PANEL (users + article specs)
  // ════════════════════════════════════════════════════════════════════════════
  const renderAdministratorPanel = () => (
    <div id="admin-hub" className="space-y-6">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-teal-700" /> Central Administrator Hub
        </h3>
      </div>

      <form onSubmit={handleSaveAdminUser} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <div>
            <h4 className="font-bold text-sm text-slate-800">{editingUserId ? 'Edit User' : 'Create User'}</h4>
            <p className="text-xs text-slate-500">Manage all journal users.</p>
          </div>
          {editingUserId && <button type="button" onClick={resetUserForm} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Cancel</button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <input value={userForm.firstName} onChange={e => setUserForm(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" className="border border-slate-300 rounded-lg p-2 bg-slate-50" />
          <input value={userForm.lastName} onChange={e => setUserForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className="border border-slate-300 rounded-lg p-2 bg-slate-50" />
          <input value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="border border-slate-300 rounded-lg p-2 bg-slate-50" />
          <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value as UserRole }))} className="border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold">
            <option value="Author">Author</option>
            <option value="Editor">Editor</option>
            <option value="Managing Editor">Managing Editor</option>
            <option value="Reviewer">Reviewer</option>
            <option value="Administrator">Administrator</option>
          </select>
          <input value={userForm.institution} onChange={e => setUserForm(p => ({ ...p, institution: e.target.value }))} placeholder="Institution" className="md:col-span-2 border border-slate-300 rounded-lg p-2 bg-slate-50" />
          <input value={userForm.orcidId} onChange={e => setUserForm(p => ({ ...p, orcidId: e.target.value }))} placeholder="ORCID iD" className="border border-slate-300 rounded-lg p-2 bg-slate-50" />
          <label className="flex items-center gap-2 border border-slate-300 rounded-lg p-2 bg-slate-50 font-semibold text-slate-700 text-xs">
            <input type="checkbox" checked={userForm.isVerified} onChange={e => setUserForm(p => ({ ...p, isVerified: e.target.checked }))} /> Verified
          </label>
        </div>
        <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg">
          {editingUserId ? 'Save Changes' : 'Create User'}
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border p-5 rounded-2xl shadow-xs space-y-4">
          <h4 className="font-bold text-sm text-slate-700 border-b pb-2">User Directory</h4>
          <div className="overflow-x-auto text-xs">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50 font-bold text-slate-600">
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Role</th>
                  <th className="p-2 text-left">Verified</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-2 font-semibold">{user.firstName} {user.lastName}</td>
                    <td className="p-2 text-slate-500">{user.email}</td>
                    <td className="p-2">
                      <select value={user.role} onChange={e => handleUpdateUserRole(user.id, e.target.value as UserRole)}
                        className={`p-1.5 rounded font-bold text-[10px] uppercase border ${user.role === 'Author' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : user.role === 'Editor' ? 'bg-teal-50 border-teal-200 text-teal-800' : user.role === 'Reviewer' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <option value="Author">Author</option>
                        <option value="Editor">Editor</option>
                        <option value="Managing Editor">Managing Editor</option>
                        <option value="Reviewer">Reviewer</option>
                        <option value="Administrator">Administrator</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <button onClick={() => { const u = adminUsers.map(x => x.id === user.id ? { ...x, isVerified: !x.isVerified } : x); setAdminUsers(u); DB.setUsers(u); onShowNotification('Updated.', 'success'); }}
                        className={`px-2 py-1 rounded text-[10px] font-bold border ${user.isVerified ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {user.isVerified ? 'Verified' : 'Unverified'}
          {/* ACTIVE DECISION/REVIEW WORKPLANE */}
          <div className="lg:col-span-8 space-y-4">
            {selectedManuscript ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                
                <div id="editor-action-header" className="flex flex-wrap justify-between items-center gap-2 border-b pb-4 no-print">
                  <div>
                    <h3 className="font-bold text-md text-slate-800 flex items-center gap-1.5">
                      <FileText className="h-5 w-5 text-teal-700" />
                      Manuscript Pipeline Review
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Evaluate credentials, financial clearance, IRBs, and draft recommendations.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOfficeEditMode(!officeEditMode)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all"
                    >
                      {officeEditMode ? 'Return to Preview' : 'Edit Full Article'}
                    </button>
                    <button
                      onClick={() => setShowDecisionModal(true)}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all"
                    >
                      Issue Formal Decision
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border p-3 rounded-xl text-xs no-print space-y-2">
                  <label className="block font-bold text-slate-700 mb-1">Editorial status visible to author</label>
                  <select
                    value={selectedManuscript.status}
                    onChange={(event) => updateSelectedManuscript({ ...selectedManuscript, status: event.target.value as ManuscriptStatus, updatedAt: new Date().toISOString() })}
                    className="w-full bg-white border border-slate-300 rounded p-2 font-semibold text-slate-800"
                  >
                    {manuscriptStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { updateSelectedManuscript({ ...selectedManuscript, updatedAt: new Date().toISOString() }); onShowNotification('Manuscript changes saved.', 'success'); }}
                      className="flex-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { updateSelectedManuscript({ ...selectedManuscript, status: 'Draft', updatedAt: new Date().toISOString() }); onShowNotification('Marked as Draft.', 'info'); }}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg"
                    >
                      Mark as Draft
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border p-3 rounded-xl text-xs no-print space-y-2">
                  <label className="block font-bold text-slate-700">Author email actions</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => sendTemplateEmail(selectedManuscript, 'acceptance')}
                      className="rounded bg-emerald-700 px-3 py-2 font-bold text-white"
                    >
                      Acceptance Email
                    </button>
                    <button
                      type="button"
                      onClick={() => sendTemplateEmail(selectedManuscript, 'payment')}
                      className="rounded bg-amber-700 px-3 py-2 font-bold text-white"
                    >
                      Payment Email
                    </button>
                    <button
                      type="button"
                      onClick={() => sendTemplateEmail(selectedManuscript, 'published')}
                      className="rounded bg-teal-800 px-3 py-2 font-bold text-white"
                    >
                      Published Email
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Download PDF/DOCX from the preview and attach it to the opened email draft.</p>
                </div>

                <div className="bg-slate-50 border p-3 rounded-xl text-xs no-print grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Issue / Volume label</label>
                    <input
                      value={selectedManuscript.publicationInfo?.volumeIssue || ''}
                      onChange={(event) => updateSelectedManuscript({
                        ...selectedManuscript,
                        publicationInfo: { ...(selectedManuscript.publicationInfo || {}), volumeIssue: event.target.value },
                        updatedAt: new Date().toISOString()
                      })}
                      placeholder="VOLUME 4 ISSUE 2. APR-JUN 2026"
                      className="w-full bg-white border border-slate-300 rounded p-2 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">DOI</label>
                    <input
                      value={selectedManuscript.publicationInfo?.doi || ''}
                      onChange={(event) => updateSelectedManuscript({
                        ...selectedManuscript,
                        publicationInfo: { ...(selectedManuscript.publicationInfo || {}), doi: event.target.value },
                        updatedAt: new Date().toISOString()
                      })}
                      placeholder="10.52340/GBMN.2026.01.01.167"
                      className="w-full bg-white border border-slate-300 rounded p-2 font-mono text-teal-800"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { onUpdateManuscripts(manuscripts.map(m => m.id === selectedManuscript.id ? selectedManuscript : m)); onShowNotification('Publication info saved.', 'success'); }}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  Save DOI / Issue
                </button>

                {/* Submitting author specs + uploaded files */}
                <div id="editor-submission-author-card" className="bg-slate-50 border p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs no-print">
                  <div>
                    <span className="text-slate-400 font-semibold block">Primary Author</span>
                    <span className="font-medium text-slate-700">
                      {selectedManuscript.authors[0]?.firstName} {selectedManuscript.authors[0]?.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">ORCID Identification</span>
                    <span className="font-mono text-teal-700">{selectedManuscript.authors[0]?.orcidId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Ethics Release (IRB)</span>
                    <span className={selectedManuscript.ethics.humanSubjectsApproved === 'yes' ? 'text-green-700 font-semibold' : 'text-slate-600'}>
                      {selectedManuscript.ethics.humanSubjectsApproved.toUpperCase()} ({selectedManuscript.ethics.irbApprovalNumber || 'Exempt'})
                    </span>
                  </div>
                </div>

                {/* Author uploaded files */}
                {selectedManuscript.editorFiles && selectedManuscript.editorFiles.length > 0 && (
                  <div className="bg-white border p-3 rounded-xl text-xs no-print">
                    <h4 className="font-bold text-slate-700 mb-2">Author-Uploaded Files</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedManuscript.editorFiles.map(f => (
                        <a key={f.id} href={f.fileUrl} download={f.fileName}
                          className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1.5 rounded-lg font-bold text-[11px] hover:bg-teal-100">
                          ⬇ {f.fileName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned Reviewer Stats & comments matrix */}
                <div id="editor-reviewer-pipeline" className="border-t pt-4 space-y-3 no-print">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-700" />
                    Reviewers Assigned Index
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Add Reviewer */}
                    <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-2">
                      <span className="font-bold block text-slate-800">Delegate Peer Referee:</span>
                      <select 
                        onChange={(e) => {
                          if (e.target.value) handleAssignReviewer(selectedManuscript, e.target.value);
                          e.target.value = '';
                        }}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 focus:outline-hidden"
                      >
                        <option value="">-- Choose Academic Referee --</option>
                        {adminUsers.filter(u => u.role === 'Reviewer').map(rev => (
                          <option key={rev.id} value={rev.id}>
                            {rev.firstName} {rev.lastName} ({rev.institution})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Check Reviewers progress */}
                    <div className="space-y-2">
                      {selectedManuscript.reviewerAssignments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No reviewers delegated yet. Use selector to allocate independent assessment.</p>
                      ) : (
                        selectedManuscript.reviewerAssignments.map((ra) => (
                          <div key={ra.reviewerId} className="bg-amber-50/44 border border-amber-100 p-2 text-xs rounded-sm">
                            <div className="flex justify-between">
                              <span className="font-bold text-slate-800">{ra.reviewerName}</span>
                              <span className="font-semibold text-teal-800 uppercase text-[9px]">{ra.status}</span>
                            </div>
                            {ra.comments && (
                              <div className="mt-1.5 border-t border-amber-200/55 pt-1 space-y-1">
                                <p className="italic">"{ra.comments.constructiveComments}"</p>
                                <p className="font-semibold text-[10px]">Recommendation: <span className="text-rose-700 uppercase">{ra.comments.recommendation}</span></p>
                              </div>
                            )}
                          </div>
                      )))}
                    </div>
                  </div>
                </div>

                {officeEditMode ? (
                  <div className="border-t pt-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-56 shrink-0">
                        <div className="bg-slate-900 rounded-xl p-3 text-white text-xs space-y-1">
                          <p className="font-black text-[10px] uppercase text-slate-400 mb-2">Article Sections</p>
                          {['getting-started','title-meta','authors','article-type','abstract','keywords','sections','references','supplementary','ethics','conflicts','funding','editor-files','preview'].map(step => (
                            <button key={step} onClick={() => setOfficeEditStep(step)}
                              className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-bold capitalize ${officeEditStep === step ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                              {step.replace(/-/g,' ')}
                            </button>
                          ))}
                          <div className="border-t border-slate-700 pt-2 mt-2 space-y-1">
                            <button
                              onClick={() => { updateSelectedManuscript({ ...selectedManuscript, updatedAt: new Date().toISOString() }); onShowNotification('Draft saved.', 'success'); }}
                              className="w-full bg-teal-700 hover:bg-teal-600 text-white font-bold px-2 py-1.5 rounded text-[11px]">
                              Save Draft
                            </button>
                            <button
                              onClick={() => { updateSelectedManuscript({ ...selectedManuscript, updatedAt: new Date().toISOString() }); setOfficeEditMode(false); onShowNotification('Draft saved and closed.', 'success'); }}
                              className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold px-2 py-1.5 rounded text-[11px]">
                              Save Draft & Close
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <SubmissionWorkflow
                          manuscript={selectedManuscript}
                          onUpdateManuscript={updateSelectedManuscript}
                          activeStep={officeEditStep}
                          onStepChange={setOfficeEditStep}
                          onShowNotification={onShowNotification}
                        />
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="max-h-[850px] overflow-y-auto rounded-xl border bg-white p-3">
                    <ManuscriptPreview manuscript={selectedManuscript} onShowNotification={onShowNotification} />
                  </div>
                )}

                {/* Issue Decision Modal Content */}
                {showDecisionModal && (
                  <div className="bg-white border border-teal-500 rounded-xl p-4 mt-4 space-y-4 shadow-xl no-print animate-fade-in text-xs">
                    <h5 className="font-bold text-sm text-teal-850">Submit Final Editorial Office Verdict</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block font-semibold mb-1">Constructive feedback / reasons for author *</label>
                        <textarea
                          rows={4}
                          value={editorComments}
                          onChange={(e) => setEditorComments(e.target.value)}
                          placeholder="Provide specific notes regarding structural, statistical, or formatting revisions requested..."
                          className="w-full bg-slate-50 border p-2 rounded"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCommitEditorialDecision(selectedManuscript, 'accept')}
                          className="flex-1 bg-green-700 text-white font-semibold py-2 rounded shadow-xs cursor-pointer text-center"
                        >
                          Accept Manuscript
                        </button>
                        <button
                          onClick={() => handleCommitEditorialDecision(selectedManuscript, 'minor-revision')}
                          className="flex-1 bg-amber-600 text-white font-semibold py-2 rounded shadow-xs cursor-pointer text-center"
                        >
                          Request Revisions
                        </button>
                        <button
                          onClick={() => handleCommitEditorialDecision(selectedManuscript, 'reject')}
                          className="flex-1 bg-rose-700 text-white font-semibold py-2 rounded shadow-xs cursor-pointer text-center"
                        >
                          Decline Paper
                        </button>
                        <button
                          onClick={() => handleCommitEditorialDecision(selectedManuscript, 'publish')}
                          className="flex-1 bg-teal-800 text-white font-semibold py-2 rounded shadow-xs cursor-pointer text-center"
                        >
                          Publish Live Online
                        </button>
                      </div>
                      <button
                        onClick={() => setShowDecisionModal(false)}
                        className="w-full text-center text-xs text-slate-400 hover:underline mt-2"
                      >
                        Cancel verdict and return
                      </button>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button onClick={() => handleEditUser(user)} className="text-[10px] font-bold text-teal-700 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteUser(user)} className="text-[10px] font-bold text-rose-600 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border p-5 rounded-2xl shadow-xs space-y-4">
          <h4 className="font-bold text-sm text-slate-700 border-b pb-2">Article Spec Quotas</h4>
          <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
            {Object.values(ARTICLE_TYPES).map(type => (
              <div key={type.key} className="p-3 bg-slate-50 rounded-lg border space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{type.name}</span>
                  <span className="text-teal-800">${type.submissionFeeUSD} USD</span>
                </div>
                <p className="text-slate-500 italic text-[11px] leading-tight">{type.description}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-slate-600 border-t border-slate-200">
                  <span>Max Words: <strong>{type.maxWordCount}</strong></span>
                  <span>Max Refs: <strong>{type.maxReferences}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div id="central-role-dashboards">
      {/* EDITOR */}
      {currentUser.role === 'Editor' && renderEditorWorkspace()}

      {/* REVIEWER */}
      {currentUser.role === 'Reviewer' && renderReviewerDashboard()}

      {/* MANAGING EDITOR */}
      {currentUser.role === 'Managing Editor' && (
        <div className="space-y-8">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4 mx-4 mt-4">
            <h3 className="text-sm font-bold text-teal-900">Managing Editor Full Access</h3>
            <p className="text-xs text-teal-800 mt-1">Full editorial workflow, reviewer management, and audit access.</p>
          </div>
          {renderEditorWorkspace()}
          <div className="p-6">{renderManagingEditorWorkspace()}</div>
        </div>
      )}

      {/* ADMINISTRATOR */}
      {currentUser.role === 'Administrator' && (
        <div className="space-y-0">
          <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Administrator Full System Access</h3>
              <p className="text-xs text-slate-300 mt-1">Editorial control, audit console, and user management.</p>
            </div>
            <div className="flex gap-1 bg-white/10 p-1 rounded-lg text-xs font-bold">
              <button onClick={() => setAdminMode('editorial')} className={`px-3 py-1.5 rounded-md ${adminMode === 'editorial' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}>Editorial</button>
              <button onClick={() => setAdminMode('finance')} className={`px-3 py-1.5 rounded-md ${adminMode === 'finance' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}>Finance/Audit</button>
              <button onClick={() => setAdminMode('users')} className={`px-3 py-1.5 rounded-md ${adminMode === 'users' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}>Users</button>
            </div>
          </div>
          {adminMode === 'editorial' && renderEditorWorkspace()}
          {adminMode === 'finance' && <div className="p-6">{renderManagingEditorWorkspace()}</div>}
          {adminMode === 'users' && <div className="p-6">{renderAdministratorPanel()}</div>}
        </div>
      )}
    </div>
  );
}
