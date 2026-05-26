/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, Manuscript } from './types';
import { createManuscriptId, DB } from './utils';
import { uploadImageDataUrlToCloudinary } from './cloudinary';
import AuthLayout from './components/AuthLayout';
import SidebarWorkflow from './components/SidebarWorkflow';
import SubmissionWorkflow from './components/SubmissionWorkflow';
import RoleDashboards from './components/RoleDashboards';
import ManuscriptPreview from './components/ManuscriptPreview';
import { changeFirebasePassword, signOutFirebase, subscribeFirebaseAuth } from './firebase';
import { 
  GraduationCap, 
  User as UserIcon, 
  LogOut, 
  Bell, 
  Sparkles, 
  AlertCircle,
  Info,
  FileText,
  Plus,
  Clock
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string>('getting-started');
  
  // Real-time toast alert state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showNotificationBell, setShowNotificationBell] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    firstName: '',
    lastName: '',
    email: '',
    institution: '',
    orcidId: '',
    newPassword: '',
    confirmPassword: '',
  });
  const isEditorialUser = currentUser && currentUser.role !== 'Author';
  const [journalNotifications, setJournalNotifications] = useState<Array<{ id: string; text: string; time: string; read: boolean }>>([
    { id: 'n1', text: 'Welcome to GBMN peer submissions network! Check policies.', time: 'Just now', read: false },
    { id: 'n2', text: 'Shota Rustaveli national grant funding integration loaded.', time: '2 hours ago', read: true },
  ]);

  // Load persistent cloud state on mount and sync visible role users across devices.
  useEffect(() => {
    const unsubscribe = subscribeFirebaseAuth(async firebaseUser => {
      await DB.syncUsersFromFirestore().catch(() => {});
      if (!firebaseUser) {
        setCurrentUser(null);
        return;
      }
      const profile = await DB.getUserByIdAsync(firebaseUser.uid);
      if (profile) setCurrentUser(profile);
    });
    DB.getManuscriptsAsync().then(setManuscripts).catch(() => {});
    return unsubscribe;
  }, []);

  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    
    // Add to notification roster history
    const newNotice = {
      id: `not-${Date.now()}`,
      text: message,
      time: 'Just now',
      read: false
    };
    setJournalNotifications(prev => [newNotice, ...prev]);

    // Timed fadeout
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleUserChanged = (newAuth: User | null) => {
    setCurrentUser(newAuth);
    if (newAuth) {
      // Refresh local submissions list
      DB.getManuscriptsAsync().then(setManuscripts).catch(() => {});
    }
  };

  const uploadEmbeddedImages = async (manuscript: Manuscript): Promise<Manuscript> => {
    const replaceImages = async (html: string, section: string) => {
      const matches = Array.from(new Set(html.match(/data:image\/[^"')\s]+/g) || []));
      let nextHtml = html;
      for (const [index, dataUrl] of matches.entries()) {
        const url = await uploadImageDataUrlToCloudinary(dataUrl, `gbmn/${manuscript.id}/${section}-${index}`);
        nextHtml = nextHtml.replaceAll(dataUrl, url);
      }
      return nextHtml;
    };
    const sections = { ...manuscript.sections };
    for (const key of Object.keys(sections)) sections[key] = await replaceImages(sections[key] || '', key);
    return { ...manuscript, sections };
  };

  const handleUpdateManuscript = async (updated: Manuscript) => {
    const cloudReady = await uploadEmbeddedImages(updated);
    const exists = manuscripts.some(m => m.id === updated.id);
    const list = exists
      ? manuscripts.map(m => m.id === updated.id ? cloudReady : m)
      : [...manuscripts, cloudReady];
    setManuscripts(list);
    DB.setManuscripts(list);
    setSelectedManuscriptId(cloudReady.id);
  };

  const handleUpdateManuscriptsList = (newList: Manuscript[]) => {
    setManuscripts(newList);
    DB.setManuscripts(newList);
  };

  const handleLogout = async () => {
    DB.setCurrentUser(null);
    await signOutFirebase();
    setCurrentUser(null);
    triggerNotification('Logged out from publishing dashboard.', 'info');
  };

  const openProfileEditor = () => {
    if (!currentUser) return;
    setProfileDraft({
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      institution: currentUser.institution,
      orcidId: currentUser.orcidId || '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowProfileEditor(true);
  };

  const saveProfileEditor = async () => {
    if (!currentUser) return;
    if (!profileDraft.firstName || !profileDraft.lastName || !profileDraft.email || !profileDraft.institution) {
      triggerNotification('Profile requires first name, last name, email, and institution.', 'error');
      return;
    }
    const { newPassword, confirmPassword, ...profileFields } = profileDraft;
    if (newPassword) {
      if (newPassword.length < 6) {
        triggerNotification('Password must be at least 6 characters.', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        triggerNotification('Passwords do not match.', 'error');
        return;
      }
    }
    const updatedUser = { ...currentUser, ...profileFields, orcidId: profileDraft.orcidId || undefined };
    const users = DB.getUsers();
    const updatedUsers = users.some(user => user.id === currentUser.id)
      ? users.map(user => user.id === currentUser.id ? updatedUser : user)
      : [...users, updatedUser];
    DB.setUsers(updatedUsers);
    DB.setUser(updatedUser);
    DB.setCurrentUser(updatedUser);
    if (newPassword) {
      await changeFirebasePassword(newPassword);
    }
    setCurrentUser(updatedUser);
    setShowProfileEditor(false);
    triggerNotification(profileDraft.newPassword ? 'Profile and password updated.' : 'Profile updated.', 'success');
  };

  const createEmptyDraft = (authorId: string): Manuscript => ({
      id: createManuscriptId(),
      status: 'Draft',
      authorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: '',
      runningTitle: '',
      specialty: 'Clinical Medicine',
      articleType: 'original-research',
      publicationInfo: {
        doi: '',
        volumeIssue: ''
      },
      checklistAgreed: false,
      authors: currentUser ? [{
        id: `auth-${currentUser.id}`,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        phone: '',
        orcidId: currentUser.orcidId || '',
        specialty: 'Clinical Medicine',
        country: 'Georgia',
        city: 'Tbilisi',
        institution: currentUser.institution,
        department: '',
        affiliation: `${currentUser.institution}`,
        affiliations: [`${currentUser.institution}`],
        academicTitle: '',
        contributionRole: 'Corresponding Author',
        contributionTags: [
          'Agreed to be accountable for all aspects of the work',
          'Will review the final version to be published'
        ],
        isCorresponding: true
      }] : [],
      abstractContents: {},
      sections: {},
      figuresAndTables: [],
      references: [],
      supplementaryFiles: [],
      ethics: {
        humanSubjectsApproved: 'no',
        irbApprovalNumber: '',
        irbInstitution: '',
        animalSubjectsUsed: 'no',
        animalEthicsStatement: '',
        informedConsentObtained: 'no'
      },
      conflictDisclosure: {
        hasConflict: false,
        conflictDetails: '',
        hasReceivedFunding: false,
        fundingSource: '',
        hasIndustryRelation: false,
        industryRelationDetails: ''
      },
      fundingDetails: {
        fundingAgency: '',
        grantNumber: '',
        explanation: ''
      },
      payment: {
        invoiceNumber: `GBMN-INV-${Date.now().toString().slice(-4)}`,
        referenceId: '',
        paymentNote: '',
        fileName: '',
        status: 'pending',
        uploadedAt: ''
      },
      editorFiles: [],
      reviewerAssignments: [],
      editorDecisionLog: []
  });

  const authorManuscripts = currentUser?.role === 'Author'
    ? manuscripts.filter(m => m.authorId === currentUser.id)
    : [];

  const activeManuscript = currentUser?.role === 'Author'
    ? authorManuscripts.find(m => m.id === selectedManuscriptId) || authorManuscripts[0] || null
    : null;
  const authorCanEditActive = !activeManuscript || ['Draft', 'Revision Requested'].includes(activeManuscript.status);

  const createAuthorDraft = () => {
    if (!currentUser) return;
    const draft = createEmptyDraft(currentUser.id);
    const list = [...manuscripts, draft];
    setManuscripts(list);
    DB.setManuscripts(list);
    setSelectedManuscriptId(draft.id);
    setActiveStep('title-meta');
    triggerNotification('New draft created. You can stop and continue later.', 'success');
  };

  useEffect(() => {
    if (currentUser?.role === 'Author' && authorManuscripts.length > 0 && !selectedManuscriptId) {
      setSelectedManuscriptId(authorManuscripts[0].id);
    }
  }, [currentUser?.id, currentUser?.role, manuscripts, selectedManuscriptId]);

  return (
    <div id="gbmn-application" className="min-h-screen flex flex-col font-sans bg-slate-50 antialiased selection:bg-teal-700 selection:text-white">
      
      {/* 1. MASTER TOAST ALERTS DECK */}
      {toast && (
        <div 
          id="system-modal-toast" 
          className="fixed top-20 right-4 z-50 animate-fade-in max-w-sm bg-white border-l-4 border-teal-700 p-4 rounded-xl shadow-2xl flex items-start gap-3 border border-slate-200"
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="h-5 w-5 text-sky-600 mt-0.5 shrink-0" />
          ) : (
            <Sparkles className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider block font-display">
              Journal System Alert
            </p>
            <p className="text-xs text-slate-650 mt-0.5 font-medium leading-snug">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* 2. SCIENTIFIC BRAND HEADNAV BAR */}
      <header id="main-editorial-header" className="bg-white border-b border-slate-200 py-3.5 px-4 md:px-8 shadow-xs flex justify-between items-center flex-wrap gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 border border-teal-100 text-teal-700 rounded-lg">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base md:text-md font-display font-extrabold text-slate-900 leading-snug tracking-tight">
              Georgian Biomedical and Medical Nexus
            </h1>
            <p className="text-[10px] text-teal-800 font-bold uppercase tracking-widest leading-none mt-0.5">
              Online Publishing and Peer Submissions
            </p>
          </div>
        </div>

        {currentUser && (
          <div id="header-user-badge" className="flex items-center gap-3 font-medium text-xs text-slate-700 no-print">
            
            {/* Notifications Bell */}
            <div className="relative">
              <button 
                id="notice-bell-icon"
                onClick={() => setShowNotificationBell(!showNotificationBell)}
                className="p-1.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                <Bell className="h-4 w-4" />
                {journalNotifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>
              
              {/* Notification Menu List */}
              {showNotificationBell && (
                <div className="absolute right-0 mt-2 w-80 bg-white border p-3 shadow-2xl rounded-xl z-[55] divide-y divide-slate-100 text-xs">
                  <div className="font-bold pb-1 text-slate-900 text-xs flex justify-between">
                    <span>Journal mailbox updates</span>
                    <button 
                      onClick={() => setJournalNotifications(prev => prev.map(n => ({...n, read: true})))}
                      className="text-[10px] underline text-teal-700"
                    >
                      Clear alerts
                    </button>
                  </div>
                  {journalNotifications.map((not) => (
                    <div key={not.id} className="py-2.5">
                      <p className={`leading-snug ${not.read ? 'text-slate-500' : 'text-slate-800 font-semibold'}`}>{not.text}</p>
                      <span className="text-[10px] text-slate-450 italic mt-1 block">{not.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User credentials */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-220 px-3 py-1.5 rounded-xl font-medium">
              <UserIcon className="h-4 w-4 text-teal-700" />
              <div>
                <span className="font-bold text-slate-800">{currentUser.firstName} {currentUser.lastName}</span>
                <span className="text-[10px] opacity-70 block">({currentUser.institution})</span>
              </div>
            </div>

            <button
              id="profile-editor-btn"
              onClick={openProfileEditor}
              className="p-2 border border-slate-200 bg-slate-50 text-teal-700 rounded-lg hover:bg-teal-50 transition"
              title="Edit profile"
            >
              <UserIcon className="h-4 w-4" />
            </button>

            {/* Logout actions */}
            <button
              id="platform-logout-btn"
              onClick={handleLogout}
              className="p-2 border border-slate-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
              title="Exit network"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      {showProfileEditor && currentUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4 no-print">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Profile</h2>
                <p className="text-xs text-slate-500">Update your GBMN account details.</p>
              </div>
              <button onClick={() => setShowProfileEditor(false)} className="rounded-lg border px-3 py-1 text-xs font-bold text-slate-600">Close</button>
            </div>
            <div className="grid grid-cols-1 gap-3 text-xs">
              <input value={profileDraft.firstName} onChange={event => setProfileDraft(prev => ({ ...prev, firstName: event.target.value }))} placeholder="First name" className="rounded-lg border border-slate-300 p-2" />
              <input value={profileDraft.lastName} onChange={event => setProfileDraft(prev => ({ ...prev, lastName: event.target.value }))} placeholder="Last name" className="rounded-lg border border-slate-300 p-2" />
              <input value={profileDraft.email} onChange={event => setProfileDraft(prev => ({ ...prev, email: event.target.value }))} placeholder="Email" className="rounded-lg border border-slate-300 p-2" />
              <input value={profileDraft.institution} onChange={event => setProfileDraft(prev => ({ ...prev, institution: event.target.value }))} placeholder="Institution" className="rounded-lg border border-slate-300 p-2" />
              <input value={profileDraft.orcidId} onChange={event => setProfileDraft(prev => ({ ...prev, orcidId: event.target.value }))} placeholder="ORCID iD" className="rounded-lg border border-slate-300 p-2 font-mono" />
              <div className="border-t border-slate-100 pt-3 mt-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Change Password (optional)</p>
                <input type="password" value={profileDraft.newPassword} onChange={event => setProfileDraft(prev => ({ ...prev, newPassword: event.target.value }))} placeholder="New password (min 6 chars)" className="rounded-lg border border-slate-300 p-2 w-full mb-2" />
                <input type="password" value={profileDraft.confirmPassword} onChange={event => setProfileDraft(prev => ({ ...prev, confirmPassword: event.target.value }))} placeholder="Confirm new password" className="rounded-lg border border-slate-300 p-2 w-full" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowProfileEditor(false)} className="rounded-lg border px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button onClick={saveProfileEditor} className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white">Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. WORKPLACE CANVAS */}
      <main id="main-workplace-canvas" className={`flex-1 w-full ${isEditorialUser ? 'py-0 px-0 max-w-none mx-0' : 'py-8 px-4 md:px-8 max-w-7xl mx-auto'}`}>
        
        {!currentUser ? (
          <AuthLayout 
            currentUser={currentUser} 
            onUserChanged={handleUserChanged} 
            onShowNotification={triggerNotification} 
          />
        ) : currentUser.role === 'Author' ? (
          
          /* AUTHOR STEP-BY-STEP SUBMISSION FLOW VIEWER */
          <div id="author-submission-layout" className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm no-print">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-display font-bold text-slate-900">Home · My Manuscripts</h2>
                  <p className="text-xs text-slate-500">{currentUser.firstName} {currentUser.lastName} · {currentUser.email} · {currentUser.institution}</p>
                </div>
                <button onClick={createAuthorDraft} className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-lg">
                  <Plus className="h-4 w-4" /> New Manuscript
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {authorManuscripts.length === 0 ? (
                  <button onClick={createAuthorDraft} className="col-span-full border-2 border-dashed border-slate-250 rounded-xl p-6 text-sm text-slate-500 hover:border-teal-500 hover:text-teal-700">
                    No manuscripts yet. Create your first draft.
                  </button>
                ) : authorManuscripts.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedManuscriptId(m.id); setActiveStep('getting-started'); }}
                    className={`text-left border rounded-xl p-3 transition ${activeManuscript?.id === m.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                      <span>{m.id}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {m.status}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-800 line-clamp-2">{m.title || 'Untitled draft'}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Created {new Date(m.createdAt).toLocaleDateString()} · Updated {new Date(m.updatedAt).toLocaleDateString()}</p>
                    {m.editorDecisionLog.length > 0 && (
                      <p className="mt-1 text-[11px] text-amber-700 font-semibold line-clamp-1">
                        Latest editor note: {m.editorDecisionLog[m.editorDecisionLog.length - 1].comments}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {activeManuscript && (
              authorCanEditActive ? (
              <div className="flex flex-col md:flex-row gap-8">
                <SidebarWorkflow 
                  manuscript={activeManuscript} 
                  activeStep={activeStep} 
                  onStepSelected={(stepId) => {
                    setActiveStep(stepId);
                    triggerNotification(`Switched section to: ${stepId.replace('-', ' ')}`, 'info');
                  }}
                />
                <div className="flex-1">
                  <SubmissionWorkflow 
                    manuscript={activeManuscript}
                    onUpdateManuscript={handleUpdateManuscript}
                    activeStep={activeStep}
                    onStepChange={setActiveStep}
                    onShowNotification={triggerNotification}
                  />
                </div>
              </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                    This manuscript is currently <strong>{activeManuscript.status}</strong>. Editing is locked until an editor returns it for revision.
                  </div>
                  <ManuscriptPreview manuscript={activeManuscript} onShowNotification={triggerNotification} />
                </div>
              )
            )}
            </div>
        ) : (
          
          /* INTERACTIVE MULTI-ROLE OFFICE DASHBOARDS */
          <RoleDashboards 
            currentUser={currentUser}
            manuscripts={manuscripts}
            onUpdateManuscripts={handleUpdateManuscriptsList}
            onShowNotification={triggerNotification}
          />
        )}

      </main>

      {/* FOOTER COOPERATIVE PANEL */}
      <footer id="publishing-system-footer" className="bg-white border-t border-slate-200 mt-12 py-6 px-4 md:px-8 text-center text-xs text-slate-400 space-y-2 no-print">
        <div className="flex justify-center items-center gap-2 mb-1">
          <GraduationCap className="h-5 w-5 text-teal-700" />
          <span className="font-semibold text-slate-800 font-display">Georgian Biomedical and Medical Nexus (GBMN)</span>
        </div>
        <p className="leading-snug max-w-sm mx-auto">
          Authorized peer submission portal. Handled in complete compatibility with the Tbilisi State Medical University and Rustaveli Science Boards.
        </p>
        <p className="font-mono text-[9px]">Server status: Live · TLS Encryption active · CC-BY 4.0 Standard</p>
      </footer>

    </div>
  );
}
