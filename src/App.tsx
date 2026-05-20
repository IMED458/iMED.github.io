/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, Manuscript, UserRole } from './types';
import { DB } from './utils';
import AuthLayout from './components/AuthLayout';
import SidebarWorkflow from './components/SidebarWorkflow';
import SubmissionWorkflow from './components/SubmissionWorkflow';
import RoleDashboards from './components/RoleDashboards';
import { 
  GraduationCap, 
  User as UserIcon, 
  LogOut, 
  Bell, 
  Cpu, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [activeStep, setActiveStep] = useState<string>('getting-started');
  
  // Real-time toast alert state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showNotificationBell, setShowNotificationBell] = useState(false);
  const [journalNotifications, setJournalNotifications] = useState<Array<{ id: string; text: string; time: string; read: boolean }>>([
    { id: 'n1', text: 'Welcome to GBMN peer submissions network! Check policies.', time: 'Just now', read: false },
    { id: 'n2', text: 'Shota Rustaveli national grant funding integration loaded.', time: '2 hours ago', read: true },
  ]);

  // Load state from local storage databases on mount
  useEffect(() => {
    setCurrentUser(DB.getCurrentUser());
    setManuscripts(DB.getManuscripts());
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
      setManuscripts(DB.getManuscripts());
    }
  };

  const handleUpdateManuscript = (updated: Manuscript) => {
    const list = manuscripts.map(m => m.id === updated.id ? updated : m);
    setManuscripts(list);
    DB.setManuscripts(list);
  };

  const handleUpdateManuscriptsList = (newList: Manuscript[]) => {
    setManuscripts(newList);
    DB.setManuscripts(newList);
  };

  const handleLogout = () => {
    DB.setCurrentUser(null);
    setCurrentUser(null);
    triggerNotification('Logged out from publishing dashboard.', 'info');
  };

  const handleQuickRoleSwap = (newRole: UserRole) => {
    const usersList = DB.getUsers();
    const targetedUser = usersList.find(u => u.role === newRole);
    if (targetedUser) {
      DB.setCurrentUser(targetedUser);
      setCurrentUser(targetedUser);
      triggerNotification(`Role swapped in sandbox mode: ${targetedUser.firstName} (${targetedUser.role})`, 'success');
      
      DB.addAuditLog({
        userId: targetedUser.id,
        userEmail: targetedUser.email,
        action: 'TOOLBAR_ROLE_SWAP',
        targetId: targetedUser.id,
        details: `Simulated hot role transition directly to: ${newRole}`
      });
    }
  };

  // Get active editing draft or create an empty one if author has none
  const activeManuscript = manuscripts.find(m => m.authorId === currentUser?.id) || (() => {
    const fallbackDraft: Manuscript = {
      id: `GBMN-2026-${Math.floor(Math.random() * 900) + 100}`,
      status: 'Draft',
      authorId: currentUser?.id || 'anonymous',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: '',
      runningTitle: '',
      specialty: 'Clinical Medicine',
      articleType: 'original-article',
      checklistAgreed: false,
      authors: [],
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
    };
    return fallbackDraft;
  })();

  const triggerPrecreateDraft = () => {
    const list = [...manuscripts, activeManuscript];
    setManuscripts(list);
    DB.setManuscripts(list);
  };

  // Ensure manuscript list contains the newly created fallback if empty list
  useEffect(() => {
    if (currentUser?.role === 'Author' && manuscripts.length === 0) {
      triggerPrecreateDraft();
    }
  }, [currentUser, manuscripts]);

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

      {/* 2. CENTRAL SANDBOX NAVIGATION OVERLAY */}
      {currentUser && (
        <div id="sandbox-quickbar" className="bg-[#0f172a] text-slate-200 px-4 py-2 text-xs font-medium flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-teal-400 animate-pulse" />
            <span className="text-slate-350">
              GBMN Sandbox Environment Panel: 
            </span>
            <span className="bg-slate-800 text-teal-400 font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">
              {currentUser.role} View Active
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 mr-1.5">Quick-Swap Roles:</span>
            {[ 'Author', 'Editor', 'Reviewer', 'Managing Editor', 'Administrator' ].map((role) => {
              const isActive = currentUser.role === role;
              return (
                <button
                  id={`sandbox-swap-${role.toLowerCase().replace(/\s+/g, '-')}`}
                  key={role}
                  onClick={() => handleQuickRoleSwap(role as UserRole)}
                  className={`px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-teal-705 text-white bg-teal-700 shadow-sm border border-teal-600' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SCIENTIFIC BRAND HEADNAV BAR */}
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
                <div className="absolute right-0 mt-2 w-80 bg-white border p-3 shadow-2xl rounded-xl z-55 divide-y divide-slate-100 text-xs">
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

      {/* 4. WORKPLACE CANVAS */}
      <main id="main-workplace-canvas" className="flex-1 py-8 px-4 md:px-8 max-w-7xl mx-auto w-full">
        
        {!currentUser ? (
          <AuthLayout 
            currentUser={currentUser} 
            onUserChanged={handleUserChanged} 
            onShowNotification={triggerNotification} 
          />
        ) : currentUser.role === 'Author' ? (
          
          /* AUTHOR STEP-BY-STEP SUBMISSION FLOW VIEWER */
          <div id="author-submission-layout" className="flex flex-col md:flex-row gap-8">
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
