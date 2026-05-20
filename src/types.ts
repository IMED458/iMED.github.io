/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Author' | 'Editor' | 'Managing Editor' | 'Reviewer' | 'Administrator';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  orcidId?: string;
  role: UserRole;
  institution: string;
  isVerified: boolean;
  joinedDate: string;
}

export interface AuthorDetails {
  id: string;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  email: string;
  phone: string;
  orcidId: string; // Mandatory ORCID field
  specialty: string;
  country: string;
  city: string;
  institution: string;
  department: string;
  affiliation: string;
  academicTitle: string;
  contributionRole: string; // e.g., 'Draft Writing', 'Data Analysis', 'Funding', etc.
  isCorresponding: boolean;
}

export type ArticleTypeKey =
  | 'original-article'
  | 'special-article'
  | 'brief-report'
  | 'clinical-problem'
  | 'clinical-practice'
  | 'review-article'
  | 'editorial'
  | 'perspective'
  | 'clinical-implications'
  | 'letter-to-editor'
  | 'special-report'
  | 'health-policy'
  | 'medicine-society'
  | 'sounding-board';

export interface ArticleTypeConfig {
  key: ArticleTypeKey;
  name: string;
  description: string;
  maxWordCount: number;
  maxReferences: number;
  maxFiguresTables: number;
  requiredSections: string[];
  abstractType: 'structured' | 'unstructured' | 'none';
  structuredAbstractSections?: string[];
  submissionFeeUSD: number;
}

export interface ReferenceItem {
  id: string;
  type: 'journal' | 'book' | 'web';
  authors: string; // Surname Initials (e.g., 'Smith AJ, Jones BJ')
  title: string;
  journalOrBook: string;
  year: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
}

export interface FigureTableItem {
  id: string;
  type: 'figure' | 'table';
  title: string;
  caption: string;
  fileUrl?: string; // or base64 data url for preview
  fileName?: string;
  tableData?: string[][]; // For grid/table builder
}

export interface SupplementaryFile {
  id: string;
  fileName: string;
  description: string;
  fileSize: string;
  uploadedAt: string;
}

export interface ConflictDisclosure {
  hasConflict: boolean;
  conflictDetails: string;
  hasReceivedFunding: boolean;
  fundingSource: string;
  hasIndustryRelation: boolean;
  industryRelationDetails: string;
  signedCoiFormUrl?: string; // File uploader state
  signedCoiFormName?: string;
}

export interface EthicsStatements {
  humanSubjectsApproved: 'yes' | 'no' | 'exempt' | 'not-applicable';
  irbApprovalNumber: string;
  irbInstitution: string;
  animalSubjectsUsed: 'yes' | 'no' | 'not-applicable';
  animalEthicsStatement: string;
  informedConsentObtained: 'yes' | 'no' | 'not-applicable';
  ethicsStatementUploadedUrl?: string;
  ethicsStatementFileName?: string;
}

export interface PaymentReceipt {
  invoiceNumber: string;
  referenceId: string;
  paymentNote: string;
  fileName: string;
  uploadedUrl?: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface ReviewerComment {
  id: string;
  reviewerId: string;
  reviewerName: string;
  ethicalConcerns: string;
  methodologyScore: number; // 1-5
  originalityScore: number; // 1-5
  scientificMeritScore: number; // 1-5
  constructiveComments: string; // Rich text or raw paragraphs
  confidentialToEditor: string;
  recommendation: 'accept' | 'minor-revision' | 'major-revision' | 'reject';
  submittedAt: string;
}

export type ManuscriptStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Revision Requested'
  | 'Accepted'
  | 'Rejected'
  | 'Published';

export interface Manuscript {
  id: string; // e.g., GBMN-2026-0042
  status: ManuscriptStatus;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  
  // Title & Categorization
  title: string;
  runningTitle: string; // Max 50 chars
  specialty: string;
  articleType: ArticleTypeKey;

  // Checklist Agreement
  checklistAgreed: boolean;
  checklistAgreedAt?: string;

  // Authors List
  authors: AuthorDetails[];

  // Abstract Content
  abstractContents: { [section: string]: string }; // e.g. { "Background": "...", "Methods": "..." } or { "text": "..." }

  // Section Content
  sections: { [sectionName: string]: string }; // introduction, materials, evaluation, discussion, etc.

  // Media
  figuresAndTables: FigureTableItem[];
  references: ReferenceItem[];
  supplementaryFiles: SupplementaryFile[];

  // Disclosures & Ethics
  ethics: EthicsStatements;
  conflictDisclosure: ConflictDisclosure;
  fundingDetails: {
    fundingAgency: string;
    grantNumber: string;
    explanation: string;
  };

  // Payment Receipt Details
  payment: PaymentReceipt;

  // Additional Reviewer/Editorial attachments
  editorFiles: { id: string; fileName: string; type: string }[];
  reviewerAssignments: {
    reviewerId: string;
    reviewerName: string;
    status: 'assigned' | 'completed' | 'declined';
    assignedAt: string;
    comments?: ReviewerComment;
  }[];
  editorDecisionLog: {
    editorId: string;
    decision: 'minor-revision' | 'major-revision' | 'accept' | 'reject' | 'publish';
    comments: string;
    timestamp: string;
  }[];
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  targetId: string;
  details: string;
}

export interface JournalSettings {
  journalNameFull: string;
  journalNameShort: string;
  contactEmail: string;
  submissionFeeUSD: number;
  openAccessPolicy: string;
  editorGuidelines: string;
}
