/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, FormEvent } from 'react';
import { User, UserRole, Manuscript, ManuscriptStatus, JournalSettings, ReviewHighlight } from '../types';
import { DB, ARTICLE_TYPES } from '../utils';
import ManuscriptPreview from './ManuscriptPreview';
import SubmissionWorkflow from './SubmissionWorkflow';
import RichTextEditor from './RichTextEditor';
import { acceptanceNotice, paymentRequest, publishedNotice, reviewerInvitation, sendEmail, sendEmailToAddress } from '../emailTemplates';
import {
  Users,
  FileText,
  Settings2,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Search,
  Database,
  AlertCircle,
  LayoutDashboard,
  Send,
  Edit3,
  Highlighter,
  Star,
  Plus,
  Eye,
  Save,
  X,
  User as UserIcon,
  Award,
  MessageSquare,
  Menu,
  ArrowLeft,
} from 'lucide-react';

interface RoleDashboardsProps {
  currentUser: User;
  manuscripts: Manuscript[];
  onUpdateManuscripts: (newManuscripts: Manuscript[]) => void;
  onShowNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

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
  const [editorNavSection, setEditorNavSection] = useState('Dashboard');
  const [officeEditMode, setOfficeEditMode] = useState(false);
  const [officeEditStep, setOfficeEditStep] = useState('title-meta');
  const [editorCommentHtml, setEditorCommentHtml] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<'accept' | 'minor-revision' | 'major-revision' | 'reject' | 'publish'>('minor-revision');
  const [showDecisionPanel, setShowDecisionPanel] = useState(false);
  const [assignEditorId, setAssignEditorId] = useState('');
  const [assignReviewerId, setAssignReviewerId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [adminMode, setAdminMode] = useState<'editorial' | 'finance' | 'users'>('editorial');
  const [editorialSection, setEditorialSection] = useState('Dashboard');
  const [emailDraft, setEmailDraft] = useState<{ open: boolean; manuscript: Manuscript | null; subject: string; body: string }>({ open: false, manuscript: null, subject: '', body: '' });
  const [adminUsers, setAdminUsers] = useState<User[]>(() => DB.getUsers());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', email: '', institution: '', role: 'Author' as UserRole, orcidId: '', isVerified: true, tempPassword: '' });
  const [journalSettings, setJournalSettings] = useState<JournalSettings>(() => DB.getJournalSettings());
  const editorOwnManuscripts = manuscripts.filter(m => m.authorId === currentUser.id);
  const [editorMyMsStep, setEditorMyMsStep] = useState('title-meta');
  const [editorMyMsSelected, setEditorMyMsSelected] = useState<string | null>(null);

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
    if (!selectedManuscript) return;
    const latest = manuscripts.find(item => item.id === selectedManuscript.id);
    if (latest && latest !== selectedManuscript) setSelectedManuscript(latest);
  }, [manuscripts, selectedManuscript]);

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

  const openAuthorEmailModal = (manuscript: Manuscript, preset: 'custom' | 'acceptance' | 'payment' | 'published' = 'custom') => {
    const email = preset === 'acceptance' ? acceptanceNotice(manuscript)
      : preset === 'payment' ? paymentRequest(manuscript)
      : preset === 'published' ? publishedNotice(manuscript)
      : { subject: `GBMN Manuscript ${manuscript.id}`, body: `Dear Author,\n\n\n\nRegards,\nGBMN Editorial Office` };
    setEmailDraft({ open: true, manuscript, subject: email.subject, body: email.body });
  };

  const handleSendToAuthor = async (manuscript: Manuscript) => {
    if (!editorCommentHtml.trim()) { onShowNotification('Please add a comment before sending.', 'error'); return; }
    const plainText = editorCommentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const statusMap: Record<string, ManuscriptStatus> = {
      'accept': 'Accepted', 'minor-revision': 'Revision Requested',
      'major-revision': 'Revision Requested', 'reject': 'Rejected', 'publish': 'Published',
    };
    const updated: Manuscript = {
      ...manuscript,
      status: statusMap[selectedDecision],
      updatedAt: new Date().toISOString(),
      editorDecisionLog: [...manuscript.editorDecisionLog, { editorId: currentUser.id, decision: selectedDecision, comments: plainText, timestamp: new Date().toISOString() }],
    };
    updateSelectedManuscript(updated);
    try {
      const result = await sendEmail('generic', updated, `GBMN Editorial Decision — ${manuscript.id}`, plainText);
      onShowNotification(result.fallback ? 'Decision saved. Mail client opened for delivery.' : 'Decision sent to author.', 'success');
    } catch {
      onShowNotification('Email delivery failed — decision recorded locally.', 'info');
    }
    setShowDecisionPanel(false);
    setEditorCommentHtml('');
    DB.addAuditLog({ userId: currentUser.id, userEmail: currentUser.email, action: `DECISION_${selectedDecision.toUpperCase()}`, targetId: manuscript.id, details: plainText.slice(0, 120) });
  };

  const handleAssignEditor = (manuscript: Manuscript, editorId: string) => {
    if (!editorId) return;
    const editorObj = allEditors.find(u => u.id === editorId);
    if (!editorObj) return;
    updateSelectedManuscript({
      ...manuscript,
      assignedEditorId: editorObj.id,
      assignedEditorName: `${editorObj.firstName} ${editorObj.lastName}`,
      assignedEditorEmail: editorObj.email,
      editorAssignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onShowNotification(`Editor ${editorObj.firstName} ${editorObj.lastName} assigned.`, 'success');
    DB.addAuditLog({ userId: currentUser.id, userEmail: currentUser.email, action: 'EDITOR_ASSIGNED', targetId: manuscript.id, details: `Assigned editor: ${editorObj.email}` });
  };

  const handleAssignReviewer = async (manuscript: Manuscript, reviewerId: string) => {
    const reviewerObj = DB.getUsers().find(u => u.id === reviewerId);
    if (!reviewerObj) return;
    if (manuscript.reviewerAssignments.some(ra => ra.reviewerId === reviewerId || ra.reviewerEmail === reviewerObj.email)) { onShowNotification('Reviewer already assigned.', 'error'); return; }
    const reviewerFullName = `${reviewerObj.firstName} ${reviewerObj.lastName}`;
    updateSelectedManuscript({
      ...manuscript,
      status: 'Reviewer Assigned',
      updatedAt: new Date().toISOString(),
      reviewerAssignments: [...manuscript.reviewerAssignments, { reviewerId, reviewerName: reviewerFullName, reviewerEmail: reviewerObj.email, status: 'assigned', assignedAt: new Date().toISOString() }],
    });
    onShowNotification(`Reviewer ${reviewerFullName} assigned.`, 'success');
    DB.addAuditLog({ userId: currentUser.id, userEmail: currentUser.email, action: 'REVIEWER_ASSIGNED', targetId: manuscript.id, details: `Dispatched to ${reviewerObj.email}` });
    try {
      const inv = reviewerInvitation(manuscript, reviewerFullName);
      await sendEmailToAddress(reviewerObj.email, reviewerFullName, inv.subject, inv.body);
      onShowNotification(`Invitation email sent to ${reviewerObj.email}.`, 'success');
    } catch {
      onShowNotification('Reviewer assigned — invitation email could not be delivered.', 'info');
    }
  };

  const handleRemoveReviewer = (manuscript: Manuscript, reviewerId: string) => {
    const reviewer = manuscript.reviewerAssignments.find(ra => ra.reviewerId === reviewerId);
    updateSelectedManuscript({
      ...manuscript,
      reviewerAssignments: manuscript.reviewerAssignments.filter(ra => ra.reviewerId !== reviewerId),
      status: manuscript.reviewerAssignments.length <= 1 ? 'Submitted' : manuscript.status,
      updatedAt: new Date().toISOString(),
    });
    onShowNotification(`Reviewer removed: ${reviewer?.reviewerName || reviewerId}`, 'success');
  };

  const handleCommitEditorialDecision = (manuscript: Manuscript, decision: 'accept' | 'minor-revision' | 'major-revision' | 'reject' | 'publish') => {
    const statusMap: Record<string, ManuscriptStatus> = {
      'accept': 'Accepted', 'minor-revision': 'Revision Requested',
      'major-revision': 'Revision Requested', 'reject': 'Rejected', 'publish': 'Published',
    };
    updateSelectedManuscript({
      ...manuscript,
      status: statusMap[decision],
      updatedAt: new Date().toISOString(),
      editorDecisionLog: [...manuscript.editorDecisionLog, { editorId: currentUser.id, decision, comments: editorCommentHtml.replace(/<[^>]+>/g, ' ').trim() || 'No remarks.', timestamp: new Date().toISOString() }],
    });
    setShowDecisionPanel(false);
    setEditorCommentHtml('');
    onShowNotification(`Decision: ${decision.toUpperCase()} recorded.`, 'success');
    DB.addAuditLog({ userId: currentUser.id, userEmail: currentUser.email, action: `DECISION_${decision.toUpperCase()}`, targetId: manuscript.id, details: `Status → ${statusMap[decision]}` });
  };

  const handleReviewerSubmit = (manuscript: Manuscript, isDraft = false) => {
    const updated = manuscripts.map(item => {
      if (item.id !== manuscript.id) return item;
      const updatedAssignments = item.reviewerAssignments.map(ra => {
        if (ra.reviewerId !== currentUser.id && ra.reviewerEmail !== currentUser.email) return ra;
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
            constructiveComments: reviewComments || '<p>See attached evaluation.</p>',
            confidentialToEditor: reviewPrivate,
            recommendation: reviewRecommend,
            submittedAt: new Date().toISOString(),
            highlights: reviewHighlights,
            status: 'submitted' as const,
          },
        };
      });
      return { ...item, status: isDraft ? item.status : ('Under Review' as ManuscriptStatus), updatedAt: new Date().toISOString(), reviewerAssignments: updatedAssignments };
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
    setReviewHighlights(prev => [...prev, { id: `hl-${Date.now()}`, text: pendingHighlightText, note: highlightNote, color: '#fef08a', createdBy: currentUser.id, createdAt: new Date().toISOString() }]);
    setShowHighlightNote(false);
    setHighlightNote('');
    setPendingHighlightText('');
    onShowNotification('Highlight saved.', 'success');
  };

  const resetUserForm = () => { setEditingUserId(null); setUserForm({ firstName: '', lastName: '', email: '', institution: '', role: 'Author', orcidId: '', isVerified: true, tempPassword: '' }); };
  const handleEditUser = (user: User) => { setEditingUserId(user.id); setUserForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, institution: user.institution, role: user.role, orcidId: user.orcidId || '', isVerified: user.isVerified, tempPassword: '' }); };
  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    const updated = adminUsers.map(u => u.id === userId ? { ...u, role: newRole } : u);
    setAdminUsers(updated); DB.setUsers(updated);
    onShowNotification(`Role updated to ${newRole}.`, 'success');
  };
  const handleSaveAdminUser = (e: FormEvent) => {
    e.preventDefault();
    if (!userForm.firstName || !userForm.lastName || !userForm.email || !userForm.institution) { onShowNotification('Fill all required fields.', 'error'); return; }
    if (adminUsers.some(u => u.email.toLowerCase() === userForm.email.toLowerCase() && u.id !== editingUserId)) { onShowNotification('Email already exists.', 'error'); return; }
    const { tempPassword, ...formFields } = userForm;
    if (editingUserId) {
      const updated = adminUsers.map(u => u.id === editingUserId ? { ...u, ...formFields, orcidId: formFields.orcidId || undefined } : u);
      setAdminUsers(updated); DB.setUsers(updated); resetUserForm();
      onShowNotification('User updated.', 'success');
    } else {
      const newUser = {
        id: `user-${Date.now()}`,
        ...formFields,
        orcidId: formFields.orcidId || undefined,
        joinedDate: new Date().toISOString().split('T')[0],
        ...(tempPassword ? { password: tempPassword, tempPassword, mustChangePassword: true } : {}),
      };
      const updated = [...adminUsers, newUser];
      setAdminUsers(updated); DB.setUsers(updated); resetUserForm();
      const pwMsg = tempPassword ? ` Temp password: ${tempPassword}` : ' No password set — user must register.';
      onShowNotification(`User created.${pwMsg}`, 'success');
    }
  };
  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser.id) { onShowNotification('Cannot delete your own account.', 'error'); return; }
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}?`)) return;
    const updated = adminUsers.filter(u => u.id !== user.id);
    setAdminUsers(updated); DB.setUsers(updated);
    if (editingUserId === user.id) resetUserForm();
    onShowNotification('User deleted.', 'success');
  };

  // ── Manuscript list item ──────────────────────────────────────────────────
  const renderManuscriptListItem = (m: Manuscript, isSelected: boolean, onClick: () => void) => {
    const isNew = m.status === 'Submitted' && m.reviewerAssignments.length === 0 && m.editorDecisionLog.length === 0;
    const daysSince = Math.floor((Date.now() - new Date(m.submittedAt || m.createdAt).getTime()) / 86400000);
    return (
      <div key={m.id} onClick={onClick} className={`p-3 border rounded-xl cursor-pointer transition-all text-xs ${isSelected ? 'bg-teal-50 border-teal-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
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
        {m.assignedEditorName && <p className="text-[10px] text-teal-700 font-semibold mt-1">Editor: {m.assignedEditorName}</p>}
      </div>
    );
  };

  // ── Editor manuscript detail panel ────────────────────────────────────────
  const renderEditorManuscriptPanel = (manuscript: Manuscript) => {
    const reviewers = DB.getUsers().filter(u => u.role === 'Reviewer');
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start gap-3 border-b pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm leading-snug">{manuscript.title || manuscript.id}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{manuscript.authors[0]?.firstName} {manuscript.authors[0]?.lastName} · {manuscript.authors[0]?.email}</p>
          </div>
          <button onClick={() => setOfficeEditMode(!officeEditMode)} className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg border ${officeEditMode ? 'bg-teal-700 text-white border-teal-700' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}`}>
            {officeEditMode ? 'Preview mode' : 'Edit article'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 no-print text-xs">
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">Status</label>
              <select value={manuscript.status} onChange={e => updateSelectedManuscript({ ...manuscript, status: e.target.value as ManuscriptStatus, updatedAt: new Date().toISOString() })} className="w-full border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-800 text-xs bg-white">
                {manuscriptStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">Assign Editor</label>
              <div className="flex gap-1">
                <select value={assignEditorId} onChange={e => setAssignEditorId(e.target.value)} className="flex-1 border border-slate-300 rounded-lg p-1.5 text-xs bg-white">
                  <option value="">— Select Editor —</option>
                  {allEditors.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
                <button onClick={() => { handleAssignEditor(manuscript, assignEditorId); setAssignEditorId(''); }} disabled={!assignEditorId} className="bg-teal-700 disabled:opacity-40 text-white font-bold px-2 rounded-lg text-[11px]">Assign</button>
              </div>
              {manuscript.assignedEditorName && <p className="text-[10px] text-teal-700 mt-0.5 font-semibold">Current: {manuscript.assignedEditorName}</p>}
            </div>
          </div>

          <div className="col-span-2">
            <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">Assign Reviewer</label>
            <div className="flex gap-1">
              <select value={assignReviewerId} onChange={e => setAssignReviewerId(e.target.value)} className="flex-1 border border-slate-300 rounded-lg p-1.5 text-xs bg-white">
                <option value="">— Choose Reviewer —</option>
                {reviewers.map(r => <option key={r.id} value={r.id}>{r.firstName} {r.lastName} ({r.institution})</option>)}
              </select>
              <button onClick={() => { if (assignReviewerId) { handleAssignReviewer(manuscript, assignReviewerId); setAssignReviewerId(''); } }} disabled={!assignReviewerId} className="bg-teal-700 disabled:opacity-40 text-white font-bold px-2 rounded-lg text-[11px]">Assign</button>
            </div>
            {manuscript.reviewerAssignments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {manuscript.reviewerAssignments.map(ra => (
                  <span key={ra.reviewerId} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ra.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ra.status === 'declined' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {ra.reviewerName} · {ra.status}
                    <button type="button" onClick={() => handleRemoveReviewer(manuscript, ra.reviewerId)} className="ml-1 text-rose-600 hover:text-rose-800" title="Remove reviewer">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">Volume / Issue</label>
            <input value={manuscript.publicationInfo?.volumeIssue || ''} onChange={e => updateSelectedManuscript({ ...manuscript, publicationInfo: { ...(manuscript.publicationInfo || {}), volumeIssue: e.target.value }, updatedAt: new Date().toISOString() })} placeholder="VOL 4 ISSUE 2. APR-JUN 2026" className="w-full border border-slate-300 rounded-lg p-1.5 text-xs" />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">DOI</label>
            <input value={manuscript.publicationInfo?.doi || ''} onChange={e => updateSelectedManuscript({ ...manuscript, publicationInfo: { ...(manuscript.publicationInfo || {}), doi: e.target.value }, updatedAt: new Date().toISOString() })} placeholder="10.52340/GBMN..." className="w-full border border-slate-300 rounded-lg p-1.5 font-mono text-xs" />
          </div>

          <div className="col-span-2 flex gap-2">
            <button onClick={() => { updateSelectedManuscript({ ...manuscript, updatedAt: new Date().toISOString() }); onShowNotification('Saved.', 'success'); }} className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-1.5 rounded-lg text-xs">Save Changes</button>
            <button onClick={() => openAuthorEmailModal(manuscript)} className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-4 py-1.5 rounded-lg text-xs">Email Author</button>
            <button onClick={() => setShowDecisionPanel(!showDecisionPanel)} className={`font-bold px-4 py-1.5 rounded-lg text-xs ${showDecisionPanel ? 'bg-purple-700 text-white' : 'bg-purple-50 border border-purple-300 text-purple-800 hover:bg-purple-100'}`}>
              {showDecisionPanel ? 'Close Decision' : 'Issue Decision'}
            </button>
          </div>
        </div>

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
                {ra.comments!.confidentialToEditor && <p className="text-slate-500 text-[10px]">Confidential: {ra.comments!.confidentialToEditor}</p>}
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

        {showDecisionPanel && (
          <div className="no-print border border-purple-300 rounded-xl p-4 bg-white space-y-3 text-xs shadow-lg">
            <div className="flex justify-between items-center border-b pb-2">
              <h5 className="font-black text-purple-900 text-sm">Editorial Decision Form</h5>
              <button onClick={() => setShowDecisionPanel(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
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
              <label className="block font-bold text-slate-700 mb-1">Comments to Author</label>
              <RichTextEditor value={editorCommentHtml} onChange={setEditorCommentHtml} placeholder="Provide detailed editorial comments..." minHeight="200px" />
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <button onClick={() => { updateSelectedManuscript({ ...manuscript, updatedAt: new Date().toISOString() }); onShowNotification('Draft saved.', 'success'); }} className="border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50">Save Draft</button>
              <button onClick={() => { updateSelectedManuscript({ ...manuscript, updatedAt: new Date().toISOString() }); setShowDecisionPanel(false); onShowNotification('Saved & closed.', 'success'); }} className="border border-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50">Save Draft & Close</button>
              <button onClick={() => handleSendToAuthor(manuscript)} className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-1.5 rounded-lg">Send to Author</button>
              <button onClick={() => handleCommitEditorialDecision(manuscript, selectedDecision)} className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-1.5 rounded-lg">Commit Decision</button>
            </div>
            <div className="flex gap-2 pt-1 flex-wrap">
              {([
                { kind: 'accepted' as const, label: 'Acceptance Email', cls: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50', preset: 'acceptance' as const },
                { kind: 'generic' as const, label: 'Payment Email', cls: 'text-amber-700 border-amber-200 hover:bg-amber-50', preset: 'payment' as const },
                { kind: 'published' as const, label: 'Published Email', cls: 'text-teal-700 border-teal-200 hover:bg-teal-50', preset: 'published' as const },
              ]).map(({ kind, label, cls, preset }) => (
                <button key={kind} onClick={async () => {
                  const tmpl = preset === 'acceptance' ? acceptanceNotice(manuscript) : preset === 'payment' ? paymentRequest(manuscript) : publishedNotice(manuscript);
                  try {
                    const res = await sendEmail(kind, manuscript, tmpl.subject, tmpl.body);
                    onShowNotification(res.fallback ? 'Mail client opened.' : `${label} sent.`, 'success');
                  } catch {
                    openAuthorEmailModal(manuscript, preset);
                  }
                }} className={`border px-3 py-1 rounded text-[10px] font-bold ${cls}`}>{label}</button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border overflow-hidden">
          {officeEditMode ? (
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-44 shrink-0 bg-slate-900 p-3 text-white text-xs space-y-1">
                <p className="font-black text-[10px] uppercase text-slate-400 mb-2">Sections</p>
                {['title-meta','authors','article-type','abstract','keywords','sections','references','supplementary','ethics','conflicts','funding','editor-files','preview'].map(step => (
                  <button key={step} onClick={() => setOfficeEditStep(step)} className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-bold capitalize ${officeEditStep === step ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
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

  // ── Editor workspace ─────────────────────────────────────────────────────
  const renderEditorWorkspace = () => {
    const isEditor = currentUser.role === 'Editor';
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
    const adminNavItems = [
      { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'All Manuscripts', icon: FileText, label: 'All Manuscripts' },
      { id: 'Awaiting Action', icon: AlertCircle, label: 'Awaiting Action' },
      { id: 'Under Review', icon: Clock, label: 'Under Review' },
      { id: 'Revisions', icon: Edit3, label: 'Revisions' },
      { id: 'Accepted', icon: CheckCircle, label: 'Accepted' },
      { id: 'Published', icon: Award, label: 'Published' },
      { id: 'Rejected', icon: XCircle, label: 'Rejected' },
      { id: 'Reviewers', icon: Users, label: 'Reviewers' },
      { id: 'Payments', icon: TrendingUp, label: 'Payments' },
      { id: 'Emails', icon: MessageSquare, label: 'Emails' },
      { id: 'My Manuscripts', icon: UserIcon, label: 'My Manuscripts' },
      { id: 'Submit Manuscript', icon: Plus, label: 'Submit Manuscript' },
      { id: 'Settings', icon: Settings2, label: 'Settings' },
    ];
    const navItems = isEditor ? editorNavItems : adminNavItems;
    const activeSection = isEditor ? editorNavSection : editorialSection;
    const setActiveSection = isEditor ? setEditorNavSection : setEditorialSection;

    const getFilteredManuscripts = () => {
      const q = searchQuery.toLowerCase();
      return sortNewest(manuscripts.filter(m => {
        const ok = !q || m.title.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.authors.some(a => a.email.toLowerCase().includes(q));
        if (!ok) return false;
        if (activeSection === 'Awaiting Action') return m.status === 'Submitted';
        if (activeSection === 'Under Review') return ['Under Review', 'Reviewer Assigned', 'In Review'].includes(m.status);
        if (activeSection === 'Revisions') return m.status === 'Revision Requested';
        if (activeSection === 'Accepted') return m.status === 'Accepted';
        if (activeSection === 'Published') return m.status === 'Published';
        if (activeSection === 'Rejected') return m.status === 'Rejected';
        if (activeSection === 'Payments') return m.payment?.status !== 'verified';
        if (activeSection === 'Assigned Manuscripts') return m.assignedEditorId === currentUser.id;
        return m.status !== 'Draft';
      }));
    };

    const visibleManuscripts = getFilteredManuscripts();
    const showListDetail = !['Dashboard', 'My Manuscripts', 'Submit Manuscript', 'Reviews', 'Settings', 'Profile'].includes(activeSection);

    return (
      <div className="min-h-[calc(100vh-88px)] bg-slate-50 relative">
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/60 md:hidden" onClick={() => setSidebarOpen(false)} />}
        <div className="flex min-h-[calc(100vh-88px)]">
          <aside className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto w-[220px] shrink-0 bg-slate-950 text-white flex flex-col transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-black text-white">GBMN Editorial</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{currentUser.firstName} {currentUser.lastName}</p>
                <p className="text-[10px] text-teal-400 font-semibold">{currentUser.role}</p>
              </div>
              <button className="md:hidden mt-0.5 text-slate-400 hover:text-white shrink-0" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => { setActiveSection(id); setSelectedManuscript(null); setOfficeEditMode(false); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold transition ${activeSection === id ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />{label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="bg-white border-b border-slate-200 px-3 md:px-6 py-2 md:py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
                <div>
                  <h1 className="text-sm md:text-base font-black text-slate-900">{activeSection}</h1>
                  <p className="text-[11px] text-slate-400 hidden sm:block">Clean editorial workflow.</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search…" className="border rounded-lg pl-8 pr-3 py-1.5 text-xs w-36 sm:w-60 bg-slate-50" />
              </div>
            </div>

            {activeSection === 'Dashboard' && (
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Total', value: totalSubmissions, color: 'text-slate-900', section: 'All Manuscripts' },
                    { label: 'Awaiting', value: decisionPendingCount, color: 'text-blue-700', section: 'Awaiting Action' },
                    { label: 'Under Review', value: underReviewCount, color: 'text-amber-700', section: 'Under Review' },
                    { label: 'Accepted', value: acceptedCount, color: 'text-emerald-700', section: 'Accepted' },
                  ].map(({ label, value, color, section }) => (
                    <button key={label} onClick={() => setActiveSection(section)} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-teal-400 shadow-sm">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">{label}</span>
                      <span className={`mt-1 block text-2xl font-black ${color}`}>{value}</span>
                    </button>
                  ))}
                </div>
                <div className="bg-white border rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-sm mb-3 text-slate-800">Recent Submissions</h3>
                  <div className="space-y-2">
                    {sortNewest(manuscripts.filter(m => m.status !== 'Draft')).slice(0, 8).map(m =>
                      renderManuscriptListItem(m, selectedManuscript?.id === m.id, () => { setSelectedManuscript(m); setActiveSection('All Manuscripts'); })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'My Manuscripts' && (
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="flex justify-between items-center">
                  <h2 className="font-black text-slate-900">My Manuscripts</h2>
                  <button onClick={() => setActiveSection('Submit Manuscript')} className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5">
                    <Plus className="h-4 w-4" /> New Manuscript
                  </button>
                </div>
                {editorOwnManuscripts.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-10 text-center text-slate-400 text-sm">
                    No manuscripts yet. <button onClick={() => setActiveSection('Submit Manuscript')} className="text-teal-700 font-bold underline">Submit your first manuscript.</button>
                  </div>
                ) : sortNewest(editorOwnManuscripts).map(m => (
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

            {activeSection === 'Submit Manuscript' && (
              <div className="flex flex-1 overflow-hidden">
                <div className="w-52 shrink-0 bg-slate-900 text-white p-3 overflow-y-auto">
                  <p className="font-black text-[10px] uppercase text-slate-400 mb-3">Submission Steps</p>
                  {['getting-started','policies','checklist','title-meta','authors','article-type','abstract','keywords','sections','references','supplementary','ethics','conflicts','funding','editor-files','payment','preview','submit'].map(step => (
                    <button key={step} onClick={() => setEditorMyMsStep(step)} className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-bold capitalize mb-0.5 ${editorMyMsStep === step ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}>
                      {step.replace(/-/g, ' ')}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {(() => {
                    const myDraft = editorOwnManuscripts.find(m => m.status === 'Draft') || null;
                    if (!myDraft) return (
                      <div className="text-center py-16">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-4">No draft in progress.</p>
                        <button onClick={() => {
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
                        }} className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-5 py-2.5 rounded-xl">
                          Create New Manuscript Draft
                        </button>
                      </div>
                    );
                    return <SubmissionWorkflow manuscript={myDraft} onUpdateManuscript={m => onUpdateManuscripts(manuscripts.map(x => x.id === m.id ? m : x))} activeStep={editorMyMsStep} onStepChange={setEditorMyMsStep} onShowNotification={onShowNotification} />;
                  })()}
                </div>
              </div>
            )}

            {activeSection === 'Reviews' && (
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <h2 className="font-black text-slate-900">Reviewer Feedback</h2>
                {sortNewest(manuscripts.filter(m => m.reviewerAssignments.some(ra => ra.status === 'completed'))).map(m => (
                  <div key={m.id} className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div><span className="font-mono text-[10px] text-teal-800 font-bold">{m.id}</span><p className="font-bold text-slate-800">{m.title}</p></div>
                      {renderStatusBadge(m.status)}
                    </div>
                    {m.reviewerAssignments.filter(ra => ra.comments).map(ra => (
                      <div key={ra.reviewerId} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between"><span className="font-bold">{ra.reviewerName}</span><span className="font-bold text-teal-800 uppercase">{ra.comments!.recommendation}</span></div>
                        <p className="italic text-slate-600">"{ra.comments!.constructiveComments}"</p>
                      </div>
                    ))}
                  </div>
                ))}
                {manuscripts.filter(m => m.reviewerAssignments.some(ra => ra.status === 'completed')).length === 0 && (
                  <div className="border-2 border-dashed rounded-xl p-10 text-center text-slate-400 text-sm">No completed reviews yet.</div>
                )}
              </div>
            )}

            {activeSection === 'Settings' && (
              <div className="p-6 overflow-y-auto flex-1">
                <form onSubmit={e => { e.preventDefault(); DB.setJournalSettings(journalSettings); onShowNotification('Settings saved.', 'success'); }} className="max-w-2xl space-y-4">
                  <h2 className="font-black text-slate-900 mb-4">Journal Settings</h2>
                  {[{ key: 'journalNameFull', label: 'Journal Full Name' }, { key: 'journalNameShort', label: 'Journal Short Name' }, { key: 'contactEmail', label: 'Contact Email' }].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
                      <input value={(journalSettings as any)[key] || ''} onChange={e => setJournalSettings(prev => ({ ...prev, [key]: e.target.value }))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                    </div>
                  ))}
                  <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-5 py-2 rounded-lg text-sm">Save Settings</button>
                </form>
              </div>
            )}

            {activeSection === 'Profile' && (
              <div className="p-6 overflow-y-auto flex-1">
                <div className="max-w-md bg-white border rounded-2xl p-5 shadow-sm space-y-3 text-sm">
                  <h2 className="font-black text-slate-900 border-b pb-2">Profile</h2>
                  <div><b>Name:</b> {currentUser.firstName} {currentUser.lastName}</div>
                  <div><b>Email:</b> {currentUser.email}</div>
                  <div><b>Role:</b> {currentUser.role}</div>
                  <div><b>Institution:</b> {currentUser.institution}</div>
                  {currentUser.orcidId && <div><b>ORCID:</b> <span className="font-mono">{currentUser.orcidId}</span></div>}
                </div>
              </div>
            )}

            {showListDetail && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className={`${selectedManuscript ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0 border-r border-slate-200 bg-white flex-col overflow-hidden`}>
                  <div className="p-3 border-b">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-[10px] font-bold">
                      {(['all', 'pending', 'reviewed'] as const).map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-1 rounded-md capitalize ${activeTab === t ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:bg-white/60'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {visibleManuscripts.filter(m => {
                      if (activeTab === 'pending') return m.status === 'Submitted';
                      if (activeTab === 'reviewed') return m.reviewerAssignments.some(ra => ra.status === 'completed');
                      return true;
                    }).map(m => renderManuscriptListItem(m, selectedManuscript?.id === m.id, () => { setSelectedManuscript(m); setOfficeEditMode(false); setShowDecisionPanel(false); }))}
                    {visibleManuscripts.length === 0 && <p className="text-xs text-slate-400 text-center py-8">No manuscripts in this view.</p>}
                  </div>
                </div>
                <div className={`${selectedManuscript ? 'flex flex-col' : 'hidden md:flex md:flex-col'} flex-1 overflow-y-auto p-5`}>
                  {selectedManuscript && (
                    <button onClick={() => setSelectedManuscript(null)} className="md:hidden flex items-center gap-1 text-xs font-bold text-teal-700 mb-3 shrink-0">
                      <ArrowLeft className="h-4 w-4" /> Back to list
                    </button>
                  )}
                  {selectedManuscript ? renderEditorManuscriptPanel(selectedManuscript) : (
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

        {emailDraft.open && emailDraft.manuscript && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
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
                <button onClick={async () => {
                  try {
                    const res = await sendEmail('generic', emailDraft.manuscript!, emailDraft.subject, emailDraft.body);
                    onShowNotification(res.fallback ? 'Mail client opened for delivery.' : 'Email sent successfully.', 'success');
                  } catch {
                    onShowNotification('Email delivery failed. Check EmailJS configuration.', 'error');
                  }
                  setEmailDraft(p => ({ ...p, open: false }));
                }} className="bg-teal-700 text-white font-bold px-4 py-2 rounded-lg text-xs">Send Email</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Reviewer dashboard ───────────────────────────────────────────────────
  const renderReviewerDashboard = () => {
    const assignedManuscripts = sortNewest(manuscripts.filter(m => m.reviewerAssignments.some(ra => ra.reviewerId === currentUser.id || ra.reviewerEmail === currentUser.email)));
    return (
      <div className="min-h-[calc(100vh-88px)] flex flex-col md:flex-row bg-slate-50">
        <div className={`${selectedManuscript ? 'hidden md:flex md:flex-col' : 'flex flex-col'} w-full md:w-80 shrink-0 bg-white border-r border-slate-200`}>
          <div className="p-4 border-b bg-white">
            <div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-5 w-5 text-teal-700" /><h3 className="font-bold text-sm text-slate-800">Reviewer Queue</h3></div>
            <p className="text-[11px] text-slate-500">Welcome, {currentUser.firstName}.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {assignedManuscripts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed rounded-xl">No assigned manuscripts.</div>
            ) : assignedManuscripts.map(m => {
              const ra = m.reviewerAssignments.find(r => r.reviewerId === currentUser.id || r.reviewerEmail === currentUser.email);
              return (
                <div key={m.id} onClick={() => setSelectedManuscript(m)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all text-xs ${selectedManuscript?.id === m.id ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100' : ra?.status === 'completed' ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50 hover:border-blue-400'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono font-bold text-teal-800 text-[10px]">{m.id}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${ra?.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : ra?.status === 'declined' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                      {ra?.status === 'completed' ? 'Completed' : ra?.status === 'declined' ? 'Declined' : 'Pending'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 line-clamp-2 leading-snug">{m.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{m.specialty} · Assigned {ra?.assignedAt ? new Date(ra.assignedAt).toLocaleDateString() : 'N/A'}</p>
                  {ra?.comments && <p className="mt-1 text-[10px] text-emerald-700 font-semibold">Recommendation: {ra.comments.recommendation.toUpperCase()}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${selectedManuscript ? 'flex flex-col' : 'hidden md:flex md:flex-col'} flex-1 overflow-hidden`}>
          {!selectedManuscript ? (
            <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-3">
              <BookOpen className="h-12 w-12 opacity-40" /><p>Select a manuscript to review</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col gap-0">
              <div className="border-b border-slate-200">
                <div className="bg-white px-4 py-2 flex items-center justify-between border-b">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedManuscript(null)} className="md:hidden p-1 rounded hover:bg-slate-100 text-slate-500 mr-1"><ArrowLeft className="h-4 w-4" /></button>
                    <Eye className="h-4 w-4 text-teal-700" /><span className="text-xs font-bold text-slate-800">Manuscript Preview — {selectedManuscript.id}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleTextHighlight} className="text-[11px] flex items-center gap-1 bg-yellow-100 border border-yellow-300 text-yellow-800 font-bold px-3 py-1 rounded-lg hover:bg-yellow-200">
                      <Highlighter className="h-3.5 w-3.5" /> Highlight selected text
                    </button>
                    <button onClick={() => setSelectedManuscript(null)} className="hidden md:block text-xs text-slate-400 hover:text-slate-600 font-bold">Close ×</button>
                  </div>
                </div>
                <div className="max-h-[45vh] overflow-y-auto bg-slate-50 p-4">
                  <ManuscriptPreview manuscript={selectedManuscript} onShowNotification={onShowNotification} />
                </div>
              </div>

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

              {showHighlightNote && (
                <div className="bg-yellow-50 border-b border-yellow-300 px-4 py-3 flex items-center gap-3 text-xs">
                  <Highlighter className="h-4 w-4 text-yellow-700 shrink-0" />
                  <p className="font-semibold text-yellow-800 shrink-0">"{pendingHighlightText.slice(0, 40)}…"</p>
                  <input value={highlightNote} onChange={e => setHighlightNote(e.target.value)} placeholder="Add note (optional)" className="flex-1 border border-yellow-300 rounded px-2 py-1 bg-white" />
                  <button onClick={confirmHighlight} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-3 py-1 rounded-lg">Save</button>
                  <button onClick={() => { setShowHighlightNote(false); setPendingHighlightText(''); }}><X className="h-4 w-4 text-slate-400" /></button>
                </div>
              )}

              <div className="bg-white p-5 space-y-4 flex-1 overflow-y-auto">
                <div className="border-b pb-3">
                  <h4 className="font-black text-teal-900 text-sm">Peer Review Form</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Manuscript ID: {selectedManuscript.id} · {selectedManuscript.title?.slice(0, 60)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-[11px] border">
                  <div><b className="text-slate-500">Title:</b> <span className="text-slate-700">{selectedManuscript.title}</span></div>
                  <div><b className="text-slate-500">Type:</b> <span className="text-slate-700">{selectedManuscript.articleType}</span></div>
                  <div><b className="text-slate-500">Author:</b> <span className="text-slate-700">{selectedManuscript.authors[0]?.firstName} {selectedManuscript.authors[0]?.lastName}</span></div>
                  <div><b className="text-slate-500">Specialty:</b> <span className="text-slate-700">{selectedManuscript.specialty}</span></div>
                </div>
                <div className="space-y-4 text-xs">
                  <div className="border rounded-xl p-4 space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">1. Ethical Concerns</h5>
                    <textarea value={reviewScoreEthical} onChange={e => setReviewScoreEthical(e.target.value)} rows={2} placeholder="Describe any ethical concerns or write 'None identified'…" className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 resize-none" />
                  </div>
                  <div className="border rounded-xl p-4 space-y-3">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">2. Scientific Assessment</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { label: 'Methodology (1-5)', value: reviewScoreMethod, setter: setReviewScoreMethod, options: [['5','5 — Pristine & Robust'],['4','4 — Good design'],['3','3 — Satisfactory'],['2','2 — Needs controls'],['1','1 — Fatally flawed']] },
                        { label: 'Originality (1-5)', value: reviewScoreOrig, setter: setReviewScoreOrig, options: [['5','5 — Novel breakthrough'],['4','4 — Significant update'],['3','3 — Confirms paradigms'],['2','2 — Incremental'],['1','1 — Repetitive']] },
                        { label: 'Scientific Merit (1-5)', value: reviewScoreMerit, setter: setReviewScoreMerit, options: [['5','5 — Decisive impact'],['4','4 — High value'],['3','3 — Average relevance'],['2','2 — Minor worth'],['1','1 — Deficient']] },
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
                  <div className="border rounded-xl p-4 space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">3. Constructive Comments to Authors *</h5>
                    <RichTextEditor value={reviewComments} onChange={value => { setReviewComments(value); setReviewDraftSaved(false); }}
                      placeholder="Provide detailed commentary on methodology, results, statistical analysis, writing clarity, and required revisions…" minHeight="220px" />
                  </div>
                  <div className="border rounded-xl p-4 space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">4. Confidential Comments to Editor</h5>
                    <textarea rows={3} value={reviewPrivate} onChange={e => setReviewPrivate(e.target.value)}
                      placeholder="Private insights for the editorial office only…"
                      className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 resize-y font-sans" />
                  </div>
                  <div className="border rounded-xl p-4 space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">5. Recommendation *</h5>
                    <select value={reviewRecommend} onChange={e => setReviewRecommend(e.target.value as any)} className="w-full bg-teal-50 border border-teal-300 rounded-lg p-2.5 font-bold text-teal-800">
                      <option value="accept">Accept Manuscript Unedited</option>
                      <option value="minor-revision">Accept with Minor Revisions</option>
                      <option value="major-revision">Re-evaluate after Major Revisions</option>
                      <option value="reject">Decline / Reject Submission</option>
                    </select>
                  </div>
                  {reviewHighlights.length > 0 && (
                    <div className="border rounded-xl p-4 bg-yellow-50">
                      <h5 className="font-bold text-yellow-800 uppercase text-[10px] tracking-wide mb-2">Text Highlights ({reviewHighlights.length})</h5>
                      {reviewHighlights.map((h, i) => (
                        <div key={h.id} className="text-[11px] bg-white border border-yellow-200 rounded-lg px-3 py-1.5 mb-1">
                          <span className="text-slate-500 font-bold">[{i + 1}]</span>{' '}
                          <span className="font-semibold">"{h.text}"</span>
                          {h.note && <span className="text-slate-500 ml-2">— {h.note}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-3 border-t">
                    <button onClick={() => handleReviewerSubmit(selectedManuscript, true)} className="border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs hover:bg-slate-50 flex items-center gap-1.5">
                      <Save className="h-3.5 w-3.5" /> Save Draft
                    </button>
                    <button onClick={() => { handleReviewerSubmit(selectedManuscript, true); setSelectedManuscript(null); }} className="border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs hover:bg-slate-50">Save Draft & Close</button>
                    <button onClick={() => handleReviewerSubmit(selectedManuscript, false)} className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-5 py-2 rounded-lg text-xs flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5" /> Submit Review
                    </button>
                    <button onClick={() => {
                      const updated = manuscripts.map(item => item.id === selectedManuscript.id ? { ...item, reviewerAssignments: item.reviewerAssignments.map(r => r.reviewerId === currentUser.id ? { ...r, status: 'declined' as const } : r) } : item);
                      onUpdateManuscripts(updated); setSelectedManuscript(null);
                      onShowNotification('Review invitation declined.', 'info');
                    }} className="border border-rose-200 text-rose-700 font-bold px-4 py-2 rounded-lg text-xs hover:bg-rose-50">Decline Invitation</button>
                  </div>
                  {reviewDraftSaved && <p className="text-[11px] text-teal-700 font-semibold">✓ Draft saved</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Managing editor audit ────────────────────────────────────────────────
  const renderManagingEditorWorkspace = () => (
    <div id="managing-editor-dash" className="space-y-6">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Database className="h-5 w-5 text-teal-700" /> Platform Audit Console</h3>
      </div>
      <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-slate-700 flex items-center gap-1.5 border-b pb-2"><AlertCircle className="h-4 w-4 text-red-500" /> Secure Event Stream</h4>
        <div className="bg-slate-900 text-emerald-400 font-mono text-[10px] p-4 rounded-xl h-64 overflow-y-auto space-y-2 select-text">
          <div className="text-white border-b border-slate-700 pb-1 mb-2">SECURE SHA-256 EVENT STREAM</div>
          {DB.getAuditLogs().map(log => (
            <div key={log.id} className="leading-snug">
              <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
              <span className="text-teal-400 font-bold">{log.action}</span> — <span className="text-slate-300">{log.details}</span>{' '}
              <span className="text-slate-500 font-bold">(ID: {log.targetId})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Admin panel ──────────────────────────────────────────────────────────
  const renderAdministratorPanel = () => (
    <div id="admin-hub" className="space-y-6">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings2 className="h-5 w-5 text-teal-700" /> Central Administrator Hub</h3>
      </div>
      <form onSubmit={handleSaveAdminUser} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
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
          {!editingUserId && (
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Temporary Password <span className="text-slate-400 font-normal">(user must change on first login)</span></label>
              <input type="text" value={userForm.tempPassword} onChange={e => setUserForm(p => ({ ...p, tempPassword: e.target.value }))} placeholder="e.g. Welcome2024!" className="w-full md:w-64 border border-amber-300 bg-amber-50 rounded-lg p-2" />
              {userForm.tempPassword && <p className="text-[10px] text-amber-700 mt-1 font-semibold">⚠ Share this password with the user securely. They will be required to change it on first login.</p>}
            </div>
          )}
        </div>
        <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg">{editingUserId ? 'Save Changes' : 'Create User'}</button>
      </form>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="font-bold text-sm text-slate-700 border-b pb-2">User Directory</h4>
          <div className="overflow-x-auto text-xs">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50 font-bold text-slate-600">
                  <th className="p-2 text-left">Name</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Verified</th><th className="p-2 text-left">Actions</th>
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
                        <option value="Author">Author</option><option value="Editor">Editor</option><option value="Managing Editor">Managing Editor</option><option value="Reviewer">Reviewer</option><option value="Administrator">Administrator</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <button onClick={() => { const u = adminUsers.map(x => x.id === user.id ? { ...x, isVerified: !x.isVerified } : x); setAdminUsers(u); DB.setUsers(u); onShowNotification('Updated.', 'success'); }}
                        className={`px-2 py-1 rounded text-[10px] font-bold border ${user.isVerified ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {user.isVerified ? 'Verified' : 'Unverified'}
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
        <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="font-bold text-sm text-slate-700 border-b pb-2">Article Spec Quotas</h4>
          <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
            {Object.values(ARTICLE_TYPES).map(type => (
              <div key={type.key} className="p-3 bg-slate-50 rounded-lg border space-y-1">
                <div className="flex justify-between font-bold text-slate-800"><span>{type.name}</span><span className="text-teal-800">${type.submissionFeeUSD} USD</span></div>
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

  return (
    <div id="central-role-dashboards">
      {currentUser.role === 'Editor' && renderEditorWorkspace()}
      {currentUser.role === 'Reviewer' && renderReviewerDashboard()}
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
