/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Manuscript } from '../types';
import { ARTICLE_TYPES } from '../utils';
import { 
  CheckCircle, 
  Circle, 
  AlertCircle, 
  BookOpen, 
  Users, 
  Layers, 
  FileText, 
  Key, 
  Bookmark, 
  Paperclip, 
  ShieldCheck, 
  DollarSign, 
  Sparkles, 
  Eye, 
  FileCheck2, 
  HeartHandshake
} from 'lucide-react';

export interface SubmissionStep {
  id: string;
  label: string;
  icon: any;
  validator: (manuscript: Manuscript) => 'complete' | 'warning' | 'empty';
}

export const SUBMISSION_STEPS: SubmissionStep[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: BookOpen,
    validator: () => 'complete',
  },
  {
    id: 'policies',
    label: 'Journal Policies',
    icon: ShieldCheck,
    validator: () => 'complete',
  },
  {
    id: 'checklist',
    label: 'Manuscript Checklist',
    icon: FileCheck2,
    validator: (m) => m.checklistAgreed ? 'complete' : 'warning',
  },
  {
    id: 'title-meta',
    label: 'Title & Metadata',
    icon: FileText,
    validator: (m) => (m.title.trim() && m.runningTitle.trim() && m.specialty.trim()) ? 'complete' : m.title.trim() ? 'warning' : 'empty',
  },
  {
    id: 'authors',
    label: 'Authors',
    icon: Users,
    validator: (m) => {
      if (m.authors.length === 0) return 'empty';
      const hasCorr = m.authors.some(a => a.isCorresponding);
      const allHaveOrcid = m.authors.every(a => a.orcidId && a.orcidId.length > 5);
      return (hasCorr && allHaveOrcid) ? 'complete' : 'warning';
    },
  },
  {
    id: 'article-type',
    label: 'Article Type',
    icon: Layers,
    validator: (m) => m.articleType ? 'complete' : 'empty',
  },
  {
    id: 'abstract',
    label: 'Abstract',
    icon: Sparkles,
    validator: (m) => {
      const config = ARTICLE_TYPES[m.articleType];
      if (!config || config.abstractType === 'none') return 'complete';
      const text = (m.abstractContents['text'] || '').replace(/<[^>]+>/g, '').trim();
      if (text.length > 50) return 'complete';
      if (text.length > 0) return 'warning';
      return 'empty';
    },
  },
  {
    id: 'keywords',
    label: 'Keywords',
    icon: Key,
    validator: (m) => {
      const cnt = (m.sections['Keywords'] || '').split(/[;,]/).map(k => k.trim()).filter(Boolean).length;
      if (cnt >= 3 && cnt <= 6) return 'complete';
      if (cnt > 0) return 'warning';
      return 'empty';
    },
  },
  {
    id: 'sections',
    label: 'Manuscript Sections',
    icon: FileText,
    validator: (m) => {
      const config = ARTICLE_TYPES[m.articleType];
      if (!config) return 'empty';
      const reqs = config.requiredSections.filter(s => s !== 'Acknowledgments' && s !== 'Keywords');
      const filled = reqs.filter(s => m.sections[s] && m.sections[s].length > 100);
      if (filled.length === reqs.length) return 'complete';
      if (filled.length > 0) return 'warning';
      return 'empty';
    },
  },
  {
    id: 'references',
    label: 'References (AMA)',
    icon: Bookmark,
    validator: (m) => {
      if (m.references.length === 0) return 'empty';
      const hasIncomplete = m.references.some(r => !r.authors || !r.title || !r.year || !r.journalOrBook);
      return hasIncomplete ? 'warning' : 'complete';
    },
  },
  {
    id: 'supplementary',
    label: 'Supplementary Files',
    icon: Paperclip,
    validator: (m) => 'complete',
  },
  {
    id: 'ethics',
    label: 'Ethics Statement',
    icon: HeartHandshake,
    validator: (m) => {
      const isComplete = m.ethics.humanSubjectsApproved && m.ethics.informedConsentObtained;
      if (isComplete && m.ethics.ethicsStatementFileName) return 'complete';
      if (isComplete) return 'warning';
      return 'empty';
    },
  },
  {
    id: 'conflicts',
    label: 'Conflict Disclosures',
    icon: ShieldCheck,
    validator: (m) => m.conflictDisclosure.signedCoiFormName ? 'complete' : 'warning',
  },
  {
    id: 'funding',
    label: 'Funding Info',
    icon: DollarSign,
    validator: () => 'complete', // Optional field
  },
  {
    id: 'payment',
    label: 'Payment Receipt',
    icon: DollarSign,
    validator: (m) => m.payment.fileName ? 'complete' : 'warning',
  },
  {
    id: 'editor-files',
    label: 'Files for Editorial Office',
    icon: FileCheck2,
    validator: () => 'complete',
  },
  {
    id: 'preview',
    label: 'Manuscript Preview',
    icon: Eye,
    validator: () => 'complete',
  },
  {
    id: 'summary-submit',
    label: 'Summary & Submit',
    icon: CheckCircle,
    validator: () => 'complete',
  }
];

interface SidebarWorkflowProps {
  manuscript: Manuscript;
  activeStep: string;
  onStepSelected: (stepId: string) => void;
}

function statusHelp(stepId: string, status: 'complete' | 'warning' | 'empty') {
  if (status === 'complete') return '';
  const messages: Record<string, string> = {
    checklist: 'Checklist must be accepted before submission.',
    'title-meta': 'Full title, running title, and specialty are required.',
    authors: 'Add at least one author, ORCID, and a corresponding author.',
    abstract: 'Abstract is required for this article type.',
    keywords: 'Enter 3-6 MeSH-style keywords separated by semicolons or commas.',
    sections: 'Required manuscript body sections need content.',
    references: 'Add complete AMA references.',
    ethics: 'Ethics fields and IRB upload should be completed.',
    conflicts: 'Signed conflict of interest form is required.',
    payment: 'Payment receipt upload is required before final submission.',
  };
  return messages[stepId] || '';
}

export default function SidebarWorkflow({ manuscript, activeStep, onStepSelected }: SidebarWorkflowProps) {
  return (
    <aside id="submission-sidebar" className="w-full md:w-80 bg-white border border-slate-200 rounded-2xl py-5 px-4 shadow-sm h-fit">
      <div className="border-b border-slate-100 pb-3 mb-4">
        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
          Submission Workflow
        </h3>
        <p className="text-sm font-semibold text-teal-800 mt-1 line-clamp-2">
          {manuscript.title || 'Untitled Manuscript Draft'}
        </p>
        <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-sm text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          Manuscript Status: {manuscript.status}
        </span>
      </div>

      <nav className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {SUBMISSION_STEPS.map((step) => {
          const status = step.validator(manuscript);
          const IconComponent = step.icon;
          const isActive = activeStep === step.id;
          const help = statusHelp(step.id, status);

          return (
            <div key={step.id}>
              <button
                id={`step-tab-${step.id}`}
                onClick={() => onStepSelected(step.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-teal-700 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComponent className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{step.label}</span>
                </div>
                <div>
                  {status === 'complete' && (
                    <CheckCircle className={`h-4 w-4 ${isActive ? 'text-teal-200' : 'text-green-600'}`} />
                  )}
                  {status === 'warning' && (
                    <AlertCircle className={`h-4 w-4 ${isActive ? 'text-amber-200' : 'text-amber-500'}`} />
                  )}
                  {status === 'empty' && (
                    <Circle className={`h-3.5 w-3.5 ${isActive ? 'text-teal-300 opacity-60' : 'text-slate-300'}`} />
                  )}
                </div>
              </button>
              {isActive && help && (
                <p className="px-3 pt-1 pb-2 text-[10px] leading-snug text-amber-700">
                  {help}
                </p>
              )}
            </div>
          );
        })}
      </nav>
      
      {/* Visual representation of journal progress */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
          <span>Overall Submission Readiness</span>
          <span>
            {Math.round(
              (SUBMISSION_STEPS.filter(s => s.validator(manuscript) === 'complete').length / SUBMISSION_STEPS.length) * 100
            )}%
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-teal-700 h-full transition-all duration-500"
            style={{ 
              width: `${(SUBMISSION_STEPS.filter(s => s.validator(manuscript) === 'complete').length / SUBMISSION_STEPS.length) * 100}%` 
            }}
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-2 italic">
          All sections must show green or amber status before final submittal.
        </p>
      </div>
    </aside>
  );
}
