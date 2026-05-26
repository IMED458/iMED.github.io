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
  password?: string;
  tempPassword?: string;
  mustChangePassword?: boolean;
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
  affiliations?: string[];
  academicTitle: string;
  contributionRole: string; // e.g., 'Draft Writing', 'Data Analysis', 'Funding', etc.
  contributionTags?: string[];
  isCorresponding: boolean;
}

export type ArticleTypeKey =
  | 'clinical-cases'
  | 'original-research'
  | 'review-articles'
  | 'commentary'
  | 'other';

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
  type: 'figure' | 'table' | 'diagram';
  title: string;
  caption: string;
  fileUrl?: string; // or base64 data url for preview
  fileName?: string;
  tableData?: string[][]; // For grid/table builder
  htmlContent?: string;
  layout?: 'two-column' | 'one-column';
}

export interface SupplementaryFile {
  id: string;
  fileName: string;
  description: string;
  fileSize: string;
  fileUrl?: string;
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

export interface ReviewHighlight {
  id: string;
  text: string;
  note?: string;
  color?: string;
  createdBy: string;
  createdAt: string;
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
  highlights?: ReviewHighlight[];
  uploadedPdfUrl?: string;
  status?: 'draft' | 'submitted';
}

export type ManuscriptStatus =
  | 'Draft'
  | 'Submitted'
  | 'Reviewer Assigned'
  | 'Under Review'
  | 'In Review'
  | 'Revision Requested'
  | 'Editorial Decision'
  | 'Accepted'
  | 'In Production'
  | 'Completed'
  | 'Rejected'
  | 'Published';

export interface Manuscript {
  id: string; // e.g., GBMN-2026-0042
  status: ManuscriptStatus;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  
  // Title & Categorization
  title: string;
  runningTitle: string; // Max 50 chars
  specialty: string;
  articleType: ArticleTypeKey;
  publicationInfo?: {
    doi?: string;
    volumeIssue?: string;
  };

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

  // Editor assignment
  assignedEditorId?: string;
  assignedEditorName?: string;
  assignedEditorEmail?: string;
  editorAssignedAt?: string;

  // Additional Reviewer/Editorial attachments
  editorFiles: { id: string; fileName: string; type: string; fileUrl?: string; uploadedAt?: string; fileSize?: string }[];
  reviewerAssignments: {
    reviewerId: string;
    reviewerName: string;
    status: 'assigned' | 'completed' | 'declined';
    assignedAt: string;
    comments?: ReviewerComment;
    highlights?: ReviewHighlight[];
    draftReview?: string;
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
