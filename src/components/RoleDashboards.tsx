/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, FormEvent } from 'react';
import { User, UserRole, Manuscript, ManuscriptStatus, SystemAuditLog, JournalSettings, ReferenceItem, FigureTableItem } from '../types';
import { DB, ARTICLE_TYPES } from '../utils';
import ManuscriptPreview from './ManuscriptPreview';
import SubmissionWorkflow from './SubmissionWorkflow';
import { acceptedPaymentRequest, authorEmail, openEmail, publishedNotice } from '../emailTemplates';
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
} from 'lucide-react';

interface RoleDashboardsProps {
  currentUser: User;
  manuscripts: Manuscript[];
  onUpdateManuscripts: (newManuscripts: Manuscript[]) => void;
  onShowNotification: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export default function RoleDashboards({ currentUser, manuscripts, onUpdateManuscripts, onShowNotification }: RoleDashboardsProps) {
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewed' | 'logs'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reviewer Scoring Form States
  const [reviewScoreEthical, setReviewScoreEthical] = useState('None identified');
  const [reviewScoreMethod, setReviewScoreMethod] = useState(5);
  const [reviewScoreOrig, setReviewScoreOrig] = useState(5);
  const [reviewScoreMerit, setReviewScoreMerit] = useState(5);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewPrivate, setReviewPrivate] = useState('');
  const [reviewRecommend, setReviewRecommend] = useState<'accept' | 'minor-revision' | 'major-revision' | 'reject'>('accept');

  // Decision Form
  const [editorComments, setEditorComments] = useState('');
  const [decisionManuscriptId, setDecisionManuscriptId] = useState('');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [officeEditMode, setOfficeEditMode] = useState(false);
  const [officeEditStep, setOfficeEditStep] = useState('title-meta');

  // Admin users edit state
  const [adminUsers, setAdminUsers] = useState<User[]>(() => DB.getUsers());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState<'editorial' | 'finance' | 'users'>('editorial');
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    institution: '',
    role: 'Author' as UserRole,
    orcidId: '',
    isVerified: true,
  });

  useEffect(() => {
    if (!selectedManuscript) return;
    const latest = manuscripts.find(item => item.id === selectedManuscript.id);
    if (latest && latest !== selectedManuscript) setSelectedManuscript(latest);
  }, [manuscripts, selectedManuscript]);

  // Manage Settings state
  const [journalSettings, setJournalSettings] = useState<JournalSettings>(() => DB.getJournalSettings());

  // General statistics
  const totalSubmissions = manuscripts.filter(m => m.status !== 'Draft').length;
  const underReviewCount = manuscripts.filter(m => m.status === 'Under Review').length;
  const decisionPendingCount = manuscripts.filter(m => m.status === 'Submitted').length;
  const acceptedCount = manuscripts.filter(m => m.status === 'Accepted' || m.status === 'Published').length;
  const manuscriptStatuses: ManuscriptStatus[] = ['Draft', 'Submitted', 'Reviewer Assigned', 'Under Review', 'In Review', 'Revision Requested', 'Editorial Decision', 'Accepted', 'In Production', 'Completed', 'Rejected', 'Published'];

  const updateSelectedManuscript = (updated: Manuscript) => {
    const list = manuscripts.map(item => item.id === updated.id ? updated : item);
    onUpdateManuscripts(list);
    setSelectedManuscript(updated);
  };

  const sendTemplateEmail = (manuscript: Manuscript, template: 'accepted' | 'published') => {
    const email = template === 'accepted' ? acceptedPaymentRequest(manuscript) : publishedNotice(manuscript);
    openEmail(authorEmail(manuscript), email.subject, email.body);
    onShowNotification('Email draft opened in your mail client.', 'info');
  };

  const handleUpdateUserRole = (userId: string, newRole: any) => {
    const updatedUsers = adminUsers.map(u => u.id === userId ? { ...u, role: newRole as any } : u);
    setAdminUsers(updatedUsers);
    DB.setUsers(updatedUsers);
    onShowNotification(`Updated user role to ${newRole}`, 'success');
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      institution: '',
      role: 'Author',
      orcidId: '',
      isVerified: true,
    });
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      institution: user.institution,
      role: user.role,
      orcidId: user.orcidId || '',
      isVerified: user.isVerified,
    });
  };

  const handleSaveAdminUser = (event: FormEvent) => {
    event.preventDefault();
    if (!userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.email.trim() || !userForm.institution.trim()) {
      onShowNotification('Fill first name, last name, email, and institution before saving user.', 'error');
      return;
    }
    const duplicate = adminUsers.some(user => user.email.toLowerCase() === userForm.email.toLowerCase() && user.id !== editingUserId);
    if (duplicate) {
      onShowNotification('A user with this email already exists.', 'error');
      return;
    }
    const updatedUsers = editingUserId
      ? adminUsers.map(user => user.id === editingUserId ? { ...user, ...userForm } : user)
      : [
          ...adminUsers,
          {
            id: `user-${Date.now()}`,
            ...userForm,
            orcidId: userForm.orcidId || undefined,
            joinedDate: new Date().toISOString().split('T')[0],
          }
        ];
    setAdminUsers(updatedUsers);
    DB.setUsers(updatedUsers);
    resetUserForm();
    onShowNotification(editingUserId ? 'User profile updated.' : 'New user created.', 'success');
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser.id) {
      onShowNotification('Administrators cannot delete their own active account.', 'error');
      return;
    }
    const confirmDelete = window.confirm(`Delete ${user.firstName} ${user.lastName} from the journal system?`);
    if (!confirmDelete) return;
    const updatedUsers = adminUsers.filter(item => item.id !== user.id);
    setAdminUsers(updatedUsers);
    DB.setUsers(updatedUsers);
    if (editingUserId === user.id) resetUserForm();
    onShowNotification('User deleted from the system.', 'success');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    DB.setJournalSettings(journalSettings);
    onShowNotification('Journal central policies updated successfully!', 'success');
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Draft</span>;
      case 'Submitted':
        return <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Submitting Office</span>;
      case 'Reviewer Assigned':
        return <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Reviewer Assigned</span>;
      case 'Under Review':
        return <span className="bg-yellow-50 text-yellow-800 border border-yellow-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Peer Reviewing</span>;
      case 'In Review':
        return <span className="bg-orange-50 text-orange-800 border border-orange-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">In Review</span>;
      case 'Revision Requested':
        return <span className="bg-amber-50 text-amber-805 border border-amber-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Revision Needed</span>;
      case 'Editorial Decision':
        return <span className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Editorial Decision</span>;
      case 'Accepted':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Accepted</span>;
      case 'In Production':
        return <span className="bg-lime-50 text-lime-800 border border-lime-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">In Production</span>;
      case 'Completed':
        return <span className="bg-green-50 text-green-800 border border-green-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Completed</span>;
      case 'Rejected':
        return <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Declined</span>;
      case 'Published':
        return <span className="bg-teal-550 text-teal-800 border border-teal-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">Published Online</span>;
      default:
        return <span className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm">{status}</span>;
    }
  };

  // Render Reviewer Dashboard
  const renderReviewerDashboard = () => {
    // Find manuscripts assigned to this reviewer
    const assignedManuscripts = manuscripts.filter(m => 
      m.reviewerAssignments.some(ra => ra.reviewerId === currentUser.id)
    );

    const reviewerStatusStyle = (status?: string, isSelected = false) => {
      if (isSelected) return 'bg-teal-50 border-teal-500 ring-2 ring-teal-100';
      if (status === 'completed') return 'bg-emerald-50 border-emerald-300 hover:border-emerald-500';
      if (status === 'declined') return 'bg-rose-50 border-rose-300 hover:border-rose-500';
      return 'bg-blue-50 border-blue-250 hover:border-blue-500';
    };

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
            reviewerAssignments: updatedAssignments 
          };
        }
        return item;
      });
      onUpdateManuscripts(updated);
      onShowNotification('Structured reviewer evaluation matrix recorded!', 'success');
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
      <div id="reviewer-dashboard" className="space-y-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-700" />
            Reviewer Editorial Queue
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Welcome, Referee. Please evaluate assigned Georgian Biomedical News double-blind submissions below.
          </p>
        </div>

        <div className={`grid grid-cols-1 ${selectedManuscript ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* List queue */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Assigned Manuscripts ({assignedManuscripts.length})
              </h4>
              <div className="flex flex-wrap gap-1.5 text-[9px] font-bold uppercase">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">New / Pending</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">Opened</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Completed</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">Declined</span>
              </div>
            </div>

            {assignedManuscripts.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                No active manuscript assignments delegated to your ORCID address.
              </div>
            ) : (
              <div className="space-y-3">
                {assignedManuscripts.map((m) => {
                  const assignment = m.reviewerAssignments.find(ra => ra.reviewerId === currentUser.id);
                  const isSelected = selectedManuscript?.id === m.id;
                  return (
                    <div 
                      key={m.id} 
                      className={`p-4 border rounded-xl transition-all cursor-pointer ${
                        reviewerStatusStyle(assignment?.status, isSelected)
                      }`}
                      onClick={() => setSelectedManuscript(m)}
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-white text-teal-800 border border-teal-100 px-2 py-0.5 rounded">
                          ID: {m.id}
                        </span>
                        {reviewerStatusBadge(assignment?.status)}
                      </div>
                      <h5 className="font-bold text-slate-800 mt-2 line-clamp-2 text-sm">{m.title}</h5>
                      <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
                        <span>Classification: <strong>{m.specialty}</strong></span>
                        <span>Assigned: <strong>{assignment?.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : 'N/A'}</strong></span>
                      </div>
                      {assignment?.comments && (
                        <p className="mt-2 text-[11px] text-emerald-800 font-semibold">
                          Recommendation: {assignment.comments.recommendation.toUpperCase()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Structured Evaluation Form */}
          {selectedManuscript && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h4 className="font-bold text-sm text-teal-800">
                   Evaluate manuscript ID: {selectedManuscript.id}
                </h4>
                <button 
                  onClick={() => setSelectedManuscript(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Close Pane [X]
                </button>
              </div>

              {/* Reviewer scoring system */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ethical Concerns Inquiry</label>
                  <input
                    type="text"
                    value={reviewScoreEthical}
                    onChange={(e) => setReviewScoreEthical(e.target.value)}
                    placeholder="Describe omissions or IRB issues if any, or 'None'"
                    className="w-full bg-slate-50 border border-slate-350 rounded-lg p-2 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Methodology (1-5)</label>
                    <select
                      value={reviewScoreMethod}
                      onChange={(e) => setReviewScoreMethod(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-350 rounded-lg p-2 focus:outline-hidden"
                    >
                      <option value="5">5 - Pristine and Robust</option>
                      <option value="4">4 - Good experimental design</option>
                      <option value="3">3 - Satisfactory but narrow</option>
                      <option value="2">2 - Needs additional controls</option>
                      <option value="1">1 - Fatally flawed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Originality (1-5)</label>
                    <select
                      value={reviewScoreOrig}
                      onChange={(e) => setReviewScoreOrig(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-350 rounded-lg p-2 focus:outline-hidden"
                    >
                      <option value="5">5 - Novel clinical breakthrough</option>
                      <option value="4">4 - Significant update</option>
                      <option value="3">3 - Confirms known paradigms</option>
                      <option value="2">2 - Incremental replication</option>
                      <option value="1">1 - Repetitive study</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Scientific Merit (1-5)</label>
                    <select
                      value={reviewScoreMerit}
                      onChange={(e) => setReviewScoreMerit(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-350 rounded-lg p-2 focus:outline-hidden"
                    >
                      <option value="5">5 - Decisive impact</option>
                      <option value="4">4 - High value to practitioners</option>
                      <option value="3">3 - Average relevance</option>
                      <option value="2">2 - Minor medical worth</option>
                      <option value="1">1 - Deficient merit</option>
                    </select>
                  </div>
                </div>

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
                <ManuscriptPreview manuscript={selectedManuscript} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Editor Workspace
  const renderEditorWorkspace = () => {
    const filtered = manuscripts.filter((m) => {
      const matchSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === 'pending') return matchSearch && m.status === 'Submitted';
      if (activeTab === 'reviewed') return matchSearch && m.reviewerAssignments.some(ra => ra.status === 'completed');
      return matchSearch;
    });

    const handleAssignReviewer = (m: Manuscript, reviewerId: string) => {
      const reviewerObj = DB.getUsers().find(u => u.id === reviewerId);
      if (!reviewerObj) return;

      const updated = manuscripts.map(item => {
        if (item.id === m.id) {
          const exists = item.reviewerAssignments.some(ra => ra.reviewerId === reviewerId);
          if (exists) {
            onShowNotification('Reviewer already assigned to this paper.', 'error');
            return item;
          }
          return {
            ...item,
            status: 'Reviewer Assigned' as any,
            reviewerAssignments: [
              ...item.reviewerAssignments,
              {
                reviewerId,
                reviewerName: `${reviewerObj.firstName} ${reviewerObj.lastName}`,
                status: 'assigned' as const,
                assignedAt: new Date().toISOString()
              }
            ]
          };
        }
        return item;
      });
      onUpdateManuscripts(updated);
      setSelectedManuscript(updated.find(item => item.id === m.id) || null);
      onShowNotification(`Assigned independent peer referee ${reviewerObj.firstName} ${reviewerObj.lastName}!`, 'success');

      DB.addAuditLog({
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: 'REVIEWER_INVITED',
        targetId: m.id,
        details: `Dispatched peer-review assignment alert to ${reviewerObj.email}`
      });
    };

    const handleCommitEditorialDecision = (m: Manuscript, decision: 'accept' | 'minor-revision' | 'major-revision' | 'reject' | 'publish') => {
      const statusMap: { [key: string]: string } = {
        'accept': 'Accepted',
        'minor-revision': 'Revision Requested',
        'major-revision': 'Revision Requested',
        'reject': 'Rejected',
        'publish': 'Published'
      };

      const updated = manuscripts.map(item => {
        if (item.id === m.id) {
          return {
            ...item,
            status: statusMap[decision] as any,
            editorDecisionLog: [
              ...item.editorDecisionLog,
              {
                editorId: currentUser.id,
                decision: decision,
                comments: editorComments || 'No remarks logged.',
                timestamp: new Date().toISOString()
              }
            ]
          };
        }
        return item;
      });
      onUpdateManuscripts(updated);
      setSelectedManuscript(updated.find(item => item.id === m.id) || null);
      setShowDecisionModal(false);
      setEditorComments('');
      onShowNotification(`Editorial decision of ${decision.toUpperCase()} recorded and transmitted!`, 'success');

      DB.addAuditLog({
        userId: currentUser.id,
        userEmail: currentUser.email,
        action: `DECISION_${decision.toUpperCase()}`,
        targetId: m.id,
        details: `Assigned status ${statusMap[decision]} with details: ${editorComments}`
      });
    };

    return (
      <div id="editor-workspace" className="space-y-6">
        
        {/* Statistics deck */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
          <div className="bg-white border p-4 rounded-xl shadow-xs text-center">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase">Submissions Volume</h5>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalSubmissions}</p>
          </div>
          <div className="bg-white border p-4 rounded-xl shadow-xs text-center">
            <h5 className="text-[11px] font-bold text-amber-500 uppercase">Referee Active Pipeline</h5>
            <p className="text-2xl font-bold text-amber-600 mt-1">{underReviewCount}</p>
          </div>
          <div className="bg-white border p-4 rounded-xl shadow-xs text-center">
            <h5 className="text-[11px] font-bold text-blue-500 uppercase">Awaiting Action</h5>
            <p className="text-2xl font-bold text-blue-600 mt-1">{decisionPendingCount}</p>
          </div>
          <div className="bg-white border p-4 rounded-xl shadow-xs text-center">
            <h5 className="text-[11px] font-bold text-emerald-500 uppercase">Accepted Papers</h5>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{acceptedCount}</p>
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 no-print">
            <div className="flex justify-between items-center pb-2 border-b">
              <h4 className="font-bold text-sm text-slate-700">Manuscript Store</h4>
              <Sliders className="h-4 w-4 text-slate-400" />
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
              <button 
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-1 px-2 rounded-md ${activeTab === 'all' ? 'bg-white text-teal-800 font-bold shadow-xs' : 'hover:bg-white/55'}`}
              >
                All
              </button>
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-1 px-2 rounded-md ${activeTab === 'pending' ? 'bg-white text-teal-800 font-bold shadow-xs' : 'hover:bg-white/55'}`}
              >
                Pending
              </button>
              <button 
                onClick={() => setActiveTab('reviewed')}
                className={`flex-1 py-1 px-2 rounded-md ${activeTab === 'reviewed' ? 'bg-white text-teal-800 font-bold shadow-xs' : 'hover:bg-white/55'}`}
              >
                Reviewed
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search ID or Title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:ring-1 focus:ring-teal-600 focus:outline-hidden"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Manuscripts roster list */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No matching submissions found.</p>
              ) : (
                filtered.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => { setSelectedManuscript(m); setDecisionManuscriptId(m.id); }}
                    className={`p-3 border rounded-xl text-left cursor-pointer transition-all ${
                      selectedManuscript?.id === m.id ? 'bg-teal-50 border-teal-500 shadow-xs' : 'bg-slate-50 border-slate-220 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-teal-800">{m.id}</span>
                      {m.status === 'Submitted' && m.reviewerAssignments.length === 0 && m.editorDecisionLog.length === 0 && (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">New</span>
                      )}
                      {renderStatusBadge(m.status)}
                    </div>
                    <h5 className="text-xs font-bold text-slate-800 mt-1.5 line-clamp-2">{m.title}</h5>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Submitted: {new Date((m as any).submittedAt || m.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

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

                <div className="bg-slate-50 border p-3 rounded-xl text-xs no-print">
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
                </div>

                <div className="bg-slate-50 border p-3 rounded-xl text-xs no-print space-y-2">
                  <label className="block font-bold text-slate-700">Author email actions</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => sendTemplateEmail(selectedManuscript, 'accepted')}
                      className="rounded bg-emerald-700 px-3 py-2 font-bold text-white"
                    >
                      Accepted + 300 GEL Email
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

                {/* Submitting author specs */}
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
                        {DB.getUsers().filter(u => u.role === 'Reviewer').map(rev => (
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
                    <SubmissionWorkflow
                      manuscript={selectedManuscript}
                      onUpdateManuscript={updateSelectedManuscript}
                      activeStep={officeEditStep}
                      onStepChange={setOfficeEditStep}
                      onShowNotification={onShowNotification}
                    />
                  </div>
                ) : (
                  <div className="border-t pt-6">
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
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white border-2 border-dashed rounded-2xl h-96 flex flex-col items-center justify-center text-slate-400">
                <FileText className="h-10 w-10 mb-2 opacity-50" />
                <p>Select a submitted manuscript from the side-deck to inspect the full package.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  // Render Managing Editor Pane
  const renderManagingEditorWorkspace = () => {
    return (
      <div id="managing-editor-dash" className="space-y-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-700" />
            Platform Auditing
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Audit system security logs and review CC-BY journal settings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Central Security Auditing console */}
          <div className="bg-white border p-5 rounded-2xl shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-700 flex items-center gap-1.5 border-b pb-2">
              <AlertCircle className="h-4 w-4 text-red-500" /> Secure Audit Console log
            </h4>
            <div className="bg-slate-900 text-emerald-400 font-mono text-[10px] p-4 rounded-xl h-64 overflow-y-auto space-y-2 select-text">
              <div className="text-white border-b border-slate-700 pb-1 mb-2">SECURE SHAL-256 EVENT STREAM</div>
              {DB.getAuditLogs().map((log) => (
                <div key={log.id} className="leading-snug">
                  <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className="text-teal-400 font-bold">{log.action}</span> -{' '}
                  <span className="text-slate-300">{log.details}</span> <span className="text-slate-500 font-bold">(ID: {log.targetId})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Administrator Panel
  const renderAdministratorPanel = () => {
    return (
      <div id="admin-hub" className="space-y-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-teal-700" />
            Central Administrator Hub
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Override submission parameters, calibrate article quotas, and assign editorial user ranks.
          </p>
        </div>

        <form onSubmit={handleSaveAdminUser} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <h4 className="font-bold text-sm text-slate-800">{editingUserId ? 'Edit System User' : 'Create System User'}</h4>
              <p className="text-xs text-slate-500">Administrators can create, edit, verify, re-role, and delete journal users.</p>
            </div>
            {editingUserId && (
              <button type="button" onClick={resetUserForm} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                Cancel edit
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <input value={userForm.firstName} onChange={(event) => setUserForm(prev => ({ ...prev, firstName: event.target.value }))} placeholder="First name" className="border border-slate-300 rounded-lg p-2 bg-slate-50" />
            <input value={userForm.lastName} onChange={(event) => setUserForm(prev => ({ ...prev, lastName: event.target.value }))} placeholder="Last name" className="border border-slate-300 rounded-lg p-2 bg-slate-50" />
            <input value={userForm.email} onChange={(event) => setUserForm(prev => ({ ...prev, email: event.target.value }))} placeholder="Email" className="border border-slate-300 rounded-lg p-2 bg-slate-50" />
            <select value={userForm.role} onChange={(event) => setUserForm(prev => ({ ...prev, role: event.target.value as UserRole }))} className="border border-slate-300 rounded-lg p-2 bg-slate-50 font-bold">
              <option value="Author">Author</option>
              <option value="Editor">Editor</option>
              <option value="Managing Editor">Managing Editor</option>
              <option value="Reviewer">Reviewer</option>
              <option value="Administrator">Administrator</option>
            </select>
            <input value={userForm.institution} onChange={(event) => setUserForm(prev => ({ ...prev, institution: event.target.value }))} placeholder="Institution" className="md:col-span-2 border border-slate-300 rounded-lg p-2 bg-slate-50" />
            <input value={userForm.orcidId} onChange={(event) => setUserForm(prev => ({ ...prev, orcidId: event.target.value }))} placeholder="ORCID iD (optional)" className="border border-slate-300 rounded-lg p-2 bg-slate-50" />
            <label className="flex items-center gap-2 border border-slate-300 rounded-lg p-2 bg-slate-50 font-semibold text-slate-700">
              <input type="checkbox" checked={userForm.isVerified} onChange={(event) => setUserForm(prev => ({ ...prev, isVerified: event.target.checked }))} />
              Verified
            </label>
          </div>
          <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg">
            {editingUserId ? 'Save User Changes' : 'Create User'}
          </button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users Roster editor */}
          <div className="lg:col-span-2 bg-white border p-5 rounded-2xl space-y-4 shadow-xs">
            <h4 className="font-bold text-sm text-slate-700 border-b pb-2">Central Scholar Roster Directory</h4>
            <div className="overflow-x-auto text-xs text-left">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50 font-bold text-slate-600">
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">System Role</th>
                    <th className="p-2">Verified</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="p-2 font-semibold text-slate-850">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="p-2 text-slate-600">{user.email}</td>
                      <td className="p-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                          className={`p-1.5 rounded font-bold text-[10px] uppercase border ${
                            user.role === 'Author' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' :
                            user.role === 'Editor' ? 'bg-teal-50 border-teal-200 text-teal-800' :
                            user.role === 'Reviewer' ? 'bg-yellow-50 border-yellow-250 text-yellow-850' :
                            'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="Author">Author</option>
                          <option value="Editor">Editor</option>
                          <option value="Managing Editor">Managing Editor</option>
                          <option value="Reviewer">Reviewer</option>
                          <option value="Administrator">Administrator</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => {
                            const updatedUsers = adminUsers.map(item => item.id === user.id ? { ...item, isVerified: !item.isVerified } : item);
                            setAdminUsers(updatedUsers);
                            DB.setUsers(updatedUsers);
                            onShowNotification('User verification state updated.', 'success');
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${
                            user.isVerified ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {user.isVerified ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-[10px] font-bold text-teal-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-[10px] font-bold text-rose-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Article configurations limits panel */}
          <div className="bg-white border p-5 rounded-2xl shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-700 border-b pb-2">Article Spec Quotas</h4>
            <div className="space-y-3 font-sans text-xs max-h-96 overflow-y-auto pr-1">
              {Object.values(ARTICLE_TYPES).map((type) => (
                <div key={type.key} className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{type.name}</span>
                    <span className="text-teal-800">${type.submissionFeeUSD} USD Offset</span>
                  </div>
                  <p className="text-slate-500 italic text-[11px] leading-tight">{type.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 text-slate-600 border-t border-slate-200/55">
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
  };

  return (
    <div id="central-role-dashboards" className="space-y-6">
      {currentUser.role === 'Editor' && renderEditorWorkspace()}
      {currentUser.role === 'Reviewer' && renderReviewerDashboard()}
      {currentUser.role === 'Managing Editor' && (
        <div className="space-y-8">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4">
            <h3 className="text-sm font-bold text-teal-900">Managing Editor Full Access</h3>
            <p className="text-xs text-teal-800 mt-1">You can manage editorial decisions, reviewer assignment, financial verification, and audit review.</p>
          </div>
          {renderEditorWorkspace()}
          {renderManagingEditorWorkspace()}
        </div>
      )}
      {currentUser.role === 'Administrator' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Administrator Full System Access</h3>
              <p className="text-xs text-slate-300 mt-1">Editorial control, finance/audit control, and user management are all available.</p>
            </div>
            <div className="flex gap-1 bg-white/10 p-1 rounded-lg text-xs font-bold">
              <button onClick={() => setAdminMode('editorial')} className={`px-3 py-1.5 rounded-md ${adminMode === 'editorial' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}>Editorial</button>
              <button onClick={() => setAdminMode('finance')} className={`px-3 py-1.5 rounded-md ${adminMode === 'finance' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}>Finance/Audit</button>
              <button onClick={() => setAdminMode('users')} className={`px-3 py-1.5 rounded-md ${adminMode === 'users' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}>Users</button>
            </div>
          </div>
          {adminMode === 'editorial' && renderEditorWorkspace()}
          {adminMode === 'finance' && renderManagingEditorWorkspace()}
          {adminMode === 'users' && renderAdministratorPanel()}
        </div>
      )}
    </div>
  );
}
